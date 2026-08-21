-- Admin check no longer goes through the SECURITY DEFINER function.
DROP POLICY IF EXISTS user_roles_admin_select_all ON public.user_roles;

DROP POLICY IF EXISTS active_connection_read_own_or_admin ON public.active_google_connection;

CREATE POLICY active_connection_read_own_or_admin
ON public.active_google_connection
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
);
