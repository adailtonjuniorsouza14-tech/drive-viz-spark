-- 1) active_google_connection: owner or admin only
DROP POLICY IF EXISTS active_connection_read ON public.active_google_connection;

CREATE POLICY active_connection_read_own_or_admin
ON public.active_google_connection
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) app_user_connections: server-only (service_role). Explicitly revoke API roles.
REVOKE ALL ON public.app_user_connections FROM anon, authenticated;
GRANT ALL ON public.app_user_connections TO service_role;

COMMENT ON TABLE public.app_user_connections IS
  'Server-only: encrypted connector keys. Accessed exclusively by service_role server functions; anon/authenticated have no grants and no policies by design.';

-- Deny-by-default marker policy so the table has an explicit rule (matches zero rows for API roles).
DROP POLICY IF EXISTS app_user_connections_no_api_access ON public.app_user_connections;
CREATE POLICY app_user_connections_no_api_access
ON public.app_user_connections
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 3) SECURITY DEFINER trigger function must not be callable by API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- has_role stays executable by authenticated: RLS policies invoke it as the caller.
