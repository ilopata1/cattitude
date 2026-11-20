"""Optional coach rewrite. A rejected reply returns the deterministic briefing."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from openai import AzureOpenAI
from pydantic import BaseModel

from coach_brief import rewrite_coach_brief
from config import settings

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["coach"])


class CoachBriefRequest(BaseModel):
    snapshot: dict[str, Any]
    findings: list[dict[str, Any]]
    deterministic: str
    style: Literal["short", "long"] = "short"


def coach_openai_client() -> AzureOpenAI:
    return AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
        timeout=20.0,
    )


@router.post("/coach/brief")
async def post_coach_brief(slug: str, body: CoachBriefRequest) -> JSONResponse:
    del slug  # The phone already scoped the snapshot. The path matches the other vessel routes.
    result = rewrite_coach_brief(body.model_dump(), client=coach_openai_client())
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
