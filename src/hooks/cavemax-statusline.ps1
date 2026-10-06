$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".cavemax-active"
if (-not (Test-Path $Flag)) { exit 0 }

# Refuse reparse points (symlinks/junctions) + oversized files — stops a planted
# flag from rendering secret bytes / ANSI escapes to the terminal each keystroke.
try {
    $Item = Get-Item -LiteralPath $Flag -Force -ErrorAction Stop
    if ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { exit 0 }
    if ($Item.Length -gt 32) { exit 0 }
} catch { exit 0 }

$Mode = ""
try {
    $Raw = Get-Content -LiteralPath $Flag -TotalCount 1 -ErrorAction Stop
    if ($null -ne $Raw) { $Mode = ([string]$Raw).Trim() }
} catch { exit 0 }

# Strip anything outside [a-z0-9-] then whitelist-validate.
$Mode = $Mode.ToLowerInvariant() -replace '[^a-z0-9-]', ''
$Valid = @('off','safe','max','brutal','mute')
if (-not ($Valid -contains $Mode)) { exit 0 }
if ($Mode -eq 'off') { exit 0 }

$Esc = [char]27
if ($Mode -eq 'max') {
    [Console]::Write("${Esc}[38;5;208m[CAVEMAX]${Esc}[0m")
} else {
    [Console]::Write("${Esc}[38;5;208m[CAVEMAX:$($Mode.ToUpperInvariant())]${Esc}[0m")
}
