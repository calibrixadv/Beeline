#!/usr/bin/env bash
# ==============================================================================
# prepare_git_cleanup.sh
# Monorepo Cleanup & Git Readiness Script for Beeline
#
# Usage:
#   ./scripts/prepare_git_cleanup.sh [--dry-run|--apply]
#
# Defaults to --dry-run (preview mode). Pass --apply to perform actual removal.
# ==============================================================================

set -euo pipefail

MODE="dry-run"

for arg in "$@"; do
    case "$arg" in
        --apply)
            MODE="apply"
            ;;
        --dry-run)
            MODE="dry-run"
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run | --apply]"
            echo "  --dry-run : Preview cleanup actions without deleting (default)"
            echo "  --apply   : Execute cleanup and remove obsolete artifacts"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: $0 [--dry-run | --apply]"
            exit 1
            ;;
    esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "========================================================================"
echo " Beeline Monorepo Git Preparation & Cleanup"
echo " Working Directory: $REPO_ROOT"
echo " Execution Mode:    [$MODE]"
echo "========================================================================"

# Directories and files to purge
TARGET_DIRS=(
    "catboost_info"
    "frontend/.next"
    "frontend/coverage"
    ".pytest_cache"
    "backend/.pytest_cache"
    ".mypy_cache"
    ".ruff_cache"
)

TARGET_FILES=(
    "frontend/tsconfig.tsbuildinfo"
    "backend/scraper/.cache/tier1.csv"
)

# Function to get human readable size
get_size_bytes() {
    local target="$1"
    if [ -d "$target" ]; then
        du -sk "$target" 2>/dev/null | awk '{print $1 * 1024}' || echo "0"
    elif [ -f "$target" ]; then
        stat -f%z "$target" 2>/dev/null || stat -c%s "$target" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

format_bytes() {
    local bytes="$1"
    if [ "$bytes" -ge 1048576 ]; then
        awk "BEGIN {printf \"%.2f MB\", $bytes / 1048576}"
    elif [ "$bytes" -ge 1024 ]; then
        awk "BEGIN {printf \"%.2f KB\", $bytes / 1024}"
    else
        echo "${bytes} B"
    fi
}

TOTAL_FREED_BYTES=0

echo ""
echo "--- 1. Purging Build/Training Artifacts & Caches ---"

# Process predefined directories
for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        SZ=$(get_size_bytes "$dir")
        HUMAN_SZ=$(format_bytes "$SZ")
        TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + SZ))
        if [ "$MODE" = "apply" ]; then
            rm -rf "$dir"
            echo " [DELETED] Dir:  $dir ($HUMAN_SZ)"
        else
            echo " [PLAN-DEL] Dir:  $dir ($HUMAN_SZ)"
        fi
    fi
done

# Process predefined files
for file in "${TARGET_FILES[@]}"; do
    if [ -f "$file" ]; then
        SZ=$(get_size_bytes "$file")
        HUMAN_SZ=$(format_bytes "$SZ")
        TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + SZ))
        if [ "$MODE" = "apply" ]; then
            rm -f "$file"
            echo " [DELETED] File: $file ($HUMAN_SZ)"
        else
            echo " [PLAN-DEL] File: $file ($HUMAN_SZ)"
        fi
    fi
done

# Scan and clean recursive patterns (__pycache__, .DS_Store, *.pyc, *.pyo)
# Find __pycache__ directories
while IFS= read -r pycache_dir; do
    if [ -n "$pycache_dir" ] && [ -d "$pycache_dir" ]; then
        SZ=$(get_size_bytes "$pycache_dir")
        HUMAN_SZ=$(format_bytes "$SZ")
        TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + SZ))
        if [ "$MODE" = "apply" ]; then
            rm -rf "$pycache_dir"
            echo " [DELETED] Cache: $pycache_dir ($HUMAN_SZ)"
        else
            echo " [PLAN-DEL] Cache: $pycache_dir ($HUMAN_SZ)"
        fi
    fi
done < <(find . -type d -name "__pycache__" -not -path "*/node_modules/*" -not -path "*/.git/*")

# Find .DS_Store files
while IFS= read -r ds_file; do
    if [ -n "$ds_file" ] && [ -f "$ds_file" ]; then
        SZ=$(get_size_bytes "$ds_file")
        HUMAN_SZ=$(format_bytes "$SZ")
        TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + SZ))
        if [ "$MODE" = "apply" ]; then
            rm -f "$ds_file"
            echo " [DELETED] Junk:  $ds_file ($HUMAN_SZ)"
        else
            echo " [PLAN-DEL] Junk:  $ds_file ($HUMAN_SZ)"
        fi
    fi
done < <(find . -type f -name ".DS_Store" -not -path "*/node_modules/*" -not -path "*/.git/*")

# Find *.pyc / *.pyo files outside of __pycache__
while IFS= read -r pyc_file; do
    if [ -n "$pyc_file" ] && [ -f "$pyc_file" ]; then
        SZ=$(get_size_bytes "$pyc_file")
        HUMAN_SZ=$(format_bytes "$SZ")
        TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + SZ))
        if [ "$MODE" = "apply" ]; then
            rm -f "$pyc_file"
            echo " [DELETED] Bytecode: $pyc_file ($HUMAN_SZ)"
        else
            echo " [PLAN-DEL] Bytecode: $pyc_file ($HUMAN_SZ)"
        fi
    fi
done < <(find . -type f \( -name "*.pyc" -o -name "*.pyo" \) -not -path "*/node_modules/*" -not -path "*/.git/*")

echo ""
HUMAN_TOTAL=$(format_bytes "$TOTAL_FREED_BYTES")
if [ "$MODE" = "apply" ]; then
    echo "Disk space freed: $HUMAN_TOTAL"
else
    echo "Potential disk space to free: $HUMAN_TOTAL"
fi

echo ""
echo "--- 2. GitHub Push Safety Audit (>50MB File Check) ---"
# Check all tracked and untracked (non-ignored) files > 50MB
LARGE_FILES_FOUND=0

while IFS= read -r file; do
    if [ -n "$file" ] && [ -f "$file" ]; then
        # Check if git tracks or would track this file (not ignored)
        if ! git check-ignore -q "$file" 2>/dev/null; then
            FILE_BYTES=$(get_size_bytes "$file")
            FILE_HUMAN=$(format_bytes "$FILE_BYTES")
            if [ "$LARGE_FILES_FOUND" -eq 0 ]; then
                printf "%-60s | %-12s | %s\n" "FILE PATH" "SIZE" "STATUS"
                printf "%-60s-+-%-12s-+-%s\n" "------------------------------------------------------------" "------------" "-------------------"
            fi
            LARGE_FILES_FOUND=$((LARGE_FILES_FOUND + 1))
            printf "%-60s | %-12s | %s\n" "$file" "$FILE_HUMAN" "WARNING: >50MB"
        fi
    fi
done < <(find . -type f -size +50M -not -path "*/.git/*" -not -path "*/node_modules/*")

if [ "$LARGE_FILES_FOUND" -eq 0 ]; then
    echo " [PASSED] Zero tracked/untracked non-ignored files exceed 50 MB."
    echo "          Safe for standard GitHub commit & push (100 MB limit)."
else
    echo ""
    echo " [WARNING] Found $LARGE_FILES_FOUND file(s) exceeding 50 MB!"
    echo "           Add them to .gitignore or use Git LFS before pushing."
fi

echo ""
echo "--- 3. Git Status Summary ---"
git status --short

echo ""
echo "========================================================================"
if [ "$MODE" = "apply" ]; then
    echo " Cleanup complete. Monorepo is prepped and ready for verification."
else
    echo " Dry-run complete. Run with '--apply' to execute."
fi
echo "========================================================================"
