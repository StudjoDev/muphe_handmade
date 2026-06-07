#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$ROOT_DIR/crystal-survey/google-apps-script"

if ! command -v clasp >/dev/null 2>&1; then
  echo "clasp is not installed. Install it with: npm install -g @google/clasp" >&2
  exit 1
fi

if [[ ! -f "$SCRIPT_DIR/.clasp.json" ]]; then
  cat >&2 <<'EOF'
Missing crystal-survey/google-apps-script/.clasp.json.

Create it by cloning the existing Apps Script project first:
  cd crystal-survey/google-apps-script
  clasp clone <SCRIPT_ID> .

The Web App URL deployment id is not the same as SCRIPT_ID.
EOF
  exit 1
fi

if [[ $# -lt 1 ]]; then
  cat >&2 <<'EOF'
Usage:
  scripts/deploy-apps-script.sh <DEPLOYMENT_ID> [DESCRIPTION]

Example:
  scripts/deploy-apps-script.sh AKfyc... "braceletProfile API update"
EOF
  exit 1
fi

DEPLOYMENT_ID="$1"
DESCRIPTION="${2:-braceletProfile API update}"

cd "$SCRIPT_DIR"

echo "Pulling current remote Apps Script files..."
clasp pull

echo "Uploading local Apps Script package..."
clasp push

echo "Creating Apps Script version..."
VERSION_OUTPUT="$(clasp version "$DESCRIPTION")"
echo "$VERSION_OUTPUT"
VERSION_NUMBER="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/^Created version \([0-9][0-9]*\).*/\1/p' | tail -1)"

if [[ -z "$VERSION_NUMBER" ]]; then
  echo "Could not parse version number from clasp output." >&2
  exit 1
fi

echo "Redeploying Web App deployment $DEPLOYMENT_ID to version $VERSION_NUMBER..."
clasp redeploy "$DEPLOYMENT_ID" "$VERSION_NUMBER" "$DESCRIPTION"

echo "Apps Script deployment updated."
