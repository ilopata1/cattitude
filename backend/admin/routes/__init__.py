from __future__ import annotations

from fastapi import APIRouter

from admin.routes import equipment, guide, home, manuals, operating_bases, option_packs, prompts, vessels

router = APIRouter(prefix="/admin")
router.include_router(home.router)
router.include_router(equipment.router)
router.include_router(manuals.router)
router.include_router(option_packs.router)
router.include_router(operating_bases.router)
router.include_router(vessels.router)
router.include_router(guide.router)
router.include_router(prompts.router)
