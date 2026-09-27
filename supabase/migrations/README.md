# Migrações históricas

Estes arquivos foram movidos e numerados para documentar a sequência usada no projeto. Não são executados automaticamente pela Vercel nem foram executados novamente nesta reorganização.

| Ordem | Arquivo atual | Nome anterior |
| --- | --- | --- |
| 1 | `001-agendamentos.sql` | `supabase-migracao-agendamentos.sql` |
| 2 | `002-seguranca-rls.sql` | `supabase-seguranca-rls.sql` |
| 3 | `003-solicitacoes-publicas.sql` | `supabase-solicitacoes-publicas.sql` |
| 4 | `004-cancelamento.sql` | `supabase-cancelamento.sql` |
| 5 | `005-endereco-busca.sql` | `supabase-endereco-busca.sql` |
| 6 | `006-fechamento-acessos.sql` | `supabase-fechamento-acessos.sql` |

## Cuidados

- O banco de produção já recebeu estes ajustes. Não execute novamente apenas porque os arquivos mudaram de pasta.
- Os scripts pressupõem `public.agendamentos` e sua estrutura original; não recriam um banco vazio por completo.
- Alguns scripts substituem funções e políticas; reaplicar uma versão anterior pode desfazer correções posteriores ou falhar por objetos existentes.
- Para uma mudança futura, crie `007-nome-da-mudanca.sql`, teste em ambiente separado e registre sua aplicação. Preserve o histórico e não use migrações antigas como atalhos para mudanças novas.
- Esta numeração é uma convenção manual do projeto, não uma configuração do Supabase CLI. Para adotar uma ferramenta de migração, estabeleça antes um baseline do schema existente e siga o formato exigido por ela.
- Nunca coloque senhas, chaves ou dados pessoais nos scripts.
