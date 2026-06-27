drop policy if exists "Public read active fundus images" on fundus_images;
create policy "Public read active fundus images" on fundus_images
  for select using (is_active = true);

drop policy if exists "Public insert quiz responses" on doctor_quiz_responses;
create policy "Public insert quiz responses" on doctor_quiz_responses
  for insert with check (true);
