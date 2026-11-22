#!/usr/bin/env bash
# Writes a new migration from the difference between prisma/migrations and prisma/schema.prisma, ending with the
# row-level-security call every migration needs (docs/ARCHITECTURE.md). Usage: npm run db:new -- <name>
set -euo pipefail
name="${1:?usage: npm run db:new -- <name>}"
dir="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_${name}"
mkdir -p "$dir"
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script > "$dir/migration.sql"
printf '\n-- Every table with tenantId: row-level security (docs/ARCHITECTURE.md).\nSELECT kosh_enable_rls();\n' >> "$dir/migration.sql"
echo "Wrote $dir/migration.sql — review it, then: npm run db:deploy"
