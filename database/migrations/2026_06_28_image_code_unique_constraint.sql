alter table fundus_images
  add column if not exists image_code text;

delete from fundus_images a
using fundus_images b
where a.image_code is not null
  and b.image_code is not null
  and a.image_code = b.image_code
  and a.created_at < b.created_at;

create unique index if not exists idx_fundus_images_image_code_unique
  on fundus_images(image_code)
  where image_code is not null;
