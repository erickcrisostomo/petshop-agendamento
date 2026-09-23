-- Executar após supabase-cancelamento.sql para manter o endereço na agenda.
begin;

alter table public.agendamentos
  add column if not exists endereco_busca text;

-- Recupera o endereço de solicitações confirmadas anteriores quando a
-- combinação de pet, telefone, data e horário identifica um único pedido.
with solicitacoes_unicas as (
  select data_desejada, horario_desejado, telefone, nome_pet,
    max(endereco) as endereco
  from public.solicitacoes_agendamento
  where status = 'confirmado' and endereco is not null
  group by data_desejada, horario_desejado, telefone, nome_pet
  having count(*) = 1
)
update public.agendamentos as agenda
set endereco_busca = solicitacao.endereco
from solicitacoes_unicas as solicitacao
where agenda.endereco_busca is null
  and agenda.tipo_busca = 'Solicitou busca em casa'
  and agenda.data_agendamento = solicitacao.data_desejada
  and agenda.horario = solicitacao.horario_desejado
  and agenda.telefone_cliente = solicitacao.telefone
  and agenda.nome_pet = solicitacao.nome_pet;

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
      and cancelado_em is null
  ) then
    return query select 'horario_indisponivel'::text;
    return;
  end if;

  select string_agg(item ->> 'nome', ', ')
  into servicos_texto
  from jsonb_array_elements(solicitacao.servicos) as item;

  insert into public.agendamentos (
    data_agendamento, horario, nome_pet, porte_especie, servico, valor,
    status, cliente_id, telefone_cliente, tipo_busca, endereco_busca, pagamento
  ) values (
    solicitacao.data_desejada, solicitacao.horario_desejado, solicitacao.nome_pet,
    concat(solicitacao.especie, ' - ', solicitacao.porte), servicos_texto,
    solicitacao.valor_estimado, 'confirmado', null, solicitacao.telefone,
    solicitacao.tipo_chegada, solicitacao.endereco, solicitacao.pagamento
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
