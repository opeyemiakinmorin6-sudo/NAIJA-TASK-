-- NAIJA TASK: private storage access for poster bank-transfer proof screenshots.
-- The bucket must already exist with the exact ID: payment proof.
-- Files are scoped to a user's own folder: <auth.uid>/<task_id>/<filename>.
-- Admins may read proof only to review payment submissions.

drop policy if exists "naija_task_upload_own_payment_proof" on storage.objects;
create policy "naija_task_upload_own_payment_proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment proof'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "naija_task_read_own_or_admin_payment_proof" on storage.objects;
create policy "naija_task_read_own_or_admin_payment_proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment proof'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
        and au.active = true
    )
  )
);

drop policy if exists "naija_task_delete_own_payment_proof" on storage.objects;
create policy "naija_task_delete_own_payment_proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment proof'
  and (storage.foldername(name))[1] = auth.uid()::text
);
