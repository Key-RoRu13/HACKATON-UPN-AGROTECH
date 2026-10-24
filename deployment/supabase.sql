-- Ejecutar una vez en SQL Editor de tu proyecto Supabase.
-- Tabla privada: solo los procesos de servidor con service_role acceden.
create table if not exists public.agrotrace_passports (
  id text primary key,
  payload jsonb not null,
  photo_objects jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  constraint only_confirmed check (payload->>'status' = 'confirmed')
);
alter table public.agrotrace_passports enable row level security;
revoke all on public.agrotrace_passports from anon, authenticated;
grant select, insert, update on public.agrotrace_passports to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agrotrace-passports', 'agrotrace-passports', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Pasaporte estable del lote: ejecutar también en proyectos ya configurados.
create table if not exists public.rikuy_lot_passports (
  id text primary key,
  payload jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.rikuy_lot_passports enable row level security;
revoke all on public.rikuy_lot_passports from anon, authenticated;
grant select, insert, update on public.rikuy_lot_passports to service_role;
