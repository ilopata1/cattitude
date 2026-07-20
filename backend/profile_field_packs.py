"""Field-pack migrations for Stage 1 profile schema evolution.

When Stage 4 (or Stage 1) adds optional fields after extracts exist, register a
**field pack**, scan debt across last_green / vessel profiles, and backfill with
**additive merge** only (empty → value + evidence). Do not rewrite audience,
drop actions, or invent vessel SOP.

Pack ``occasion`` (v4.19) is the founding pack: when/why on operator_actions.
"""

from __future__ import annotations

import json
import re
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

_BACKEND = Path(__file__).resolve().parent
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"
OUTREMER_PROFILES = _BACKEND / "fixtures" / "pipeline" / "outremer" / "profiles.json"

PROFILE_SCHEMA_VERSION = "v4.19"

# Contexts that already count as occasion for Stage 4 (no backfill required).
# commissioning is itself the when/why for installer-framed setup steps.
_OCCASION_SATISFIED_CONTEXTS = frozenset(
    {"daily", "emergency", "maintenance", "commissioning"}
)

_OCCASION_IN_ACTION_RE = re.compile(
    r"\b(after|when|before|if|during|once|whenever)\b", re.I
)


@dataclass(frozen=True)
class FieldPack:
    id: str
    description: str
    scan: Callable[[dict[str, Any], str], list[dict[str, Any]]]
    offline_backfill: Callable[
        [dict[str, Any], str, Path | None], tuple[dict[str, Any], list[dict[str, Any]]]
    ]


def _action_has_occasion(action: dict[str, Any]) -> bool:
    occ = str(action.get("occasion") or "").strip()
    if occ:
        from interaction_profile_validate import occasion_is_circular

        if not occasion_is_circular(str(action.get("action") or ""), occ):
            return True
    ctx = str(action.get("context") or "").strip().lower()
    if ctx in _OCCASION_SATISFIED_CONTEXTS:
        return True
    act = str(action.get("action") or "")
    if _OCCASION_IN_ACTION_RE.search(act):
        return True
    return False


def scan_occasion_debt(profile: dict[str, Any], device_key: str) -> list[dict[str, Any]]:
    """Situational (etc.) operator/either actions lacking a sourced occasion."""
    debt: list[dict[str, Any]] = []
    for i, act in enumerate(profile.get("operator_actions") or []):
        if not isinstance(act, dict):
            continue
        action = str(act.get("action") or "").strip()
        if not action:
            continue
        audience = str(act.get("audience") or "").strip().lower()
        if audience not in {"operator", "either"}:
            continue
        if _action_has_occasion(act):
            continue
        debt.append(
            {
                "pack": "occasion",
                "device_key": device_key,
                "path": f"operator_actions[{i}]",
                "action": action,
                "audience": audience,
                "context": str(act.get("context") or ""),
                "severity": "stage4_imperative"
                if str(act.get("context") or "") == "situational"
                else "advisory",
            }
        )
    return debt


def additive_set_occasion(
    profile: dict[str, Any],
    *,
    action_substr: str,
    occasion: str,
    evidence_section: str,
    evidence_note: str,
    source_tag: str = "derived",
    match_all: bool = False,
) -> list[dict[str, Any]]:
    """Set occasion on matching action(s) if empty. Returns fill records."""
    occasion = str(occasion or "").strip()
    if not occasion:
        return []
    needle = action_substr.lower()
    fills: list[dict[str, Any]] = []
    actions = profile.get("operator_actions") or []
    for i, act in enumerate(actions):
        if not isinstance(act, dict):
            continue
        action = str(act.get("action") or "")
        if needle not in action.lower():
            continue
        if str(act.get("occasion") or "").strip():
            if not match_all:
                return fills
            continue
        act["occasion"] = occasion
        if source_tag and not act.get("source"):
            act["source"] = source_tag
        path = f"operator_actions[{i}].occasion"
        evidence = list(profile.get("evidence") or [])
        evidence.append(
            {
                "supports_field": path,
                "manual_section": evidence_section,
                "note": evidence_note[:120],
            }
        )
        profile["evidence"] = evidence
        profile["profile_schema_version"] = PROFILE_SCHEMA_VERSION
        fills.append(
            {
                "path": path,
                "action": action,
                "occasion": occasion,
                "manual_section": evidence_section,
                "source": source_tag,
            }
        )
        if not match_all:
            break
    return fills


def _apply_rules(
    profile: dict[str, Any],
    blob_l: str,
    rules: list[tuple[str, str, str, str, str, bool]],
) -> list[dict[str, Any]]:
    """rules: (needles_csv, action_substr, occasion, section, note, match_all)."""
    fills: list[dict[str, Any]] = []
    for needles_csv, substr, occasion, section, note, match_all in rules:
        needles = [n.strip() for n in needles_csv.split("|") if n.strip()]
        if needles and not any(n.lower() in blob_l for n in needles):
            continue
        fills.extend(
            additive_set_occasion(
                profile,
                action_substr=substr,
                occasion=occasion,
                evidence_section=section,
                evidence_note=note,
                source_tag="derived",
                match_all=match_all,
            )
        )
    return fills


def offline_backfill_occasion_combi(
    profile: dict[str, Any],
    device_key: str,
    device_dir: Path | None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Grounded occasion fills for Mass Combi from last_green excerpt corpus."""
    del device_key
    out = deepcopy(profile)
    blob = ""
    if device_dir and device_dir.is_dir():
        blob = _load_excerpt_blob(device_dir)
    blob_l = blob.lower()
    fills = _apply_rules(
        out,
        blob_l,
        [
            (
                "external ac circuit breaker|power sharing",
                "AC input current limit",
                "when shore or mains AC input is limited, to avoid tripping "
                "the external AC circuit breaker",
                "3.4.4 Power sharing mode",
                "limited AC input; external breaker may trip",
                False,
            ),
            (
                "power sharing level|match external",
                "Power Sharing level",
                "to match the external circuit breaker rating",
                "3.4.4 Power sharing mode",
                "Power Sharing level vs external breaker",
                False,
            ),
            (
                "prevent depleting",
                "switch off inverter",
                "to prevent depleting the batteries",
                "4.5 Daily use, MasterBus monitoring",
                "Inverter Option: switch Off to prevent depleting batteries",
                False,
            ),
            (
                "charger off|switch off the charger",
                "switch off the charger",
                "when charger-off is required from the Mass Combi operating modes",
                "4.5 Daily use, MasterBus monitoring",
                "Mode includes Charger off",
                False,
            ),
            (
                "switched off manually|switch on the mass combi",
                "switch on the Mass Combi",
                "when the Mass Combi Pro was switched off manually",
                "operation and warnings",
                "Switch on after manual off via main switch",
                False,
            ),
            (
                "demand for ac power is higher|generator / mains support",
                "Generator / mains support",
                "when AC demand is higher than available AC input power",
                "3.4.5 Gen-/Mains support",
                "support mode when demand exceeds AC input",
                False,
            ),
            (
                "contact your local mastervolt service",
                "contact Mastervolt Service Centre",
                "when a problem cannot be solved using the troubleshooting table",
                "troubleshooting",
                "contact Service Centre if table does not solve problem",
                False,
            ),
        ],
    )
    return out, fills


def offline_backfill_occasion_mppt(
    profile: dict[str, Any],
    device_key: str,
    device_dir: Path | None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    del device_key
    out = deepcopy(profile)
    blob = ""
    if device_dir and device_dir.is_dir():
        blob = _load_excerpt_blob(device_dir)
    blob_l = blob.lower()
    fills = _apply_rules(
        out,
        blob_l,
        [
            (
                "at sunset you can choose",
                "sunset action",
                "at sunset, for load-output lighting control",
                "Setting the Sunset action",
                "At sunset you can choose load-output actions",
                True,
            ),
            (
                "victronconnect|mppt control display can be used to configure",
                "configure solar charger settings",
                "when changing solar charger settings via VictronConnect or an "
                "optional display",
                "Configuration and settings",
                "configure settings via app or MPPT Control display",
                False,
            ),
            (
                "shut down the solar charger",
                "shutdown the device",
                "when shutting down the solar charger (disconnect PV supply first)",
                "6.5. Shutdown and restart procedure",
                "prescribed shutdown order: PV then battery",
                False,
            ),
            (
                "restart the solar charger after it was shutdown",
                "restart the device",
                "when restarting the solar charger after a shutdown "
                "(reconnect battery supply first)",
                "6.5. Shutdown and restart procedure",
                "prescribed restart order after shutdown",
                False,
            ),
            (
                "how to update firmware|updating firmware",
                "update firmware",
                "when updating the solar charger firmware",
                "5.3. Updating firmware",
                "firmware update procedure in settings chapter",
                False,
            ),
            (
                "mppt control|ve.direct port",
                "VE.Direct cable",
                "when connecting an optional MPPT Control display via VE.Direct",
                "Display / VE.Direct",
                "optional MPPT Control connects via VE.Direct cable",
                False,
            ),
        ],
    )
    return out, fills


def offline_backfill_occasion_mli(
    profile: dict[str, Any],
    device_key: str,
    device_dir: Path | None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    del device_key
    out = deepcopy(profile)
    blob = ""
    if device_dir and device_dir.is_dir():
        blob = _load_excerpt_blob(device_dir)
    blob_l = blob.lower()
    fills = _apply_rules(
        out,
        blob_l,
        [
            (
                "switch off the load, then switch on the charger",
                "switch off the load, then switch on the charger",
                "when verifying charge current into the battery during "
                "installation checks",
                "installation / verification",
                "verify current into battery after load off / charger on",
                False,
            ),
        ],
    )
    return out, fills


def offline_backfill_occasion_generic(
    profile: dict[str, Any],
    device_key: str,
    device_dir: Path | None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Dispatch offline occasion derives by device family."""
    key = device_key.lower()
    if "combi" in key or key in {"mass_combi_pro", "mastervolt_combi"}:
        return offline_backfill_occasion_combi(profile, device_key, device_dir)
    if "mppt" in key or "victron" in key:
        return offline_backfill_occasion_mppt(profile, device_key, device_dir)
    if "mli" in key or key == "mastervolt_mli":
        return offline_backfill_occasion_mli(profile, device_key, device_dir)
    return deepcopy(profile), []


def backfill_vessel_czone_occasion(vessel: dict[str, Any]) -> list[dict[str, Any]]:
    """Fill CZone platform Modes/Climate CONTROLS occasions from QSG-grounded purposes."""
    fills: list[dict[str, Any]] = []
    for key in ("czone_2_0", "czone_touch_7"):
        prof = vessel.get(key)
        if not isinstance(prof, dict):
            continue
        # Prefer platform profile for Climate/Modes actions.
        if key != "czone_2_0":
            continue
        rules = [
            (
                "activate Mode",
                "when controlling several circuits with one Modes action",
                "MODES PAGE",
                "Modes: control multiple circuits with a single touch",
            ),
            (
                "Power button to turn Aircon",
                "when turning the aircon unit on or off from Climate CONTROLS",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Power button",
            ),
            (
                "Mode button to cycle",
                "when changing Climate operating mode",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Mode button",
            ),
            (
                "Temp Down",
                "when adjusting the Climate setpoint temperature down",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Temp Down",
            ),
            (
                "Temp Up",
                "when adjusting the Climate setpoint temperature up",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Temp Up",
            ),
            (
                "Fan Down",
                "when adjusting Climate fan speed down",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Fan Down",
            ),
            (
                "Fan Up",
                "when adjusting Climate fan speed up",
                "CLIMATE CONTROLS",
                "Climate CONTROLS Fan Up",
            ),
        ]
        for substr, occasion, section, note in rules:
            for rec in additive_set_occasion(
                prof,
                action_substr=substr,
                occasion=occasion,
                evidence_section=section,
                evidence_note=note,
                source_tag="derived",
                match_all=True,
            ):
                fills.append({"device_key": key, **rec})
        # Mirror into ui_pages actions when present
        for page in prof.get("ui_pages") or []:
            if not isinstance(page, dict):
                continue
            for act in page.get("actions") or []:
                if not isinstance(act, dict):
                    continue
                if str(act.get("occasion") or "").strip():
                    continue
                text = str(act.get("action") or "")
                for substr, occasion, _section, _note in rules:
                    if substr.lower() in text.lower():
                        act["occasion"] = occasion
                        break
        vessel[key] = prof
    return fills


# Promote map: last_green folder -> vessel catalog_key(s)
OCCASION_PROMOTE_MAP: dict[str, tuple[str, ...]] = {
    "mastervolt_combi": ("mass_combi_pro",),
    "victron_mppt": ("victron_mppt", "victron_mppt_150_60"),
    "mastervolt_mli": ("mli_ultra",),
}


def _load_excerpt_blob(device_dir: Path) -> str:
    parts: list[str] = []
    extraction = device_dir / "extraction_input.json"
    if extraction.is_file():
        data = json.loads(extraction.read_text(encoding="utf-8"))
        for ex in data.get("excerpts") or []:
            if isinstance(ex, dict) and ex.get("text"):
                parts.append(str(ex["text"]))
    groups = device_dir / "groups"
    if groups.is_dir():
        for path in sorted(groups.glob("*_input.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            for ex in data.get("excerpts") or []:
                if isinstance(ex, dict) and ex.get("text"):
                    parts.append(str(ex["text"]))
    # Collapse PDF line-wrap whitespace so multi-line needles match.
    return re.sub(r"\s+", " ", "\n".join(parts))


FIELD_PACKS: dict[str, FieldPack] = {
    "occasion": FieldPack(
        id="occasion",
        description=(
            "Populate operator_actions[].occasion from manual text when/why; "
            "empty means manual silent (Stage 4 demotes imperatives)."
        ),
        scan=scan_occasion_debt,
        offline_backfill=offline_backfill_occasion_generic,
    ),
}


def list_last_green_devices() -> list[tuple[str, Path]]:
    out: list[tuple[str, Path]] = []
    if not LAST_GREEN.is_dir():
        return out
    for path in sorted(LAST_GREEN.iterdir()):
        if path.is_dir() and (path / "profile.json").is_file():
            out.append((path.name, path))
    return out


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def scan_pack_debt(
    pack_id: str,
    *,
    include_vessel: bool = True,
) -> list[dict[str, Any]]:
    pack = FIELD_PACKS[pack_id]
    debt: list[dict[str, Any]] = []
    for key, folder in list_last_green_devices():
        profile = load_json(folder / "profile.json")
        for row in pack.scan(profile, key):
            row = dict(row)
            row["source"] = "last_green"
            debt.append(row)
    if include_vessel and OUTREMER_PROFILES.is_file():
        vessel = load_json(OUTREMER_PROFILES)
        for key, profile in vessel.items():
            if not isinstance(profile, dict):
                continue
            if "operator_actions" not in profile and "device" not in profile:
                continue
            for row in pack.scan(profile, key):
                row = dict(row)
                row["source"] = "vessel"
                debt.append(row)
    return debt


def backfill_last_green(
    pack_id: str,
    *,
    device_folder: str | None = None,
) -> list[dict[str, Any]]:
    """Run offline backfill on last_green profiles; write updated profile.json."""
    pack = FIELD_PACKS[pack_id]
    results: list[dict[str, Any]] = []
    devices = list_last_green_devices()
    if device_folder:
        devices = [(k, p) for k, p in devices if k == device_folder]
    for key, folder in devices:
        profile = load_json(folder / "profile.json")
        updated, fills = pack.offline_backfill(profile, key, folder)
        if fills:
            save_json(folder / "profile.json", updated)
        results.append(
            {
                "device_key": key,
                "path": str(folder / "profile.json"),
                "fills": fills,
            }
        )
    return results


def promote_occasion_to_vessel(
    *,
    catalog_key: str,
    last_green_folder: str,
) -> list[dict[str, Any]]:
    """Copy occasion values from last_green onto matching vessel stub actions."""
    lg_path = LAST_GREEN / last_green_folder / "profile.json"
    if not lg_path.is_file() or not OUTREMER_PROFILES.is_file():
        return []
    lg = load_json(lg_path)
    vessel = load_json(OUTREMER_PROFILES)
    stub = vessel.get(catalog_key)
    if not isinstance(stub, dict):
        return []
    promoted: list[dict[str, Any]] = []
    lg_by_action = {
        str(a.get("action") or "").strip().lower(): a
        for a in (lg.get("operator_actions") or [])
        if isinstance(a, dict) and str(a.get("occasion") or "").strip()
    }
    for act in stub.get("operator_actions") or []:
        if not isinstance(act, dict):
            continue
        key = str(act.get("action") or "").strip().lower()
        src = lg_by_action.get(key)
        if not src:
            for lg_act, row in lg_by_action.items():
                if key and (key in lg_act or lg_act in key):
                    src = row
                    break
        if not src:
            continue
        if str(act.get("occasion") or "").strip():
            continue
        occasion = str(src.get("occasion") or "").strip()
        act["occasion"] = occasion
        promoted.append(
            {
                "catalog_key": catalog_key,
                "action": act.get("action"),
                "occasion": occasion,
            }
        )
        evidence = list(stub.get("evidence") or [])
        evidence.append(
            {
                "supports_field": "operator_actions.occasion",
                "manual_section": "promoted:last_green",
                "note": f"occasion from {last_green_folder}",
            }
        )
        stub["evidence"] = evidence
    if promoted:
        stub["profile_schema_version"] = PROFILE_SCHEMA_VERSION
        vessel[catalog_key] = stub
        save_json(OUTREMER_PROFILES, vessel)
    return promoted


def catch_up_all_occasion_packs() -> dict[str, Any]:
    """Backfill every last_green device, promote mapped stubs, fill CZone vessel."""
    lg_results = backfill_last_green("occasion")
    promoted: list[dict[str, Any]] = []
    for folder, catalog_keys in OCCASION_PROMOTE_MAP.items():
        for ck in catalog_keys:
            promoted.extend(
                promote_occasion_to_vessel(
                    catalog_key=ck, last_green_folder=folder
                )
            )
    vessel = load_json(OUTREMER_PROFILES)
    czone_fills = backfill_vessel_czone_occasion(vessel)
    if czone_fills:
        save_json(OUTREMER_PROFILES, vessel)
    debt_after = scan_pack_debt("occasion")
    return {
        "last_green": lg_results,
        "promoted": promoted,
        "czone_fills": czone_fills,
        "debt_remaining": debt_after,
        "debt_count": len(debt_after),
    }