"""Global Stage 4 composition rules — all sections, all vessels.

Spec: equipment-classification-spec-v4.15.md (+ tips through v4.21).

No section-specific or vessel-specific logic. Batteries & Energy drafts are
founding counterexamples only (documented in the spec, not encoded here).
"""

from __future__ import annotations

import re
from typing import Any

# Contexts that count as a sourced occasion for an operator action.
_OCCASION_CONTEXTS = frozenset(
    {"daily", "emergency", "maintenance", "commissioning"}
)

# Canonical spine (slots may be omitted when empty).
SECTION_SPINE: tuple[str, ...] = (
    "capability_summary",
    "how_it_works",
    "monitoring",
    "adjusting",
    "troubleshooting",
    "reference",
)

# Legacy composer block names → spine slots.
BLOCK_ALIASES: dict[str, str] = {
    "charging": "how_it_works",
    "inverter": "adjusting",
}

# Internal / system phrasing → owner language (founding examples).
# Includes provenance-leak tokens that belong only in the provenance map
# (v4.9 confidence-via-phrasing; elevated to global xxxiv in v4.18).
_INTERNAL_PHRASE_RES: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bprotective status\b", re.I),
        "protective status",
    ),
    (
        re.compile(r"\bsurveyed\b", re.I),
        "surveyed",
    ),
    (
        re.compile(r"\battested\b", re.I),
        "attested",
    ),
    (
        re.compile(r"\bper inspection\b", re.I),
        "per inspection",
    ),
    (
        re.compile(r"\bowner[\s-]survey\b", re.I),
        "owner-survey",
    ),
    (
        re.compile(r"\bsurvey estimate\b", re.I),
        "survey estimate",
    ),
)

WISDOM_PENDING = "pending"
WISDOM_FILLED = "filled"

# Quantities that must not be restated by the wisdom-slot inference when they
# already appear in capability/identity prose (this section or pointed-to).
_QTY_TOKEN_RE = re.compile(
    r"(?P<num>\d+(?:[.,]\d+)?(?:\s*[–\-]\s*\d+(?:[.,]\d+)?)?)\s*"
    r"(?P<unit>kwh|kw|w)\b",
    re.I,
)


def _normalize_qty_token(num: str, unit: str) -> str:
    n = re.sub(r"\s+", "", num.replace(",", ".").replace("-", "–"))
    return f"{n}|{unit.lower()}"


def extract_capacity_quantity_tokens(text: str) -> set[str]:
    """Normalize kW / kWh / W quantity phrases for restatement compare."""
    out: set[str] = set()
    for m in _QTY_TOKEN_RE.finditer(text or ""):
        out.add(_normalize_qty_token(m.group("num"), m.group("unit")))
    return out


def normalize_block(block: str) -> str:
    b = str(block or "").strip()
    return BLOCK_ALIASES.get(b, b)


def spine_index(block: str) -> int | None:
    norm = normalize_block(block)
    try:
        return SECTION_SPINE.index(norm)
    except ValueError:
        return None


def lint_spine_order(block_order: list[str]) -> list[dict[str, str]]:
    """xxxii — emitted blocks must be non-decreasing along the spine."""
    warnings: list[dict[str, str]] = []
    last = -1
    for raw in block_order:
        idx = spine_index(raw)
        if idx is None:
            warnings.append(
                {
                    "code": "unknown_spine_block",
                    "block": raw,
                    "guidance": (
                        "Block is not on the global section spine and has no "
                        "alias — rename or extend BLOCK_ALIASES in spec."
                    ),
                }
            )
            continue
        if idx < last:
            warnings.append(
                {
                    "code": "spine_order_violation",
                    "block": raw,
                    "normalized": normalize_block(raw),
                    "guidance": (
                        "Section-scope ordering: blocks must follow "
                        "capability → how_it_works → monitoring → adjusting → "
                        "troubleshooting → reference."
                    ),
                }
            )
        last = max(last, idx)
    return warnings


def lint_xref_slot_consolidation(
    guide_links: list[dict[str, Any]],
    provenance_map: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Same xref target must not appear in two non-adjacent spine slots."""
    # Map sentence_id → block
    sid_block = {
        str(p.get("id")): normalize_block(str(p.get("block") or ""))
        for p in provenance_map
    }
    by_target: dict[str, set[str]] = {}
    for link in guide_links or []:
        tid = str(link.get("target_id") or "").strip()
        if not tid:
            continue
        block = normalize_block(
            str(link.get("block") or sid_block.get(str(link.get("sentence_id")), ""))
        )
        if block:
            by_target.setdefault(tid, set()).add(block)

    warnings: list[dict[str, str]] = []
    for tid, blocks in by_target.items():
        if len(blocks) < 2:
            continue
        idxs = sorted(
            i for i in (spine_index(b) for b in blocks) if i is not None
        )
        if not idxs:
            continue
        # Non-adjacent if span > number of distinct blocks - 1 gaps allowed only if contiguous
        if idxs[-1] - idxs[0] > len(idxs) - 1:
            warnings.append(
                {
                    "code": "xref_not_consolidated",
                    "target_id": tid,
                    "blocks": ", ".join(sorted(blocks)),
                    "guidance": (
                        "Cross-references to the same section must be "
                        "consolidated — not repeated in non-adjacent spine slots."
                    ),
                }
            )
    return warnings


def _catalog_base_key(raw: str) -> str:
    """Normalize instance keys for orphan grouping (no section-specific names)."""
    base = str(raw or "").strip()
    # Repeatedly strip trailing _<digits> (e.g. victron_mppt_150_60 → victron_mppt).
    while True:
        nxt = re.sub(r"_\d+$", "", base)
        if nxt == base:
            break
        base = nxt
    base = re.sub(r"_(port|stbd)$", "", base, flags=re.I)
    return base


def _device_keys_from_sources(sources: list[Any]) -> set[str]:
    out: set[str] = set()
    for s in sources or []:
        text = str(s or "")
        m = re.match(r"graph\.device:(.+)$", text)
        if m:
            out.add(_catalog_base_key(m.group(1)))
    return out


def _looks_complete_orphan_treatment(sentence: str) -> bool:
    """Minimal complete = contribution + owner interaction cue."""
    s = (sentence or "").lower()
    contributes = bool(
        re.search(
            r"\b(charge|charg|power|feed|supply|generat|contribute|provide)\b",
            s,
        )
    )
    interacts = bool(
        re.search(
            r"\b(brake|stop|reset|open|press|set|checks?|watch|use|when|"
            r"victronconnect)\b",
            s,
        )
    )
    return contributes and interacts


def lint_orphan_facts(
    provenance_map: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """xxxiii — single-sentence devices need complete treatment or reference."""
    by_device: dict[str, list[dict[str, Any]]] = {}
    for row in provenance_map or []:
        if row.get("kind") == "composed_inference" and not str(
            row.get("sentence") or ""
        ).strip():
            continue
        for dev in _device_keys_from_sources(list(row.get("sources") or [])):
            by_device.setdefault(dev, []).append(row)

    warnings: list[dict[str, str]] = []
    for dev, rows in by_device.items():
        if len(rows) != 1:
            continue
        row = rows[0]
        block = normalize_block(str(row.get("block") or ""))
        sentence = str(row.get("sentence") or "")
        if block == "reference":
            continue
        if _looks_complete_orphan_treatment(sentence):
            continue
        warnings.append(
            {
                "code": "orphan_fact",
                "device": dev,
                "sentence_id": str(row.get("id") or ""),
                "block": block,
                "guidance": (
                    "Orphan-fact rule: give a minimal complete treatment "
                    "(what it does + when the owner interacts) or demote to "
                    "the reference block."
                ),
            }
        )
    return warnings


def lint_internal_vocabulary(text: str) -> list[dict[str, str]]:
    """xxxiv — internal/system phrasing banned in guest prose."""
    warnings: list[dict[str, str]] = []
    seen: set[str] = set()
    for pat, label in _INTERNAL_PHRASE_RES:
        for m in pat.finditer(text or ""):
            hit = m.group(0)
            key = hit.lower()
            if key in seen:
                continue
            seen.add(key)
            warnings.append(
                {
                    "code": "internal_phrase",
                    "match": hit,
                    "pattern": label,
                    "guidance": (
                        "Prefer owner language. Provenance tokens "
                        "('surveyed', 'attested', 'per inspection', "
                        "'protective status', …) stay in the provenance map "
                        "— express confidence with about/ranges in prose."
                    ),
                }
            )
    return warnings


def ensure_wisdom_slot(
    composed: dict[str, Any],
) -> dict[str, Any]:
    """Return wisdom_slot dict; invent pending only when absent and no inference."""
    existing = composed.get("wisdom_slot")
    if isinstance(existing, dict) and existing.get("status"):
        return dict(existing)
    inferences = [
        p
        for p in (composed.get("provenance_map") or [])
        if (
            p.get("composed_inference")
            or p.get("kind") == "composed_inference"
        )
        and str(p.get("sentence") or "").strip()
    ]
    preferred = [
        p
        for p in inferences
        if normalize_block(str(p.get("block") or "")) != "capability_summary"
    ]
    pick = preferred or inferences
    if pick:
        return {
            "status": WISDOM_FILLED,
            "sentence_id": pick[0].get("id"),
            "block": pick[0].get("block"),
        }
    return {
        "status": WISDOM_PENDING,
        "sentence_id": None,
        "block": None,
        "note": (
            "Operate-tier wisdom pending section-specific round "
            "(global slot only)."
        ),
    }


def lint_wisdom_quantity_restatement(
    composed: dict[str, Any],
    *,
    peer_capability_texts: list[str] | None = None,
) -> list[dict[str, str]]:
    """xxxv — wisdom composed_inference must not restate capability quantities.

    Wisdom must add behavior, comparison, or guidance. Restating a kW/kWh/W
    figure already present in this section's capability/identity sentences or
    in pointed-to section capability prose fails even when fully sourced.
    """
    wisdom = ensure_wisdom_slot(composed)
    if wisdom.get("status") != WISDOM_FILLED:
        return []
    prov = list(composed.get("provenance_map") or [])
    by_id = {str(p.get("id")): p for p in prov}
    sid = str(wisdom.get("sentence_id") or "")
    row = by_id.get(sid)
    if row is None:
        for p in prov:
            if not (
                p.get("composed_inference")
                or p.get("kind") == "composed_inference"
            ):
                continue
            if not str(p.get("sentence") or "").strip():
                continue
            if normalize_block(str(p.get("block") or "")) == "capability_summary":
                continue
            row = p
            break
    if row is None:
        return []

    sentence = str(row.get("sentence") or "").strip()
    warnings: list[dict[str, str]] = []
    block = normalize_block(str(row.get("block") or wisdom.get("block") or ""))
    if block == "capability_summary":
        warnings.append(
            {
                "code": "wisdom_is_capability_identity",
                "sentence_id": str(row.get("id") or sid),
                "guidance": (
                    "Wisdom-slot composed_inference must be behavior, "
                    "comparison, or guidance — not the capability/identity "
                    "sentence itself (xxxv / v4.20)."
                ),
            }
        )

    capability_corpus: list[str] = []
    for p in prov:
        if normalize_block(str(p.get("block") or "")) != "capability_summary":
            continue
        text = str(p.get("sentence") or "").strip()
        if text:
            capability_corpus.append(text)
    for text in peer_capability_texts or []:
        if str(text or "").strip():
            capability_corpus.append(str(text))
    for text in composed.get("pointed_section_capability_sentences") or []:
        if str(text or "").strip():
            capability_corpus.append(str(text))

    wisdom_qty = extract_capacity_quantity_tokens(sentence)
    if not wisdom_qty:
        return warnings

    cap_qty: set[str] = set()
    for text in capability_corpus:
        cap_qty |= extract_capacity_quantity_tokens(text)
    overlap = wisdom_qty & cap_qty
    if overlap:
        warnings.append(
            {
                "code": "wisdom_quantity_restatement",
                "sentence_id": str(row.get("id") or sid),
                "overlap": ",".join(sorted(overlap)),
                "guidance": (
                    "Wisdom-slot composed_inference must not restate "
                    "capability/identity quantities already stated in this "
                    "section or a pointed-to section — use behavior, "
                    "comparison, or guidance instead (xxxv / v4.20). "
                    "Sourced restatement still fails."
                ),
            }
        )
    return warnings


_SENTENCE_INITIAL_NUMERAL_RE = re.compile(
    r"(?:^|\n\n+)(?P<num>\d[\d,.]*)\s+\S",
    re.M,
)

_ONES = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
}


def spell_sentence_initial_number(n: int) -> str:
    """Spell small integers for sentence-initial use (capitalize separately)."""
    if n in _ONES:
        return _ONES[n]
    return str(n)


def lint_sentence_initial_numerals(text: str) -> list[dict[str, str]]:
    """xxxvii — guest prose must not start a sentence with Arabic digits."""
    warnings: list[dict[str, str]] = []
    # Strip markdown title lines
    body = re.sub(r"(?m)^#.+$", "", text or "")
    for m in _SENTENCE_INITIAL_NUMERAL_RE.finditer(body):
        # Allow pure ranges like "1.6–1.8" only mid-sentence; at start still flag
        warnings.append(
            {
                "code": "sentence_initial_numeral",
                "match": m.group("num"),
                "guidance": (
                    "Spell out numbers that begin a sentence "
                    "('Two inverter-chargers…')."
                ),
            }
        )
    return warnings


def lint_same_breath_capability(
    provenance_map: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """xxxvi — identity then capacity/rating must not be adjacent split sentences."""
    cap = [
        p
        for p in provenance_map or []
        if normalize_block(str(p.get("block") or "")) == "capability_summary"
        and str(p.get("sentence") or "").strip()
    ]
    warnings: list[dict[str, str]] = []
    for a, b in zip(cap, cap[1:]):
        sa = str(a.get("sentence") or "").lower()
        sb = str(b.get("sentence") or "").lower()
        identity_ish = bool(
            re.search(r"\b(bank|batter(?:y|ies)|system|array)\b", sa)
        ) and not bool(re.search(r"\b(kwh|kw\b|capacity|rated)\b", sa))
        capacity_ish = bool(re.search(r"\b(kwh|capacity|rated)\b", sb))
        if identity_ish and capacity_ish:
            warnings.append(
                {
                    "code": "same_breath_split",
                    "sentence_ids": f"{a.get('id')},{b.get('id')}",
                    "guidance": (
                        "Identity and capacity/rating for the same group must "
                        "appear in the same breath (one paragraph), per v4.9/"
                        "v4.16 — not consecutive capability sentences."
                    ),
                }
            )
    return warnings


_EVASIVE_ADJUSTING_RES = (
    re.compile(
        r"\bset it on the .+ you are adjusting\b",
        re.I,
    ),
    re.compile(
        r"\bon the (?:device|unit|equipment) you are (?:using|adjusting)\b",
        re.I,
    ),
)


def lint_evasive_adjusting_instructions(text: str) -> list[dict[str, str]]:
    """xxxviii — adjusting prose must not dodge the control surface."""
    warnings: list[dict[str, str]] = []
    for pat in _EVASIVE_ADJUSTING_RES:
        for m in pat.finditer(text or ""):
            warnings.append(
                {
                    "code": "evasive_adjusting_instruction",
                    "match": m.group(0),
                    "guidance": (
                        "Name the profile control surface(s) and any documented "
                        "station page, or drop-and-report if sources cannot say."
                    ),
                }
            )
    return warnings


def action_has_sourced_occasion(action: dict[str, Any] | None) -> bool:
    """True when an operator_action carries a sourced when/why occasion.

    ``context=situational`` alone is not an occasion. Daily / emergency /
    maintenance contexts count. Action verbs that embed after/when/before/if
    also count. Explicit when/trigger/occasion fields count when present.
    Circular occasions (purpose restates the action) do **not** count (v4.29 /
    xxxix) — treat as unoccasioned.
    """
    if not isinstance(action, dict):
        return False
    for key in ("when", "trigger", "occasion", "why"):
        val = str(action.get(key) or "").strip()
        if not val:
            continue
        if key == "occasion":
            from interaction_profile_validate import occasion_is_circular

            if occasion_is_circular(str(action.get("action") or ""), val):
                continue
        return True
    ctx = str(action.get("context") or "").strip().lower()
    if ctx in _OCCASION_CONTEXTS:
        return True
    act = str(action.get("action") or "")
    if re.search(r"\b(after|when|before|if|during|once|whenever)\b", act, re.I):
        return True
    return False


_POINTER_PHRASE_RE = re.compile(
    r"(?:can be found in the .+? section of this guide|"
    r"(?:are|is) in the .+? notes that accompany(?: this chapter)?|"
    r"notes that accompany this chapter)",
    re.I,
)

_IMPERATIVE_CUE_RE = re.compile(
    r"(?:^|(?<=[.!?]\s)|(?<=—\s)|(?<=–\s)|(?<=;\s)|(?<=,\s))"
    r"(?P<verb>Use|Set|Change|Open|Press|Reset|Watch|Check|Turn|Shut|"
    r"Apply|Activate|configure)\b",
    re.M,
)

_OCCASION_PROSE_CUE_RE = re.compile(
    r"\b(?:"
    r"when|whenever|if|after|before|once|until|during|"
    r"as part of|day-to-day|daily|"
    r"under (?:sail|way)|at anchor|"
    r"in (?:an )?emergency|for recovery|"
    r"protective disconnect"
    r")\b",
    re.I,
)


def _sentence_split(paragraph: str) -> list[str]:
    text = (paragraph or "").strip()
    if not text:
        return []
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def lint_pointer_paragraph_final(text: str) -> list[dict[str, str]]:
    """xl — leaf/section pointers must be the final sentence of their paragraph."""
    warnings: list[dict[str, str]] = []
    body = re.sub(r"(?m)^#.+$", "", text or "")
    for para in re.split(r"\n\s*\n+", body):
        sents = _sentence_split(para)
        if len(sents) < 2:
            continue
        for i, sent in enumerate(sents):
            if _POINTER_PHRASE_RE.search(sent) and i < len(sents) - 1:
                warnings.append(
                    {
                        "code": "pointer_not_paragraph_final",
                        "match": sent[:120],
                        "guidance": (
                            "Cross-section / leaf pointers that share a paragraph "
                            "with other content must be the final sentence of "
                            "that paragraph."
                        ),
                    }
                )
                break
    return warnings


def lint_instruction_occasions(
    text: str,
    provenance_map: list[dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    """xxxix — rendered instructions need a when/why occasion in the same sentence.

    Reference-block sentences are exempt (capability inventory, not imperatives).
    """
    ref_sents: set[str] = set()
    for row in provenance_map or []:
        if normalize_block(str(row.get("block") or "")) == "reference":
            s = str(row.get("sentence") or "").strip()
            if s:
                ref_sents.add(s)

    warnings: list[dict[str, str]] = []
    body = re.sub(r"(?m)^#.+$", "", text or "")
    for para in re.split(r"\n\s*\n+", body):
        for sent in _sentence_split(para):
            if sent in ref_sents:
                continue
            if not _IMPERATIVE_CUE_RE.search(sent):
                continue
            if _OCCASION_PROSE_CUE_RE.search(sent):
                continue
            m = _IMPERATIVE_CUE_RE.search(sent)
            warnings.append(
                {
                    "code": "instruction_missing_occasion",
                    "match": sent[:140],
                    "verb": (m.group("verb") if m else ""),
                    "guidance": (
                        "Every rendered instruction must carry a sourced "
                        "occasion (when/why). If none exists, demote to "
                        "reference rather than a floating imperative."
                    ),
                }
            )
    return warnings


_NAV_STATE_RE = re.compile(
    r"\b(?:under\s+way|underway|under\s+sail)\b",
    re.I,
)
_ALTERNATOR_CHARGE_RE = re.compile(
    r"\b(?:alternators?|engine[- ]driven\s+charg(?:e|ing|ers?))\b",
    re.I,
)
_ENGINE_ENABLING_RE = re.compile(
    r"\b(?:engines?\s+(?:are\s+)?running|while\s+motoring|when\s+motoring)\b",
    re.I,
)


def lint_charge_path_enabling_conditions(text: str) -> list[dict[str, str]]:
    """xli — charge-path comparisons must name enabling conditions, not nav state.

    Navigation state (under way / under sail) must not stand in for
    engine-driven / alternator charging. Solar boom-shade lines that say
    "Under sail" without claiming alternator charge are fine.
    """
    warnings: list[dict[str, str]] = []
    body = re.sub(r"(?m)^#.+$", "", text or "")
    for para in re.split(r"\n\s*\n+", body):
        for sent in _sentence_split(para):
            if not _NAV_STATE_RE.search(sent):
                continue
            if not _ALTERNATOR_CHARGE_RE.search(sent):
                continue
            if _ENGINE_ENABLING_RE.search(sent):
                continue
            warnings.append(
                {
                    "code": "charge_path_nav_proxy",
                    "match": sent[:160],
                    "guidance": (
                        "Name each charge source's enabling condition "
                        "(e.g. engines running for alternators; sun/shade "
                        "for solar). Do not use vessel underway/under-sail "
                        "state as a proxy for engine-driven charging."
                    ),
                }
            )
    return warnings


def assess_global_composition(
    composed: dict[str, Any],
    *,
    require_filled_wisdom: bool = False,
    peer_capability_texts: list[str] | None = None,
) -> dict[str, Any]:
    """Aggregate global composition checks (xxxii–xli); xxxv includes v4.20."""
    draft = str(composed.get("draft_markdown") or "")
    block_order = list(composed.get("block_order") or [])
    prov = list(composed.get("provenance_map") or [])
    links = list(composed.get("guide_links") or [])
    sid_block = {str(p.get("id")): p.get("block") for p in prov}
    enriched_links = []
    for link in links:
        row = dict(link)
        if not row.get("block"):
            row["block"] = sid_block.get(str(row.get("sentence_id")))
        enriched_links.append(row)

    wisdom = ensure_wisdom_slot(composed)
    spine_hits = lint_spine_order(block_order)
    xref_hits = lint_xref_slot_consolidation(enriched_links, prov)
    orphan_hits = lint_orphan_facts(prov)
    vocab_hits = lint_internal_vocabulary(draft)
    same_breath_hits = lint_same_breath_capability(prov)
    numeral_hits = lint_sentence_initial_numerals(draft)
    evasive_hits = lint_evasive_adjusting_instructions(draft)
    occasion_hits = lint_instruction_occasions(draft, prov)
    pointer_hits = lint_pointer_paragraph_final(draft)
    wisdom_restatement_hits = lint_wisdom_quantity_restatement(
        composed, peer_capability_texts=peer_capability_texts
    )
    charge_path_hits = lint_charge_path_enabling_conditions(draft)

    wisdom_ok = (
        (
            wisdom.get("status") == WISDOM_FILLED
            or (
                not require_filled_wisdom
                and wisdom.get("status") == WISDOM_PENDING
            )
        )
        and len(wisdom_restatement_hits) == 0
    )

    checks = {
        "spine_order_ok": len(spine_hits) == 0,
        "xref_consolidated": len(xref_hits) == 0,
        "orphan_facts_ok": len(orphan_hits) == 0,
        "owner_vocabulary_ok": len(vocab_hits) == 0,
        "wisdom_slot_ok": wisdom_ok,
        "same_breath_ok": len(same_breath_hits) == 0,
        "sentence_initial_numerals_ok": len(numeral_hits) == 0,
        "surface_bound_adjusting_ok": len(evasive_hits) == 0,
        "instruction_occasion_ok": len(occasion_hits) == 0,
        "pointer_paragraph_final_ok": len(pointer_hits) == 0,
        "charge_path_enabling_ok": len(charge_path_hits) == 0,
    }
    return {
        "checks": checks,
        "pass": all(checks.values()),
        "wisdom_slot": wisdom,
        "findings": {
            "spine": spine_hits,
            "xref": xref_hits,
            "orphan": orphan_hits,
            "vocabulary": vocab_hits,
            "same_breath": same_breath_hits,
            "sentence_initial_numerals": numeral_hits,
            "evasive_adjusting": evasive_hits,
            "instruction_occasion": occasion_hits,
            "pointer_paragraph_final": pointer_hits,
            "wisdom_restatement": wisdom_restatement_hits,
            "charge_path_enabling": charge_path_hits,
        },
        "version": "v4.21",
        "criteria": [
            "xxxii",
            "xxxiii",
            "xxxiv",
            "xxxv",
            "xxxvi",
            "xxxvii",
            "xxxviii",
            "xxxix",
            "xl",
            "xli",
        ],
    }
