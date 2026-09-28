"""Check that every image path in a published guide resolves.

Local mode (default) uses the files the API process can read.
Pass --base-url to GET each path from a running API instead.

    python scripts/verify_guide_assets.py
    python scripts/verify_guide_assets.py --base-url https://cattitude-production.up.railway.app
"""

from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_bootstrap import asset_file_path, find_asset_paths  # noqa: E402
from guide_service import fetch_latest_publication, fetch_vessel  # noqa: E402

DEFAULT_SLUGS = ("cattitude", "supernova", "sister-test")


def _http_status(url: str) -> int:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            response.read(64)
            return int(response.status)
    except urllib.error.HTTPError as exc:
        return int(exc.code)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", action="append", dest="slugs")
    parser.add_argument(
        "--base-url",
        default="",
        help="API origin. When set, each path is fetched over HTTP.",
    )
    args = parser.parse_args()
    slugs = args.slugs or list(DEFAULT_SLUGS)
    base = args.base_url.rstrip("/")
    failures: list[str] = []

    for slug in slugs:
        vessel = fetch_vessel(slug)
        if vessel is None:
            failures.append(f"{slug}: vessel not found")
            continue
        publication = fetch_latest_publication(vessel["id"])
        if publication is None:
            failures.append(f"{slug}: no publication")
            continue
        paths = find_asset_paths(publication["payload"])
        if not paths:
            print(f"{slug}: no asset paths")
            continue
        for path in paths:
            if base:
                url = f"{base}/api/v1/vessels/{slug}/guide/assets/{path}"
                status = _http_status(url)
                if status != 200:
                    failures.append(f"{slug}: HTTP {status} {path}")
                continue
            file_path = asset_file_path(path, vessel_slug=slug)
            if not file_path.is_file():
                failures.append(f"{slug}: missing file {path}")

    if failures:
        print("FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    where = base or "local files"
    print(f"OK: published asset paths resolve ({where})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
