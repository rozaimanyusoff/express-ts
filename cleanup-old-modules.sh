#!/bin/bash

# Admin Module Consolidation - Cleanup Script
# This script removes the old standalone modules after migration is complete
# Run this ONLY after verifying all dependencies have been migrated to p.admin

echo "=========================================="
echo "Admin Module Cleanup - Remove Old Modules"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "This script will delete the following old modules:"
echo "  - src/p.nav/"
echo "  - src/p.role/"
echo "  - src/p.group/"
echo ""
echo "These have been consolidated into: src/p.admin/"
echo ""
echo "⚠️  WARNING: This action cannot be undone!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to delete these modules? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "Removing old modules..."
echo ""

# Remove modules with verbose output
if [ -d "src/p.nav" ]; then
    echo "🗑️  Removing src/p.nav/"
    rm -rf src/p.nav/
    echo "✅ src/p.nav/ deleted"
fi

if [ -d "src/p.role" ]; then
    echo "🗑️  Removing src/p.role/"
    rm -rf src/p.role/
    echo "✅ src/p.role/ deleted"
fi

if [ -d "src/p.group" ]; then
    echo "🗑️  Removing src/p.group/"
    rm -rf src/p.group/
    echo "✅ src/p.group/ deleted"
fi

echo ""
echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "Old modules have been removed."
echo "All functionality is now in: src/p.admin/"
echo ""
echo "Next steps:"
echo "  1. Run type-checking: npm run type-check"
echo "  2. Run tests to verify everything works"
echo "  3. Commit changes to git"
echo ""
