"""Replace homeRuleSections platform prompt — vessel-agnostic, snapshot-only rules."""

from alembic import op
from sqlalchemy import text

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None

_HOME_RULES_PROMPT_V2 = """Generate homeRuleSections for the Home tab.

Use ONLY facts from INPUT SNAPSHOT (vessel, guide_context, equipment).
Turn guide_context.localRules into guest-facing rules when present.
Add equipment-specific rules only when manufacturer/model in the snapshot supports them.

STRICT RULES:
- Do NOT include location-specific rules (anchoring, VHF channels, marina/charter contacts)
  unless explicitly stated in guide_context.localRules or guide_context VHF/contact fields.
- Do NOT mention equipment brands or models absent from INPUT SNAPSHOT equipment.
- Do NOT assume charter base, cruising region, or head type — use snapshot facts only.
- If REFERENCE MODULE is provided, match its section structure and tone only; write fresh rule
  text from INPUT SNAPSHOT. Never copy reference rule wording the snapshot does not support.

Produce 2–3 sections: Never Do This (danger), Always Do This (caution), optional Good Habits (good).
Each rule needs icon (emoji), tone, and text. Add link only when referencing a checklist route.

Return JSON only — a JSON array (homeRuleSections), no wrapper object."""


def upgrade() -> None:
    op.execute(
        """
        UPDATE guide_prompt_template
        SET is_active = false
        WHERE scope = 'platform'
          AND scope_id IS NULL
          AND content_type = 'ui'
          AND content_key = 'homeRuleSections'
          AND is_active = true
        """
    )
    conn = op.get_bind()
    conn.execute(
        text(
            """
            INSERT INTO guide_prompt_template (
                scope, scope_id, content_type, content_key, version,
                prompt_text, is_active, created_by
            )
            SELECT
                'platform', NULL,
                'ui', 'homeRuleSections',
                COALESCE(
                    (
                        SELECT MAX(version)
                        FROM guide_prompt_template
                        WHERE scope = 'platform'
                          AND scope_id IS NULL
                          AND content_type = 'ui'
                          AND content_key = 'homeRuleSections'
                    ),
                    0
                ) + 1,
                :prompt_text, true, 'migration_017'
            """
        ),
        {"prompt_text": _HOME_RULES_PROMPT_V2},
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE guide_prompt_template
        SET is_active = false
        WHERE scope = 'platform'
          AND scope_id IS NULL
          AND content_type = 'ui'
          AND content_key = 'homeRuleSections'
          AND is_active = true
        """
    )
    op.execute(
        """
        UPDATE guide_prompt_template
        SET is_active = true
        WHERE scope = 'platform'
          AND scope_id IS NULL
          AND content_type = 'ui'
          AND content_key = 'homeRuleSections'
          AND version = 1
        """
    )
