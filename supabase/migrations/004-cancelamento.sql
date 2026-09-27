-- Aplicar no SQL Editor do Supabase antes de publicar o botão de cancelamento.
-- Mantém o histórico e libera o horário cancelado para outro cliente.
begin;

alter table public.agendamentos
  add column if not exists cancelado_em timestamptz;

drop index if exists public.agendamentos_data_horario_unico;
create unique index if not exists agendamentos_data_horario_ativo_unico
  on public.agendamentos (data_agendamento, horario)
  where cancelado_em is null;

create or replace function public.horarios_ocupados(data_consulta date)
returns table (horario text)
language sql
stable
security definer
set search_path = public
as $$
  select a.horario
  from public.agendamentos a
  where a.data_agendamento = data_consulta
    and a.cancelado_em is null;
$$;

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
    status, cliente_id, telefone_cliente, tipo_busca, pagamento
  ) values (
    solicitacao.data_desejada, solicitacao.horario_desejado, solicitacao.nome_pet,
    concat(solicitacao.especie, ' - ', solicitacao.porte), servicos_texto,
    solicitacao.valor_estimado, 'confirmado', null, solicitacao.telefone,
    solicitacao.tipo_chegada, solicitacao.pagamento
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
