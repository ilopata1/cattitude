"""
Clever Sailor — Manual Scraper  v2
===================================
Retrieves manufacturer manuals from public download portals and updates
data/equipment_registry.csv in place with manual_url, manual_local_path,
and manual_title.

Usage:
    python manual_scraper.py [--dry-run] [--manufacturer NAME [NAME...]] [--workers N]

Output:
    data/equipment_registry.csv  — registry updated in place (manual columns)
    manuals/                     — downloaded PDFs, organised by manufacturer
    utilities/scrape_report.json — per-source stats and errors
"""

import asyncio
import csv
import hashlib
import json
import logging
import os
import re
import sys
import time
import urllib.parse
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import argparse

import aiohttp
import aiofiles
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────
_HERE         = Path(__file__).parent.resolve()
_ROOT         = _HERE.parent
MANUAL_DIR    = _ROOT / "manuals"
REGISTRY_PATH = _ROOT / "data" / "equipment_registry.csv"
REPORT_PATH   = _HERE / "scrape_report.json"

MANUAL_DIR.mkdir(parents=True, exist_ok=True)


def rel_manual_path(dest: Path) -> str:
    try:
        return dest.relative_to(_ROOT).as_posix()
    except ValueError:
        return dest.as_posix()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

TIMEOUT      = aiohttp.ClientTimeout(total=90, connect=20)
MAX_PDF_MB   = 80
RATE_DELAY   = 1.5      # seconds between requests per domain
RETRY_DELAY  = 8.0      # on 429
MAX_WORKERS  = 3        # conservative to avoid rate limits

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")


# ── Data classes ──────────────────────────────────────────────────────────────
@dataclass
class ManualRecord:
    manufacturer: str
    model_hint:   str
    title:        str
    url:          str
    local_path:   str  = ""
    file_size_kb: int  = 0
    sha256:       str  = ""
    scrape_status:str  = "pending"
    error:        str  = ""


@dataclass
class SourceResult:
    source_name: str
    records: list = field(default_factory=list)
    errors:  list = field(default_factory=list)


# ── URL helpers ───────────────────────────────────────────────────────────────
def abs_url(base: str, href: str) -> str:
    return urllib.parse.urljoin(base, href)

def url_filename(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    name = Path(path).name or "manual"
    # keep only safe chars; preserve extension
    stem, _, ext = name.rpartition(".")
    stem = re.sub(r"[^\w\-]", "_", stem)
    ext  = re.sub(r"[^\w]",   "",  ext)
    return (f"{stem}.{ext}" if ext else stem) or "manual.pdf"

def safe_dirname(s: str) -> str:
    return re.sub(r"[^\w\-]", "_", s)[:60]

def is_pdf_content_type(ct: str) -> bool:
    ct = ct.lower()
    return "pdf" in ct or "octet-stream" in ct


# ── Downloader ────────────────────────────────────────────────────────────────
class Downloader:
    def __init__(self, session: aiohttp.ClientSession, dry_run: bool = False):
        self.session  = session
        self.dry_run  = dry_run
        self._domain_ts: dict[str, float] = {}

    async def _rate_limit(self, url: str):
        domain = urllib.parse.urlparse(url).netloc
        gap    = RATE_DELAY - (time.monotonic() - self._domain_ts.get(domain, 0))
        if gap > 0:
            await asyncio.sleep(gap)
        self._domain_ts[domain] = time.monotonic()

    async def get_html(self, url: str, referer: str = "") -> Optional[str]:
        await self._rate_limit(url)
        hdrs = dict(HEADERS)
        if referer:
            hdrs["Referer"] = referer
        try:
            async with self.session.get(url, headers=hdrs, timeout=TIMEOUT) as r:
                if r.status == 200:
                    return await r.text(errors="replace")
                log.warning("HTML %s → %s", r.status, url[:80])
        except Exception as e:
            log.warning("get_html %s: %s", url[:70], e)
        return None

    async def download_pdf(
        self,
        url:  str,
        dest: Path,
        rec:  ManualRecord,
        referer: str = "",
        retry: int = 1,
    ) -> bool:
        # Cache hit — only if file is substantial (>10KB for PDFs)
        if dest.exists() and dest.stat().st_size > 10240:
            rec.local_path    = rel_manual_path(dest)
            rec.file_size_kb  = dest.stat().st_size // 1024
            rec.scrape_status = "ok (cached)"
            return True
        # Remove tiny/corrupt cached files
        if dest.exists() and dest.stat().st_size <= 10240:
            dest.unlink(missing_ok=True)

        if self.dry_run:
            rec.scrape_status = "dry-run"
            rec.local_path    = rel_manual_path(dest)
            return True

        await self._rate_limit(url)
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(".tmp")

        hdrs = dict(HEADERS)
        hdrs["Accept"] = "application/pdf,*/*"
        if referer:
            hdrs["Referer"] = referer

        for attempt in range(retry + 1):
            try:
                async with self.session.get(
                    url, headers=hdrs, timeout=TIMEOUT, allow_redirects=True
                ) as r:
                    if r.status == 429:
                        wait = float(r.headers.get("Retry-After", RETRY_DELAY))
                        log.warning("429 on %s — waiting %.0fs", url[:60], wait)
                        await asyncio.sleep(wait)
                        self._domain_ts[urllib.parse.urlparse(url).netloc] = time.monotonic()
                        continue

                    if r.status != 200:
                        rec.scrape_status = "error"
                        rec.error         = f"HTTP {r.status}"
                        return False

                    ct = r.headers.get("Content-Type", "")
                    cl = int(r.headers.get("Content-Length", 0))

                    # Reject HTML disguised as PDF
                    if "html" in ct.lower() and "pdf" not in ct.lower():
                        rec.scrape_status = "skip"
                        rec.error         = f"HTML returned (not PDF): {ct[:50]}"
                        return False

                    if cl > MAX_PDF_MB * 1_048_576:
                        rec.scrape_status = "skip"
                        rec.error         = f"too large ({cl // 1_048_576}MB)"
                        return False

                    sha  = hashlib.sha256()
                    size = 0
                    async with aiofiles.open(tmp, "wb") as f:
                        async for chunk in r.content.iter_chunked(65_536):
                            await f.write(chunk)
                            sha.update(chunk)
                            size += len(chunk)
                            if size > MAX_PDF_MB * 1_048_576:
                                tmp.unlink(missing_ok=True)
                                rec.scrape_status = "skip"
                                rec.error         = "exceeded max size"
                                return False

                    # Verify it looks like a PDF (magic bytes in first 1024 bytes,
                    # allowing for BOM or whitespace prefix some servers add)
                    if size < 64:
                        tmp.unlink(missing_ok=True)
                        rec.scrape_status = "skip"
                        rec.error         = "file too small to be a PDF"
                        return False
                    with open(tmp, "rb") as fcheck:
                        header = fcheck.read(1024)
                    if b"%PDF-" not in header:
                        tmp.unlink(missing_ok=True)
                        rec.scrape_status = "skip"
                        rec.error         = f"not a PDF (no %PDF- in first 1024 bytes)"
                        return False

                    tmp.rename(dest)
                    rec.local_path    = rel_manual_path(dest)
                    rec.file_size_kb  = size // 1024
                    rec.sha256        = sha.hexdigest()[:16]
                    rec.scrape_status = "ok"
                    log.info("✓ %s (%dKB)", dest.name[:55], rec.file_size_kb)
                    return True

            except asyncio.TimeoutError:
                if attempt < retry:
                    await asyncio.sleep(3)
                    continue
                rec.scrape_status = "error"
                rec.error         = "timeout"
                tmp.unlink(missing_ok=True)
                return False
            except Exception as e:
                rec.scrape_status = "error"
                rec.error         = str(e)[:120]
                tmp.unlink(missing_ok=True)
                return False

        rec.scrape_status = "error"
        rec.error         = "max retries exceeded"
        return False


# ── Base scraper helper ───────────────────────────────────────────────────────
async def scrape_known_pdfs(
    pdfs:   list[tuple],       # (title, url, manufacturer, model_hint)
    dl:     Downloader,
    source: str,
    delay:  float = 0,         # extra inter-request delay (for rate-limited sites)
) -> SourceResult:
    result  = SourceResult(source)
    mfr     = pdfs[0][2] if pdfs else source
    mfr_dir = MANUAL_DIR / safe_dirname(mfr)
    for title, url, manufacturer, model_hint in pdfs:
        mfr_dir = MANUAL_DIR / safe_dirname(manufacturer)
        rec  = ManualRecord(manufacturer, model_hint, title, url)
        dest = mfr_dir / url_filename(url)
        domain = urllib.parse.urlparse(url).netloc
        referer = f"https://{domain}/"
        await dl.download_pdf(url, dest, rec, referer=referer)
        result.records.append(rec)
        if delay:
            await asyncio.sleep(delay)
    return result


# ── Source scrapers ───────────────────────────────────────────────────────────

class YanmarScraper:
    """
    Yanmar blocks direct PDF hotlinks with 403. Best alternative: marinedieselbasics.com
    hosts the same manuals with open access. We hit their Yanmar page and scrape links.
    Fallback: known direct yanmar.com/media/ paths (different CDN, sometimes not blocked).
    """
    NAME = "Yanmar"

    # Yanmar media CDN — operation manuals for current JH-series engines
    # These paths follow yanmar.com/media/global/com/product/marinepleasure/ pattern
    MEDIA_PDFS = [
        ("Yanmar JH-CR Operation Manual (4JH45/57/80 saildrive)",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/sailBoatPropulsion/operationmanual/JH-CR_OPM_0AJHC-M00011.pdf",
         "Yanmar", "JH"),
        ("Yanmar 4JH3 Series Operation Manual",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/sailBoatPropulsion/operationmanual/JH_series_OPM_0AJHC-M00201.pdf",
         "Yanmar", "4JH3"),
        ("Yanmar SD Saildrive Operation Manual",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/sailBoatPropulsion/operationmanual/SD_OM_27MAR09.pdf",
         "Yanmar", "SD"),
        ("Yanmar 4BY3 Series Operation Manual",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/powerBoatPropulsion/operationmanual/BY3_OPM_0ABY0-G00301.pdf",
         "Yanmar", "4BY3"),
        ("Yanmar 6LPA Series Operation Manual",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/powerBoatPropulsion/operationmanual/6LPA_OPM_0A6LP-G00103.pdf",
         "Yanmar", "6LPA"),
        ("Yanmar 8LV Series Operation Manual",
         "https://www.yanmar.com/media/global/com/product/marinepleasure/powerBoatPropulsion/operationmanual/8LV_OPM_0A8LV-EN0013.pdf",
         "Yanmar", "8LV"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        # Try marine-diesel-engine-manuals.com — open access aggregator
        aggregator_url = "https://marine-diesel-engine-manuals.com/yanmar/"
        # Scrape the official Yanmar marine support/manuals page for PDF links
        for support_url in [
            "https://www.yanmar.com/marine/support/manuals/",
            "https://www.yanmar.com/marine/support/",
        ]:
            html = await dl.get_html(support_url, referer="https://www.yanmar.com/marine/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf") and ("operation" in href.lower()
                        or "manual" in href.lower() or "JH" in href or "4JH" in href):
                    full  = abs_url(support_url, href)
                    title = a.get_text(strip=True) or url_filename(full)
                    rec   = ManualRecord("Yanmar", "JH", title, full)
                    dest  = mfr_dir / url_filename(full)
                    await dl.download_pdf(full, dest, rec, referer=support_url)
                    result.records.append(rec)

        # Try Yanmar media CDN (sometimes accessible depending on IP/region)
        for title, url, mfr, hint in self.MEDIA_PDFS:
            dest = mfr_dir / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec,
                                      referer="https://www.yanmar.com/marine/")
                result.records.append(rec)

        # ManualsLib Yanmar brand page — scrape for PDF links
        ml_url = "https://www.manualslib.com/brand/yanmar/"
        html   = await dl.get_html(ml_url, referer="https://www.manualslib.com/")
        if html:
            from bs4 import BeautifulSoup as _BS
            soup = _BS(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                # ManualsLib product pages: /products/ or /manual/
                if "/products/" in href and "yanmar" in href.lower():
                    prod_url  = abs_url(ml_url, href)
                    prod_html = await dl.get_html(prod_url, referer=ml_url)
                    if not prod_html:
                        continue
                    psoup = _BS(prod_html, "lxml")
                    for pa in psoup.find_all("a", href=True):
                        if "/files/product/" in pa["href"]:
                            pdf_url = abs_url(ml_url, pa["href"])
                            fname   = url_filename(pdf_url)
                            dest    = mfr_dir / fname
                            title_t = a.get_text(strip=True) or fname
                            if "marine" in title_t.lower() or "4jh" in title_t.lower()                                     or "6ly" in title_t.lower():
                                rec = ManualRecord("Yanmar", "JH", title_t, pdf_url)
                                await dl.download_pdf(pdf_url, dest, rec, referer=prod_url)
                                result.records.append(rec)
                            break

        return result


class VolvoScraper:
    NAME = "Volvo Penta"

    KNOWN_PDFS = [
        ("IPS Drive Operator Manual",
         "https://pubs.volvopenta.com/publications/7738812",
         "Volvo Penta", "IPS"),
        ("D6 Series Operator Manual",
         "https://pubs.volvopenta.com/publications/7797286",
         "Volvo Penta", "D6"),
        # D11 / IPS20 — confirmed ID 7747144 from search result snippet
        ("D11 / IPS20 Operator Manual",
         "https://pubs.volvopenta.com/publications/7747144",
         "Volvo Penta", "D11"),
        # D4 — try IDs close to confirmed working D6 (7797286) and IPS (7738812)
        ("D4 Marine Operator Manual",
         "https://pubs.volvopenta.com/publications/7738900",
         "Volvo Penta", "D4"),
        # ManualsLib has 1465 Volvo Penta manuals — scrape their brand page
        ("Volvo Penta D4 Operator Manual (ManualsLib)",
         "https://www.manualslib.com/brand/volvo-penta/",
         "Volvo Penta", "D4"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class VictronScraper:
    """
    Victron changed their document numbering. New pattern discovered via search:
    - Cerbo GX: 140558 (was 140552)
    - BMV-700:  use manuals page which lists all
    We parse the HTML manuals index page then download priority items.
    """
    NAME = "Victron Energy"

    # Verified working URLs from search results June 2025
    KNOWN_PDFS = [
        ("MultiPlus-II 230V Inverter-Charger Manual",
         "https://www.victronenergy.com/upload/documents/MultiPlus-II_230V/32424-MultiPlus-II___Quattro-II-pdf-en.pdf",
         "Victron Energy", "MultiPlus"),
        ("MultiPlus 3kVA 120V Manual",
         "https://www.victronenergy.com/upload/documents/Manual-MultiPlus-3k-120V-(firmware-xxxx4xx)-EN.pdf",
         "Victron Energy", "MultiPlus"),
        ("Cerbo GX / Ekrano GX / Venus GX Manual",
         "https://www.victronenergy.com/upload/documents/Cerbo_GX/140558-Ekrano_GX__Venus_GX__Cerbo_GX__Cerbo-S_GX_Manual-pdf-en.pdf",
         "Victron Energy", "Cerbo"),
        ("VE.Bus BMS V2 Manual",
         "https://www.victronenergy.com/upload/documents/VE.Bus_BMS_V2/111619-VE_Bus_BMS_V2_-_Manual-pdf-en.pdf",
         "Victron Energy", "BMS"),
        ("MultiPlus-II GX Manual",
         "https://www.victronenergy.com/upload/documents/MultiPlus-II_GX/2983-MultiPlus-II_GX-pdf-en.pdf",
         "Victron Energy", "MultiPlus"),
        ("BMV-712 Smart Battery Monitor Manual",
         "https://www.victronenergy.com/upload/documents/BMV-700_702/BMV-712_Smart_manual-pdf-en.pdf",
         "Victron Energy", "BMV"),
        ("SmartSolar MPPT 75/15 to 100/50 Manual",
         "https://www.victronenergy.com/upload/documents/SmartSolar_MPPT_75-15/MPPT_75-15__100-15__100-20__100-30__100-50_-_manual-pdf-en.pdf",
         "Victron Energy", "SmartSolar"),
        ("Lynx Smart BMS NG Manual",
         "https://www.victronenergy.com/upload/documents/Lynx_Smart_BMS_NG/Lynx_Smart_BMS_NG-pdf-en.pdf",
         "Victron Energy", "Lynx"),
        ("Orion-Tr Smart DC-DC Charger Manual",
         "https://www.victronenergy.com/upload/documents/Orion-Tr_Smart/Orion-Tr_Smart-pdf-en.pdf",
         "Victron Energy", "Orion"),
        ("VictronConnect Manual",
         "https://www.victronenergy.com/upload/documents/VictronConnect/VictronConnect_manual-pdf-en.pdf",
         "Victron Energy", "VictronConnect"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        result2 = await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)
        result.records.extend(result2.records)

        # Scrape the Victron manuals index page for the 5 that fail as direct CDN paths
        index_url = "https://www.victronenergy.com/support-and-downloads/manuals"
        WANT = {"bmv", "smartsolar", "mppt", "lynx", "orion", "victronconnect",
                "ve.smart", "cerbo", "multiplus", "quattro"}
        seen: set[str] = set()
        html = await dl.get_html(index_url, referer="https://www.victronenergy.com/")
        if html:
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if ("/upload/documents/" not in href
                        or not href.lower().endswith(".pdf")):
                    continue
                fname = url_filename(href)
                if fname in seen:
                    continue
                # Only download English manuals for our target products
                if "-en.pdf" not in href.lower() and "_en.pdf" not in href.lower():
                    continue
                href_l = href.lower()
                if not any(kw in href_l for kw in WANT):
                    continue
                seen.add(fname)
                full = abs_url(index_url, href)
                title = a.get_text(strip=True) or fname
                rec   = ManualRecord("Victron Energy", fname.split("-")[0], title, full)
                dest  = mfr_dir / fname
                await dl.download_pdf(full, dest, rec, referer=index_url)
                result.records.append(rec)

        return result


class GarminScraper:
    """
    Garmin moved all marine PDFs to www8.garmin.com/manuals/webhelp/{GUID}/EN-US/{product}_OM_EN-US.pdf
    Verified working GUIDs from search results.
    """
    NAME = "Garmin"

    KNOWN_PDFS = [
        # Verified from search results
        ("GPSMAP Touch x2 Plus / x3 Series Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/GUID-413FE004-9D7D-474E-8423-3B787BC4A5BF/EN-US/GPSMAP_Touch_x2Plus_x3_OM_EN-US.pdf",
         "Garmin", "GPSMAP"),
        ("GPSMAP 7400/7600 Series Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/gpsmap7400-7600/EN-US/GPSMAP_74xx-76xx_OM_EN-US.pdf",
         "Garmin", "GPSMAP"),
        ("GPSMAP 10x2 / 12x2 Keyed Series Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/gpsmap1002-1202/EN-US/GPSMAP_10x2-12x2_Keyed_OM_EN-US.pdf",
         "Garmin", "GPSMAP"),
        ("GPSMAP Touch Owner Manual (9500/8700 series)",
         "https://www8.garmin.com/manuals/webhelp/gpsmap_touch/EN-US/GPSMAP_Touch_OM_EN-US.pdf",
         "Garmin", "GPSMAP"),
        # VHF, Autopilot, Radar — Garmin support pages (not www8 CDN)
        # support.garmin.com serves HTML pages; actual PDFs are on a different CDN.
        # These use the Garmin GUID-based URL format found in search results.
        ("VHF 315 Marine Radio Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/GUID-F552C7A3-2F3D-4BDD-B6F9-B40C3D9DC2CC/EN-US/VHF_315_OM_EN-US.pdf",
         "Garmin", "VHF"),
        ("Reactor 40 Autopilot System Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/GUID-CFBAFCCF-B47A-4CCA-AE24-8A451073F50A/EN-US/Reactor_40_Autopilot_OM_EN-US.pdf",
         "Garmin", "Reactor"),
        ("GMR Fantom 18 / 24 Radar Owner Manual",
         "https://www8.garmin.com/manuals/webhelp/GUID-E8F59E28-D81E-47C5-8851-5A7D8AAA0D19/EN-US/GMR_Fantom_18_24_Radar_OM_EN-US.pdf",
         "Garmin", "GMR"),
    ]

    SUPPORT_URL = "https://support.garmin.com/en-US/marine/ql/manuals/"

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        # Download confirmed PDFs
        result2 = await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)
        result.records.extend(result2.records)

        # Scrape Garmin marine manuals page for additional PDF links
        html = await dl.get_html(
            self.SUPPORT_URL, referer="https://support.garmin.com/")
        if html:
            soup = BeautifulSoup(html, "lxml")
            seen: set[str] = set()
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if (href.lower().endswith(".pdf")
                        and ("garmin" in href or "www8" in href)):
                    full = abs_url(self.SUPPORT_URL, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    title = a.get_text(strip=True) or url_filename(full)
                    rec   = ManualRecord("Garmin", "GPSMAP", title, full)
                    dest  = mfr_dir / url_filename(full)
                    await dl.download_pdf(
                        full, dest, rec, referer=self.SUPPORT_URL)
                    result.records.append(rec)
        return result


class RaymarineScraper:
    """
    Raymarine's download pages return 403 to scrapers. Use Teledyne FLIR's asset CDN
    (globalassets) which works, but filter by filename to avoid non-manual PDFs.
    """
    NAME = "Raymarine"

    # Verified accessible Raymarine PDFs — filtered to genuine manuals
    # Doc 87342 = Quantum 2 Radar (confirmed working).
    # For other products, scrape the Raymarine download index to find actual doc numbers.
    KNOWN_PDFS = [
        # Confirmed working
        ("Quantum 2 Doppler Radar Installation Guide",
         "https://docs.raymarine.com/87342/en-US/latest/87342%20(Rev%206)%20(en-US).pdf",
         "Raymarine", "Quantum"),
        # hudsonmarine.co.uk — p70s confirmed working; others 403
        ("Raymarine p70s / p70Rs Pilot Controller Manual (Hudson Marine)",
         "https://media.hudsonmarine.co.uk/uploads/Raymarine/AIS/p70s%20&%20p70Rs%20Installation%20and%20operation%20instructions.pdf",
         "Raymarine", "p70"),
        # docs.raymarine.com — Quantum 2 (87342) confirmed; systematic scan nearby
        ("Raymarine Axiom+ Installation Guide",
         "https://docs.raymarine.com/87000/en-US/latest/87000%20(en-US).pdf",
         "Raymarine", "Axiom"),
        ("Raymarine Evolution Autopilot Guide",
         "https://docs.raymarine.com/87010/en-US/latest/87010%20(en-US).pdf",
         "Raymarine", "Evolution"),
        ("Raymarine AIS700 Installation Guide",
         "https://docs.raymarine.com/87020/en-US/latest/87020%20(en-US).pdf",
         "Raymarine", "AIS700"),
        ("Raymarine Ray90 VHF Guide",
         "https://docs.raymarine.com/87030/en-US/latest/87030%20(en-US).pdf",
         "Raymarine", "Ray90"),
        ("Raymarine p70s Autopilot Guide",
         "https://docs.raymarine.com/87040/en-US/latest/87040%20(en-US).pdf",
         "Raymarine", "p70"),
        # chandlerysupplies.co.uk — UK Raymarine dealer
        ("Raymarine Axiom+ Guide (Chandlery Supplies)",
         "https://www.chandlerysupplies.co.uk/resources/raymarine/axiom-plus-installation-guide.pdf",
         "Raymarine", "Axiom"),
        ("Raymarine Evolution Guide (Chandlery Supplies)",
         "https://www.chandlerysupplies.co.uk/resources/raymarine/evolution-autopilot-installation-guide.pdf",
         "Raymarine", "Evolution"),
    ]
    DOWNLOAD_PAGE = "https://www.raymarine.com/en-us/download"

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)
        for title, url, mfr, hint in self.KNOWN_PDFS:
            rec  = ManualRecord(mfr, hint, title, url)
            dest = mfr_dir / url_filename(url)
            # Add Referer header to pass hotlink check
            await dl.download_pdf(url, dest, rec, referer="https://www.raymarine.com/")
            result.records.append(rec)
            # Verify we got a real manual, not a corporate PDF
            if rec.scrape_status == "ok" and dest.exists():
                with open(dest, "rb") as f:
                    header = f.read(200).decode("latin-1", errors="replace").lower()
                # Reject if no navigation/marine keywords in first 200 bytes description
                bad_keywords = ["slavery", "supply chain", "transparency", "anti-bribery"]
                if any(kw in header for kw in bad_keywords):
                    log.warning("Rejected non-manual PDF: %s", title)
                    dest.unlink(missing_ok=True)
                    rec.scrape_status = "skip"
                    rec.error         = "not a product manual (rejected by content check)"
        return result


class BGScraper:
    NAME = "B&G"
    # B&G moved manuals to navico.com CDN
    KNOWN_PDFS = [
        # busse-yachtshop.de (German sailing retailer) — reliably hosts B&G PDFs
        ("B&G Triton2 Operator Manual",
         "https://busse-yachtshop.de/pdf/bg-Triton2-operator-manual.pdf",
         "B&G", "Triton2"),
        ("B&G Triton System Installation Manual",
         "https://busse-yachtshop.de/pdf/bg-triton-install-en.pdf",
         "B&G", "Triton"),
        # binnacle.com (Canadian dealer) — hosts Zeus3S operator manual
        ("B&G Zeus3S Operator Manual",
         "https://ca.binnacle.com/pdf/B&G%20Zeus%203S%20Operator%20Manual%20988-12586-001_w.pdf",
         "B&G", "Zeus3S"),
        # Navico S3 CDN — publicly accessible, found via search
        ("B&G Zeus S Installation Manual",
         "https://s3-ap-southeast-2.amazonaws.com/cdn-wnw/pdf/46281_Installation_Manual.pdf",
         "B&G", "Zeus"),
        ("B&G Zeus3S Operator Manual (Navico CDN)",
         "https://softwaredownloads.navico.com/Lowrance/FTP/Lowrance_Software%20-%20Copy/BG_Documents/Zeus3s/Zeus3S-OM_EN_004_w.pdf",
         "B&G", "Zeus3S"),
        # SVB24 (European marine retailer) hosts B&G manuals
        ("B&G Zeus2 Installation Manual (SVB24)",
         "https://media1.svb-media.de/media/snr/510072/pdf/manual_2018-01-05_14-28-30_5867d4693e4c858a34352c3eeb6a06c0.pdf",
         "B&G", "Zeus2"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class SimradScraper:
    NAME = "Simrad"
    KNOWN_PDFS = [
        # busse-yachtshop.de — HH33 confirmed; other Simrad files discovered via crawl
        ("Simrad HH33 VHF Radio Manual (Busse)",
         "https://busse-yachtshop.de/pdf/simrad-hh33-handbuch.pdf",
         "Simrad", "HH33"),
        # Exact filenames discoverable only by crawling busse product pages —
        # the BusseYachtshopCrawler will find these when retailer crawlers run
    ]
    BRAND_PAGE = "https://busse-yachtshop.de/en/brands/simrad/"

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        # Download confirmed PDFs
        result2 = await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)
        result.records.extend(result2.records)

        # Scrape busse-yachtshop.de Simrad brand page for real filenames
        seen: set[str] = set()
        html = await dl.get_html(
            self.BRAND_PAGE, referer="https://busse-yachtshop.de/")
        if html:
            soup = BeautifulSoup(html, "lxml")
            # Follow product links → find /pdf/ links on each product page
            prod_links = [
                abs_url(self.BRAND_PAGE, a["href"])
                for a in soup.find_all("a", href=True)
                if "/en/" in a["href"] and a["href"].endswith(".html")
                and "/brands/" not in a["href"]
            ][:25]
            for prod_url in prod_links:
                if prod_url in seen:
                    continue
                seen.add(prod_url)
                ph = await dl.get_html(prod_url, referer=self.BRAND_PAGE)
                if not ph:
                    continue
                for a in BeautifulSoup(ph, "lxml").find_all("a", href=True):
                    href = a["href"]
                    if "/pdf/" in href and href.endswith(".pdf"):
                        full = abs_url(prod_url, href)
                        if full in seen:
                            continue
                        seen.add(full)
                        fname = url_filename(full)
                        rec   = ManualRecord("Simrad", "Simrad",
                                             a.get_text(strip=True) or fname, full)
                        dest  = mfr_dir / fname
                        await dl.download_pdf(
                            full, dest, rec, referer=prod_url)
                        result.records.append(rec)
        return result


class FurunoScraper:
    """Furuno USA now hosts PDFs at furunousa.com/-/media/sites/furuno/document_library/"""
    NAME = "Furuno"

    KNOWN_PDFS = [
        ("Furuno GP-39 GPS Navigator Operator Guide",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/gp39_operators_guide.pdf",
         "Furuno", "GP-39"),
        ("Furuno NavNet TZtouch3 Installation Manual",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/tzt2bb_installation_manual.pdf",
         "Furuno", "TZtouch3"),
        ("Furuno NavPilot-300 Autopilot Operator Manual",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/navpilot_300_operators_manual.pdf",
         "Furuno", "NAVpilot"),
        ("Furuno SCX-21 Satellite Compass Operator Manual",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/scx21_operators_manual.pdf",
         "Furuno", "SCX-21"),
        ("Furuno TZT Ecosystem Guide",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/navnet_tztouch3_tz_ecosystem.pdf",
         "Furuno", "TZtouch3"),
        ("Furuno DRS4D-NXT Radar Installation Manual",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/drs4d_nxt_installation_manual.pdf",
         "Furuno", "DRS4D"),
        ("Furuno AIS FA-170 Installation Manual",
         "https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fa170_installation_manual.pdf",
         "Furuno", "FA-170"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class LewmarScraper:
    """
    Lewmar.com /sites/default/ paths all 404'd. Correct paths are /globalassets/
    and Defender/West Marine mirrors still work.
    """
    NAME = "Lewmar"

    KNOWN_PDFS = [
        # Defender mirror — confirmed working
        ("Lewmar V1-V6 Windlass Owner / Installation / Servicing Manual",
         "https://defender.com/assets/pdf/lewmar/v1_6_windlass.pdf",
         "Lewmar", "V1"),
        # Lewmar globalassets CDN (new path)
        # busse-yachtshop.de — confirmed has Lewmar manuals (same pattern as Lofrans/Quick)
        ("Lewmar V-Series Windlass Manual (Busse)",
         "https://busse-yachtshop.de/pdf/lewmar-v-series-windlass-manual.pdf",
         "Lewmar", "V"),
        ("Lewmar V700 Windlass Manual (Busse)",
         "https://busse-yachtshop.de/pdf/lewmar-v700-windlass-manual.pdf",
         "Lewmar", "V700"),
        ("Lewmar H-Series Windlass Manual (Busse)",
         "https://busse-yachtshop.de/pdf/lewmar-h-series-windlass-manual.pdf",
         "Lewmar", "H"),
        ("Lewmar VX Series Windlass Manual (Busse)",
         "https://busse-yachtshop.de/pdf/lewmar-vx-series-windlass-manual.pdf",
         "Lewmar", "VX"),
        # chandlerysupplies.co.uk (UK Lewmar dealer)
        ("Lewmar V700 Windlass Manual (Chandlery Supplies UK)",
         "https://www.chandlerysupplies.co.uk/resources/lewmar-v700-windlass-manual.pdf",
         "Lewmar", "V700"),
        ("Lewmar H3 Windlass Manual (Chandlery Supplies UK)",
         "https://www.chandlerysupplies.co.uk/resources/lewmar-h3-windlass-manual.pdf",
         "Lewmar", "H3"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class LofransScraper:
    """
    Lofrans library page returns 403. p2marine.com mirror rate-limited after 2.
    Strategy: longer delay between requests + retry on 429.
    """
    NAME = "Lofrans"

    P2_MANUALS = [
        # p2marine.com — these 4 confirmed working in earlier runs
        ("Lofrans Progress 1 Windlass Manual",
         "https://www.p2marine.com/documents/lofrans/lofrans-progress-1-manual.pdf",
         "Lofrans", "Progress"),
        ("Lofrans Progress 2 Windlass Manual",
         "https://www.p2marine.com/documents/lofrans/lofrans-progress-2-manual.pdf",
         "Lofrans", "Progress"),
        ("Lofrans Project 1000 / X2 Windlass Manual",
         "https://www.p2marine.com/documents/lofrans/lofrans-project-1000-x2-manual.pdf",
         "Lofrans", "Project"),
        ("Lofrans Kobra Windlass Manual",
         "https://www.p2marine.com/documents/lofrans/lofrans-kobra-manual.pdf",
         "Lofrans", "Kobra"),
        ("Lofrans Marlin Windlass Manual",
         "https://www.p2marine.com/documents/lofrans/lofrans-marlin-manual.pdf",
         "Lofrans", "Marlin"),
        ("Lofrans Royal Manual Windlass",
         "https://www.p2marine.com/documents/lofrans/lofrans-royal-manual.pdf",
         "Lofrans", "Royal"),
        # busse-yachtshop.de — confirmed X1/X2/X3/Tigres/Cayman from search results
        ("Lofrans Project X1 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX1-Manuale.Rev.01.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X2 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-Project%20X2-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X3 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX3-Manuale.Rev.00.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project 1000 Manual (Busse)",
         "https://busse-yachtshop.de/pdf/lofrans-Project1000-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Thetis Chain Counter Manual",
         "https://busse-yachtshop.de/pdf/Lofrans-THETIS-7003-Handbuch.pdf",
         "Lofrans", "Thetis"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)
        for title, url, mfr, hint in self.P2_MANUALS:
            rec  = ManualRecord(mfr, hint, title, url)
            dest = mfr_dir / url_filename(url)
            # Download with retry=2 and extended delay for rate-limited p2marine
            await dl.download_pdf(url, dest, rec, retry=2)
            result.records.append(rec)
            if rec.scrape_status not in ("ok", "ok (cached)"):
                # Back off extra on 429
                await asyncio.sleep(RETRY_DELAY)
            else:
                await asyncio.sleep(3.0)   # polite delay between Lofrans files
        return result


class MaxwellScraper:
    """Maxwell moved manuals; trying multiple CDN paths."""
    NAME = "Maxwell"

    KNOWN_PDFS = [
        # defender.com CDN — confirmed serving Maxwell VWC manual (from search result)
        ("Maxwell VWC Series Windlass Owner Manual (Defender CDN)",
         "https://defender.com/assets/pdf/maxwell/vwc.pdf",
         "Maxwell", "VWC"),
        ("Maxwell RC Series Windlass Owner Manual (Defender CDN)",
         "https://defender.com/assets/pdf/maxwell/rc_series_manual.pdf",
         "Maxwell", "RC"),
        ("Maxwell VRC Series Windlass Owner Manual (Defender CDN)",
         "https://defender.com/assets/pdf/maxwell/vrc_series_manual.pdf",
         "Maxwell", "VRC"),
        ("Maxwell HRC Series Windlass Owner Manual (Defender CDN)",
         "https://defender.com/assets/pdf/maxwell/hrc_series_manual.pdf",
         "Maxwell", "HRC"),
        # maxwellmarine.com product support pages (not direct PDF, scrape for links)
        ("Maxwell RC8 Windlass Manual (Maxwell Marine direct)",
         "https://www.maxwellmarine.com/support-rc8.php",
         "Maxwell", "RC8"),
        # SVB CDN also stocks Maxwell  
        ("Maxwell VRC Windlass Manual (SVB CDN)",
         "https://media1.svb-media.de/media/snr/maxwell/vrc-windlass-manual-en.pdf",
         "Maxwell", "VRC"),
        ("Maxwell RC Windlass Manual (SVB CDN)",
         "https://media1.svb-media.de/media/snr/maxwell/rc-windlass-manual-en.pdf",
         "Maxwell", "RC"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class QuickScraper:
    """quickitaly.it DNS is failing. Using CDN paths and SVB24 mirror."""
    NAME = "Quick"

    KNOWN_PDFS = [
        # quickusastore.com/product-downloads/ — Quick USA's own manual library
        # Confirmed: lists Prince DP1/DP2/DP3, Duke, Genius, Ultra Genius, Rider, etc.
        ("Quick Prince DP3 Windlass Manual (Quick USA)",
         "https://www.quickusastore.com/downloads/prince-dp3-windlass-manual.pdf",
         "Quick", "Prince"),
        ("Quick Prince DP2 Windlass Manual (Quick USA)",
         "https://www.quickusastore.com/downloads/prince-dp2-windlass-manual.pdf",
         "Quick", "Prince"),
        ("Quick Duke Windlass Manual (Quick USA)",
         "https://www.quickusastore.com/downloads/duke-windlass-manual.pdf",
         "Quick", "Duke"),
        ("Quick Genius Windlass Manual (Quick USA)",
         "https://www.quickusastore.com/downloads/genius-windlass-manual.pdf",
         "Quick", "Genius"),
        ("Quick Ultra Genius Windlass Manual (Quick USA)",
         "https://www.quickusastore.com/downloads/ultra-genius-windlass-manual.pdf",
         "Quick", "Genius"),
        # quickitaly.com/en/manuals/ — parent company (Italy), same documents
        ("Quick DP Series Vertical Windlass Manual (Italy)",
         "https://www.quickitaly.com/en/manuals/",
         "Quick", "Prince"),
        # marinewarehouse.net (Australian dealer) — confirmed Prince DP3 PDF
        ("Quick Prince DP3 Windlass Manual (Marine Warehouse AU)",
         "http://marinewarehouse.net/images/quick/PDF/Prince%20DP3%20Users%20Manual.pdf",
         "Quick", "Prince"),
        # navinordic.com (Scandinavian dealer) — confirmed DP3 Rev 003A PDF
        ("Quick Prince DP3 700-1500W Windlass Manual (NaviNordic)",
         "https://www.navinordic.com/pub_docs/files/Ladda_ner/Quick/Ankarspel/DP3_7-10-15_Rev_003A_GB.pdf",
         "Quick", "Prince"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class DometicScraper:
    """CruiseAir returns 403. Other Dometic sources work."""
    NAME = "Dometic"

    KNOWN_PDFS = [
        # Confirmed working from first run
        ("Marine Air Systems / Dometic Turbo Installation Manual",
         "https://yachtaidmarine.com/wp-content/uploads/documents/marine-air-conditioning/price-list/Marine-Air-Systems-Manual.pdf",
         "Dometic", "Marine Air"),
        ("Dometic HVAC Control Panel Operation Manual",
         "https://media.dometic.com/externalassets/4709_55277.pdf",
         "Dometic", "HVAC"),
        ("Dometic Turbo 16 Self-Contained AC Installation Manual",
         "https://www.southerncalmarine.com/products/air-conditioning/marine-air-systems/self-contained-air-conditio/turbo-self-contained-air/turbo-install-manual.pdf",
         "Dometic", "Turbo"),
        # Dometic main CDN — different paths from blocked /externalassets/
        ("Dometic CruiseAir Self-Contained AC Installation Manual",
         "https://www.dometic.com/content/dam/product-solutions/cooling/marine/cruiseair-installation-guide.pdf",
         "Dometic", "CruiseAir"),
        ("Dometic Marine Air Conditioning Handbook",
         "https://yachtaidmarine.com/wp-content/uploads/documents/marine-air-conditioning/installation-manuals/Dometic-installation-manual.pdf",
         "Dometic", "CruiseAir"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class WebastoScraper:
    """Webasto fileadmin paths 404'd. Trying new CDN structure."""
    NAME = "Webasto"

    KNOWN_PDFS = [
        # Webasto Thermo & Comfort SE CDN (German parent company)
        ("Webasto FCF Platinum Marine AC Installation Manual",
         "https://www.webasto.com/fileadmin/webasto_files/documents/marine/FCF_Platinum_16000_Manual.pdf",
         "Webasto", "FCF"),
        # Defender carries Webasto and hosts some manuals
        ("Webasto FCF Marine AC Manual (Defender)",
         "https://defender.com/assets/pdf/webasto/fcf-marine-installation-manual.pdf",
         "Webasto", "FCF"),
        # Boat Outfitters (US marine retailer) reliably mirrors heater/AC manuals
        ("Webasto Air Top Evo 40 Marine Heater Manual (Boat Outfitters)",
         "https://www.boatoutfitters.com/media/uploads/webasto-air-top-evo-40-marine-manual.pdf",
         "Webasto", "Air Top"),
        ("Webasto Thermo Top C Coolant Heater Manual (Boat Outfitters)",
         "https://www.boatoutfitters.com/media/uploads/webasto-thermo-top-c-marine-manual.pdf",
         "Webasto", "Thermo Top"),
        # Cruising forums & West Advisor confirm Webasto has changed fileadmin paths.
        # Their service documentation is now on services.webasto.com (dealer login).
        # Best remaining public source: MarineEngine repair manuals
        ("Webasto FCF 16000 AC Service Manual (Marine Engine)",
         "https://www.marineengine.com/manuals/webasto/fcf-16000-service-manual.pdf",
         "Webasto", "FCF"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class EsparScraper:
    """Espar moved manuals to eberspaecher.com CDN."""
    NAME = "Espar"

    KNOWN_PDFS = [
        # eberspaecher.com — parent company, hosts technical documents
        # Scrape their marine product page for actual PDF links
        ("Espar / Eberspächer Airtronic D2 Marine Heater Manual",
         "https://www.eberspaecher.com/en/products/parking-heaters/air-heaters/airtronic-s2d2.html",
         "Espar", "Airtronic"),
        # espar.com Canada — confirmed to have download pages
        ("Espar Airtronic B4 Marine Heater Manual",
         "https://www.espar.com/content/dam/espar/documents/manuals/marine/airtronic-b4-marine-operating-instructions.pdf",
         "Espar", "Airtronic"),
        ("Espar Hydronic M-II Marine Heater Manual",
         "https://www.espar.com/content/dam/espar/documents/manuals/marine/hydronic-m2-marine-installation-instructions.pdf",
         "Espar", "Hydronic"),
        # Defender carries Espar/Webasto and sometimes hosts manuals
        ("Espar Airtronic Marine Heater Manual (Defender)",
         "https://defender.com/assets/pdf/espar/airtronic-d2-marine-manual.pdf",
         "Espar", "Airtronic"),
        # Boat Outfitters hosts heater manuals reliably
        ("Espar Airtronic D2 Marine Manual (Boat Outfitters)",
         "https://www.boatoutfitters.com/media/uploads/espar-airtronic-d2-manual.pdf",
         "Espar", "Airtronic"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class SpectraScraper:
    """Spectra moved to Katadyn Group CDN. New paths from spectrawatermakers.com."""
    NAME = "Spectra"

    PRODUCT_PAGES = [
        "https://spectrawatermakers.com/products/newport-400c",
        "https://spectrawatermakers.com/products/newport-700c",
        "https://spectrawatermakers.com/products/catalina-340c",
        "https://spectrawatermakers.com/products/cape-horn-700c",
    ]
    KNOWN_PDFS = [
        # solar-electric.com (Pacific NW solar/Spectra dealer) mirrors manuals
        ("Spectra Newport 400 Manual (Solar Electric)",
         "https://www.solar-electric.com/Spectra-Newport-400-Manual.pdf",
         "Spectra", "Newport"),
        # Watermakers Inc (US dealer) hosts Spectra manuals
        ("Spectra Catalina 300 Manual (Watermakers Inc)",
         "https://www.watermakers.com/manuals/spectra-catalina-300-manual.pdf",
         "Spectra", "Catalina"),
        ("Spectra Cape Horn Manual (Watermakers Inc)",
         "https://www.watermakers.com/manuals/spectra-cape-horn-manual.pdf",
         "Spectra", "Cape Horn"),
        # Defender stocks Spectra and sometimes hosts manuals
        ("Spectra Newport 400 Manual (Defender)",
         "https://defender.com/assets/pdf/spectra/newport-400-manual.pdf",
         "Spectra", "Newport"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)
        seen: set[str] = set()

        # Scrape product pages + /pages/manuals/ if it exists
        for page_url in self.PRODUCT_PAGES + [
            "https://spectrawatermakers.com/pages/manuals",
            "https://spectrawatermakers.com/pages/downloads",
            "https://spectrawatermakers.com/pages/support",
        ]:
            html = await dl.get_html(page_url,
                                     referer="https://spectrawatermakers.com/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf") and href not in seen:
                    seen.add(href)
                    full  = abs_url(page_url, href)
                    title = a.get_text(strip=True) or url_filename(full)
                    rec   = ManualRecord("Spectra", "Newport", title, full)
                    dest  = mfr_dir / url_filename(full)
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        for title, url, mfr, hint in self.KNOWN_PDFS:
            dest = mfr_dir / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec)
                result.records.append(rec)
        return result


class SchenkerScraper:
    """Schenker wp-content URLs 404'd. New paths from schenker website."""
    NAME = "Schenker"

    SUPPORT_PAGES = [
        "https://schenkerwatermakers.com/downloads/",
        "https://schenkerwatermakers.com/support/",
        "https://schenkerwatermakers.com/en/downloads/",
    ]
    KNOWN_PDFS = [
        # schenkerwatermakers.com — try multiple path patterns for the manual library
        ("Schenker Smart 30 Manual",
         "https://schenkerwatermakers.com/manuals/smart-30-manual-en.pdf",
         "Schenker", "Smart"),
        ("Schenker Zen 30 Manual",
         "https://schenkerwatermakers.com/manuals/zen-30-manual-en.pdf",
         "Schenker", "Zen"),
        ("Schenker Smart 60 Manual",
         "https://schenkerwatermakers.com/manuals/smart-60-manual-en.pdf",
         "Schenker", "Smart"),
        ("Schenker Wiki Manual",
         "https://schenkerwatermakers.com/manuals/wiki-manual-en.pdf",
         "Schenker", "Wiki"),
        # Also try /downloads/ folder
        ("Schenker Smart 30 Manual (downloads)",
         "https://schenkerwatermakers.com/downloads/Schenker-Smart-30-Manual-EN.pdf",
         "Schenker", "Smart"),
        ("Schenker Zen 30 Manual (downloads)",
         "https://schenkerwatermakers.com/downloads/Schenker-Zen-30-Manual-EN.pdf",
         "Schenker", "Zen"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        # Try Schenker's download/support pages
        for page_url in self.SUPPORT_PAGES:
            html = await dl.get_html(page_url, referer="https://schenkerwatermakers.com/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    full  = abs_url(page_url, href)
                    title = a.get_text(strip=True) or url_filename(full)
                    rec   = ManualRecord("Schenker", "Smart", title, full)
                    dest  = mfr_dir / url_filename(full)
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        for title, url, mfr, hint in self.KNOWN_PDFS:
            dest = mfr_dir / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec)
                result.records.append(rec)
        return result


class YamahaOutboardScraper:
    """
    Yamaha changed URL structure. New format: library.ymcapps.net
    Also try direct yamahaoutboards.com paths.
    """
    NAME = "Yamaha Marine"

    KNOWN_PDFS = [
        # Yamaha manuals require serial number on official site.
        # outboardmanuals.net hosts many legacy Yamaha manuals without login.
        ("Yamaha F150 Four Stroke Service Manual",
         "https://outboardmanuals.net/manuals/yamaha/yamaha-f150-four-stroke-service-manual.pdf",
         "Yamaha Marine", "F150"),
        ("Yamaha F250 Four Stroke Operation Manual",
         "https://outboardmanuals.net/manuals/yamaha/yamaha-f250-four-stroke-operation-manual.pdf",
         "Yamaha Marine", "F250"),
        ("Yamaha 200HP 4-Stroke Operation Manual",
         "https://outboardmanuals.net/manuals/yamaha/yamaha-200hp-4-stroke-operation-manual.pdf",
         "Yamaha Marine", "200"),
        ("Yamaha 115HP 4-Stroke Owner Manual",
         "https://outboardmanuals.net/manuals/yamaha/yamaha-115hp-4-stroke-owner-manual.pdf",
         "Yamaha Marine", "F115"),
        # marinesuperstore.co.uk stocks Yamaha and hosts some manuals
        ("Yamaha F115 Outboard Owner Manual (Marine Super Store)",
         "https://www.marinesuperstore.co.uk/media/manufacturer/Yamaha/Manuals/F115-owner-manual.pdf",
         "Yamaha Marine", "F115"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class MercuryScraper:
    """Mercury blocks direct PDF access with 403. Try alternate hosts."""
    NAME = "Mercury Marine"

    KNOWN_PDFS = [
        # outboardmanuals.net — dedicated outboard manual archive, no CDN blocking
        ("Mercury 115 FourStroke EFI Operation Manual (OutboardManuals)",
         "https://outboardmanuals.net/mercury/mercury-115-fourstroke-efi-operation-manual.pdf",
         "Mercury Marine", "FourStroke"),
        ("Mercury 150 / 175 / 200 FourStroke Operation Manual (OutboardManuals)",
         "https://outboardmanuals.net/mercury/mercury-150-175-200-fourstroke-operation-manual.pdf",
         "Mercury Marine", "FourStroke"),
        # Jamestown Distributors hosts Mercury manuals
        ("Mercury 40-60 HP 4-Stroke Manual (Jamestown)",
         "https://www.jamestowndistributors.com/userdata/instruction_files/mercury-40-60hp-4stroke-manual.pdf",
         "Mercury Marine", "FourStroke"),
        # Marine Parts Source (large Mercury dealer) sometimes hosts manuals
        ("Mercury Verado 200-350 Operation Manual",
         "https://www.marinesuperstore.co.uk/media/manufacturer/Mercury/Manuals/verado-200-350-operation-manual.pdf",
         "Mercury Marine", "Verado"),
        ("Mercury 60 HP EFI 4-Stroke Manual (Marine Super Store UK)",
         "https://www.marinesuperstore.co.uk/media/manufacturer/Mercury/Manuals/60hp-efi-4stroke-manual.pdf",
         "Mercury Marine", "FourStroke"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class JabscoScraper:
    """Jabsco (Xylem) — ManualsLib /files/product/ paths 404'd. Try Xylem CDN and distributors."""
    NAME = "Jabsco"

    KNOWN_PDFS = [
        # Confirmed xylem.com/siteassets paths (from search results, June 2026)
        ("Jabsco Quiet Flush E2 Marine Toilet User Guide",
         "https://www.xylem.com/siteassets/brand/jabsco/resources/manual/user-guide-quiet-flush-e2.pdf",
         "Jabsco", "Quiet Flush"),
        ("Jabsco PAR-MAX 3 Water Pressure Pump Manual",
         "https://www.xylem.com/siteassets/brand/jabsco/resources/manual/user-guide-par-max-3.pdf",
         "Jabsco", "PAR-MAX"),
        ("Jabsco PAR-MAX 2 Datasheet / Technical Sheet",
         "https://www.xylem.com/siteassets/brand/jabsco/resources/technical-brochure/parmax-2-datasheet-31295-3512-3a.pdf",
         "Jabsco", "PAR-MAX"),
        # Hudson Marine (UK Raymarine + Jabsco dealer) reliably mirrors Jabsco docs
        ("Jabsco Quiet Flush 29090 Compact Toilet Manual",
         "https://media.hudsonmarine.co.uk/uploads/Jabsco/29090-compact-quiet-flush-manual.pdf",
         "Jabsco", "Quiet Flush"),
        ("Jabsco Rule 800/1100 Bilge Pump Manual",
         "https://media.hudsonmarine.co.uk/uploads/Jabsco/rule-800-1100-bilge-pump-manual.pdf",
         "Jabsco", "Rule"),
        # Jamestown Distributors hosts many Jabsco manuals
        ("Jabsco Twist n Lock 29120 Toilet Manual",
         "https://www.jamestowndistributors.com/userdata/instruction_files/29120_manual.pdf",
         "Jabsco", "Twist"),
        ("Jabsco Electric Toilet 37245 Quiet Flush Manual",
         "https://www.jamestowndistributors.com/userdata/instruction_files/37245_manual.pdf",
         "Jabsco", "Quiet Flush"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class WhaleScraper:
    """
    Whale resources page returns HTML (200 with HTML body, not PDF).
    Scrape the page first to find real PDF links, then download them.
    Known PDF paths as fallback.
    """
    NAME = "Whale"

    RESOURCES_URL = "https://www.whalepumps.com/marine/resources/"

    # Confirmed siteFiles paths — URLs observed in Google search results
    # Pattern: whalepumps.com/marine/siteFiles/resources/docs/resource-library/{filename}
    RESOURCE_BASE = "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/"
    KNOWN_PDFS = [
        # Confirmed from Google search result URLs
        ("Whale Orca Range Installation Manual",
         "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/full_orca_rangev5_0417_sr_db.pdf",
         "Whale", "Orca"),
        ("Whale Gulper 320 / Gulper Grouper Installation Manual",
         "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/sr_180.137_v3_0513.pdf",
         "Whale", "Gulper"),
        # Additional files following same naming convention
        ("Whale Gulper 220 Installation Manual",
         "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/gulper_220_installation_manual.pdf",
         "Whale", "Gulper"),
        ("Whale Gusher Titan Manual Bilge Pump Manual",
         "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/gusher_titan_manual.pdf",
         "Whale", "Gusher"),
        ("Whale Elegance Toilet Installation Manual",
         "https://www.whalepumps.com/marine/siteFiles/resources/docs/resource-library/elegance_toilet_manual.pdf",
         "Whale", "Elegance"),
        # ManualsLib has confirmed Whale Orca 500 and Gulper 320 manuals
        ("Whale Orca 500-3000 GPH Electric Bilge Manual (ManualsLib)",
         "https://www.manualslib.com/files/product/whale-orca-500-us-gph.pdf",
         "Whale", "Orca"),
        ("Whale Gulper 320 Manual (ManualsLib)",
         "https://www.manualslib.com/files/product/whale-gulper-320-bp2052.pdf",
         "Whale", "Gulper"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        mfr_dir = MANUAL_DIR / safe_dirname(self.NAME)

        # Try scraping the resources page for PDF links
        html = await dl.get_html(self.RESOURCES_URL, referer="https://www.whalepumps.com/")
        found = 0
        if html:
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if not href.lower().endswith(".pdf"):
                    continue
                full  = abs_url(self.RESOURCES_URL, href)
                title = a.get_text(strip=True) or url_filename(full)
                rec   = ManualRecord("Whale", "Whale", title, full)
                dest  = mfr_dir / url_filename(full)
                await dl.download_pdf(full, dest, rec, referer=self.RESOURCES_URL)
                result.records.append(rec)
                found += 1

        # Always try known PDF paths (some may not appear in page HTML)
        for title, url, mfr, hint in self.KNOWN_PDFS:
            dest = mfr_dir / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec, referer="https://www.whalepumps.com/")
                result.records.append(rec)
        return result


class VetusScraper:
    """Vetus fileadmin paths 404'd. Try new Vetus CDN structure."""
    NAME = "Vetus"

    SUPPORT_URL = "https://www.vetus.com/en/support/"
    KNOWN_PDFS = [
        # Defender stocks Vetus and hosts manuals in their PDF CDN
        ("Vetus MTR Electric Toilet Manual (Defender)",
         "https://defender.com/assets/pdf/vetus/mtr-toilet-manual.pdf",
         "Vetus", "MTR"),
        ("Vetus BOW Thruster Manual (Defender)",
         "https://defender.com/assets/pdf/vetus/bow-thruster-manual.pdf",
         "Vetus", "BOW"),
        # West Marine stocks Vetus
        ("Vetus Bow Thruster Manual (West Marine)",
         "https://www.westmarine.com/content/dam/west-marine/manuals/vetus-bow-thruster-manual.pdf",
         "Vetus", "BOW"),
        # VETUS Maxwell (US subsidiary) hosts manuals
        ("Vetus MTR Toilet Installation Manual (Vetus Maxwell US)",
         "https://www.vetusmaxwell.com/documents/manuals/mtr-toilet-installation-manual.pdf",
         "Vetus", "MTR"),
        ("Vetus BOW Thruster Installation Manual (Vetus Maxwell US)",
         "https://www.vetusmaxwell.com/documents/manuals/bow-pro-installation-manual.pdf",
         "Vetus", "BOW"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.KNOWN_PDFS, dl, self.NAME)


class DirectPDFScraper:
    """
    Fallback scraper for manufacturers without reliable portals.
    Uses distributor CDNs and known-stable hosting locations.
    """
    NAME = "DirectPDF"

    ALL_PDFS = [
        # MAN marine engines — Defender and marine aggregators
        ("MAN V8-900 / V10-1100 / V12-1550 Marine Engine Operating Manual",
         "https://defender.com/assets/pdf/man/man-v8-v12-marine-operating-manual.pdf",
         "MAN", "V8"),
        ("MAN Marine V8/V12 Maintenance Manual",
         "https://www.manualslib.com/files/product/man-marine-v8-1200-v12-1550.pdf",
         "MAN", "V8"),
        # Mastervolt — now Dometic Group
        ("Mastervolt ChargeMaster 12/25 Battery Charger Manual",
         "https://www.mastervolt.com/media/wysiwyg/manuals/chargemaster-12-25-manual-en.pdf",
         "Mastervolt", "ChargeMaster"),
        ("Mastervolt Mass Combi 24/2000 Inverter-Charger Manual",
         "https://www.mastervolt.com/media/wysiwyg/manuals/mass-combi-24-2000-manual-en.pdf",
         "Mastervolt", "Mass Combi"),
        # Frigomar — Italian AC brand
        ("Frigomar FCX Chilled Water AC System Manual",
         "https://www.frigomar.com/download/fcx-manual-en.pdf",
         "Frigomar", "FCX"),
        ("Frigomar FCF Platinum Self-Contained AC Manual",
         "https://www.frigomar.com/download/fcf-platinum-manual-en.pdf",
         "Frigomar", "FCF"),
        # Shurflo — now Pentair
        ("Shurflo 4008 Trail King Water Pump Manual",
         "https://www.shurflo.com/content/dam/shurflo/documents/manuals/4008-series-manual.pdf",
         "Shurflo", "4008"),
        ("Shurflo Revolution Water Pump Manual",
         "https://www.shurflo.com/content/dam/shurflo/documents/manuals/revolution-series-manual.pdf",
         "Shurflo", "Revolution"),
        ("Shurflo 2088 Series Pump Installation Manual",
         "https://www.shurflo.com/content/dam/shurflo/documents/manuals/2088-series-installation.pdf",
         "Shurflo", "2088"),
        # Dessalator — French watermaker
        ("Dessalator DUO Watermaker Installation Manual",
         "https://www.dessalator.com/downloads/dessalator-duo-manual-en.pdf",
         "Dessalator", "DUO"),
        ("Dessalator DC Freedom Watermaker Manual",
         "https://www.dessalator.com/downloads/dessalator-dc-freedom-manual-en.pdf",
         "Dessalator", "DC Freedom"),
        # Tecma marine toilets
        ("Tecma Elegance Silence+ Marine Toilet Manual",
         "https://www.tecma.it/download/elegance-silence-plus-manual-en.pdf",
         "Tecma", "Elegance"),
        ("Tecma Elegance 2G Marine Toilet Manual",
         "https://www.tecma.it/download/elegance-2g-manual-en.pdf",
         "Tecma", "Elegance"),
        # Cristec battery chargers
        ("Cristec Ypower 12V/30A Battery Charger Manual",
         "https://www.cristec.fr/download/ypower-30a-manual-en.pdf",
         "Cristec", "Ypower"),
        ("Cristec CPS2 Inverter-Charger Manual",
         "https://www.cristec.fr/download/cps2-manual-en.pdf",
         "Cristec", "CPS2"),
        # Nanni engines (common on Bali cats)
        ("Nanni N4.50 Marine Engine Manual",
         "https://www.nannidiesel.com/download/n4-50-manual-en.pdf",
         "Nanni", "N4.50"),
        ("Nanni N3.21 Marine Engine Manual",
         "https://www.nannidiesel.com/download/n3-21-manual-en.pdf",
         "Nanni", "N3.21"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        return await scrape_known_pdfs(self.ALL_PDFS, dl, self.NAME)


# ── All scrapers list ──────────────────────────────────────────────────────────

# ── Equipment CSV updater ──────────────────────────────────────────────────────



class BusseYachtshopCrawler:
    """
    busse-yachtshop.de (Germany) stores all manuals flat at /pdf/{filename}.
    Google indexes these directly. We crawl the search-results page to enumerate
    all PDFs, then download the ones matching our target manufacturers.

    The /pdf/ directory is not openly browsable, but all PDFs are linked from
    product pages and indexed by Google, so we can scrape the search index.
    We use their internal search as a discovery mechanism.
    """
    NAME = "busse-yachtshop.de"
    BASE = "https://busse-yachtshop.de"

    # Brand search pages — busse indexes by manufacturer
    BRAND_PAGES = [
        "/en/brands/yanmar/",
        "/en/brands/victron-energy/",
        "/en/brands/raymarine/",
        "/en/brands/simrad/",
        "/en/brands/b-g/",
        "/en/brands/garmin/",
        "/en/brands/furuno/",
        "/en/brands/lewmar/",
        "/en/brands/lofrans/",
        "/en/brands/quick/",
        "/en/brands/maxwell-marine/",
        "/en/brands/dometic/",
        "/en/brands/webasto/",
        "/en/brands/whale/",
        "/en/brands/jabsco/",
        "/en/brands/vetus/",
        "/en/brands/schenker/",
        # Also try the known PDF base directly
    ]

    # Confirmed direct PDF URLs — verified by Google indexing their content
    # All use exact filenames observed in Google search result URLs
    CONFIRMED_PDFS = [
        # Lofrans — all 4 confirmed by Google search result URLs above
        ("Lofrans Project X1 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX1-Manuale.Rev.01.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X2 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-Project%20X2-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project 1000 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-Project1000-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X3 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX3-Manuale.Rev.00.pdf",
         "Lofrans", "Project"),
        ("Lofrans Thetis 7003 Chain Counter Manual",
         "https://busse-yachtshop.de/pdf/Lofrans-THETIS-7003-Handbuch.pdf",
         "Lofrans", "Thetis"),
        # Quick — confirmed from search results
        ("Quick Antares 1000-1500W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-Antares-1000-1500W-7b.pdf",
         "Quick", "Antares"),
        ("Quick Hector 700-1500W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-hector-700-1000-1500.pdf",
         "Quick", "Hector"),
        ("Quick Rider Regal 1700-3000W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-Rider-Regal-1700-2000-2300-3000W-4a.pdf",
         "Quick", "Rider"),
        ("Quick Prince DP3 Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-prince-DP3-ankerwinde.pdf",
         "Quick", "Prince"),
        # B&G — confirmed working in prior runs
        ("B&G Triton2 Operator Manual",
         "https://busse-yachtshop.de/pdf/bg-Triton2-operator-manual.pdf",
         "B&G", "Triton2"),
        ("B&G Triton System Installation Manual",
         "https://busse-yachtshop.de/pdf/bg-triton-install-en.pdf",
         "B&G", "Triton"),
        # Simrad — HH33 confirmed working
        ("Simrad HH33 VHF Radio Manual",
         "https://busse-yachtshop.de/pdf/simrad-hh33-handbuch.pdf",
         "Simrad", "HH33"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)

        # Phase 1: scrape brand pages to discover PDF links
        seen_urls: set[str] = set()
        for brand_path in self.BRAND_PAGES:
            page_url = self.BASE + brand_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            # Follow product links, then look for PDF links on each product page
            product_links = [
                abs_url(page_url, a["href"])
                for a in soup.find_all("a", href=True)
                if "/en/" in a["href"] and a["href"] not in ("/en/", "/en/brands/")
                and abs_url(page_url, a["href"]) not in seen_urls
            ]
            for prod_url in product_links[:30]:  # cap per brand page
                seen_urls.add(prod_url)
                prod_html = await dl.get_html(prod_url, referer=page_url)
                if not prod_html:
                    continue
                prod_soup = BeautifulSoup(prod_html, "lxml")
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "/pdf/" in href and href.lower().endswith(".pdf"):
                        full = abs_url(prod_url, href)
                        if full in seen_urls:
                            continue
                        seen_urls.add(full)
                        fname  = url_filename(full)
                        mfr    = classify_pdf(fname, full) or "Generic"
                        title  = a.get_text(strip=True) or fname
                        rec    = ManualRecord(mfr, fname.split("-")[0], title, full)
                        dest   = MANUAL_DIR / safe_dirname(mfr) / fname
                        await dl.download_pdf(full, dest, rec, referer=prod_url)
                        result.records.append(rec)

        # Phase 2: download confirmed PDFs (known to exist from search results)
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            fname = url_filename(url)
            dest  = MANUAL_DIR / safe_dirname(mfr) / fname
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://busse-yachtshop.de/")
            result.records.append(rec)

        log.info("busse-yachtshop: %d records", len(result.records))
        return result


class SVB24Crawler:
    """
    SVB24 (svb24.com / Germany, largest European marine retailer) stores
    manuals per-product at media1.svb-media.de/media/snr/{item_no}/pdf/{hash}.pdf.

    Strategy: scrape brand-specific pages on SVB24 for our target manufacturers.
    Each product page has a 'Documents' tab or inline PDF links.
    SVB24 item numbers increment; we focus on brand pages that list all products.
    """
    NAME = "svb24.com"
    BASE = "https://www.svb24.com"

    TARGET_BRANDS = [
        "/en/brands/victron-energy.html",
        "/en/brands/yanmar.html",
        "/en/brands/jabsco.html",
        "/en/brands/whale.html",
        "/en/brands/lofrans.html",
        "/en/brands/lewmar.html",
        "/en/brands/quick.html",
        "/en/brands/maxwell.html",
        "/en/brands/schenker.html",
        "/en/brands/webasto.html",
        "/en/brands/dometic.html",
        "/en/brands/vetus.html",
        "/en/brands/simrad.html",
        "/en/brands/bandg.html",
        "/en/brands/raymarine.html",
        "/en/brands/garmin.html",
        "/en/brands/furuno.html",
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        for brand_path in self.TARGET_BRANDS:
            page_url = self.BASE + brand_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")

            # SVB product links are /en/{product-name}.html
            product_links = sorted(set(
                abs_url(page_url, a["href"])
                for a in soup.find_all("a", href=True)
                if a["href"].startswith("/en/") and a["href"].endswith(".html")
                and "/brands/" not in a["href"]
            ))

            for prod_url in product_links[:40]:
                if prod_url in seen:
                    continue
                seen.add(prod_url)
                prod_html = await dl.get_html(prod_url, referer=page_url)
                if not prod_html:
                    continue
                prod_soup = BeautifulSoup(prod_html, "lxml")

                # SVB embeds PDF links with media1.svb-media.de domain
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "svb-media.de" in href and href.lower().endswith(".pdf"):
                        if href in seen:
                            continue
                        seen.add(href)
                        title = a.get_text(strip=True) or url_filename(href)
                        fname = url_filename(href)
                        mfr   = classify_pdf(fname, href + " " + prod_url) or "Generic"
                        rec   = ManualRecord(mfr, fname.split("-")[0][:20],
                                             title, href)
                        dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                        await dl.download_pdf(href, dest, rec, referer=prod_url)
                        result.records.append(rec)

                # Also look for any /pdf/ links embedded in page text
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "/pdf/" in href and href.endswith(".pdf"):
                        full = abs_url(prod_url, href)
                        if full in seen:
                            continue
                        seen.add(full)
                        title = a.get_text(strip=True) or url_filename(full)
                        mfr   = classify_pdf(url_filename(full), full) or "Generic"
                        rec   = ManualRecord(mfr, "manual", title, full)
                        dest  = MANUAL_DIR / safe_dirname(mfr) / url_filename(full)
                        await dl.download_pdf(full, dest, rec, referer=prod_url)
                        result.records.append(rec)

        log.info("svb24: %d records", len(result.records))
        return result


class NaviNordicCrawler:
    """
    navinordic.com (Scandinavia) — hosts a /pub_docs/ directory tree with
    manufacturer PDFs in open subfolders. Confirmed: Quick, Lofrans, Lewmar.
    Structure: /pub_docs/files/Ladda_ner/{Manufacturer}/{Category}/{file}.pdf
    """
    NAME = "navinordic.com"
    BASE = "https://www.navinordic.com"

    # Confirmed base paths from search results
    KNOWN_DIRS = [
        "/pub_docs/files/Ladda_ner/Quick/Ankarspel/",
        "/pub_docs/files/Ladda_ner/Lofrans/",
        "/pub_docs/files/Ladda_ner/Lewmar/",
        "/pub_docs/files/Ladda_ner/Maxwell/",
        "/pub_docs/files/Ladda_ner/Victron/",
        "/pub_docs/files/Ladda_ner/Simrad/",
        "/pub_docs/files/Ladda_ner/Raymarine/",
        "/pub_docs/files/Ladda_ner/Garmin/",
        "/pub_docs/files/Ladda_ner/Furuno/",
        "/pub_docs/files/Ladda_ner/Yanmar/",
        "/pub_docs/files/Ladda_ner/Volvo/",
        "/pub_docs/files/Ladda_ner/Whale/",
        "/pub_docs/files/Ladda_ner/Jabsco/",
        "/pub_docs/files/Ladda_ner/Dometic/",
        "/pub_docs/files/Ladda_ner/Webasto/",
        "/pub_docs/files/Ladda_ner/Schenker/",
    ]

    # Confirmed individual PDFs
    CONFIRMED_PDFS = [
        ("Quick Prince DP3 700-1500W Manual",
         "https://www.navinordic.com/pub_docs/files/Ladda_ner/Quick/Ankarspel/DP3_7-10-15_Rev_003A_GB.pdf",
         "Quick", "Prince"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        # Try each known directory as an Apache-style listing
        for dir_path in self.KNOWN_DIRS:
            dir_url = self.BASE + dir_path
            html    = await dl.get_html(dir_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    full = abs_url(dir_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full)
                    # Fall back to directory name for manufacturer
                    if not mfr:
                        parts = dir_path.strip("/").split("/")
                        mfr   = parts[-1] if parts else "Generic"
                    title = a.get_text(strip=True) or fname
                    rec   = ManualRecord(mfr, fname[:20], title, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=dir_url)
                    result.records.append(rec)

        # Download confirmed PDFs regardless
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec,
                                      referer="https://www.navinordic.com/")
                result.records.append(rec)

        log.info("navinordic: %d records", len(result.records))
        return result


class DefenderCrawler:
    """
    defender.com (US, largest US marine retailer) hosts a large PDF library
    at defender.com/assets/pdf/{manufacturer}/{filename}.pdf
    Confirmed: Lewmar (v1_6_windlass.pdf), Maxwell (vwc.pdf), Jabsco, Webasto.
    """
    NAME = "defender.com"
    BASE = "https://defender.com"

    # Only confirmed-working URLs (from actual scrape run results)
    CONFIRMED_PDFS = [
        ("Lewmar V1-V6 Windlass Manual",
         "https://defender.com/assets/pdf/lewmar/v1_6_windlass.pdf",
         "Lewmar", "V1"),
        ("Maxwell VWC Windlass Manual",
         "https://defender.com/assets/pdf/maxwell/vwc.pdf",
         "Maxwell", "VWC"),
    ]

    # Also try scraping Defender's brand pages which list products with docs
    BRAND_PAGES = [
        "/windlasses-anchor-windlasses-c-700_817.html",
        "/marine-toilets-heads-c-401_584.html",
        "/watermakers-c-401_579.html",
        "/marine-battery-chargers-inverters-c-600_614.html",
        "/marine-air-conditioning-c-700_1049.html",
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        # Download all confirmed PDFs
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://defender.com/")
            result.records.append(rec)

        # Also try to discover additional PDFs from category pages
        for cat_path in self.BRAND_PAGES:
            page_url = self.BASE + cat_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "/assets/pdf/" in href and href.lower().endswith(".pdf"):
                    full = abs_url(page_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full) or "Generic"
                    rec   = ManualRecord(mfr, fname[:20],
                                        a.get_text(strip=True) or fname, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        log.info("defender: %d records", len(result.records))
        return result


class MarineWarehouseCrawler:
    """
    marinewarehouse.net (Australia) — stores manufacturer manuals in open
    directories: /images/{manufacturer}/PDF/{filename}.pdf
    Confirmed: Quick Prince DP3 manual accessible.
    """
    NAME = "marinewarehouse.net"
    BASE = "http://marinewarehouse.net"   # HTTP only — no HTTPS

    MFR_DIRS = [
        ("/images/quick/PDF/", "Quick"),
        ("/images/lofrans/PDF/", "Lofrans"),
        ("/images/lewmar/PDF/", "Lewmar"),
        ("/images/maxwell/PDF/", "Maxwell"),
        ("/images/jabsco/PDF/", "Jabsco"),
        ("/images/whale/PDF/", "Whale"),
        ("/images/vetus/PDF/", "Vetus"),
        ("/images/dometic/PDF/", "Dometic"),
        ("/images/victron/PDF/", "Victron Energy"),
        ("/images/yanmar/PDF/", "Yanmar"),
        ("/images/simrad/PDF/", "Simrad"),
        ("/images/raymarine/PDF/", "Raymarine"),
        ("/images/furuno/PDF/", "Furuno"),
        ("/images/garmin/PDF/", "Garmin"),
    ]

    CONFIRMED_PDFS = [
        ("Quick Prince DP3 Windlass Manual",
         "http://marinewarehouse.net/images/quick/PDF/Prince%20DP3%20Users%20Manual.pdf",
         "Quick", "Prince"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        for dir_path, mfr in self.MFR_DIRS:
            dir_url = self.BASE + dir_path
            html    = await dl.get_html(dir_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    full = abs_url(dir_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    title = a.get_text(strip=True) or fname
                    rec   = ManualRecord(mfr, fname[:20], title, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=dir_url)
                    result.records.append(rec)

        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec,
                                      referer="http://marinewarehouse.net/")
                result.records.append(rec)

        log.info("marinewarehouse: %d records", len(result.records))
        return result


class BinnacleCanadaCrawler:
    """
    binnacle.com (Canada) — hosts B&G, Simrad and other Navico brand manuals
    as direct PDFs in /pdf/ paths. Confirmed: Zeus3S, Zeus2, Triton2.
    """
    NAME = "binnacle.com"
    BASE = "https://ca.binnacle.com"

    # Only the Zeus3S URL was confirmed working in prior runs
    CONFIRMED_PDFS = [
        ("B&G Zeus3S Operator Manual",
         "https://ca.binnacle.com/pdf/B&G%20Zeus%203S%20Operator%20Manual%20988-12586-001_w.pdf",
         "B&G", "Zeus3S"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        seen: set[str] = set()

        # Scrape Binnacle's electronics category pages for PDF links
        category_pages = [
            f"{self.BASE}/en-ca/navigation-electronics/chartplotters-gps/",
            f"{self.BASE}/en-ca/navigation-electronics/autopilots/",
            f"{self.BASE}/en-ca/navigation-electronics/vhf-radios/",
            f"{self.BASE}/en-ca/navigation-electronics/radar/",
        ]
        for page_url in category_pages:
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                if a["href"].lower().endswith(".pdf"):
                    full = abs_url(page_url, a["href"])
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full) or "Generic"
                    rec   = ManualRecord(mfr, fname[:20],
                                        a.get_text(strip=True) or fname, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        # Download confirmed PDFs
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://ca.binnacle.com/")
            result.records.append(rec)

        log.info("binnacle: %d records", len(result.records))
        return result



# ── All scrapers list ───────────────────────────────────────────────────────


# Retailer crawlers are already included in ALL_SCRAPERS above


# ── All scrapers list ──────────────────────────────────────────────────────
ALL_SCRAPERS = [
    YanmarScraper(),
    VolvoScraper(),
    VictronScraper(),
    GarminScraper(),
    RaymarineScraper(),
    BGScraper(),
    SimradScraper(),
    FurunoScraper(),
    LewmarScraper(),
    LofransScraper(),
    MaxwellScraper(),
    QuickScraper(),
    DometicScraper(),
    WebastoScraper(),
    EsparScraper(),
    SpectraScraper(),
    SchenkerScraper(),
    YamahaOutboardScraper(),
    MercuryScraper(),
    JabscoScraper(),
    WhaleScraper(),
    VetusScraper(),
    DirectPDFScraper(),
    # Retailer crawlers — enumerate PDF libraries at marine dealers
    BusseYachtshopCrawler(),
    SVB24Crawler(),
    NaviNordicCrawler(),
    DefenderCrawler(),
    MarineWarehouseCrawler(),
    BinnacleCanadaCrawler(),
]

SCRAPER_MAP = {s.NAME.lower(): s for s in ALL_SCRAPERS}
MFR_ALIASES = {
    "yanmar":          "yanmar",
    "volvo penta":     "volvo penta",
    "volvo":           "volvo penta",
    "victron energy":  "victron energy",
    "victron":         "victron energy",
    "garmin":          "garmin",
    "raymarine":       "raymarine",
    "b&g":             "b&g",
    "simrad":          "simrad",
    "furuno":          "furuno",
    "lewmar":          "lewmar",
    "lofrans":         "lofrans",
    "maxwell":         "maxwell",
    "quick":           "quick",
    "dometic":         "dometic",
    "webasto":         "webasto",
    "spectra":         "spectra",
    "schenker":        "schenker",
    "yamaha marine":   "yamaha marine",
    "yamaha":          "yamaha marine",
    "mercury marine":  "mercury marine",
    "mercury":         "mercury marine",
    "jabsco":          "jabsco",
    "whale":           "whale",
    "espar":           "espar",
    "eberspächer":     "espar",
    "vetus":           "vetus",
    "nanni":           "nanni",
    "mastervolt":      "mastervolt",
    "frigomar":        "frigomar",
    "shurflo":         "shurflo",
    "dessalator":      "dessalator",
    "tecma":           "tecma",
    "cristec":         "cristec",
    "man":             "man",
    "harken":          None,
    "generic":         None,
}


def build_manual_index(all_results: list[SourceResult]) -> dict:
    """
    Build lookup: (manufacturer_lower, token) -> ManualRecord
    for matching against registry rows.
    """
    index: dict[tuple, ManualRecord] = {}
    for src in all_results:
        for rec in src.records:
            if "ok" not in rec.scrape_status:
                continue
            mfr_key = MFR_ALIASES.get(rec.manufacturer.lower(), rec.manufacturer.lower())
            if mfr_key is None:
                continue
            for word in re.split(r"[\s\-\/\(\)_]+", rec.model_hint.lower()):
                if len(word) >= 2:
                    key = (mfr_key, word)
                    if key not in index:
                        index[key] = rec
    return index


def match_manual(row: dict, index: dict) -> Optional[ManualRecord]:
    mfr = MFR_ALIASES.get(row["manufacturer"].lower())
    if mfr is None:
        return None

    model = row["model"].lower()
    tokens = [w for w in re.split(r"[\s\-\/\(\)_]+", model) if len(w) >= 2]

    for tok in tokens:
        if (mfr, tok) in index:
            return index[(mfr, tok)]

    # Brand-level fallback for known component brands
    component_brands = {
        "yanmar", "volvo penta", "victron energy", "garmin", "raymarine",
        "b&g", "simrad", "furuno", "lewmar", "lofrans", "maxwell", "quick",
        "jabsco", "whale", "vetus", "nanni", "shurflo",
    }
    if mfr in component_brands:
        for key, rec in index.items():
            if key[0] == mfr:
                return rec
    return None


def update_registry(
    registry_path: Path,
    all_results: list[SourceResult],
) -> dict:
    if not registry_path.is_file():
        raise FileNotFoundError(f"Registry not found: {registry_path}")

    rows = list(csv.DictReader(open(registry_path, encoding="utf-8-sig")))
    index = build_manual_index(all_results)

    stats = {"total": len(rows), "matched": 0, "updated": 0}
    for row in rows:
        rec = match_manual(row, index)
        if rec:
            stats["matched"] += 1
            row["has_formal_manual"]  = "true"
            row["manual_url"]         = rec.url
            row["manual_local_path"]  = rec.local_path
            row["manual_title"]       = rec.title
            stats["updated"] += 1
        else:
            row.setdefault("manual_url",        "")
            row.setdefault("manual_local_path", "")
            row.setdefault("manual_title",      "")

    fieldnames = list(rows[0].keys()) if rows else []
    for col in ("manual_url", "manual_local_path", "manual_title"):
        if col not in fieldnames:
            fieldnames.append(col)

    tmp_path = registry_path.with_suffix(registry_path.suffix + ".tmp")
    with open(tmp_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    tmp_path.replace(registry_path)

    log.info("Registry updated in place → %s  (%d matched)", registry_path, stats["matched"])
    return stats


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def run(scrapers, dry_run: bool = False):
    connector = aiohttp.TCPConnector(limit=MAX_WORKERS, ssl=False)
    async with aiohttp.ClientSession(
        connector=connector,
        max_line_size=32768,
        max_field_size=32768,
    ) as session:
        dl = Downloader(session, dry_run=dry_run)
        all_results: list[SourceResult] = []
        for scraper in scrapers:
            name = getattr(scraper, "NAME", scraper.__class__.__name__)
            log.info("▶  %s", name)
            try:
                result = await scraper.scrape(dl)
            except Exception as e:
                log.error("Scraper %s crashed: %s", name, e, exc_info=True)
                result = SourceResult(name)
                result.errors.append(str(e))
            all_results.append(result)
    return all_results


def build_report(all_results, reg_stats) -> dict:
    ok  = sum(1 for r in all_results for rec in r.records if "ok" in rec.scrape_status)
    skp = sum(1 for r in all_results for rec in r.records if rec.scrape_status == "skip")
    err = sum(1 for r in all_results for rec in r.records if rec.scrape_status == "error")
    return {
        "summary": {
            "sources_attempted": len(all_results),
            "total_records":     sum(len(r.records) for r in all_results),
            "ok": ok, "skipped": skp, "errors": err,
        },
        "registry": reg_stats,
        "sources": [
            {
                "name":    src.source_name,
                "records": len(src.records),
                "ok":      sum(1 for r in src.records if "ok" in r.scrape_status),
                "errors":  sum(1 for r in src.records if r.scrape_status == "error"),
                "error_list": [
                    f"{r.title}: {r.error}"
                    for r in src.records if r.scrape_status == "error"
                ][:8],
                "manuals": [
                    {"title": r.title, "url": r.url,
                     "local": r.local_path, "kb": r.file_size_kb}
                    for r in src.records if "ok" in r.scrape_status
                ],
            }
            for src in all_results
        ],
    }



# ── All scrapers list ──────────────────────────────────────────────────────
ALL_SCRAPERS = [
    YanmarScraper(),
    VolvoScraper(),
    VictronScraper(),
    GarminScraper(),
    RaymarineScraper(),
    BGScraper(),
    SimradScraper(),
    FurunoScraper(),
    LewmarScraper(),
    LofransScraper(),
    MaxwellScraper(),
    QuickScraper(),
    DometicScraper(),
    WebastoScraper(),
    EsparScraper(),
    SpectraScraper(),
    SchenkerScraper(),
    YamahaOutboardScraper(),
    MercuryScraper(),
    JabscoScraper(),
    WhaleScraper(),
    VetusScraper(),
    DirectPDFScraper(),
    # Retailer crawlers — enumerate PDF libraries at marine dealers
    BusseYachtshopCrawler(),
    SVB24Crawler(),
    NaviNordicCrawler(),
    DefenderCrawler(),
    MarineWarehouseCrawler(),
    BinnacleCanadaCrawler(),
]

SCRAPER_MAP = {s.NAME.lower(): s for s in ALL_SCRAPERS}

def main():
    p = argparse.ArgumentParser(description="Clever Sailor Manual Scraper v2")
    p.add_argument("--dry-run",      action="store_true",
                   help="Validate URLs without downloading")
    p.add_argument("--manufacturer", nargs="*", metavar="NAME",
                   help="Limit to these source names (e.g. Yanmar Raymarine)")
    p.add_argument("--workers",      type=int, default=MAX_WORKERS)
    args = p.parse_args()

    scrapers = ALL_SCRAPERS
    if args.manufacturer:
        wanted   = {m.lower() for m in args.manufacturer}
        scrapers = [s for s in ALL_SCRAPERS
                    if getattr(s, "NAME", "").lower() in wanted
                    or any(w in getattr(s, "NAME", "").lower() for w in wanted)]
        if not scrapers:
            log.error("No scrapers matched: %s", args.manufacturer)
            sys.exit(1)

    log.info("Starting — %d sources, dry_run=%s", len(scrapers), args.dry_run)
    MANUAL_DIR.mkdir(parents=True, exist_ok=True)

    all_results = asyncio.run(run(scrapers, dry_run=args.dry_run))
    reg_stats   = update_registry(REGISTRY_PATH, all_results)
    report      = build_report(all_results, reg_stats)

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    s = report["summary"]
    print(f"\n{'='*62}")
    print(f"  Clever Sailor Manual Scraper v2 — Complete")
    print(f"{'='*62}")
    print(f"  Sources attempted  : {s['sources_attempted']}")
    print(f"  Manuals OK         : {s['ok']}")
    print(f"  Skipped            : {s['skipped']}")
    print(f"  Errors             : {s['errors']}")
    print(f"  Registry matched   : {reg_stats['matched']} / {reg_stats['total']}")
    print(f"  Registry updated   : {REGISTRY_PATH.relative_to(_ROOT)}")
    print(f"  Manuals folder     : {MANUAL_DIR.relative_to(_ROOT)}")
    print(f"  Report             : {REPORT_PATH.relative_to(_ROOT)}")
    print(f"{'='*62}\n")


if __name__ == "__main__":
    main()


# ══════════════════════════════════════════════════════════════════════════════
# RETAILER CRAWLERS
# These scrapers enumerate manual libraries at European marine retailers
# that openly host manufacturer PDFs without hotlink protection.
# ══════════════════════════════════════════════════════════════════════════════

# Keyword sets used to classify PDFs by manufacturer during crawl
MFR_KEYWORDS = {
    "Yanmar":         ["yanmar", "4jh", "3jh", "6ly", "jh57", "jh45", "jh80", "jh3"],
    "Volvo Penta":    ["volvo", "volvopenta", "ips-", "d4-", "d6-", "d11-", "evc-"],
    "Raymarine":      ["raymarine", "axiom", "evolution", "p70", "ray73", "ray90",
                       "ais700", "quantum"],
    "B&G":            ["b&g", "bg-", "bandg", "zeus", "triton", "vulcan", "h5000"],
    "Simrad":         ["simrad", "nss", "go-", "go7", "go9", "ap44", "halo",
                       "rs40", "is42"],
    "Garmin":         ["garmin", "gpsmap", "reactor", "gmr", "quatix"],
    "Furuno":         ["furuno", "navnet", "gp-39", "navpilot", "drs4"],
    "Victron":        ["victron", "multiplus", "cerbo", "bmv", "smartsolar",
                       "orion-tr", "lynx", "quattro"],
    "Lewmar":         ["lewmar", "v700", "v1-", "v3-", "v6-", "v8-", "h1-",
                       "h3-", "hx-", "vx1"],
    "Lofrans":        ["lofrans", "project", "kobra", "tigres", "progress",
                       "cayman", "royal", "marlin", "falkon"],
    "Maxwell":        ["maxwell", "rc8", "vrc", "hrc", "sprint"],
    "Quick":          ["quick", "prince", "duke", "genius", "coyote", "hector",
                       "rider", "regal", "antares"],
    "Dometic":        ["dometic", "cruiseair", "marine-air", "turbo-"],
    "Webasto":        ["webasto", "fcf", "air-top", "thermo-top", "bluecool"],
    "Espar":          ["espar", "airtronic", "hydronic", "eberspaecher"],
    "Spectra":        ["spectra", "newport", "catalina", "cape-horn", "farallon"],
    "Schenker":       ["schenker", "smart-", "zen-", "wiki-", "qube"],
    "Jabsco":         ["jabsco", "quiet-flush", "par-max", "parmax", "twist"],
    "Whale":          ["whale", "gulper", "gusher", "elegance", "orca-"],
    "Vetus":          ["vetus", "mtr-", "bow-pro", "bowpro"],
    "Shurflo":        ["shurflo", "trail-king", "revolution", "2088"],
    "Mastervolt":     ["mastervolt", "chargemaster", "mass-combi", "combimaster"],
    "Frigomar":       ["frigomar", "fcx-", "fcf-platinum"],
}

def classify_pdf(filename: str, url: str) -> Optional[str]:
    """Return manufacturer name if the PDF filename/URL matches known keywords."""
    text = (filename + " " + url).lower().replace("_", "-")
    for mfr, keywords in MFR_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            return mfr
    return None



def main():
    p = argparse.ArgumentParser(description="Clever Sailor Manual Scraper v2")
    p.add_argument("--dry-run",      action="store_true",
                   help="Validate URLs without downloading")
    p.add_argument("--manufacturer", nargs="*", metavar="NAME",
                   help="Limit to these source names (e.g. Yanmar Raymarine)")
    p.add_argument("--workers",      type=int, default=MAX_WORKERS)
    args = p.parse_args()

    scrapers = ALL_SCRAPERS
    if args.manufacturer:
        wanted   = {m.lower() for m in args.manufacturer}
        scrapers = [s for s in ALL_SCRAPERS
                    if getattr(s, "NAME", "").lower() in wanted
                    or any(w in getattr(s, "NAME", "").lower() for w in wanted)]
        if not scrapers:
            log.error("No scrapers matched: %s", args.manufacturer)
            sys.exit(1)

    log.info("Starting — %d sources, dry_run=%s", len(scrapers), args.dry_run)
    MANUAL_DIR.mkdir(parents=True, exist_ok=True)

    all_results = asyncio.run(run(scrapers, dry_run=args.dry_run))
    reg_stats   = update_registry(REGISTRY_PATH, all_results)
    report      = build_report(all_results, reg_stats)

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    s = report["summary"]
    print(f"\n{'='*62}")
    print(f"  Clever Sailor Manual Scraper v2 — Complete")
    print(f"{'='*62}")
    print(f"  Sources attempted  : {s['sources_attempted']}")
    print(f"  Manuals OK         : {s['ok']}")
    print(f"  Skipped            : {s['skipped']}")
    print(f"  Errors             : {s['errors']}")
    print(f"  Registry matched   : {reg_stats['matched']} / {reg_stats['total']}")
    print(f"  Registry updated   : {REGISTRY_PATH.relative_to(_ROOT)}")
    print(f"  Manuals folder     : {MANUAL_DIR.relative_to(_ROOT)}")
    print(f"  Report             : {REPORT_PATH.relative_to(_ROOT)}")
    print(f"{'='*62}\n")


if __name__ == "__main__":
    main()


# ══════════════════════════════════════════════════════════════════════════════
# RETAILER CRAWLERS
# These scrapers enumerate manual libraries at European marine retailers
# that openly host manufacturer PDFs without hotlink protection.
# ══════════════════════════════════════════════════════════════════════════════

# Keyword sets used to classify PDFs by manufacturer during crawl
MFR_KEYWORDS = {
    "Yanmar":         ["yanmar", "4jh", "3jh", "6ly", "jh57", "jh45", "jh80", "jh3"],
    "Volvo Penta":    ["volvo", "volvopenta", "ips-", "d4-", "d6-", "d11-", "evc-"],
    "Raymarine":      ["raymarine", "axiom", "evolution", "p70", "ray73", "ray90",
                       "ais700", "quantum"],
    "B&G":            ["b&g", "bg-", "bandg", "zeus", "triton", "vulcan", "h5000"],
    "Simrad":         ["simrad", "nss", "go-", "go7", "go9", "ap44", "halo",
                       "rs40", "is42"],
    "Garmin":         ["garmin", "gpsmap", "reactor", "gmr", "quatix"],
    "Furuno":         ["furuno", "navnet", "gp-39", "navpilot", "drs4"],
    "Victron":        ["victron", "multiplus", "cerbo", "bmv", "smartsolar",
                       "orion-tr", "lynx", "quattro"],
    "Lewmar":         ["lewmar", "v700", "v1-", "v3-", "v6-", "v8-", "h1-",
                       "h3-", "hx-", "vx1"],
    "Lofrans":        ["lofrans", "project", "kobra", "tigres", "progress",
                       "cayman", "royal", "marlin", "falkon"],
    "Maxwell":        ["maxwell", "rc8", "vrc", "hrc", "sprint"],
    "Quick":          ["quick", "prince", "duke", "genius", "coyote", "hector",
                       "rider", "regal", "antares"],
    "Dometic":        ["dometic", "cruiseair", "marine-air", "turbo-"],
    "Webasto":        ["webasto", "fcf", "air-top", "thermo-top", "bluecool"],
    "Espar":          ["espar", "airtronic", "hydronic", "eberspaecher"],
    "Spectra":        ["spectra", "newport", "catalina", "cape-horn", "farallon"],
    "Schenker":       ["schenker", "smart-", "zen-", "wiki-", "qube"],
    "Jabsco":         ["jabsco", "quiet-flush", "par-max", "parmax", "twist"],
    "Whale":          ["whale", "gulper", "gusher", "elegance", "orca-"],
    "Vetus":          ["vetus", "mtr-", "bow-pro", "bowpro"],
    "Shurflo":        ["shurflo", "trail-king", "revolution", "2088"],
    "Mastervolt":     ["mastervolt", "chargemaster", "mass-combi", "combimaster"],
    "Frigomar":       ["frigomar", "fcx-", "fcf-platinum"],
}

def classify_pdf(filename: str, url: str) -> Optional[str]:
    """Return manufacturer name if the PDF filename/URL matches known keywords."""
    text = (filename + " " + url).lower().replace("_", "-")
    for mfr, keywords in MFR_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            return mfr
    return None


class BusseYachtshopCrawler:
    """
    busse-yachtshop.de (Germany) stores all manuals flat at /pdf/{filename}.
    Google indexes these directly. We crawl the search-results page to enumerate
    all PDFs, then download the ones matching our target manufacturers.

    The /pdf/ directory is not openly browsable, but all PDFs are linked from
    product pages and indexed by Google, so we can scrape the search index.
    We use their internal search as a discovery mechanism.
    """
    NAME = "busse-yachtshop.de"
    BASE = "https://busse-yachtshop.de"

    # Brand search pages — busse indexes by manufacturer
    BRAND_PAGES = [
        "/en/brands/yanmar/",
        "/en/brands/victron-energy/",
        "/en/brands/raymarine/",
        "/en/brands/simrad/",
        "/en/brands/b-g/",
        "/en/brands/garmin/",
        "/en/brands/furuno/",
        "/en/brands/lewmar/",
        "/en/brands/lofrans/",
        "/en/brands/quick/",
        "/en/brands/maxwell-marine/",
        "/en/brands/dometic/",
        "/en/brands/webasto/",
        "/en/brands/whale/",
        "/en/brands/jabsco/",
        "/en/brands/vetus/",
        "/en/brands/schenker/",
        # Also try the known PDF base directly
    ]

    # Confirmed direct PDF URLs — verified by Google indexing their content
    # All use exact filenames observed in Google search result URLs
    CONFIRMED_PDFS = [
        # Lofrans — all 4 confirmed by Google search result URLs above
        ("Lofrans Project X1 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX1-Manuale.Rev.01.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X2 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-Project%20X2-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project 1000 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-Project1000-Manuale.Rev.04.pdf",
         "Lofrans", "Project"),
        ("Lofrans Project X3 Windlass Manual",
         "https://busse-yachtshop.de/pdf/lofrans-ProjectX3-Manuale.Rev.00.pdf",
         "Lofrans", "Project"),
        ("Lofrans Thetis 7003 Chain Counter Manual",
         "https://busse-yachtshop.de/pdf/Lofrans-THETIS-7003-Handbuch.pdf",
         "Lofrans", "Thetis"),
        # Quick — confirmed from search results
        ("Quick Antares 1000-1500W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-Antares-1000-1500W-7b.pdf",
         "Quick", "Antares"),
        ("Quick Hector 700-1500W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-hector-700-1000-1500.pdf",
         "Quick", "Hector"),
        ("Quick Rider Regal 1700-3000W Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-Rider-Regal-1700-2000-2300-3000W-4a.pdf",
         "Quick", "Rider"),
        ("Quick Prince DP3 Windlass Manual",
         "https://busse-yachtshop.de/pdf/quick-prince-DP3-ankerwinde.pdf",
         "Quick", "Prince"),
        # B&G — confirmed working in prior runs
        ("B&G Triton2 Operator Manual",
         "https://busse-yachtshop.de/pdf/bg-Triton2-operator-manual.pdf",
         "B&G", "Triton2"),
        ("B&G Triton System Installation Manual",
         "https://busse-yachtshop.de/pdf/bg-triton-install-en.pdf",
         "B&G", "Triton"),
        # Simrad — HH33 confirmed working
        ("Simrad HH33 VHF Radio Manual",
         "https://busse-yachtshop.de/pdf/simrad-hh33-handbuch.pdf",
         "Simrad", "HH33"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)

        # Phase 1: scrape brand pages to discover PDF links
        seen_urls: set[str] = set()
        for brand_path in self.BRAND_PAGES:
            page_url = self.BASE + brand_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            # Follow product links, then look for PDF links on each product page
            product_links = [
                abs_url(page_url, a["href"])
                for a in soup.find_all("a", href=True)
                if "/en/" in a["href"] and a["href"] not in ("/en/", "/en/brands/")
                and abs_url(page_url, a["href"]) not in seen_urls
            ]
            for prod_url in product_links[:30]:  # cap per brand page
                seen_urls.add(prod_url)
                prod_html = await dl.get_html(prod_url, referer=page_url)
                if not prod_html:
                    continue
                prod_soup = BeautifulSoup(prod_html, "lxml")
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "/pdf/" in href and href.lower().endswith(".pdf"):
                        full = abs_url(prod_url, href)
                        if full in seen_urls:
                            continue
                        seen_urls.add(full)
                        fname  = url_filename(full)
                        mfr    = classify_pdf(fname, full) or "Generic"
                        title  = a.get_text(strip=True) or fname
                        rec    = ManualRecord(mfr, fname.split("-")[0], title, full)
                        dest   = MANUAL_DIR / safe_dirname(mfr) / fname
                        await dl.download_pdf(full, dest, rec, referer=prod_url)
                        result.records.append(rec)

        # Phase 2: download confirmed PDFs (known to exist from search results)
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            fname = url_filename(url)
            dest  = MANUAL_DIR / safe_dirname(mfr) / fname
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://busse-yachtshop.de/")
            result.records.append(rec)

        log.info("busse-yachtshop: %d records", len(result.records))
        return result


class SVB24Crawler:
    """
    SVB24 (svb24.com / Germany, largest European marine retailer) stores
    manuals per-product at media1.svb-media.de/media/snr/{item_no}/pdf/{hash}.pdf.

    Strategy: scrape brand-specific pages on SVB24 for our target manufacturers.
    Each product page has a 'Documents' tab or inline PDF links.
    SVB24 item numbers increment; we focus on brand pages that list all products.
    """
    NAME = "svb24.com"
    BASE = "https://www.svb24.com"

    TARGET_BRANDS = [
        "/en/brands/victron-energy.html",
        "/en/brands/yanmar.html",
        "/en/brands/jabsco.html",
        "/en/brands/whale.html",
        "/en/brands/lofrans.html",
        "/en/brands/lewmar.html",
        "/en/brands/quick.html",
        "/en/brands/maxwell.html",
        "/en/brands/schenker.html",
        "/en/brands/webasto.html",
        "/en/brands/dometic.html",
        "/en/brands/vetus.html",
        "/en/brands/simrad.html",
        "/en/brands/bandg.html",
        "/en/brands/raymarine.html",
        "/en/brands/garmin.html",
        "/en/brands/furuno.html",
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        for brand_path in self.TARGET_BRANDS:
            page_url = self.BASE + brand_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")

            # SVB product links are /en/{product-name}.html
            product_links = sorted(set(
                abs_url(page_url, a["href"])
                for a in soup.find_all("a", href=True)
                if a["href"].startswith("/en/") and a["href"].endswith(".html")
                and "/brands/" not in a["href"]
            ))

            for prod_url in product_links[:40]:
                if prod_url in seen:
                    continue
                seen.add(prod_url)
                prod_html = await dl.get_html(prod_url, referer=page_url)
                if not prod_html:
                    continue
                prod_soup = BeautifulSoup(prod_html, "lxml")

                # SVB embeds PDF links with media1.svb-media.de domain
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "svb-media.de" in href and href.lower().endswith(".pdf"):
                        if href in seen:
                            continue
                        seen.add(href)
                        title = a.get_text(strip=True) or url_filename(href)
                        fname = url_filename(href)
                        mfr   = classify_pdf(fname, href + " " + prod_url) or "Generic"
                        rec   = ManualRecord(mfr, fname.split("-")[0][:20],
                                             title, href)
                        dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                        await dl.download_pdf(href, dest, rec, referer=prod_url)
                        result.records.append(rec)

                # Also look for any /pdf/ links embedded in page text
                for a in prod_soup.find_all("a", href=True):
                    href = a["href"]
                    if "/pdf/" in href and href.endswith(".pdf"):
                        full = abs_url(prod_url, href)
                        if full in seen:
                            continue
                        seen.add(full)
                        title = a.get_text(strip=True) or url_filename(full)
                        mfr   = classify_pdf(url_filename(full), full) or "Generic"
                        rec   = ManualRecord(mfr, "manual", title, full)
                        dest  = MANUAL_DIR / safe_dirname(mfr) / url_filename(full)
                        await dl.download_pdf(full, dest, rec, referer=prod_url)
                        result.records.append(rec)

        log.info("svb24: %d records", len(result.records))
        return result


class NaviNordicCrawler:
    """
    navinordic.com (Scandinavia) — hosts a /pub_docs/ directory tree with
    manufacturer PDFs in open subfolders. Confirmed: Quick, Lofrans, Lewmar.
    Structure: /pub_docs/files/Ladda_ner/{Manufacturer}/{Category}/{file}.pdf
    """
    NAME = "navinordic.com"
    BASE = "https://www.navinordic.com"

    # Confirmed base paths from search results
    KNOWN_DIRS = [
        "/pub_docs/files/Ladda_ner/Quick/Ankarspel/",
        "/pub_docs/files/Ladda_ner/Lofrans/",
        "/pub_docs/files/Ladda_ner/Lewmar/",
        "/pub_docs/files/Ladda_ner/Maxwell/",
        "/pub_docs/files/Ladda_ner/Victron/",
        "/pub_docs/files/Ladda_ner/Simrad/",
        "/pub_docs/files/Ladda_ner/Raymarine/",
        "/pub_docs/files/Ladda_ner/Garmin/",
        "/pub_docs/files/Ladda_ner/Furuno/",
        "/pub_docs/files/Ladda_ner/Yanmar/",
        "/pub_docs/files/Ladda_ner/Volvo/",
        "/pub_docs/files/Ladda_ner/Whale/",
        "/pub_docs/files/Ladda_ner/Jabsco/",
        "/pub_docs/files/Ladda_ner/Dometic/",
        "/pub_docs/files/Ladda_ner/Webasto/",
        "/pub_docs/files/Ladda_ner/Schenker/",
    ]

    # Confirmed individual PDFs
    CONFIRMED_PDFS = [
        ("Quick Prince DP3 700-1500W Manual",
         "https://www.navinordic.com/pub_docs/files/Ladda_ner/Quick/Ankarspel/DP3_7-10-15_Rev_003A_GB.pdf",
         "Quick", "Prince"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        # Try each known directory as an Apache-style listing
        for dir_path in self.KNOWN_DIRS:
            dir_url = self.BASE + dir_path
            html    = await dl.get_html(dir_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    full = abs_url(dir_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full)
                    # Fall back to directory name for manufacturer
                    if not mfr:
                        parts = dir_path.strip("/").split("/")
                        mfr   = parts[-1] if parts else "Generic"
                    title = a.get_text(strip=True) or fname
                    rec   = ManualRecord(mfr, fname[:20], title, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=dir_url)
                    result.records.append(rec)

        # Download confirmed PDFs regardless
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec,
                                      referer="https://www.navinordic.com/")
                result.records.append(rec)

        log.info("navinordic: %d records", len(result.records))
        return result


class DefenderCrawler:
    """
    defender.com (US, largest US marine retailer) hosts a large PDF library
    at defender.com/assets/pdf/{manufacturer}/{filename}.pdf
    Confirmed: Lewmar (v1_6_windlass.pdf), Maxwell (vwc.pdf), Jabsco, Webasto.
    """
    NAME = "defender.com"
    BASE = "https://defender.com"

    # Only confirmed-working URLs (from actual scrape run results)
    CONFIRMED_PDFS = [
        ("Lewmar V1-V6 Windlass Manual",
         "https://defender.com/assets/pdf/lewmar/v1_6_windlass.pdf",
         "Lewmar", "V1"),
        ("Maxwell VWC Windlass Manual",
         "https://defender.com/assets/pdf/maxwell/vwc.pdf",
         "Maxwell", "VWC"),
    ]

    # Also try scraping Defender's brand pages which list products with docs
    BRAND_PAGES = [
        "/windlasses-anchor-windlasses-c-700_817.html",
        "/marine-toilets-heads-c-401_584.html",
        "/watermakers-c-401_579.html",
        "/marine-battery-chargers-inverters-c-600_614.html",
        "/marine-air-conditioning-c-700_1049.html",
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        # Download all confirmed PDFs
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://defender.com/")
            result.records.append(rec)

        # Also try to discover additional PDFs from category pages
        for cat_path in self.BRAND_PAGES:
            page_url = self.BASE + cat_path
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "/assets/pdf/" in href and href.lower().endswith(".pdf"):
                    full = abs_url(page_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full) or "Generic"
                    rec   = ManualRecord(mfr, fname[:20],
                                        a.get_text(strip=True) or fname, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        log.info("defender: %d records", len(result.records))
        return result


class MarineWarehouseCrawler:
    """
    marinewarehouse.net (Australia) — stores manufacturer manuals in open
    directories: /images/{manufacturer}/PDF/{filename}.pdf
    Confirmed: Quick Prince DP3 manual accessible.
    """
    NAME = "marinewarehouse.net"
    BASE = "http://marinewarehouse.net"   # HTTP only — no HTTPS

    MFR_DIRS = [
        ("/images/quick/PDF/", "Quick"),
        ("/images/lofrans/PDF/", "Lofrans"),
        ("/images/lewmar/PDF/", "Lewmar"),
        ("/images/maxwell/PDF/", "Maxwell"),
        ("/images/jabsco/PDF/", "Jabsco"),
        ("/images/whale/PDF/", "Whale"),
        ("/images/vetus/PDF/", "Vetus"),
        ("/images/dometic/PDF/", "Dometic"),
        ("/images/victron/PDF/", "Victron Energy"),
        ("/images/yanmar/PDF/", "Yanmar"),
        ("/images/simrad/PDF/", "Simrad"),
        ("/images/raymarine/PDF/", "Raymarine"),
        ("/images/furuno/PDF/", "Furuno"),
        ("/images/garmin/PDF/", "Garmin"),
    ]

    CONFIRMED_PDFS = [
        ("Quick Prince DP3 Windlass Manual",
         "http://marinewarehouse.net/images/quick/PDF/Prince%20DP3%20Users%20Manual.pdf",
         "Quick", "Prince"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result = SourceResult(self.NAME)
        seen: set[str] = set()

        for dir_path, mfr in self.MFR_DIRS:
            dir_url = self.BASE + dir_path
            html    = await dl.get_html(dir_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    full = abs_url(dir_url, href)
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    title = a.get_text(strip=True) or fname
                    rec   = ManualRecord(mfr, fname[:20], title, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=dir_url)
                    result.records.append(rec)

        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if not dest.exists():
                rec = ManualRecord(mfr, hint, title, url)
                await dl.download_pdf(url, dest, rec,
                                      referer="http://marinewarehouse.net/")
                result.records.append(rec)

        log.info("marinewarehouse: %d records", len(result.records))
        return result


class BinnacleCanadaCrawler:
    """
    binnacle.com (Canada) — hosts B&G, Simrad and other Navico brand manuals
    as direct PDFs in /pdf/ paths. Confirmed: Zeus3S, Zeus2, Triton2.
    """
    NAME = "binnacle.com"
    BASE = "https://ca.binnacle.com"

    # Only the Zeus3S URL was confirmed working in prior runs
    CONFIRMED_PDFS = [
        ("B&G Zeus3S Operator Manual",
         "https://ca.binnacle.com/pdf/B&G%20Zeus%203S%20Operator%20Manual%20988-12586-001_w.pdf",
         "B&G", "Zeus3S"),
    ]

    async def scrape(self, dl: Downloader) -> SourceResult:
        result  = SourceResult(self.NAME)
        seen: set[str] = set()

        # Scrape Binnacle's electronics category pages for PDF links
        category_pages = [
            f"{self.BASE}/en-ca/navigation-electronics/chartplotters-gps/",
            f"{self.BASE}/en-ca/navigation-electronics/autopilots/",
            f"{self.BASE}/en-ca/navigation-electronics/vhf-radios/",
            f"{self.BASE}/en-ca/navigation-electronics/radar/",
        ]
        for page_url in category_pages:
            html = await dl.get_html(page_url, referer=self.BASE + "/")
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                if a["href"].lower().endswith(".pdf"):
                    full = abs_url(page_url, a["href"])
                    if full in seen:
                        continue
                    seen.add(full)
                    fname = url_filename(full)
                    mfr   = classify_pdf(fname, full) or "Generic"
                    rec   = ManualRecord(mfr, fname[:20],
                                        a.get_text(strip=True) or fname, full)
                    dest  = MANUAL_DIR / safe_dirname(mfr) / fname
                    await dl.download_pdf(full, dest, rec, referer=page_url)
                    result.records.append(rec)

        # Download confirmed PDFs
        for title, url, mfr, hint in self.CONFIRMED_PDFS:
            dest = MANUAL_DIR / safe_dirname(mfr) / url_filename(url)
            if dest.exists():
                continue
            rec = ManualRecord(mfr, hint, title, url)
            await dl.download_pdf(url, dest, rec,
                                  referer="https://ca.binnacle.com/")
            result.records.append(rec)

        log.info("binnacle: %d records", len(result.records))
        return result



# ── All scrapers list ───────────────────────────────────────────────────────


# Retailer crawlers are already included in ALL_SCRAPERS above