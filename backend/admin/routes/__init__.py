from __future__ import annotations

from fastapi import APIRouter

from admin.routes import equipment, guide, home, operating_bases, prompts, vessels

router = APIRouter(prefix="/admin")
router.include_router(home.router)
router.include_router(equipment.router)
router.include_router(operating_bases.router)
router.include_router(vessels.router)
router.include_router(guide.router)
router.include_router(prompts.router)
