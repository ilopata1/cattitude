"""SmartSolar material-instability diagnosis (offline; no re-extract)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_instability import classify_extraction_votes
from interaction_profile_partition import partition_excerpts

SCRATCH = _BACKEND / "fixtures/pipeline/scratch/victron_mppt.json"
INPUT = _BACKEND / "fixtures/pipeline/last_green/victron_mppt/extraction_input.json"
GROUPS = _BACKEND / "fixtures/pipeline/last_green/victron_mppt/groups"


def main() -> int:
    prof = json.loads(SCRATCH.read_text(encoding="utf-8"))
    classified = classify_extraction_votes(
        list(prof.get("extraction_votes") or []), n_runs=3
    )
    inp = json.loads(INPUT.read_text(encoding="utf-8"))
    excerpts = list(inp.get("excerpts") or [])
    headings = list((inp.get("coverage") or {}).get("headings_all") or [])
    groups = partition_excerpts(excerpts, inventory_headings=headings)
    g_rev = partition_excerpts(list(reversed(excerpts)), inventory_headings=headings)
    print(
        "PARTITION deterministic (same vs reversed order):",
        [(g["group_id"], len(g["excerpts"])) for g in groups]
        == [(g["group_id"], len(g["excerpts"])) for g in g_rev],
    )
    print("group layout:", [(g["group_id"], len(g["excerpts"])) for g in groups])

    def locate(pat: str) -> list[tuple[str, int]]:
        rx = re.compile(pat, re.I)
        hits: list[tuple[str, int]] = []
        for g in groups:
            n = sum(
                1
                for e in g.get("excerpts") or []
                if rx.search(str(e.get("text") or ""))
            )
            if n:
                hits.append((str(g["group_id"]), n))
        return hits

    # Single-run archived group outputs → which group emitted (last run only).
    emitted: dict[str, list[str]] = {}
    for path in sorted(GROUPS.glob("*_output.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        raw = data.get("profile") or data.get("raw_profile") or data
        gid = path.stem.replace("_output", "")
        for r in raw.get("requires_devices") or []:
            if isinstance(r, dict):
                emitted.setdefault(
                    str(r.get("description_verbatim") or "").lower(), []
                ).append(gid)
        for a in raw.get("operator_actions") or []:
            if isinstance(a, dict):
                emitted.setdefault(str(a.get("action") or "").lower(), []).append(gid)

    print()
    print(
        "| Field | Runs present | Excerpt groups (hits) | Last-run group emit | Class |"
    )
    print("|---|---|---|---|---|")

    field_patterns = {
        "connect the MPPT Control display": r"MPPT Control",
        "update firmware": r"firmware",
        "disable Bluetooth": r"Bluetooth",
        "enable Bluetooth": r"Bluetooth",
        "check error codes via VictronConnect app": r"error code",
        "set the sunset action": r"sunset",
        "MPPT Control display": r"MPPT Control",
        "GX device or GlobalLink 520": r"GlobalLink|GX device",
        "VE.Direct TX digital output cable": r"VE\.Direct TX|TX digital output",
    }

    for vote in classified["material"]:
        variants = vote.get("variants") or []
        present_runs = []
        label = ""
        for var in variants:
            val = var.get("value")
            if val is None:
                continue
            present_runs.append(var.get("run"))
            if isinstance(val, dict):
                label = str(
                    val.get("action") or val.get("description_verbatim") or ""
                )
            else:
                label = str(val)
        pat = None
        for key, p in field_patterns.items():
            if key.lower() in label.lower() or label.lower() in key.lower():
                pat = p
                break
        locs = locate(pat) if pat else []
        emit = emitted.get(label.lower(), [])
        # Classify
        multi = len(locs) > 1
        omission = len(present_runs) < 3 and len(present_runs) >= 1
        if multi and omission:
            cls = "(i) group-boundary / multi-group coverage + LLM omission"
        elif multi:
            cls = "(i) relevant text split/duplicated across groups"
        elif omission and locs:
            cls = "(iii) LLM omission with text in one/few groups (not partition nondet)"
        elif not locs:
            cls = "(iii) cue sparse/missing in routed excerpts"
        else:
            cls = "(ii) genuine ambiguity / optional feature"
        # GX needed_for flap: different needed_for across runs
        if "GX device" in label or "GlobalLink" in label:
            needed = []
            for var in variants:
                val = var.get("value")
                if isinstance(val, dict):
                    needed.append(
                        f"run{var.get('run')}→{val.get('needed_for')}"
                    )
            cls = (
                "(ii)/(iii) same product phrase; runs disagree on needed_for "
                f"({', '.join(needed)}); not partition nondeterminism"
            )
        print(
            f"| `{label}` | {present_runs} | {locs} | {emit or '—'} | {cls} |"
        )

    print()
    print("Hypothesis: partitioning nondeterministic → KILLED "
          "(identical groups under reversed excerpt order).")
    print(
        "Most flaps are LLM presence/omission across N=3 on a fixed partition; "
        "multi-group cues are common (chapter_5 + chapter_8) but boundaries "
        "are stable."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
