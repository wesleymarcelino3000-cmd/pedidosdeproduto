-- INNO LIFE PEDIDOS - SUPABASE COMPLETO
-- Rode tudo no Supabase: SQL Editor > New query > Run

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
alter table public.pedidos_produtos add column if not exists checked boolean not null default false;
alter table public.pedidos_produtos enable row level security;

drop policy if exists pedidos_select_public on public.pedidos_produtos;
drop policy if exists pedidos_insert_public on public.pedidos_produtos;
drop policy if exists pedidos_update_public on public.pedidos_produtos;
drop policy if exists pedidos_delete_public on public.pedidos_produtos;
drop policy if exists "Permitir leitura publica pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir inserir pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir atualizar pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir excluir pedidos" on public.pedidos_produtos;

create policy pedidos_select_public on public.pedidos_produtos for select to anon, authenticated using (true);
create policy pedidos_insert_public on public.pedidos_produtos for insert to anon, authenticated with check (true);
create policy pedidos_update_public on public.pedidos_produtos for update to anon, authenticated using (true) with check (true);
create policy pedidos_delete_public on public.pedidos_produtos for delete to anon, authenticated using (true);

create table if not exists public.listas_pedidos_mensais (
  id uuid primary key default gen_random_uuid(),
  mes_referencia text not null,
  observacao text,
  data_lista date,
  total_pedidos integer not null default 0,
  total_itens integer not null default 0,
  pedidos_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.listas_pedidos_mensais add column if not exists data_lista date;

alter table public.listas_pedidos_mensais enable row level security;

drop policy if exists listas_select_public on public.listas_pedidos_mensais;
drop policy if exists listas_insert_public on public.listas_pedidos_mensais;
drop policy if exists listas_update_public on public.listas_pedidos_mensais;
drop policy if exists listas_delete_public on public.listas_pedidos_mensais;
drop policy if exists "Permitir leitura publica listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir inserir listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir atualizar listas mensais" on public.listas_pedidos_mensais;
drop policy if exists "Permitir excluir listas mensais" on public.listas_pedidos_mensais;

create policy listas_select_public on public.listas_pedidos_mensais for select to anon, authenticated using (true);
create policy listas_insert_public on public.listas_pedidos_mensais for insert to anon, authenticated with check (true);
create policy listas_update_public on public.listas_pedidos_mensais for update to anon, authenticated using (true) with check (true);
create policy listas_delete_public on public.listas_pedidos_mensais for delete to anon, authenticated using (true);

create table if not exists public.produtos_cadastrados (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.produtos_cadastrados enable row level security;

drop policy if exists produtos_select_public on public.produtos_cadastrados;
drop policy if exists produtos_insert_public on public.produtos_cadastrados;
drop policy if exists produtos_update_public on public.produtos_cadastrados;
drop policy if exists produtos_delete_public on public.produtos_cadastrados;
drop policy if exists "Permitir leitura publica produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir inserir produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir atualizar produtos" on public.produtos_cadastrados;
drop policy if exists "Permitir excluir produtos" on public.produtos_cadastrados;

create policy produtos_select_public on public.produtos_cadastrados for select to anon, authenticated using (true);
create policy produtos_insert_public on public.produtos_cadastrados for insert to anon, authenticated with check (true);
create policy produtos_update_public on public.produtos_cadastrados for update to anon, authenticated using (true) with check (true);
create policy produtos_delete_public on public.produtos_cadastrados for delete to anon, authenticated using (true);

-- Permissões necessárias para a chave publishable/anon salvar pelo REST API
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.pedidos_produtos to anon, authenticated;
grant select, insert, update, delete on public.listas_pedidos_mensais to anon, authenticated;
grant select, insert, update, delete on public.produtos_cadastrados to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

insert into public.produtos_cadastrados (nome) values
('Melasonina'),('Bom Hálito'),('Pulmoclean'),('DrySkin')
on conflict (nome) do nothing;

-- Atualiza o cache do PostgREST/Supabase
notify pgrst, 'reload schema';
