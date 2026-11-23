-- Ask AI: the read-only database role, for a database whose application user may not create roles.
--
-- The migration "ask_views" does all of this by itself when it can. Run this file once, as a database administrator,
-- only when Settings → Ask says the read-only role is missing (or the migration printed a notice about kosh_ask):
--
--   psql -d <database> -v app=<application user> -f scripts/ask-role.sql
--
-- <application user> is the user in DATABASE_URL. Safe to run again. PostgreSQL 16 or newer.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kosh_ask') THEN
    CREATE ROLE kosh_ask NOLOGIN NOINHERIT;
  END IF;
END $$;

-- The application steps down to kosh_ask for each question; it never inherits from it.
GRANT kosh_ask TO :"app" WITH SET TRUE, INHERIT FALSE;

-- What kosh_ask may read: the views of the "ask" schema, except the two that hold the pass.
GRANT USAGE ON SCHEMA ask TO kosh_ask;
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'ask' AND viewname NOT IN ('ctx', 'emp') LOOP
    EXECUTE format('GRANT SELECT ON ask.%I TO kosh_ask', v.viewname);
  END LOOP;
END $$;
REVOKE ALL ON ask.ctx, ask.emp FROM kosh_ask;

-- ask.run() executes as kosh_ask (inside it PostgreSQL refuses any change of role); only the application may call it.
REVOKE ALL ON FUNCTION ask.run(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ask.run(text, integer) TO :"app";
GRANT CREATE ON SCHEMA ask TO kosh_ask;
ALTER FUNCTION ask.run(text, integer) OWNER TO kosh_ask;
REVOKE CREATE ON SCHEMA ask FROM kosh_ask;

-- Optional, stricter still: a separate login for Ask, so that its connection could not read a table even by mistake.
--   ALTER ROLE kosh_ask LOGIN PASSWORD '<a long random password>';
-- then set ASK_DATABASE_URL to the same database with user kosh_ask and that password.
