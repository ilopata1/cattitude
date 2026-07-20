# Offline + live pipeline gates (Windows-friendly; Makefile may not be present).
# From backend/:
#   .\pipeline_verify.ps1
#   .\pipeline_verify.ps1 -CompareScratch
#   .\pipeline_verify.ps1 -Regression

param(
    [switch]$CompareScratch,
    [switch]$Regression
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Invoke-Step([string]$Title, [string]$Cmd) {
    Write-Host "==> $Title"
    Invoke-Expression $Cmd
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Title (exit $LASTEXITCODE)"
    }
}

Invoke-Step "Stage 1.5 validator fixtures" "python scripts/verify_interaction_profile_validate.py"
Invoke-Step "Stage 1.5 Zeus v4.22 founding" "python scripts/verify_stage15_zeus_v422.py"
Invoke-Step "Heading carry-forward v4.23" "python scripts/verify_heading_carry_forward.py"
Invoke-Step "Stage 1.5 contradiction auto-repair" "python scripts/verify_interaction_profile_autorepair.py"
Invoke-Step "Stage 1.5 absence + coverage" "python scripts/verify_interaction_profile_absence.py"
Invoke-Step "Stage 1 reduce merge" "python scripts/verify_interaction_profile_merge.py"
Invoke-Step "Stage 1.6 derived actions" "python scripts/verify_interaction_profile_derive.py"
Invoke-Step "Stage 1 stability voting + partition" "python scripts/verify_interaction_profile_vote.py"
Invoke-Step "Stage 1 procedure inventory" "python scripts/verify_interaction_profile_procedures.py"
Invoke-Step "Stage 2 system graph fixtures" "python scripts/verify_system_graph.py"
Invoke-Step "System assembly fixtures" "python scripts/verify_system_assembly.py"
Invoke-Step "Solar section v4" "python scripts/verify_solar_section_v4.py"
Invoke-Step "Controls section v4.10" "python scripts/verify_controls_section_v4.py"
Invoke-Step "Batteries section v4.17" "python scripts/verify_batteries_section_v4.py"
Invoke-Step "Electrical section v4.35" "python scripts/verify_electrical_section_v4.py"
Invoke-Step "Field pack occasion v4.19" "python scripts/verify_field_pack_occasion.py"

if ($CompareScratch -or $Regression) {
    Invoke-Step "Live scratch vs SmartSolar golden" "python scripts/compare_smartsolar_scratch.py"
    Invoke-Step "Live scratch vs Mass Combi golden" "python scripts/compare_masscombi_scratch.py"
    Invoke-Step "Live scratch vs MLI Ultra golden" "python scripts/compare_mli_scratch.py"
    Invoke-Step "Archive last_green payloads" "python scripts/archive_last_green.py --all-green"
    # Stage 2 resolver negatives (plain switch / Class T) are asserted inside
    # verify_system_graph.py (always) and again on the full Outremer vessel run.
    Invoke-Step "Outremer vessel Stage 2+3 (resolver + xrefs)" "python scripts/run_outremer_vessel.py"
}

Write-Host "OK - pipeline verify complete"
