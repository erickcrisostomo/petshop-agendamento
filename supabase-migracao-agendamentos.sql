-- Execute este script no SQL Editor do Supabase antes de publicar a nova tela.
-- Ele preserva os agendamentos existentes; os novos campos ficarão vazios nos registros antigos.

alter table public.agendamentos
  add column if not exists cliente_id uuid references auth.users(id) on delete set null,
  add column if not exists telefone_cliente text,
  add column if not exists tipo_busca text;

alter table public.agendamentos
  drop constraint if exists agendamentos_tipo_busca_valido;

alter table public.agendamentos
  add constraint agendamentos_tipo_busca_valido
  check (tipo_busca is null or tipo_busca in (
    'Cliente levará ao pet shop',
    'Solicitou busca em casa'
  ));

-- Impede que duas pessoas confirmem o mesmo dia e horário simultaneamente.
create unique index if not exists agendamentos_data_horario_unico
  on public.agendamentos (data_agendamento, horario);

-- Segurança: só ative RLS depois de criar e testar as políticas do seu projeto.
-- Ativar RLS sem políticas bloquearia todos os acessos da aplicação.
