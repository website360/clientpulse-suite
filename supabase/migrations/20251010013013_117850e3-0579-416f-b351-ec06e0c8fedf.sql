-- Make bucket public so public URLs work
update storage.buckets set public = true where id = 'ticket-attachments';

-- Drop existing policies if they exist
drop policy if exists "Public read avatars & branding" on storage.objects;
drop policy if exists "Auth users insert avatars" on storage.objects;
drop policy if exists "Auth users update avatars" on storage.objects;
drop policy if exists "Admins insert branding" on storage.objects;
drop policy if exists "Admins update branding" on storage.objects;

-- Allow public read for avatars and branding folders
create policy "Public read avatars & branding"
on storage.objects for select
using (
  bucket_id = 'ticket-attachments'
  and (
    (storage.foldername(name))[1] = 'avatars'
    or (storage.foldername(name))[1] = 'branding'
  )
);

-- Allow authenticated users to upload/update avatars
create policy "Auth users insert avatars"
on storage.objects for insert
with check (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = 'avatars'
  and auth.role() = 'authenticated'
);

create policy "Auth users update avatars"
on storage.objects for update
using (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = 'avatars'
  and auth.role() = 'authenticated'
);

-- Allow admins to upload/update branding
create policy "Admins insert branding"
on storage.objects for insert
with check (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = 'branding'
  and has_role(auth.uid(), 'admin'::app_role)
);

create policy "Admins update branding"
on storage.objects for update
using (
  bucket_id = 'ticket-attachments'
  and (storage.foldername(name))[1] = 'branding'
  and has_role(auth.uid(), 'admin'::app_role)
);