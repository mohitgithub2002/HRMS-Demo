-- CreateTable
CREATE TABLE "DeviceRegistration" (
    "serial" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("serial")
);

-- CreateIndex
CREATE INDEX "DeviceRegistration_tenantId_idx" ON "DeviceRegistration"("tenantId");


-- DeviceRegistration is a platform table (a device push arrives before anyone is signed in): no row-level security.
CREATE OR REPLACE FUNCTION kosh_enable_rls() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'tenantId' AND tb.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('Session', 'OtpChallenge', 'PlatformAudit', 'DeviceRegistration')
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

-- Every table with tenantId: row-level security (docs/ARCHITECTURE.md).
SELECT kosh_enable_rls();
