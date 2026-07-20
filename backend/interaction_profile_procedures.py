"""Stage 1 procedure inventory — reference-free recall check (v4.2 / v4.3 / v4.24).

Builds a procedure / enumerated-alternative inventory from routed excerpts
(heuristics first; optional cheap LLM fallback when a group yields nothing),
reconciles against the **full profile** (extracted+derived actions,
control_surfaces, requires_devices), and emits ``procedure_unaccounted`` /
``alternative_unaccounted`` warnings.

Sibling-only features in multi-variant manuals classify as
``not_applicable:other_variant`` (v4.24) — not unaccounted, not repair.

Targeted map-retry repair is **enabled** but **scoped** to adjudicated
classes only (v4.3). Non-adjudicated unaccounted items keep their flags.
"""

from __future__ import annotations

import re
from copy import deepcopy
from typing import Any, Callable

from interaction_profile_merge import fuzzy_text_similar
from interaction_profile_vote import item_grounded_in_excerpts

# Gate on; repair still filters to ADJUDICATED_REPAIR_IDS only.
PROCEDURE_REPAIR_ENABLED = True

DETERMINISTIC_FILL = "deterministic_fill"
PROCEDURE_UNACCOUNTED = "procedure_unaccounted"
ALTERNATIVE_UNACCOUNTED = "alternative_unaccounted"

# Inventory kinds that may receive a deterministic action fill (not alts / modes).
_DETERMINISTIC_FILL_KINDS = frozenset({"headed_procedure", "numbered_heading"})

# Six adjudicated residual items (SmartSolar×3 + Combi×2 + MLI×1).
ADJUDICATED_REPAIR_IDS = (
    "smartsolar_sunset",
    "smartsolar_firmware",
    "smartsolar_globallink",
    "combi_gen_mains",
    "combi_power_sharing",
    "mli_panel_alts",
)

_ADJUDICATION_TRAILER_NOTES: dict[str, str] = {
    "smartsolar_sunset": (
        "Setting the Sunset action: extract the operator setting/behavior as "
        "the manual frames it."
    ),
    "smartsolar_firmware": (
        "Updating firmware: extract the firmware-update action as the manual "
        "frames it (VictronConnect path is fine)."
    ),
    "smartsolar_globallink": (
        "GlobalLink 520: emit as a separate requires_devices alternative to "
        "GX device (same needed_for); do not collapse into a single OR string."
    ),
    "combi_gen_mains": (
        "Gen-/Mains support: extract as the manual frames it (mode selection / "
        "behavior). Installer audience is acceptable if that is what the text "
        "says; step-form is not required."
    ),
    "combi_power_sharing": (
        "Power sharing mode: extract as the manual frames it (mode selection / "
        "behavior). Installer audience is acceptable if that is what the text "
        "says; step-form is not required."
    ),
    "mli_panel_alts": (
        "SmartRemote / EasyView 5: emit separate requires_devices entries for "
        "each alternative. If the manual presents them as alternatives to "
        "MasterView, use the same needed_for as the MasterView family."
    ),
}

_PANEL_FAMILY_RE = re.compile(
    r"(?i)\b(MasterView|SmartRemote|EasyView(?:\s*5)?)\b"
)

# Numbered chapter/section title: "5.3. Updating firmware" / "5.4 Disabling…"
_NUMBERED_HEADING_RE = re.compile(
    r"(?m)^(?P<num>\d+(?:\.\d+){0,3})\.?\s+"
    r"(?P<title>[A-Z][^\n]{2,80}?)"
    r"(?:\s*\.{2,}|\s*$)",
)

# Imperative / gerund procedure titles (line-start).
_IMPERATIVE_TITLE_RE = re.compile(
    r"(?mi)^(?P<title>"
    r"(?:Updating|Update|Disabling and enabling|Enabling and disabling|"
    r"Turning|Set(?:ting)? the|Configure|Configuring|"
    r"Shutdown and restart(?:\s+procedure)?|Restart|Shutdown|"
    r"How to|To (?:disable|enable|update|set|configure|connect|install))\b"
    r"[^\n.]{0,80})"
)

_STEP_BLOCK_RE = re.compile(
    r"(?mi)(?:^|\n)\s*(?:(?:\d+)[\.\)]\s+\S|•\s+\S|-\s+\S).{8,}",
)

_IMPERATIVE_VERB_RE = re.compile(
    r"(?i)\b("
    r"updat(?:e|ing)|disabl(?:e|ing)|enabl(?:e|ing)|set(?:ting)?|"
    r"configur(?:e|ing)|turn(?:ing)?|shut\s*-?down|restart|"
    r"connect(?:ing)?|install(?:ing)?|monitor(?:ing)?|"
    r"how to|to (?:disable|enable|update|set|configure|connect)|"
    r"perform|adjust(?:ing)?|switch(?:ing)?|procedure"
    r")\b"
)

_PROCEDURE_SHAPED_HEADING_RE = re.compile(
    r"(?i)^("
    r"Updating|Disabling and enabling|Enabling and disabling|"
    r"Setting the|Shutdown and restart|Turning|How to|To |"
    r".*\bprocedure\b"
    r")"
)

# Spec / front-matter / TOC / captions dropped or auto-classified.
_SPEC_FRONT_RE = re.compile(
    r"(?i)\b("
    r"contents|table of contents|index|glossary|warranty|liability|"
    r"technical data|specifications?|dimensions?|wiring diagram|"
    r"safety (?:instructions|precautions)|important safety|disclaimer|"
    r"introduction|about this manual|revision history|"
    r"fcc|industry canada|compliance|features\b"
    r")\b"
)

_INSTALLER_AUDIENCE_RE = re.compile(
    r"(?i)\b("
    r"DIP[- ]?switch(?:es)?|MasterAdjust|CZone Configuration Tool|"
    r"configuration tool|consult (?:your )?dealer|qualified (?:personnel|installer)|"
    r"connection compartment|wiring|mounting|commissioning|"
    r"installer|distributor|"
    r"set DIP|backbone|tee connector|"
    r"cluster(?:s)? in (?:MasterAdjust|CZone)|Configure Topology|"
    r"NMEA2000 Instances|circuits? tab|"
    r"Place the DC[- ]?fuse|Things you need|"
    r"batteries in series|parallel sets|"
    # CZone / MasterAdjust UI wizard steps (installer_or_technician)
    r"\bclick\b|drop-?down list|tick show|advanced settings|"
    r"alarm severities|battery alarm|switch type|switch \(output\)|"
    r"off/restore|single throw|relay type|"
    r"MasterBus cable to the other|connect to the MLI|"
    r"how to (?:set up|activate|create) a (?:MasterBus|CZone|cluster)|"
    r"switch (?:on|off) (?:(?:some|all) )?loads(?:\s+and\s+chargers)?|"
    r"maintenance procedure"
    r")\b"
)

# Bare install wiring / terminal steps — always installer, not operator recall.
_WIRING_INSTALL_RE = re.compile(
    r"(?i)^(?:"
    r"Connect\b.+\b(?:"
    r"Inputs?|Outputs?|IN-[A-Z]|OUT-[A-Z]|DC\s+Positive|DC\s+Negative|"
    r"Breakout|terminal|stud|connector|Negative|Positive|Analogue|Analog"
    r")"
    r"|Turn the switch/circuit breaker on supplying"
    r"|.+\bmain positive stud\b"
    r"|Digital Switch Input Connector"
    r"|Connect DC (?:Positive|Negative)\b"
    r"|Connect (?:High|Low)-Current Outputs?\b"
    r"|Connect Analogue Inputs?\b"
    r"|Connect the Digital Switch Breakout\b"
    r")"
)

_TRUNCATED_TITLE_TAIL_RE = re.compile(
    r"(?i)\b(must|when|the|a|an|to|for|of|and|or|with|by|is|are)$"
)


def _is_truncated_title(title: str) -> bool:
    """True when a heading looks cut by chunk/excerpt clipping."""
    t = (title or "").strip().rstrip(":").strip()
    if not t:
        return False
    if _TRUNCATED_TITLE_TAIL_RE.search(t):
        return True
    words = t.split()
    # "How to SE" / "How to set" (incomplete how-to)
    if (
        len(words) >= 3
        and words[0].lower() == "how"
        and words[1].lower() == "to"
        and len(words) <= 4
        and len(words[-1]) <= 4
    ):
        return True
    if re.search(r"(?i)^how\s+to\s+\w{1,4}$", t):
        return True
    # Unbalanced open paren / bracket (wrapped heading cut mid-line).
    if t.count("(") > t.count(")") or t.count("[") > t.count("]"):
        return True
    # Ends mid-word: last token ALLCAPS length 2–4 on a short title.
    if (
        words
        and words[-1].isupper()
        and words[-1].isalpha()
        and 2 <= len(words[-1]) <= 4
        and len(t) <= 24
    ):
        return True
    return False


_FIGURE_CAPTION_RE = re.compile(
    r"(?i)("
    r"\bfig(?:ure)?\.?\s*\d|"
    r"\btable\s*\d|"
    r"display with front switch|"
    r"\d+\.\s+[A-Z][a-z].*\d+\.\s+[A-Z]|"  # numbered callout rows
    r"OUT-\d|sync connector"
    r")"
)

_SPEC_FRAGMENT_RE = re.compile(
    r"(?i)^("
    r"A?\s*\d+\s*\.\.?\s*\d+\s*A.*"  # A 1-30 A / 1..150 A
    r"|AN\s+\w+"  # AN Amsterdam
    r"|V every\b.*"
    r"|CZONE®?"
    r")$"
)

_BARE_CHAPTER_RE = re.compile(
    r"(?i)^(operation|operation modes|operation policies|monitoring|"
    r"maintenance|maintenance procedure|configuration|troubleshooting|"
    r"trouble shooting table|"
    r"protections|features|bluetooth|start up|battery|grounding|"
    r"connection overview|virtual load output|streetlight settings|"
    r"battery settings|load output settings|tx port settings|"
    r"rx port settings|ve\.smart networking(?:\s+setup)?|"
    r"output 1 and 2|"
    r"masterbus (?:configuration|alarms)|list of event sources|"
    r"temperature compensated charging|"
    r"flexible charge algorithm|adaptive 3-stage battery charging|"
    r"masterbus on the mli ultra|correct disposal of this product|"
    r"update|connect|restart when|restart attempts exceeded|"
    r"to set up a new network|how to set up a masterbus network|"
    r"switch on some loads|switch off all loads(?: and chargers)?|"
    r"set the state to on|set the required alarm levels.*"
    r")$"
)

# Operator-mode procedure titles — NEVER installer-classify or structure-filter.
# These are true-positive recall candidates (power-assist / sharing family).
_OPERATOR_MODE_PROTECT_RE = re.compile(
    r"(?i)\b("
    r"gen-?/mains\s+support|generator\s*/?\s*mains\s+support|"
    r"mains\s+support|generator\s+support|"
    r"power\s+sharing(?:\s+mode)?|power\s+assist|"
    r"power\s+support"
    r")\b"
)

_ERROR_CODE_HEADING_RE = re.compile(
    r"(?i)^error\s+\d+|error\s+\d+\s+to\s+\d+|interrupted firmware update|"
    r"bluetooth check|communication issues|voltage sensing|"
    r"blown fuse|reverse battery|battery cable|batteries are overcharged|"
    r"pv voltage too high|dc load too high|battery is full|"
    r"load output not able|solar charger is externally|"
    r"disabled in the settings|temperature compensation|"
    r"internal temperature|battery (?:voltage|charge voltage) setting"
)


def _excerpt_text(item: dict[str, Any] | str) -> str:
    if isinstance(item, str):
        return item
    if not isinstance(item, dict):
        return ""
    for key in ("text", "content", "excerpt", "body"):
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val
    return ""


def _excerpt_heading(item: dict[str, Any] | str) -> str:
    if not isinstance(item, dict):
        return ""
    return str(item.get("source_heading_guess") or "").strip()


def _normalize_title(title: str) -> str:
    t = " ".join((title or "").split())
    t = t.strip(" .:—–-")
    if len(t) > 100:
        t = t[:100].rsplit(" ", 1)[0]
    return t


def _has_step_body(snippet: str) -> bool:
    return bool(_STEP_BLOCK_RE.search(snippet or ""))


def _is_toc_artifact(title: str, snippet: str) -> bool:
    blob = f"{title}\n{snippet}"
    # Dotted TOC leaders + page numbers.
    if re.search(r"\.{4,}\s*\d+\s*$", snippet.strip(), re.M):
        return True
    if re.search(r"\.{4,}", title):
        return True
    # TOC dump line that lists many section numbers.
    if len(re.findall(r"\b\d+\.\d+\b", blob)) >= 4 and not _has_step_body(snippet):
        return True
    return False


def _is_protected_operator_mode(title: str) -> bool:
    t = _normalize_title(title)
    if not _OPERATOR_MODE_PROTECT_RE.search(t):
        return False
    # Reject DIP-table dumps that merely *mention* the mode.
    if len(t) > 48:
        return False
    # Title should be dominated by the mode name (not a long sentence).
    if len(t.split()) > 6:
        return False
    return True


def _structural_reject_reason(title: str, snippet: str, *, kind: str) -> str | None:
    """Return filter id if rejected, else None. Protected operator-modes never reject."""
    title_n = _normalize_title(title)
    if _is_protected_operator_mode(title_n):
        return None
    if len(title_n) < 6:
        return "filter:too_short"
    if len(title_n.split()) < 2:
        return "filter:too_few_tokens"
    if _is_toc_artifact(title_n, snippet):
        return "filter:toc_artifact"
    if _FIGURE_CAPTION_RE.search(title_n):
        return "filter:figure_caption"
    if _SPEC_FRAGMENT_RE.match(title_n):
        return "filter:spec_fragment"
    if _SPEC_FRONT_RE.search(title_n) and not re.search(
        r"(?i)\b(update|firmware|bluetooth|sunset|shutdown|restart)\b", title_n
    ):
        return "filter:spec_or_front_matter"
    if _BARE_CHAPTER_RE.match(title_n) and not _has_step_body(snippet):
        return "filter:bare_chapter"
    if _is_truncated_title(title_n):
        return "filter:truncated_heading"
    if _ERROR_CODE_HEADING_RE.search(title_n):
        return "filter:error_code_heading"
    if not _IMPERATIVE_VERB_RE.search(title_n):
        return "filter:no_imperative_verb"
    shaped = bool(_PROCEDURE_SHAPED_HEADING_RE.search(title_n))
    steps = _has_step_body(snippet)
    if not (shaped or steps):
        return "filter:no_steps_or_procedure_heading"
    if kind == "numbered_heading" and not shaped and not steps:
        return "filter:numbered_heading_without_shape"
    return None


def _passes_structural_filter(title: str, snippet: str, *, kind: str) -> bool:
    return _structural_reject_reason(title, snippet, kind=kind) is None


def _classify_not_operator_relevant(
    title: str, snippet: str
) -> tuple[str | None, str | None]:
    """Return (classification_label, rule_id) or (None, None).

    Protected operator-mode titles never auto-classify as installer.
    """
    if _is_protected_operator_mode(title):
        return None, None
    blob = f"{title}\n{snippet}"
    if _SPEC_FRONT_RE.search(title) or re.search(
        r"(?i)\btechnical data\b|\bspecifications?\b", blob[:240]
    ):
        return "not_operator_relevant:spec_or_front_matter", "rule:spec_or_front_matter"
    if _WIRING_INSTALL_RE.search(title.strip()):
        return "not_operator_relevant:installer", "rule:installer:wiring_connect_step"
    if re.search(
        r"(?i)update firmware of devices on the network|updating device firmware",
        title,
    ):
        return "not_operator_relevant:installer", "rule:installer:network_firmware"
    m = _INSTALLER_AUDIENCE_RE.search(blob)
    if m:
        return "not_operator_relevant:installer", f"rule:installer:{m.group(0).lower()}"
    return None, None


# Multi-variant manuals: section scoped to sibling models only (Zeus founding).
_VARIANT_APPLIES_ONLY_RE = re.compile(
    r"(?is)(?:this\s+(?:functionality|feature|section|option)\s+)?"
    r"applies\s+to\s+(.+?)\s+only\b"
)
_VARIANT_FOR_UNITS_ONLY_RE = re.compile(
    r"(?is)\b(?:for|on)\s+(.+?)\s+(?:units?|models?|displays?)\s+only\b"
)
_VARIANT_AVAILABLE_ONLY_RE = re.compile(
    r"(?is)\b(?:available|supported)\s+only\s+(?:on|for|with)\s+(.+?)(?:\.|$|\n)"
)
_VARIANT_NOT_ON_RE = re.compile(
    r"(?is)\b(?:not\s+available|not\s+supported|does\s+not\s+apply|"
    r"not\s+applicable)\s+(?:on|for|to)\s+(.+?)(?:\.|$|\n)"
)


def _norm_model_phrase(text: str) -> str:
    s = (text or "").lower()
    s = s.replace("&", " ")
    s = re.sub(r"[®™]", "", s)
    s = re.sub(r"[^a-z0-9.\s]+", " ", s)
    return " ".join(s.split())


def _model_phrase_in(haystack: str, model: str) -> bool:
    """True when ``model`` appears in ``haystack`` as a whole-token phrase.

    Word boundaries prevent ``Zeus SR`` matching ``Zeus SRX``.
    """
    h = _norm_model_phrase(haystack)
    m = _norm_model_phrase(model)
    if not h or not m:
        return False
    pat = r"\b" + r"\s+".join(re.escape(t) for t in m.split()) + r"\b"
    return bool(re.search(pat, h))


def _split_variant_model_list(phrase: str) -> list[str]:
    raw = (phrase or "").strip()
    if not raw:
        return []
    # Cut trailing clause noise after the model list.
    raw = re.split(r"(?i)\b(?:see|refer|note|when|if)\b", raw, maxsplit=1)[0]
    parts = re.split(r"\s+and\s+|,\s*|\s*/\s*|\s*;\s*|\s+or\s+", raw)
    out: list[str] = []
    for p in parts:
        cleaned = p.strip(" .:—–-\t")
        cleaned = re.sub(r"(?i)^(the|a|an)\s+", "", cleaned).strip()
        if cleaned and len(cleaned) >= 2:
            out.append(cleaned)
    return out


def _target_model_aliases(profile: dict[str, Any]) -> list[str]:
    device = profile.get("device") if isinstance(profile.get("device"), dict) else {}
    model = str(device.get("model") or "").strip()
    mfr = str(device.get("manufacturer") or "").strip()
    aliases: list[str] = []
    if model:
        aliases.append(model)
    if mfr and model:
        aliases.append(f"{mfr} {model}")
    # Drop redundant empties / dupes.
    seen: set[str] = set()
    out: list[str] = []
    for a in aliases:
        key = _norm_model_phrase(a)
        if key and key not in seen:
            seen.add(key)
            out.append(a)
    return out


def _target_in_named_models(named: list[str], aliases: list[str]) -> bool:
    for n in named:
        for alias in aliases:
            if _model_phrase_in(n, alias) or _model_phrase_in(alias, n):
                return True
    return False


def classify_other_variant_scope(
    title: str,
    snippet: str,
    profile: dict[str, Any],
    *,
    excerpt_text: str | None = None,
) -> tuple[str | None, str | None]:
    """Classify procedures scoped only to sibling models in a shared manual.

    Founding (B&G Zeus SR): ``This functionality applies to NSO 4 and Zeus SRX
    only`` — not applicable to Zeus SR (``SR`` ≠ ``SRX``).
    """
    aliases = _target_model_aliases(profile)
    if not aliases:
        return None, None
    blob = "\n".join(
        [
            str(title or ""),
            str(snippet or ""),
            str(excerpt_text or ""),
        ]
    )
    if not blob.strip():
        return None, None

    for pat, rule in (
        (_VARIANT_APPLIES_ONLY_RE, "rule:variant_scope:applies_to_only"),
        (_VARIANT_FOR_UNITS_ONLY_RE, "rule:variant_scope:for_units_only"),
        (_VARIANT_AVAILABLE_ONLY_RE, "rule:variant_scope:available_only_on"),
    ):
        m = pat.search(blob)
        if not m:
            continue
        named = _split_variant_model_list(m.group(1))
        if not named:
            continue
        if not _target_in_named_models(named, aliases):
            return "not_applicable:other_variant", rule

    m = _VARIANT_NOT_ON_RE.search(blob)
    if m:
        named = _split_variant_model_list(m.group(1))
        if named and _target_in_named_models(named, aliases):
            return "not_applicable:other_variant", "rule:variant_scope:not_on_target"

    return None, None


def _excerpt_text_by_ref(
    excerpts: list[dict[str, Any]] | list[str] | None,
) -> dict[str, str]:
    out: dict[str, str] = {}
    for ei, raw in enumerate(excerpts or []):
        out[f"excerpt[{ei}]"] = _excerpt_text(raw)
    return out


def _join_truncated_title(title: str, following: str) -> str:
    """Join truncated openers with the next line (same excerpt only)."""
    t = (title or "").strip().rstrip(":").strip()
    if not t or not _is_truncated_title(t):
        return t
    for line in (following or "").splitlines():
        nxt = line.strip().lstrip("#").strip().rstrip(":").strip()
        if not nxt or nxt.lower() == t.lower():
            continue
        # Bare step marker — title is already the full clause before the list.
        if re.match(r"^\d+[\.\)]\s*$", nxt) or re.match(r"^\d+[\.\)]\s+\S", nxt):
            return t
        if re.match(r"^\d+(?:\.\d+)*\.?\s+\S", nxt):
            break
        # Continuation may be the rest of a mid-word clip ("SE" + "T UP A…").
        if t[-1:].isalpha() and nxt[:1].isalpha() and nxt[:1].islower():
            joined = f"{t}{nxt}".strip()
        else:
            joined = f"{t} {nxt}".strip()
        return joined[:200]
    return t


def _complete_title_from_corpus(
    title: str,
    corpus: str,
    *,
    section_num: str | None = None,
) -> str:
    """Resolve a truncated title using other text in the same group/corpus.

    Intra-excerpt join cannot see continuations that live in a different
    retrieved excerpt after the 1200-char clip. Prefer a longer numbered
    heading whose title starts with the truncated stem.
    """
    t = (title or "").strip()
    if not t or not _is_truncated_title(t) or not corpus:
        return t
    stem = t.lower()
    best = t
    for m in re.finditer(
        r"(?m)^(?P<num>\d+(?:\.\d+){0,3})\.?\s+(?P<title>[^\n]{3,120})",
        corpus,
    ):
        num = m.group("num")
        full = re.split(r"\s*\.{2,}|\t", m.group("title"))[0].strip()
        full = full.strip(" .:—–-")
        if not full or len(full) <= len(t):
            continue
        if section_num and num != section_num and not full.lower().startswith(stem):
            continue
        if full.lower().startswith(stem) and len(full) > len(best):
            best = full[:200]
    return best


def _excerpt_window(text: str, start: int, *, before: int = 220, after: int = 280) -> str:
    """Snippet window including preceding section-scope lines when present.

    Lookback snaps to a line start so scope sentences are not mid-word clipped
    (e.g. ``applies to`` → ``ies to``).
    """
    start = max(0, int(start))
    lo = max(0, start - before)
    if lo > 0:
        nl = text.rfind("\n", lo, start)
        if nl >= lo:
            lo = nl + 1
        else:
            while lo < start and not text[lo].isspace():
                lo += 1
            while lo < start and text[lo].isspace():
                lo += 1
    hi = min(len(text), start + after)
    return text[lo:hi]


def inventory_procedures_from_excerpts(
    excerpts: list[dict[str, Any]] | list[str] | None,
    *,
    group_id: str = "",
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (kept_items, filtered_trail_rows)."""
    items: list[dict[str, Any]] = []
    filtered_trail: list[dict[str, Any]] = []
    seen: set[str] = set()
    # Cross-excerpt corpus: join runs only within one excerpt's following text;
    # truncated titles at the 1200-char clip need other excerpts in the group.
    group_corpus = "\n".join(_excerpt_text(raw) for raw in (excerpts or []))

    def _add(
        *,
        title: str,
        kind: str,
        excerpt_ref: str,
        snippet: str,
        source: str = "heuristic",
        following: str = "",
        section_num: str | None = None,
    ) -> None:
        joined = _join_truncated_title(title, following)
        completed = _complete_title_from_corpus(
            joined, group_corpus, section_num=section_num
        )
        title_n = _normalize_title(completed)
        if not title_n:
            return
        key = title_n.lower()
        if key in seen or re.fullmatch(r"\d+(?:\.\d+)*", title_n):
            return
        classification, class_rule = _classify_not_operator_relevant(title_n, snippet)
        reject = None
        if not classification:
            reject = _structural_reject_reason(title_n, snippet, kind=kind)
        if reject:
            seen.add(key)
            filtered_trail.append(
                {
                    "title": title_n,
                    "kind": kind,
                    "group_id": group_id or None,
                    "excerpt_ref": excerpt_ref,
                    "snippet": " ".join(snippet.split())[:240],
                    "disposition": "filtered",
                    "filter": reject,
                }
            )
            return
        if classification and not _IMPERATIVE_VERB_RE.search(title_n):
            if not _INSTALLER_AUDIENCE_RE.search(f"{title_n}\n{snippet}"):
                if not _WIRING_INSTALL_RE.search(title_n):
                    if not _is_protected_operator_mode(title_n):
                        seen.add(key)
                        filtered_trail.append(
                            {
                                "title": title_n,
                                "kind": kind,
                                "group_id": group_id or None,
                                "excerpt_ref": excerpt_ref,
                                "disposition": "filtered",
                                "filter": "filter:classified_without_verb",
                            }
                        )
                        return
        seen.add(key)
        row: dict[str, Any] = {
            "title": title_n,
            "kind": kind,
            "group_id": group_id or None,
            "excerpt_ref": excerpt_ref,
            "snippet": " ".join(snippet.split())[:240],
            "source": source,
            # Full excerpt text for variant-scope classify (map-group refs are
            # local; top-level excerpt[i] indexing is not reliable at reconcile).
            "excerpt_text": text[:2500],
        }
        if classification:
            row["classification"] = classification
            row["classification_rule"] = class_rule
        items.append(row)

    for ei, raw in enumerate(excerpts or []):
        text = _excerpt_text(raw)
        heading = _excerpt_heading(raw)
        ref = f"excerpt[{ei}]"
        if heading and not _is_toc_artifact(heading, text[:120]):
            clean_h = re.sub(r"^\d+(?:\.\d+)*\.?\s*", "", heading)
            if _IMPERATIVE_TITLE_RE.match(heading) or _NUMBERED_HEADING_RE.match(heading):
                _add(
                    title=clean_h,
                    kind="headed_procedure",
                    excerpt_ref=ref,
                    snippet=text[:240],
                )
            elif re.match(r"^\d+(?:\.\d+)*\.?\s+\S", heading):
                _add(
                    title=clean_h,
                    kind="numbered_heading",
                    excerpt_ref=ref,
                    snippet=text[:240],
                )
            elif _is_protected_operator_mode(clean_h):
                _add(
                    title=clean_h,
                    kind="headed_procedure",
                    excerpt_ref=ref,
                    snippet=text[:240],
                )

        for m in _NUMBERED_HEADING_RE.finditer(text):
            title = re.split(r"\s{2,}|\t", m.group("title"))[0]
            snippet = _excerpt_window(text, m.start())
            if "...." in text[m.start() : m.start() + 80]:
                continue
            _add(
                title=title,
                kind="numbered_heading",
                excerpt_ref=ref,
                snippet=snippet,
                following=text[m.end() : m.end() + 120],
                section_num=m.group("num"),
            )

        for m in _IMPERATIVE_TITLE_RE.finditer(text):
            title = m.group("title").strip()
            if len(title) > 90:
                continue
            _add(
                title=title,
                kind="imperative_heading",
                excerpt_ref=ref,
                snippet=_excerpt_window(text, m.start()),
                following=text[m.end() : m.end() + 120],
            )

        # Also catch protected operator-mode headings mid-text ("3.4.5 Gen-/Mains support").
        for m in re.finditer(
            r"(?mi)^(?:\d+(?:\.\d+){1,3}\.?\s+)?"
            r"(?P<title>Gen-?/Mains\s+support|Power\s+sharing(?:\s+mode)?|Power\s+assist)"
            r"(?:\s*$|\s*\n)",
            text,
        ):
            title = m.group("title")
            if len(title) > 48:
                continue
            _add(
                title=title,
                kind="headed_procedure",
                excerpt_ref=ref,
                snippet=_excerpt_window(text, m.start()),
            )

        if _STEP_BLOCK_RE.search(text):
            first_line = text.strip().split("\n", 1)[0].strip()
            first_line = re.sub(r"^\d+(?:\.\d+)*\.?\s*", "", first_line)
            if (
                6 <= len(first_line) <= 90
                and (
                    _PROCEDURE_SHAPED_HEADING_RE.search(first_line)
                    or _is_protected_operator_mode(first_line)
                )
            ):
                _add(
                    title=first_line,
                    kind="step_block",
                    excerpt_ref=ref,
                    snippet=text[:280],
                )

    return items, filtered_trail


def inventory_or_alternatives_from_excerpts(
    excerpts: list[dict[str, Any]] | list[str] | None,
    *,
    group_id: str = "",
) -> list[dict[str, Any]]:
    """Extract enumerated device alternatives ('GX device or GlobalLink 520')."""
    precise = [
        re.compile(
            r"(?i)\b(?P<a>GX device)\s+or\s+(?P<b>GlobalLink\s*\d+)\b"
        ),
        re.compile(
            r"(?i)\b(?P<a>GlobalLink\s*\d+)\s+or\s+(?P<b>GX device)\b"
        ),
        re.compile(
            r"(?i)\ban?\s+(?P<a>GX device)\s+or\s+(?:an?\s+)?(?P<b>GlobalLink\s*\d+)\b"
        ),
        re.compile(
            r"(?i)\b(?P<a>SmartRemote)\s+or\s+(?P<b>EasyView\s*\d+)\b"
        ),
        re.compile(
            r"(?i)\b(?P<a>VictronConnect(?:\s+app)?)\s+or\s+"
            r"(?P<b>(?:the\s+)?(?:optional\s+)?(?:MPPT\s+)?(?:Control\s+)?display)\b"
        ),
    ]
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for ei, raw in enumerate(excerpts or []):
        text = _excerpt_text(raw)
        ref = f"excerpt[{ei}]"
        for cre in precise:
            for m in cre.finditer(text):
                parts = [
                    re.sub(r"^(?:an?\s+|the\s+)", "", m.group("a").strip(), flags=re.I),
                    re.sub(r"^(?:an?\s+|the\s+)", "", m.group("b").strip(), flags=re.I),
                ]
                body = f"{parts[0]} or {parts[1]}"
                key = " | ".join(p.lower() for p in parts)
                if key in seen:
                    continue
                seen.add(key)
                out.append(
                    {
                        "title": body,
                        "kind": "enumerated_alternatives",
                        "alternatives": parts,
                        "group_id": group_id or None,
                        "excerpt_ref": ref,
                        "snippet": " ".join(text[m.start() : m.start() + 200].split()),
                        "source": "heuristic",
                    }
                )
    return out


def _fuzzy_dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse near-identical titles (heading vs in-text phrasing)."""
    out: list[dict[str, Any]] = []
    for row in rows:
        title = str(row.get("title") or "").strip()
        if not title:
            continue
        matched = False
        for prev in out:
            prev_t = str(prev.get("title") or "")
            if fuzzy_text_similar(title, prev_t, threshold=0.72):
                matched = True
                # Prefer longer / more specific title as canonical.
                if len(title) > len(prev_t) + 4:
                    merged = dict(row)
                    merged["deduped_from"] = prev_t
                    out[out.index(prev)] = merged
                break
            # Stem compare: strip leading gerund / "To ".
            a = re.sub(
                r"(?i)^(updating|disabling and enabling|setting the|turning|to)\s+",
                "",
                title,
            ).lower()
            b = re.sub(
                r"(?i)^(updating|disabling and enabling|setting the|turning|to)\s+",
                "",
                prev_t,
            ).lower()
            if a and b and (a in b or b in a or fuzzy_text_similar(a, b, threshold=0.75)):
                matched = True
                break
        if not matched:
            out.append(row)
    return out


def build_procedure_inventory(
    excerpts: list[dict[str, Any]] | list[str] | None,
    *,
    map_groups: list[dict[str, Any]] | None = None,
    llm_fallback: Callable[[str, list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
) -> dict[str, Any]:
    """Build full inventory from flat excerpts and/or map groups."""
    procedures: list[dict[str, Any]] = []
    alternatives: list[dict[str, Any]] = []
    filtered_trail: list[dict[str, Any]] = []
    groups_used: list[str] = []

    if map_groups:
        for g in map_groups:
            if not isinstance(g, dict):
                continue
            gid = str(g.get("group_id") or "group")
            gex = list(g.get("excerpts") or [])
            if not gex:
                continue
            groups_used.append(gid)
            found, filtered = inventory_procedures_from_excerpts(gex, group_id=gid)
            if not found and llm_fallback is not None:
                found = list(llm_fallback(gid, gex) or [])
                for row in found:
                    row.setdefault("source", "llm_fallback")
                    row.setdefault("group_id", gid)
            procedures.extend(found)
            filtered_trail.extend(filtered)
            alternatives.extend(
                inventory_or_alternatives_from_excerpts(gex, group_id=gid)
            )

    if not procedures and not alternatives:
        procedures, filtered = inventory_procedures_from_excerpts(excerpts)
        filtered_trail.extend(filtered)
        alternatives = inventory_or_alternatives_from_excerpts(excerpts)

    procedures = _fuzzy_dedupe_rows(procedures)
    alternatives = _fuzzy_dedupe_rows(alternatives)
    filtered_trail = _fuzzy_dedupe_rows(filtered_trail)

    return {
        "procedures": procedures,
        "alternatives": alternatives,
        "filtered": filtered_trail,
        "groups_scanned": groups_used,
        "procedure_count": len(procedures),
        "alternative_count": len(alternatives),
        "filtered_count": len(filtered_trail),
    }


def _action_rows(profile: dict[str, Any]) -> list[tuple[str, str]]:
    """(field_path, text) for operator_actions."""
    out: list[tuple[str, str]] = []
    for i, a in enumerate(profile.get("operator_actions") or []):
        if isinstance(a, dict):
            t = str(a.get("action") or "").strip()
            if t:
                out.append((f"operator_actions[{i}]", t))
    return out


def _surface_rows(profile: dict[str, Any]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for i, s in enumerate(profile.get("control_surfaces") or []):
        if not isinstance(s, dict):
            continue
        for key in ("label_verbatim", "surface"):
            t = str(s.get(key) or "").strip()
            if t:
                out.append((f"control_surfaces[{i}].{key}", t))
    return out


def _require_rows(profile: dict[str, Any]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for i, r in enumerate(profile.get("requires_devices") or []):
        if isinstance(r, dict):
            t = str(r.get("description_verbatim") or "").strip()
            if t:
                out.append((f"requires_devices[{i}]", t))
    return out


def _action_texts(profile: dict[str, Any]) -> list[str]:
    return [t for _p, t in _action_rows(profile)]


def _surface_texts(profile: dict[str, Any]) -> list[str]:
    return [t for _p, t in _surface_rows(profile)]


def _require_texts(profile: dict[str, Any]) -> list[str]:
    return [t for _p, t in _require_rows(profile)]


def _stem_token(tok: str) -> str:
    t = tok.lower()
    for suf in ("ing", "tion", "ed", "es", "s"):
        if len(t) > 4 and t.endswith(suf):
            return t[: -len(suf)]
    return t


def _content_tokens(text: str) -> set[str]:
    stop = {
        "the",
        "a",
        "an",
        "and",
        "or",
        "to",
        "via",
        "for",
        "with",
        "from",
        "of",
        "on",
        "in",
        "set",
        "mode",
        "disabl",
        "enabl",
        "updat",
        "turn",
        "how",
    }
    return {
        _stem_token(t)
        for t in re.split(r"[^a-z0-9]+", (text or "").lower())
        if len(t) > 1 and _stem_token(t) not in stop and t not in stop
    }


def _token_overlap_score(a: str, b: str) -> float:
    aa = (a or "").strip().lower()
    bb = (b or "").strip().lower()
    if not aa or not bb:
        return 0.0
    if aa == bb:
        return 1.0
    ta = _content_tokens(aa)
    tb = _content_tokens(bb)
    if not ta or not tb:
        # Fall back to raw overlap when content-token sets empty (all stopwords).
        ta = {_stem_token(t) for t in re.split(r"[^a-z0-9]+", aa) if len(t) > 1}
        tb = {_stem_token(t) for t in re.split(r"[^a-z0-9]+", bb) if len(t) > 1}
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def _verb_object_compatible(needle: str, hay: str) -> bool:
    """Require shared distinctive content tokens (rejects Gen-/Mains ↔ AC-limit)."""
    na, nb = _content_tokens(needle), _content_tokens(hay)
    if not na or not nb:
        return False
    overlap = na & nb
    if not overlap:
        return False
    # Prefer a noun-ish token (>=4) so "support" alone does not bind loosely.
    if any(len(t) >= 4 for t in overlap):
        return True
    return min(len(na), len(nb)) <= 2


def _best_match(
    needle: str,
    rows: list[tuple[str, str]],
    *,
    threshold: float = 0.72,
    require_vo: bool = True,
) -> dict[str, Any] | None:
    """Return best matched_to dict or None."""
    n = (needle or "").strip()
    if not n:
        return None
    best: dict[str, Any] | None = None
    for path, text in rows:
        if require_vo and not _verb_object_compatible(n, text):
            continue
        score = _token_overlap_score(n, text)
        if fuzzy_text_similar(n, text, threshold=threshold):
            score = max(score, threshold)
        nn, hh = n.lower(), text.lower()
        # Exact or near-substring only when lengths are close (avoid combined OR labels).
        if nn == hh:
            score = 1.0
        elif nn in hh or hh in nn:
            shorter, longer = (nn, hh) if len(nn) <= len(hh) else (hh, nn)
            if len(shorter) / max(len(longer), 1) >= 0.55:
                score = max(score, len(shorter) / len(longer))
            else:
                continue
        if score < threshold:
            continue
        if best is None or score > float(best["similarity"]):
            best = {
                "field_path": path,
                "text": text,
                "similarity": round(float(score), 3),
            }
    return best


def _is_combined_or_label(text: str) -> bool:
    return bool(re.search(r"(?i)\bor\b", text or ""))


def _matches_shutdown_restart_pair(title: str, actions: list[str]) -> bool:
    if not re.search(r"(?i)shutdown", title) or not re.search(r"(?i)restart", title):
        return False
    has_sd = any(re.search(r"(?i)shutdown", a) for a in actions)
    has_rs = any(re.search(r"(?i)restart", a) for a in actions)
    return has_sd and has_rs


def _alt_part_match(
    part: str,
    require_rows: list[tuple[str, str]],
    surface_rows: list[tuple[str, str]],
) -> dict[str, Any] | None:
    """Per-alternative match: single-product rows only (never combined 'A or B' labels)."""
    singles = [
        (p, t)
        for p, t in (require_rows + surface_rows)
        if not _is_combined_or_label(t)
    ]
    return _best_match(part, singles, threshold=0.78, require_vo=True)


def reconcile_procedure_inventory(
    inventory: dict[str, Any],
    profile: dict[str, Any],
    *,
    excerpts: list[dict[str, Any]] | list[str] | None = None,
) -> dict[str, Any]:
    """Map inventory rows to full-profile content; emit accounting trail."""
    action_rows = _action_rows(profile)
    surface_rows = _surface_rows(profile)
    require_rows = _require_rows(profile)
    actions = [t for _p, t in action_rows]
    accounted: list[dict[str, Any]] = []
    classified: list[dict[str, Any]] = []
    unaccounted: list[dict[str, Any]] = []
    trail: list[dict[str, Any]] = []
    flags: list[dict[str, str]] = []
    excerpt_texts = _excerpt_text_by_ref(excerpts)

    # Filtered items from inventory build.
    for row in inventory.get("filtered") or []:
        if isinstance(row, dict):
            trail.append(dict(row))

    for row in inventory.get("procedures") or []:
        if not isinstance(row, dict):
            continue
        entry = dict(row)
        title = str(entry.get("title") or "")
        snippet = str(entry.get("snippet") or "")
        prior = str(entry.get("classification") or "")
        prior_rule = str(entry.get("classification_rule") or "")
        excerpt_blob = str(entry.get("excerpt_text") or "").strip() or excerpt_texts.get(
            str(entry.get("excerpt_ref") or ""), ""
        )

        def _trail_base(**extra: Any) -> dict[str, Any]:
            base = {
                "title": title,
                "kind": entry.get("kind"),
                "group_id": entry.get("group_id"),
                "excerpt_ref": entry.get("excerpt_ref"),
            }
            base.update(extra)
            return base

        if prior.startswith("not_operator_relevant") or prior.startswith(
            "not_applicable"
        ):
            entry["status"] = "classified"
            classified.append(entry)
            trail.append(
                _trail_base(
                    disposition="classified",
                    auto_classified=prior,
                    rule=prior_rule or prior,
                )
            )
            continue

        variant_cls, variant_rule = classify_other_variant_scope(
            title, snippet, profile, excerpt_text=excerpt_blob
        )
        if variant_cls:
            entry["classification"] = variant_cls
            entry["classification_rule"] = variant_rule
            entry["status"] = "classified"
            classified.append(entry)
            trail.append(
                _trail_base(
                    disposition="classified",
                    auto_classified=variant_cls,
                    rule=variant_rule,
                )
            )
            continue

        cls, cls_rule = _classify_not_operator_relevant(title, snippet)
        if cls and str(cls).endswith(":installer"):
            entry["classification"] = cls
            entry["classification_rule"] = cls_rule
            entry["status"] = "classified"
            classified.append(entry)
            trail.append(
                _trail_base(
                    disposition="classified",
                    auto_classified=cls,
                    rule=cls_rule,
                )
            )
            continue

        if _matches_shutdown_restart_pair(title, actions):
            entry["status"] = "accounted_action"
            entry["accounted_via"] = "derived_shutdown_restart_pair"
            matched = {
                "field_path": "operator_actions[shutdown+restart]",
                "text": "shutdown the device + restart the device",
                "similarity": 1.0,
            }
            entry["matched_to"] = matched
            accounted.append(entry)
            trail.append(
                _trail_base(disposition="matched", matched_to=matched)
            )
            continue

        # Operator-mode titles (Gen-/Mains, Power sharing): accept slightly lower
        # similarity so mode-selection phrasing still accounts (v4.3 adjudication).
        proc_threshold = (
            0.65 if _OPERATOR_MODE_PROTECT_RE.search(title) else 0.72
        )
        hit = _best_match(title, action_rows, threshold=proc_threshold, require_vo=True)
        if hit:
            entry["status"] = "accounted_action"
            entry["matched_to"] = hit
            accounted.append(entry)
            trail.append(_trail_base(disposition="matched", matched_to=hit))
            continue
        hit = _best_match(title, surface_rows, threshold=0.72, require_vo=True)
        if hit:
            entry["status"] = "accounted_surface"
            entry["matched_to"] = hit
            accounted.append(entry)
            trail.append(_trail_base(disposition="matched", matched_to=hit))
            continue
        hit = _best_match(title, require_rows, threshold=0.78, require_vo=True)
        if hit:
            entry["status"] = "accounted_requires"
            entry["matched_to"] = hit
            accounted.append(entry)
            trail.append(_trail_base(disposition="matched", matched_to=hit))
            continue

        if cls:
            entry["classification"] = cls
            entry["classification_rule"] = cls_rule
            entry["status"] = "classified"
            classified.append(entry)
            trail.append(
                _trail_base(
                    disposition="classified",
                    auto_classified=cls,
                    rule=cls_rule,
                )
            )
            continue

        entry["status"] = "unaccounted"
        unaccounted.append(entry)
        trail.append(_trail_base(disposition="unaccounted"))
        flags.append(
            {
                "flag": PROCEDURE_UNACCOUNTED,
                "severity": "warning",
                "detail": (
                    f"procedure {title!r} unaccounted "
                    f"(source {entry.get('excerpt_ref')}"
                    f"{'@' + entry['group_id'] if entry.get('group_id') else ''})"
                ),
                "field_path": "operator_actions",
            }
        )

    alt_unaccounted: list[dict[str, Any]] = []
    for row in inventory.get("alternatives") or []:
        if not isinstance(row, dict):
            continue
        entry = dict(row)
        title = str(entry.get("title") or "")
        missing: list[str] = []
        part_matches: list[dict[str, Any]] = []
        for alt in entry.get("alternatives") or []:
            hit = _alt_part_match(str(alt), require_rows, surface_rows)
            if hit is None:
                missing.append(str(alt))
            else:
                part_matches.append({"alternative": str(alt), "matched_to": hit})
        if not missing:
            entry["status"] = "accounted_requires_or_surface"
            entry["part_matches"] = part_matches
            accounted.append(entry)
            trail.append(
                {
                    "title": title,
                    "kind": "enumerated_alternatives",
                    "group_id": entry.get("group_id"),
                    "excerpt_ref": entry.get("excerpt_ref"),
                    "disposition": "matched",
                    "part_matches": part_matches,
                }
            )
            continue
        entry["status"] = "unaccounted"
        entry["missing_alternatives"] = missing
        entry["part_matches"] = part_matches
        alt_unaccounted.append(entry)
        unaccounted.append(entry)
        trail.append(
            {
                "title": title,
                "kind": "enumerated_alternatives",
                "group_id": entry.get("group_id"),
                "excerpt_ref": entry.get("excerpt_ref"),
                "disposition": "unaccounted",
                "missing_alternatives": missing,
                "part_matches": part_matches,
            }
        )
        flags.append(
            {
                "flag": ALTERNATIVE_UNACCOUNTED,
                "severity": "warning",
                "detail": (
                    f"enumerated alternatives missing {missing!r} "
                    f"from {title!r} "
                    f"(source {entry.get('excerpt_ref')})"
                ),
                "field_path": "requires_devices",
            }
        )

    return {
        "accounted": accounted,
        "classified": classified,
        "unaccounted": unaccounted,
        "unaccounted_procedures": [
            u for u in unaccounted if u.get("kind") != "enumerated_alternatives"
        ],
        "unaccounted_alternatives": alt_unaccounted,
        "accounting_trail": trail,
        "validation_flags": flags,
        "counts": {
            "accounted": len(accounted),
            "classified": len(classified),
            "unaccounted": len(unaccounted),
            "filtered": len(inventory.get("filtered") or []),
            "trail": len(trail),
        },
        "corpus_sizes": {
            "actions": len(action_rows),
            "surfaces": len(surface_rows),
            "requires": len(require_rows),
        },
    }


def _matches_any(needle: str, haystacks: list[str], *, threshold: float = 0.55) -> bool:
    """Legacy helper for repair merge (loose). Prefer `_best_match` for reconcile."""
    rows = [("x", h) for h in haystacks]
    return _best_match(needle, rows, threshold=threshold, require_vo=False) is not None


def adjudicated_repair_id(item: dict[str, Any]) -> str | None:
    """Return adjudicated repair class id, or None if out of scope."""
    title = str(item.get("title") or "").strip().lower()
    missing = [
        str(x).strip().lower()
        for x in (item.get("missing_alternatives") or item.get("alternatives") or [])
    ]
    blob = " ".join([title, *missing])
    if "sunset" in title:
        return "smartsolar_sunset"
    if "firmware" in title:
        return "smartsolar_firmware"
    if "globallink" in blob or (
        item.get("kind") == "enumerated_alternatives"
        and "gx device" in title
        and any("globallink" in m for m in missing)
    ):
        return "smartsolar_globallink"
    if "gen" in title and "mains" in title:
        return "combi_gen_mains"
    if "power sharing" in title:
        return "combi_power_sharing"
    if "smartremote" in blob or "easyview" in blob:
        return "mli_panel_alts"
    return None


def filter_adjudicated_unaccounted(
    unaccounted: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Keep only the six adjudicated residual classes."""
    out: list[dict[str, Any]] = []
    for u in unaccounted:
        if not isinstance(u, dict):
            continue
        aid = adjudicated_repair_id(u)
        if aid is None:
            continue
        entry = dict(u)
        entry["adjudicated_id"] = aid
        out.append(entry)
    return out


def build_procedure_repair_trailer(unaccounted: list[dict[str, Any]]) -> str:
    """Map-retry trailer: heading + excerpt_ref + adjudication notes."""
    parts: list[str] = []
    titles: list[str] = []
    alts: list[str] = []
    refs: list[str] = []
    notes: list[str] = []
    for u in unaccounted:
        ref = str(u.get("excerpt_ref") or "").strip()
        if ref and ref not in refs:
            refs.append(ref)
        aid = str(u.get("adjudicated_id") or adjudicated_repair_id(u) or "")
        note = _ADJUDICATION_TRAILER_NOTES.get(aid)
        if note and note not in notes:
            notes.append(note)
        if u.get("kind") == "enumerated_alternatives":
            alts.extend(
                str(a)
                for a in (u.get("missing_alternatives") or u.get("alternatives") or [])
                if str(a).strip()
            )
        else:
            title = str(u.get("title") or "").strip()
            if title:
                titles.append(title if not ref else f"{title} ({ref})")
    if titles:
        heading_list = "; ".join(titles[:12])
        parts.append(
            "these excerpts contain procedures not yet profiled: "
            f"{heading_list}; extract them or state why they are not operator actions."
        )
    if alts:
        alt_list = "; ".join(alts[:8])
        ref_bit = f" (excerpt_ref: {', '.join(refs[:4])})" if refs else ""
        parts.append(
            "these excerpts list device alternatives not yet profiled"
            f"{ref_bit}: {alt_list}; emit a separate requires_devices entry "
            "for each alternative."
        )
    if notes:
        parts.append("ADJUDICATION: " + " ".join(notes))
    return " ".join(parts)


def _excerpts_for_refs(
    excerpts: list[dict[str, Any]] | list[str] | None,
    refs: set[str],
) -> list[dict[str, Any]]:
    scoped: list[dict[str, Any]] = []
    for ei, raw in enumerate(excerpts or []):
        ref = f"excerpt[{ei}]"
        if refs and ref not in refs:
            continue
        if isinstance(raw, dict):
            scoped.append(raw)
        elif isinstance(raw, str) and raw.strip():
            scoped.append({"text": raw})
    if scoped:
        return scoped
    for raw in excerpts or []:
        if isinstance(raw, dict):
            scoped.append(raw)
        elif isinstance(raw, str) and raw.strip():
            scoped.append({"text": raw})
        if len(scoped) >= 8:
            break
    return scoped


def _merge_partial_into_profile(
    base: dict[str, Any],
    partial: dict[str, Any],
    scoped: list[dict[str, Any]],
    *,
    items: list[dict[str, Any]] | None = None,
) -> tuple[dict[str, Any], int, int]:
    """Union+grounding merge of one map-retry partial into base.

    Does **not** re-vote the whole profile against the narrow group excerpts
    (that would drop actions repaired in earlier groups). When ``items`` is
    provided, only rows relevant to those adjudicated titles/alts are kept.
    """
    title_needles: list[str] = []
    alt_needles: list[str] = []
    for u in items or []:
        title_needles.append(str(u.get("title") or "").strip().lower())
        for a in u.get("missing_alternatives") or u.get("alternatives") or []:
            alt_needles.append(str(a).strip().lower())
        aid = str(u.get("adjudicated_id") or "")
        if aid == "smartsolar_firmware":
            title_needles.append("firmware")
        if aid == "smartsolar_sunset":
            title_needles.append("sunset")
        if aid == "combi_gen_mains":
            title_needles.extend(["gen-/mains", "mains support", "generator"])
        if aid == "combi_power_sharing":
            title_needles.extend(["power sharing", "power-sharing", "power assist"])

    def _relevant_action(text: str) -> bool:
        if not items:
            return True
        low = text.lower()
        return any(n and n in low for n in title_needles)

    def _relevant_require(text: str) -> bool:
        if not items:
            return True
        low = text.lower()
        if any(n and (n in low or low in n) for n in alt_needles):
            return True
        # GlobalLink / panel alts by adjudicated id even if already partially present.
        for u in items:
            aid = str(u.get("adjudicated_id") or "")
            if aid == "smartsolar_globallink" and "globallink" in low:
                return True
            if aid == "mli_panel_alts" and (
                "smartremote" in low or "easyview" in low
            ):
                return True
        return False

    new_actions: list[dict[str, Any]] = []
    for a in partial.get("operator_actions") or []:
        if not isinstance(a, dict):
            continue
        text = str(a.get("action") or "").strip()
        if not text:
            continue
        if not _relevant_action(text):
            continue
        if not item_grounded_in_excerpts(text, scoped):
            continue
        if _matches_any(text, _action_texts(base)):
            continue
        entry = dict(a)
        entry["source"] = "extracted"
        entry["vote_margin"] = entry.get("vote_margin") or "repaired"
        if "firmware" in text.lower():
            entry["context"] = "maintenance"
        new_actions.append(entry)

    new_requires: list[dict[str, Any]] = []
    for r in partial.get("requires_devices") or []:
        if not isinstance(r, dict):
            continue
        desc = str(r.get("description_verbatim") or "").strip()
        if not desc:
            continue
        if not _relevant_require(desc):
            continue
        if not item_grounded_in_excerpts(desc, scoped):
            continue
        if _matches_any(desc, _require_texts(base), threshold=0.5):
            continue
        entry = dict(r)
        entry["vote_margin"] = entry.get("vote_margin") or "repaired"
        new_requires.append(entry)

    out = deepcopy(base)
    out["operator_actions"] = list(base.get("operator_actions") or []) + new_actions
    out["requires_devices"] = list(base.get("requires_devices") or []) + new_requires
    return out, len(new_actions), len(new_requires)


def unify_panel_family_needed_for(profile: dict[str, Any]) -> dict[str, Any]:
    """Unify needed_for across MasterView / SmartRemote / EasyView family."""
    out = dict(profile)
    requires = [dict(r) for r in (out.get("requires_devices") or []) if isinstance(r, dict)]
    family = [
        r
        for r in requires
        if _PANEL_FAMILY_RE.search(str(r.get("description_verbatim") or ""))
    ]
    if len(family) < 2:
        out["requires_devices"] = requires
        return out
    canon = ""
    for r in family:
        if "masterview" in str(r.get("description_verbatim") or "").lower():
            canon = str(r.get("needed_for") or "").strip()
            if canon:
                break
    if not canon:
        for r in family:
            canon = str(r.get("needed_for") or "").strip()
            if canon:
                break
    if canon:
        for r in family:
            prev = str(r.get("needed_for") or "").strip()
            if prev != canon:
                if prev:
                    r["needed_for_unified_from"] = prev
                r["needed_for"] = canon
    out["requires_devices"] = requires
    return out


def unify_gx_globallink_needed_for(profile: dict[str, Any]) -> dict[str, Any]:
    """Align GlobalLink 520 needed_for with the GX device sibling (OR semantics)."""
    out = dict(profile)
    requires = [dict(r) for r in (out.get("requires_devices") or []) if isinstance(r, dict)]
    gx_needed = ""
    for r in requires:
        desc = str(r.get("description_verbatim") or "").lower()
        if "gx device" in desc or desc.strip() == "gx":
            gx_needed = str(r.get("needed_for") or "").strip()
            if gx_needed:
                break
    if not gx_needed:
        out["requires_devices"] = requires
        return out
    for r in requires:
        desc = str(r.get("description_verbatim") or "").lower()
        if "globallink" not in desc:
            continue
        prev = str(r.get("needed_for") or "").strip()
        if prev != gx_needed:
            if prev:
                r["needed_for_unified_from"] = prev
            r["needed_for"] = gx_needed
    out["requires_devices"] = requires
    return out


def _excerpt_blob(scoped: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for e in scoped:
        if isinstance(e, dict):
            parts.append(str(e.get("text") or ""))
            parts.append(str(e.get("source_heading_guess") or ""))
        elif isinstance(e, str):
            parts.append(e)
    return "\n".join(parts).lower()


def _deterministic_fill_for_item(
    item: dict[str, Any],
    profile: dict[str, Any],
    scoped: list[dict[str, Any]],
) -> dict[str, Any]:
    """Deterministic action fill — headed/numbered procedures only.

    Forbidden for ``enumerated_alternatives`` and mode-description titles
    (Gen-/Mains / Power sharing family). Action text is the inventory heading
    verbatim. Caller attaches ``deterministic_fill`` flags for review.
    """
    partial: dict[str, Any] = {"operator_actions": [], "requires_devices": []}
    kind = str(item.get("kind") or "").strip()
    if kind == "enumerated_alternatives":
        return partial
    if kind not in _DETERMINISTIC_FILL_KINDS:
        return partial

    title = str(item.get("title") or "").strip()
    if not title:
        return partial
    # Mode descriptions stay LLM-only (or remain flagged).
    if _OPERATOR_MODE_PROTECT_RE.search(title):
        return partial

    blob = _excerpt_blob(scoped)
    action_rows = [
        (f"operator_actions[{i}]", str(a.get("action") or ""))
        for i, a in enumerate(profile.get("operator_actions") or [])
        if isinstance(a, dict)
    ]
    if _best_match(title, action_rows, threshold=0.72, require_vo=True):
        return partial

    # Verbatim heading only (no gerund rewrite).
    action = title
    if not item_grounded_in_excerpts(action, scoped) and title.lower() not in blob:
        toks = [t for t in re.split(r"\W+", title.lower()) if len(t) >= 4]
        if not toks or not any(t in blob for t in toks):
            return partial

    context = "situational"
    if "firmware" in title.lower():
        context = "maintenance"
    partial["operator_actions"].append(
        {
            "action": action,
            "audience": "operator",
            "context": context,
            "source": "extracted",
            "vote_margin": "repaired_deterministic",
            "deterministic_fill": True,
        }
    )
    return partial


def apply_procedure_repair(
    profile: dict[str, Any],
    *,
    unaccounted: list[dict[str, Any]],
    excerpts: list[dict[str, Any]] | list[str] | None,
    map_fn: Callable[[list[dict[str, Any]], str], dict[str, Any]] | None,
    enabled: bool | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Scoped repair: one map-retry per adjudicated item group, then flag stands."""
    gate = PROCEDURE_REPAIR_ENABLED if enabled is None else enabled
    meta: dict[str, Any] = {
        "attempted": False,
        "enabled": gate,
        "skipped": not gate,
        "unaccounted_in": len(unaccounted),
        "scope": "adjudicated_classes_only",
        "adjudicated_ids": list(ADJUDICATED_REPAIR_IDS),
    }
    if not gate:
        return profile, meta

    targets = filter_adjudicated_unaccounted(unaccounted)
    meta["adjudicated_unaccounted"] = len(targets)
    meta["skipped_non_adjudicated"] = len(unaccounted) - len(targets)
    if not targets:
        meta["skipped_reason"] = "no_adjudicated_targets"
        meta["skipped"] = True
        return profile, meta
    if map_fn is None:
        meta["skipped_reason"] = "no_map_fn"
        meta["skipped"] = True
        return profile, meta

    # One map-retry per excerpt_ref group (item group).
    groups: dict[str, list[dict[str, Any]]] = {}
    for u in targets:
        key = str(u.get("excerpt_ref") or u.get("adjudicated_id") or "unknown")
        groups.setdefault(key, []).append(u)

    base = deepcopy(profile)
    attempts: list[dict[str, Any]] = []
    total_actions = 0
    total_requires = 0
    meta["attempted"] = True
    meta["skipped"] = False

    for group_key, items in groups.items():
        refs = {str(u.get("excerpt_ref") or "") for u in items if u.get("excerpt_ref")}
        scoped = _excerpts_for_refs(excerpts, refs)
        trailer = build_procedure_repair_trailer(items)
        attempt: dict[str, Any] = {
            "group_key": group_key,
            "adjudicated_ids": [u.get("adjudicated_id") for u in items],
            "titles": [u.get("title") for u in items],
            "excerpt_refs": sorted(refs),
            "trailer": trailer,
        }
        partial = map_fn(scoped, trailer)
        if not isinstance(partial, dict):
            attempt["error"] = "map_fn_non_dict"
            partial = {"operator_actions": [], "requires_devices": []}
        base, n_act, n_req = _merge_partial_into_profile(
            base, partial, scoped, items=items
        )
        # One LLM attempt; if still unmatched, deterministic fill (procedures only).
        det_actions = 0
        for u in items:
            det = _deterministic_fill_for_item(u, base, scoped)
            base, da, _dr = _merge_partial_into_profile(
                base, det, scoped, items=[u]
            )
            # Verbatim heading may not pass token grounding — allow title blob.
            if da == 0 and det.get("operator_actions"):
                for a in det["operator_actions"]:
                    if _matches_any(str(a.get("action") or ""), _action_texts(base)):
                        continue
                    entry = dict(a)
                    entry["source"] = "extracted"
                    base.setdefault("operator_actions", []).append(entry)
                    da += 1
            det_actions += da
        attempt["added_actions"] = n_act + det_actions
        attempt["added_requires"] = n_req
        attempt["deterministic_actions"] = det_actions
        attempts.append(attempt)
        total_actions += n_act + det_actions
        total_requires += n_req

    if any(u.get("adjudicated_id") == "mli_panel_alts" for u in targets):
        base = unify_panel_family_needed_for(base)
    if any(u.get("adjudicated_id") == "smartsolar_globallink" for u in targets):
        base = unify_gx_globallink_needed_for(base)

    # Review flag for any deterministic fills.
    flags = list(base.get("validation_flags") or [])
    existing = {
        (f.get("flag"), f.get("detail"))
        for f in flags
        if isinstance(f, dict)
    }
    for i, a in enumerate(base.get("operator_actions") or []):
        if not isinstance(a, dict):
            continue
        if not (
            a.get("deterministic_fill") is True
            or str(a.get("vote_margin") or "") == "repaired_deterministic"
        ):
            continue
        detail = f"deterministic_fill action={a.get('action')!r}"
        key = (DETERMINISTIC_FILL, detail)
        if key not in existing:
            flags.append(
                {
                    "flag": DETERMINISTIC_FILL,
                    "detail": detail,
                    "field_path": f"operator_actions[{i}]",
                }
            )
            existing.add(key)
    base["validation_flags"] = flags

    from interaction_profile_options import collapse_option_value_actions

    base["operator_actions"] = collapse_option_value_actions(
        list(base.get("operator_actions") or [])
    )

    meta["attempts"] = attempts
    meta["added_actions"] = total_actions
    meta["added_requires"] = total_requires
    meta["trailer"] = attempts[0]["trailer"] if attempts else ""
    return base, meta


def run_procedure_inventory_pass(
    profile: dict[str, Any],
    *,
    excerpts: list[dict[str, Any]] | list[str] | None,
    map_groups: list[dict[str, Any]] | None = None,
    llm_fallback: Callable[[str, list[dict[str, Any]]], list[dict[str, Any]]]
    | None = None,
    repair_map_fn: Callable[[list[dict[str, Any]], str], dict[str, Any]] | None = None,
    repair_enabled: bool | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Inventory → reconcile → optional scoped repair. Returns (profile, payload)."""
    inventory = build_procedure_inventory(
        excerpts, map_groups=map_groups, llm_fallback=llm_fallback
    )
    reconciliation = reconcile_procedure_inventory(
        inventory, profile, excerpts=excerpts
    )
    out = dict(profile)
    flags = list(out.get("validation_flags") or [])
    existing = {
        (f.get("flag"), f.get("detail"))
        for f in flags
        if isinstance(f, dict)
    }
    for f in reconciliation.get("validation_flags") or []:
        key = (f.get("flag"), f.get("detail"))
        if key not in existing:
            flags.append(f)
            existing.add(key)
    out["validation_flags"] = flags

    repair_meta: dict[str, Any] = {"attempted": False, "enabled": False}
    gate = PROCEDURE_REPAIR_ENABLED if repair_enabled is None else repair_enabled
    if gate and reconciliation.get("unaccounted"):
        out, repair_meta = apply_procedure_repair(
            out,
            unaccounted=list(reconciliation.get("unaccounted") or []),
            excerpts=excerpts,
            map_fn=repair_map_fn,
            enabled=True,
        )
        reconciliation = reconcile_procedure_inventory(
            inventory, out, excerpts=excerpts
        )
        flags = [
            f
            for f in (out.get("validation_flags") or [])
            if not (
                isinstance(f, dict)
                and f.get("flag") in {PROCEDURE_UNACCOUNTED, ALTERNATIVE_UNACCOUNTED}
            )
        ]
        flags.extend(reconciliation.get("validation_flags") or [])
        out["validation_flags"] = flags

    payload = {
        "inventory": inventory,
        "reconciliation": {
            "accounted": reconciliation.get("accounted"),
            "classified": reconciliation.get("classified"),
            "unaccounted": reconciliation.get("unaccounted"),
            "unaccounted_procedures": reconciliation.get("unaccounted_procedures"),
            "unaccounted_alternatives": reconciliation.get("unaccounted_alternatives"),
            "accounting_trail": reconciliation.get("accounting_trail"),
            "counts": reconciliation.get("counts"),
            "corpus_sizes": reconciliation.get("corpus_sizes"),
        },
        "repair": repair_meta,
        "repair_enabled": gate,
    }
    return out, payload
