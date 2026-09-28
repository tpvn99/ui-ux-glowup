#!/bin/bash
# Validates every skill in skills/ against the Agent Skills specification.
# Reference: https://agentskills.io/specification.md
# Adapted from coreyhaines31/marketingskills (MIT).

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
cd "$(dirname "$0")"
SKILLS_DIR="skills"
ISSUES=0; WARNINGS=0; PASSED=0

echo "Validating skills against the Agent Skills specification"
echo "========================================================"

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  skill_file="$skill_dir/SKILL.md"
  errors=(); warnings=()

  if [[ ! -f "$skill_file" ]]; then
    echo -e "${RED}✗ $skill_name${NC}\n   Missing SKILL.md"; ((ISSUES++)); continue
  fi

  frontmatter=$(awk '/^---$/{count++; next} count==1' "$skill_file")
  if [[ -z "$frontmatter" ]]; then
    echo -e "${RED}✗ $skill_name${NC}\n   Missing YAML frontmatter"; ((ISSUES++)); continue
  fi

  # name
  name=$(echo "$frontmatter" | grep "^name:" | sed 's/^name: //' | tr -d ' "')
  if [[ -z "$name" ]]; then errors+=("Missing 'name'")
  elif [[ "$name" != "$skill_name" ]]; then errors+=("Name mismatch: dir='$skill_name' frontmatter='$name'")
  elif ! [[ "$name" =~ ^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$ ]] || [[ "$name" == *--* ]]; then errors+=("Invalid name format: '$name'")
  fi

  # description
  desc=$(echo "$frontmatter" | grep "^description:" | head -1 | sed 's/^description: //; s/^"//; s/"$//')
  if [[ -z "$desc" ]]; then errors+=("Missing 'description'")
  else
    len=${#desc}
    (( len < 1 || len > 1024 )) && errors+=("Description length $len (must be 1-1024)")
    echo "$desc" | grep -qi "when\|use" || warnings+=("Description lacks trigger phrases ('when', 'use')")
  fi

  # version placement
  echo "$frontmatter" | grep -q "^version:" && errors+=("'version' must be under 'metadata:'")

  # length
  lines=$(wc -l < "$skill_file")
  (( lines > 500 )) && warnings+=("SKILL.md is $lines lines (should be <500)")

  # referenced files exist
  for ref in $(grep -oE '(references|scripts|assets)/[A-Za-z0-9_./-]+\.(md|mjs|js|html|tsx|json)' "$skill_file" | sort -u); do
    [[ -f "$skill_dir/$ref" ]] || errors+=("Referenced file not found: $ref")
  done

  # evals JSON
  if [[ -f "$skill_dir/evals/evals.json" ]]; then
    python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$skill_dir/evals/evals.json" 2>/dev/null || errors+=("evals/evals.json is not valid JSON")
  else
    warnings+=("No evals/evals.json")
  fi

  if (( ${#errors[@]} )); then
    echo -e "${RED}✗ $skill_name${NC}"; for e in "${errors[@]}"; do echo -e "   ${RED}Error:${NC} $e"; done
    for w in "${warnings[@]}"; do echo -e "   ${YELLOW}Warning:${NC} $w"; done
    ((ISSUES++))
  elif (( ${#warnings[@]} )); then
    echo -e "${YELLOW}! $skill_name${NC}"; for w in "${warnings[@]}"; do echo -e "   ${YELLOW}Warning:${NC} $w"; done
    ((WARNINGS++))
  else
    echo -e "${GREEN}✓ $skill_name${NC}"; ((PASSED++))
  fi
done

# Plugin manifests
for f in .claude-plugin/plugin.json .claude-plugin/marketplace.json; do
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null || { echo -e "${RED}✗ $f is not valid JSON${NC}"; ((ISSUES++)); }
done
pv=$(python3 -c "import json;print(json.load(open('.claude-plugin/plugin.json'))['version'])")
mv=$(python3 -c "import json;print(json.load(open('.claude-plugin/marketplace.json'))['metadata']['version'])")
if [[ "$pv" != "$mv" ]]; then echo -e "${RED}✗ Version mismatch: plugin.json=$pv marketplace.json=$mv${NC}"; ((ISSUES++)); fi
grep -q "^### $pv " VERSIONS.md || { echo -e "${YELLOW}! VERSIONS.md has no '### $pv (date)' block${NC}"; ((WARNINGS++)); }

echo "========================================================"
echo -e "${GREEN}Passed: $PASSED${NC}  ${YELLOW}Warnings: $WARNINGS${NC}  ${RED}Issues: $ISSUES${NC}"
(( ISSUES == 0 )) && { echo -e "${GREEN}All skills are valid ✓${NC}"; exit 0; } || exit 1
