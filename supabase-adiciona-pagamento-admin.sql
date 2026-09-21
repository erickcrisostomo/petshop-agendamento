-- Execute uma vez no SQL Editor do Supabase.
-- Guarda a forma de pagamento escolhida na agenda após a confirmação.

alter table public.agendamentos
  add column if not exists pagamento text;

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
