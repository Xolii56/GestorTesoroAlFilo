-- Esquema base Inventario + Requests + Restocks
-- Ejecutar en Supabase SQL Editor

-- USERS (perfil app, enlaza con auth.uid() via discord)
create table if not exists users (
  discord_id uuid primary key, -- auth.uid()
  username text,
  avatar_url text,
  role text not null default 'miembro', -- visitante|miembro|encargado|admin
  created_at timestamptz default now()
);

-- ITEMS
create table if not exists items (
  id bigserial primary key,
  name text not null,
  type text,
  quantity integer not null default 0,
  unit_value numeric(12,2),
  location text,
  updated_at timestamptz default now()
);

-- REQUESTS
create table if not exists requests (
  id bigserial primary key,
  requester_discord_id uuid not null,
  item_id bigint references items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null default 'pendiente', -- pendiente|aprobada|rechazada|parcial
  approver_discord_id uuid,
  created_at timestamptz default now()
);

-- RESTOCKS
create table if not exists restocks (
  id bigserial primary key,
  item_id bigint references items(id) on delete cascade,
  requested_by uuid not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'abierto', -- abierto|en_progreso|completado
  created_at timestamptz default now()
);

-- CONTRIBUTIONS
create table if not exists contributions (
  id bigserial primary key,
  restock_id bigint references restocks(id) on delete cascade,
  contributor_discord_id uuid not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now()
);

-- Vistas de conveniencia
create view requests_with_item as
  select r.*, i.name as item_name
  from requests r
  left join items i on i.id = r.item_id;
