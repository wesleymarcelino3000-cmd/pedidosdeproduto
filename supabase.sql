-- App Pedidos de Produtos dos Funcionários - Inno Life
-- Rode este SQL no Supabase: SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.pedidos_produtos (
  id uuid primary key default gen_random_uuid(),
  funcionario text not null,
  produto text not null,
  quantidade integer not null check (quantidade > 0),
  checked boolean not null default false,
  arquivado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pedidos_produtos add column if not exists arquivado boolean not null default false;
alter table public.pedidos_produtos enable row level security;

drop policy if exists "Permitir leitura publica pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir inserir pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir atualizar pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir excluir pedidos" on public.pedidos_produtos;

create policy "Permitir leitura publica pedidos" on public.pedidos_produtos for select using (true);
create policy "Permitir inserir pedidos" on public.pedidos_produtos for insert with check (true);
create policy "Permitir atualizar pedidos" on public.pedidos_produtos for update using (true) with check (true);
create policy "Permitir excluir pedidos" on public.pedidos_produtos for delete using (true);

create table if not exists public.listas_pedidos_mensais (
  id uuid primary key default gen_random_uuid(),
  mes_referencia text not null,
  observacao text,
  total_pedidos integer not null default 0,
  total_itens integer not null default 0,
  pedidos_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.listas_pedidos_mensais enable row level security;

drop policy if exists "Permitir leitura publica listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir inserir listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir atualizar listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir excluir listas mensais" on public.listas_pedidos_mensais;

create policy "Permitir leitura publica listas mensais" on public.listas_pedidos_mensais for select using (true);
create policy "Permitir inserir listas mensais" on public.listas_pedidos_mensais for insert with check (true);
create policy "Permitir atualizar listas mensais" on public.listas_pedidos_mensais for update using (true) with check (true);
create policy "Permitir excluir listas mensais" on public.listas_pedidos_mensais for delete using (true);

create table if not exists public.produtos_cadastrados (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.produtos_cadastrados enable row level security;

drop policy if exists "Permitir leitura publica produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir inserir produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir atualizar produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir excluir produtos" on public.produtos_cadastrados;

create policy "Permitir leitura publica produtos" on public.produtos_cadastrados for select using (true);
create policy "Permitir inserir produtos" on public.produtos_cadastrados for insert with check (true);
create policy "Permitir atualizar produtos" on public.produtos_cadastrados for update using (true) with check (true);
create policy "Permitir excluir produtos" on public.produtos_cadastrados for delete using (true);

insert into public.produtos_cadastrados (nome) values
('Melasonina'),('Bom Hálito'),('Pulmoclean'),('DrySkin')
on conflict (nome) do nothing;
