-- Políticas de segurança da tabela public.agendamentos.
-- Execute este arquivo no SQL Editor do Supabase somente depois de publicar
-- a versão do site que usa a função horarios_ocupados.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt() ->> 'email') = 'pretin@thpet.com.br', false);
$$;

create or replace function public.horarios_ocupados(data_consulta date)
returns table (horario text)
language sql
stable
security definer
set search_path = public
as $$
  select a.horario
  from public.agendamentos a
  where a.data_agendamento = data_consulta;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.horarios_ocupados(date) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.horarios_ocupados(date) to authenticated;

alter table public.agendamentos enable row level security;

-- Remove regras permissivas que expunham a tabela inteira.
drop policy if exists "Permitir alteração de agendamentos" on public.agendamentos;
drop policy if exists "Permitir inserção de agendamentos" on public.agendamentos;
drop policy if exists "Permitir leitura de agendamentos" on public.agendamentos;
drop policy if exists "Usuarios podem criar agendamentos" on public.agendamentos;
drop policy if exists "Usuarios veem apenas seus agendamentos" on public.agendamentos;

create policy "Clientes criam apenas os próprios agendamentos"
on public.agendamentos
for insert
to authenticated
with check (cliente_id = (select auth.uid()));

create policy "Clientes veem apenas os próprios agendamentos"
on public.agendamentos
for select
to authenticated
using (cliente_id = (select auth.uid()) or (select public.is_admin()));

create policy "Somente admin altera agendamentos"
on public.agendamentos
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

commit;
