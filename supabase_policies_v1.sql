-- Activar RLS y políticas base
alter table users enable row level security;
alter table items enable row level security;
alter table requests enable row level security;
alter table restocks enable row level security;
alter table contributions enable row level security;

-- Función helper: comprueba si auth.uid() es encargado/admin
create or replace function is_staff(uid uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from users u
    where u.discord_id = uid and u.role in ('encargado','admin')
  );
$$;

-- USERS
create policy users_self on users
for select
using (discord_id = auth.uid() or is_staff(auth.uid()));

create policy users_insert_self on users
for insert
with check (discord_id = auth.uid());

create policy users_update_admin on users
for update
using (is_staff(auth.uid()));

-- ITEMS
create policy items_read_all on items
for select using (true);

create policy items_write_staff on items
for insert with check (is_staff(auth.uid()));
create policy items_update_staff on items
for update using (is_staff(auth.uid()));
create policy items_delete_admin on items
for delete using (is_staff(auth.uid()));

-- REQUESTS
create policy requests_read_mine_or_staff on requests
for select
using (requester_discord_id = auth.uid() or is_staff(auth.uid()));

create policy requests_insert_self on requests
for insert
with check (requester_discord_id = auth.uid());

create policy requests_update_staff on requests
for update using (is_staff(auth.uid()));

-- RESTOCKS
create policy restocks_read_all on restocks
for select using (true);

create policy restocks_write_staff on restocks
for insert with check (is_staff(auth.uid()));
create policy restocks_update_staff on restocks
for update using (is_staff(auth.uid()));
create policy restocks_delete_staff on restocks
for delete using (is_staff(auth.uid()));

-- CONTRIBUTIONS
create policy contributions_read_all on contributions
for select using (true);

create policy contributions_insert_auth on contributions
for insert with check (auth.role() = 'authenticated');

-- Trigger update timestamp
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_items_updated on items;
create trigger set_items_updated before update on items
for each row execute procedure set_updated_at();
