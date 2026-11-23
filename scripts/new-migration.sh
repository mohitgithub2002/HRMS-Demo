#!/usr/bin/env bash
# Writes a new migration from the difference between prisma/migrations and prisma/schema.prisma, ending with the
# row-level-security call every migration needs (docs/ARCHITECTURE.md). Usage: npm run db:new -- <name>
set -euo pipefail
name="${1:?usage: npm run db:new -- <name>}"
dir="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_${name}"
# The same-organisation keys and indexes (kosh_tfk_*, kosh_tuniq_*) live outside schema.prisma; never let Prisma
# drop them. The awk step removes the comment headings left without a statement.
# Written to a temporary file first, so a failed diff never leaves an empty migration behind.
tmp="$(mktemp)"
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script > "$tmp"
mkdir -p "$dir"
grep -v '"kosh_t' "$tmp" | awk 'BEGIN { RS = ""; ORS = "\n\n" } !/^-- [A-Za-z]+$/' > "$dir/migration.sql"
rm -f "$tmp"
printf -- '-- Every table with tenantId: row-level security and same-organisation keys (docs/ARCHITECTURE.md).\nSELECT kosh_enable_rls();\n' >> "$dir/migration.sql"
echo "Wrote $dir/migration.sql — review it, then: npm run db:deploy"
