-- Public bucket for business logos, covers and gallery. Objects live under <business_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "business media: public read" on storage.objects for select
  using (bucket_id = 'business-media');
create policy "business media: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-media' and fmbp.owns_business(((storage.foldername(name))[1])::uuid));
create policy "business media: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'business-media' and fmbp.owns_business(((storage.foldername(name))[1])::uuid));
create policy "business media: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'business-media' and fmbp.owns_business(((storage.foldername(name))[1])::uuid));
