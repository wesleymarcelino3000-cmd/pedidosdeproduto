-- PEDIDOS DE PRODUTOS - INNO LIFE
-- Rode este SQL no Supabase em SQL Editor > Run.

create extension if not exists "pgcrypto";

create table if not exists public.pedidos_produtos (
  id uuid primary key default gen_random_uuid(),
  funcionario text not null,
  produto text not null,
  quantidade integer not null check (quantidade > 0),
  checked boolean not null default false,
  arquivado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pedidos_produtos add column if not exists checked boolean not null default false;
alter table public.pedidos_produtos add column if not exists arquivado boolean not null default false;
alter table public.pedidos_produtos add column if not exists created_at timestamptz not null default now();

create table if not exists public.listas_pedidos_mensais (
  id uuid primary key default gen_random_uuid(),
  mes_referencia text not null,
  observacao text,
  total_pedidos integer not null default 0,
  total_itens integer not null default 0,
  pedidos_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.produtos_pedidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

insert into public.produtos_pedidos (nome) values
('Melasonina'),('Bom Hálito'),('Pulmoclean'),('DrySkin')
on conflict (nome) do nothing;

alter table public.pedidos_produtos enable row level security;
alter table public.listas_pedidos_mensais enable row level security;
alter table public.produtos_pedidos enable row level security;

drop policy if exists "permitir tudo pedidos" on public.pedidos_produtos;
drop policy if exists "permitir tudo listas" on public.listas_pedidos_mensais;
drop policy if exists "permitir tudo produtos" on public.produtos_pedidos;

create policy "permitir tudo pedidos" on public.pedidos_produtos for all using (true) with check (true);
create policy "permitir tudo listas" on public.listas_pedidos_mensais for all using (true) with check (true);
create policy "permitir tudo produtos" on public.produtos_pedidos for all using (true) with check (true);
