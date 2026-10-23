-- Defense in depth: prior Supabase policies must not bypass the application's
-- verified-session, invitation and ownership checks. No records/policies deleted.
DO $$
DECLARE
  api_role TEXT;
  table_name TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'users', 'profiles', 'projects', 'chat_sessions', 'chat_messages',
        'matching_results', 'service_providers', 'auth_sessions', 'invitations',
        'rate_limits', 'conversations', 'direct_messages'
      ] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
