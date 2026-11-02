# Crée les labels et une issue GitHub par ligne de docs/backlog.csv.
# Prérequis : GitHub CLI installé (winget install GitHub.cli) puis `gh auth login`.
# Usage (à la racine du dépôt) : .\scripts\create-issues.ps1

$labels = @{
  "E2" = "1f6feb"; "E3" = "8250df"; "E4" = "bf8700"; "E5" = "cf222e"
  "R1" = "d0d7de"; "R2" = "d0d7de"; "R3" = "d0d7de"; "R4" = "d0d7de"; "Tous" = "d0d7de"
  "must" = "b60205"; "should" = "fbca04"; "could" = "0e8a16"
}
foreach ($name in $labels.Keys) {
  gh label create $name --color $labels[$name] --force | Out-Null
}

Import-Csv -Path "docs/backlog.csv" -Encoding UTF8 | ForEach-Object {
  $body = "Estimation : $($_.estimate_days) j`nVoir docs/backlog.md"
  gh issue create --title "[$($_.id)] $($_.title)" --body $body `
    --label $_.epic --label $_.role --label $_.priority
  Write-Host "Créée : $($_.id)"
}
