alter table fundus_images
  add column if not exists image_code text;

create unique index if not exists idx_fundus_images_code_unique
  on fundus_images(image_code)
  where image_code is not null;

create index if not exists idx_fundus_images_code on fundus_images(image_code);

drop policy if exists "Prototype update fundus images" on fundus_images;
create policy "Prototype update fundus images" on fundus_images
  for update using (true) with check (true);

drop policy if exists "Prototype delete fundus images" on fundus_images;
create policy "Prototype delete fundus images" on fundus_images
  for delete using (true);
