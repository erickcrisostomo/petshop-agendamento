-- Ajuste final para o fluxo de solicitacoes publicas.
-- Execute uma vez no SQL Editor apos as migracoes anteriores.
-- O cliente cria uma solicitacao pela API; apenas a funcao de confirmacao
-- (SECURITY DEFINER, acessivel ao admin autenticado) cria o agendamento.

begin;

drop policy if exists "Clientes criam apenas os próprios agendamentos"
  on public.agendamentos;
revoke insert on table public.agendamentos from public, anon, authenticated;

-- REVOKE FROM public sozinho nao remove os grants explicitos do papel anon.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.horarios_ocupados(date) from public, anon;
revoke execute on function public.confirmar_solicitacao_agendamento(uuid)
  from public, anon;

commit;
