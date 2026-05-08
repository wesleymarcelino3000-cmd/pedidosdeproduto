-- Tabela para o app de pedidos de produtos dos funcionários
-- Rode este SQL no Supabase: SQL Editor > New query > Run

create table if not exists public.pedidos_produtos (
  id uuid primary key default gen_random_uuid(),
  funcionario text not null,
  produto text not null,
  quantidade integer not null check (quantidade > 0),
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pedidos_produtos enable row level security;

-- Remove políticas antigas, caso existam
drop policy if exists "Permitir leitura publica pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir inserir pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir atualizar pedidos" on public.pedidos_produtos;
drop policy if exists "Permitir excluir pedidos" on public.pedidos_produtos;

-- Como é um app interno simples usando chave publishable/anon,
-- essas políticas liberam o uso da tabela pelo app.
create policy "Permitir leitura publica pedidos"
on public.pedidos_produtos for select
using (true);

create policy "Permitir inserir pedidos"
on public.pedidos_produtos for insert
with check (true);

create policy "Permitir atualizar pedidos"
on public.pedidos_produtos for update
using (true)
with check (true);

create policy "Permitir excluir pedidos"
on public.pedidos_produtos for delete
using (true);
