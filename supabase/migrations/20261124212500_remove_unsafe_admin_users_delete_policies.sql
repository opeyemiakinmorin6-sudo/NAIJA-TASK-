-- The policies below were attached to public.admin_users (not tasks).
-- They allowed any active administrator to directly delete administrator
-- membership rows. Admin membership changes must use an audited, purpose-built
-- server-side workflow instead of broad table DELETE access.
DROP POLICY IF EXISTS "Admin can delete tasks" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.admin_users;
