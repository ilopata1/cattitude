# Offline pipeline regression (Stage 1.5 + Stage 2 + assembly).
# Run from backend/:  make pipeline-verify
#
# Live extract gate (after extract_interaction_profile.py writes scratch):
#   make pipeline-compare-scratch

.PHONY: pipeline-verify pipeline-compare-scratch pipeline-regression stage4-bytematch stage4-substrate-match

pipeline-verify:
	python scripts/verify_interaction_profile_validate.py
	python scripts/verify_interaction_profile_autorepair.py
	python scripts/verify_interaction_profile_absence.py
	python scripts/verify_interaction_profile_merge.py
	python scripts/verify_interaction_profile_derive.py
	python scripts/verify_system_graph.py
	python scripts/verify_system_assembly.py
	python scripts/verify_solar_section_v4.py
	python scripts/verify_batteries_section_v4.py
	python scripts/verify_controls_section_v4.py
	python scripts/verify_electrical_section_v4.py
	python scripts/verify_nav_section_v4.py
	python scripts/verify_stage4_modules.py

# Phase 2+ gate (needs DB seeded + frozen oracle under fixtures/pipeline/oracles/):
#   python scripts/verify_stage4_modules.py --write-oracle --slug supernova
# DB-substrate-built modules (with registry places) must match the frozen oracle.
stage4-bytematch:
	python scripts/verify_stage4_modules.py --byte-match --slug supernova

# Substrate fidelity without location prose (places stripped from DB path).
stage4-substrate-match:
	python scripts/verify_stage4_modules.py --substrate-match --slug supernova

pipeline-compare-scratch:
	python scripts/compare_smartsolar_scratch.py
	python scripts/compare_masscombi_scratch.py

# Full local gate: fixtures must pass; live scratch must match golden if present.
pipeline-regression: pipeline-verify pipeline-compare-scratch
