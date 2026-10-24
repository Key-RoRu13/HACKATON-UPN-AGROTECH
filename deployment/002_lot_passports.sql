-- Pasaporte estable del lote: ejecutar también en proyectos ya configurados.
create table if not exists public.rikuy_lot_passports (
  id text primary key,
  payload jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.rikuy_lot_passports enable row level security;
revoke all on public.rikuy_lot_passports from anon, authenticated;
grant select, insert, update on public.rikuy_lot_passports to service_role;
