-- ─────────────────────────────────────────────────────────────────────────────
-- Same-organisation references. PostgreSQL checks foreign keys without row-level security, so a plain
-- foreign key would let organisation A store a row pointing at organisation B's employee. For every
-- single-column foreign key between two tables that both have "tenantId", kosh_tenant_fks() adds a partner
-- key on ("tenantId", column) → ("tenantId", referenced column): a row can only point at a row of its own
-- organisation. MATCH SIMPLE: an empty reference (NULL) is still allowed.
-- The objects are named kosh_tuniq_* / kosh_tfk_* and are not in schema.prisma (scripts/new-migration.sh keeps
-- Prisma from dropping them). kosh_enable_rls() now also calls kosh_tenant_fks(), so every migration is covered.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kosh_tenant_fks() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r record;
  idx text;
  fk text;
BEGIN
  FOR r IN
    SELECT c.conname, ct.relname AS child, pt.relname AS parent, a.attname AS col, af.attname AS refcol
    FROM pg_constraint c
    JOIN pg_class ct ON ct.oid = c.conrelid
    JOIN pg_class pt ON pt.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = ct.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND n.nspname = 'public' AND array_length(c.conkey, 1) = 1
      AND c.conname NOT LIKE 'kosh_tfk_%'
      AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.conrelid AND x.attname = 'tenantId' AND NOT x.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.confrelid AND x.attname = 'tenantId' AND NOT x.attisdropped)
  LOOP
    idx := left('kosh_tuniq_' || r.parent || '_' || r.refcol, 63);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I ("tenantId", %I)', idx, r.parent, r.refcol);
    fk := left('kosh_tfk_' || r.conname, 63);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId", %I) REFERENCES %I ("tenantId", %I)', r.child, fk, r.col, r.parent, r.refcol);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION kosh_enable_rls() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'tenantId' AND tb.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('Session', 'OtpChallenge', 'PlatformAudit')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.platform'', true) = ''on'') WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.platform'', true) = ''on'')',
      t.table_name);
  END LOOP;
  PERFORM kosh_tenant_fks();
END;
$$;

SELECT kosh_enable_rls();
