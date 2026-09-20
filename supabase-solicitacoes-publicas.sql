-- Nova fila de solicitações públicas.
-- Execute este arquivo no SQL Editor do Supabase antes de publicar a nova página inicial.
-- Ele não altera nem remove os agendamentos existentes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.solicitacoes_agendamento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  created_at timestamptz not null default now(),
  confirmado_em timestamptz,
  status text not null default 'aguardando_confirmacao'
    check (status in ('aguardando_confirmacao', 'confirmado', 'recusado', 'cancelado')),
  nome_tutor text not null,
  telefone text not null,
  nome_pet text not null,
  especie text not null,
  porte text not null,
  temperamento text not null,
  servicos jsonb not null,
  valor_estimado numeric(10,2) not null check (valor_estimado >= 0),
  data_desejada date not null,
  horario_desejado text not null,
  tipo_chegada text not null check (tipo_chegada in ('Cliente levará ao pet shop', 'Solicitou busca em casa')),
  endereco text,
  pagamento text not null check (pagamento in ('Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro')),
  observacoes text
);

create index if not exists solicitacoes_agendamento_status_data_idx
  on public.solicitacoes_agendamento (status, data_desejada, horario_desejado);

alter table public.solicitacoes_agendamento enable row level security;

drop policy if exists "Admin consulta solicitacoes" on public.solicitacoes_agendamento;
create policy "Admin consulta solicitacoes"
on public.solicitacoes_agendamento
for select
to authenticated
using ((select public.is_admin()));

-- Nenhuma política anônima de INSERT: o navegador não escreve diretamente no banco.
-- A Vercel valida os dados e usa a chave de serviço apenas no servidor.

create or replace function public.confirmar_solicitacao_agendamento(solicitacao_id uuid)
returns table (resultado text)
language plpgsql
security definer
set search_path = public
as $$
declare
  solicitacao public.solicitacoes_agendamento%rowtype;
  servicos_texto text;
begin
  if not public.is_admin() then
    raise exception 'Acesso não autorizado';
  end if;

  select * into solicitacao
  from public.solicitacoes_agendamento
  where id = solicitacao_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada';
  end if;

  if solicitacao.status <> 'aguardando_confirmacao' then
    return query select 'solicitacao_ja_processada'::text;
    return;
  end if;

  if exists (
    select 1 from public.agendamentos
    where data_agendamento = solicitacao.data_desejada
      and horario = solicitacao.horario_desejado
  ) then
    return query select 'horario_indisponivel'::text;
    return;
  end if;

  select string_agg(item ->> 'nome', ', ')
  into servicos_texto
  from jsonb_array_elements(solicitacao.servicos) as item;

  insert into public.agendamentos (
    data_agendamento, horario, nome_pet, porte_especie, servico, valor,
    status, cliente_id, telefone_cliente, tipo_busca
  ) values (
    solicitacao.data_desejada, solicitacao.horario_desejado, solicitacao.nome_pet,
    concat(solicitacao.especie, ' - ', solicitacao.porte), servicos_texto,
    solicitacao.valor_estimado, 'confirmado', null, solicitacao.telefone,
    solicitacao.tipo_chegada
  );

  update public.solicitacoes_agendamento
  set status = 'confirmado', confirmado_em = now()
  where id = solicitacao.id;

  return query select 'confirmado'::text;
end;
$$;

revoke all on function public.confirmar_solicitacao_agendamento(uuid) from public;
grant execute on function public.confirmar_solicitacao_agendamento(uuid) to authenticated;

commit;
