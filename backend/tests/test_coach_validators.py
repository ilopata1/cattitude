"""Coach rewrite checks. The model client is a fake. No network calls."""

from __future__ import annotations

import json
import logging
import os
from types import SimpleNamespace

os.environ.setdefault("AZURE_OPENAI_API_KEY", "test-key")
os.environ.setdefault("AZURE_OPENAI_ENDPOINT", "https://example.openai.azure.com/")
os.environ.setdefault("AZURE_OPENAI_API_VERSION", "2024-10-21")
os.environ.setdefault("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "embed")
os.environ.setdefault("AZURE_OPENAI_CHAT_DEPLOYMENT", "chat-deployment")
os.environ.setdefault("DATABASE_URL", "postgresql://localhost/cattitude")

from coach_brief import (  # noqa: E402
    SECTIONS,
    assemble_coach_brief,
    parse_coach_reply,
    rewrite_coach_brief,
    validate_coach_reply,
)
from llm_client import (  # noqa: E402
    build_chat_llm,
    require_structured_output_api_version,
    structured_outputs_supported,
)


def _finding(finding_id, *, severity="info", direction=None, evidence=None, text="Hold course."):
    item = {
        "id": finding_id,
        "severity": severity,
        "confidence": "high",
        "text": text,
        "evidence": evidence if evidence is not None else {},
        "section": "sails",
    }
    if direction:
        item["direction"] = direction
    return item


def _reply(**sections):
    payload = {key: [] for key in SECTIONS}
    payload.update(sections)
    return payload


def _body(findings, style="short", deterministic="Deterministic briefing."):
    return {
        "snapshot": {"vessel": {"hullType": "cat", "hasDaggerboards": False}},
        "findings": findings,
        "deterministic": deterministic,
        "style": style,
    }


def _gust_findings():
    return [
        _finding(
            "sails.reef-gust-spread",
            severity="action",
            direction="less-sail",
            evidence={"gustKn": 25, "avoidKn": 18},
            text="Gusts reach 25 kn. The plan says avoid full main above 18 kn.",
        ),
        _finding(
            "outlook.watch-handover",
            evidence={"minutes": 40},
            text="Watch change in 40 min.",
        ),
    ]


def _passing_reply():
    return _reply(
        bottom_line=[{
            "finding_id": "sails.reef-gust-spread",
            "sentence": "Gusts reach 25 kn. The plan says avoid full main above 18 kn.",
        }],
        caveats=[{
            "finding_id": "outlook.watch-handover",
            "sentence": "Watch change in 40 min.",
        }],
    )


def test_passing_reply_is_accepted():
    body = _body(_gust_findings())
    parsed = _passing_reply()
    assert validate_coach_reply(parsed, body) is None
    text = assemble_coach_brief(parsed)
    assert "BOTTOM LINE" in text
    assert "Gusts reach 25 kn." in text
    assert "avoid full main" in text


def test_invented_number_is_rejected():
    parsed = _passing_reply()
    parsed["bottom_line"][0]["sentence"] = "Gusts reach 99 kn."
    assert validate_coach_reply(parsed, _body(_gust_findings())) == "numbers"


def test_missing_action_is_rejected():
    findings = [
        _finding("sails.mismatch", severity="action", text="Reef the main.", evidence={}),
        _finding("outlook.watch-handover", text="Watch change in 40 min.", evidence={"minutes": 40}),
    ]
    parsed = _reply(
        bottom_line=[{"finding_id": "outlook.watch-handover", "sentence": "Watch change in 40 min."}],
        sail_plan=[{"finding_id": "sails.mismatch", "sentence": "Reef the main."}],
    )
    assert validate_coach_reply(parsed, _body(findings)) == "coverage"


def test_shake_out_is_rejected():
    findings = [_finding("sails.mismatch", severity="action", text="Reef the main.", evidence={})]
    parsed = _reply(bottom_line=[{
        "finding_id": "sails.mismatch",
        "sentence": "Shake out the reef.",
    }])
    assert validate_coach_reply(parsed, _body(findings)) == "safety"


def test_same_direction_may_repeat_its_own_recommendation():
    findings = [_finding(
        "sails.same",
        severity="action",
        direction="same",
        text="Shake out the reef.",
        evidence={},
    )]
    parsed = _reply(bottom_line=[{
        "finding_id": "sails.same",
        "sentence": "Shake out the reef.",
    }])
    assert validate_coach_reply(parsed, _body(findings)) is None


def test_unknown_finding_id_is_rejected():
    parsed = _reply(bottom_line=[{
        "finding_id": "not-a-finding",
        "sentence": "Gusts reach 25 kn.",
    }])
    assert validate_coach_reply(parsed, _body(_gust_findings())) == "grounding"


def test_over_length_is_rejected():
    sentence = " ".join(["steady"] * 200)
    findings = [_finding("sails.reef-gust-spread", severity="action", direction="less-sail", text=sentence)]
    parsed = _reply(bottom_line=[{"finding_id": "sails.reef-gust-spread", "sentence": sentence}])
    assert validate_coach_reply(parsed, _body(findings, style="short")) == "length"


def test_fenced_json_is_rejected_without_repair():
    raw = "```json\n" + json.dumps(_passing_reply()) + "\n```"
    assert parse_coach_reply(raw) is None
    result = rewrite_coach_brief(
        _body(_gust_findings(), deterministic="Keep the software text."),
        client=_client(raw),
    )
    assert result["source"] == "deterministic"
    assert result["rejected_reason"] == "schema"
    assert result["text"] == "Keep the software text."


def test_temperature_error_retries_once_without_it(caplog):
    client = _TemperatureThenOk()
    with caplog.at_level(logging.WARNING):
        result = rewrite_coach_brief(_body(_gust_findings()), client=client)
    assert result["source"] == "llm"
    assert len(client.calls) == 2
    assert client.calls[0]["temperature"] == 0.1
    assert "temperature" not in client.calls[1]
    assert "temperature" in caplog.text.lower()


def test_build_chat_llm_uses_chat_model_then_deployment(monkeypatch):
    from llm_client import settings

    monkeypatch.setattr(settings, "azure_openai_chat_deployment", "chat-deployment")
    monkeypatch.setattr(settings, "azure_openai_chat_model", "gpt-5.1")
    monkeypatch.setattr("llm_client.AzureOpenAI", lambda **kwargs: kwargs)
    built = build_chat_llm(0.2)
    assert built["model"] == "gpt-5.1"
    assert built["deployment_name"] == "chat-deployment"
    assert built["temperature"] == 0.2

    monkeypatch.setattr(settings, "azure_openai_chat_model", None)
    fallback = build_chat_llm(None)
    assert fallback["model"] == "chat-deployment"
    assert "temperature" not in fallback


def test_old_api_version_fails_startup(monkeypatch):
    from llm_client import settings

    assert structured_outputs_supported("2024-10-21")
    assert structured_outputs_supported("2024-10-21-preview")
    assert not structured_outputs_supported("2024-02-01")
    monkeypatch.setattr(settings, "azure_openai_api_version", "2024-02-01")
    try:
        require_structured_output_api_version()
    except RuntimeError as exc:
        assert "2024-10-21" in str(exc)
    else:
        raise AssertionError("an old API version should stop startup")


class _TemperatureThenOk:
    def __init__(self):
        self.calls = []
        self.chat = SimpleNamespace(completions=self)

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if "temperature" in kwargs:
            raise RuntimeError("Unsupported parameter: temperature")
        return _message(json.dumps(_passing_reply()))


def _client(content: str):
    completions = SimpleNamespace(create=lambda **_kwargs: _message(content))
    return SimpleNamespace(chat=SimpleNamespace(completions=completions))


def _message(content: str):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])
