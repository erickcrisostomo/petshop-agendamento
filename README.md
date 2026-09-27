# TH Pet — agendamento

Site de agendamento com confirmação pelo WhatsApp, painel administrativo e banco Supabase. Não há cobrança online nem login de clientes.

## Organização

```text
/
├── index.html                 # Página pública e formulário
├── sobre.html / suporte.html  # Páginas institucionais
├── admin-login.html           # Login da equipe
├── admin.html                 # Painel administrativo
├── recuperar-senha.html / redefinir-senha.html
├── ThaisPet@.html             # Compatibilidade com a URL antiga do painel
├── agendamento.html           # Compatibilidade com a URL antiga do agendamento
├── assets/
│   ├── css/                   # Estilos públicos, institucionais e administrativos
│   ├── js/                    # Comportamento das páginas
│   └── imagens/               # Logo, favicon e fotos
├── api/                       # Endpoints server-side da Vercel
├── supabase/migrations/       # Scripts SQL históricos em ordem
├── tests/                     # Testes automatizados
└── docs/                      # Convenções e documentação
```

As páginas e `api/` continuam na raiz para preservar as URLs e os endpoints. Os scripts do navegador continuam carregados pelas páginas, sem compilação ou novo framework.

## Testes

Com Node.js instalado, execute na raiz:

```sh
node --test tests/*.test.js
```

Ou execute `npm test` (`npm.cmd test` caso o PowerShell bloqueie `npm.ps1`). Não há dependências npm para instalar. Os testes verificam regras da API, períodos do painel, referências locais e compatibilidade da URL antiga. Eles não substituem um teste completo no Supabase de produção.

Para visualizar somente HTML/CSS/JS com Python instalado:

```sh
python -m http.server 8000
```

Abra `http://localhost:8000`. Esse servidor NÃO executa `api/`; o envio de solicitações e a consulta de horários precisam do ambiente Vercel configurado. Não use dados reais de clientes em testes.

## Configuração e publicação

O projeto existente é publicado na Vercel a partir de `main`. Uma mudança local só chega ao site depois de commit, push e conclusão do deployment.

Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do projeto Vercel, conforme `.env.example`. Nunca inclua a chave de serviço no frontend ou no Git. A chave publishable usada no navegador não substitui autenticação, permissões e RLS.

Depois de publicar, confira a navegação, login do admin, disponibilidade de horários, formulário/WhatsApp, confirmação e cancelamento. Renomear uma página exige atualizar também redirecionamentos e eventuais URLs de autenticação configuradas no Supabase.

## Banco de dados

Consulte [supabase/migrations/README.md](supabase/migrations/README.md). A reorganização NÃO alterou o banco nem exige reaplicar esses scripts. As migrações são históricas e pressupõem uma tabela de agendamentos preexistente; ainda não são um bootstrap completo de um banco vazio.

## Mudanças de organização

| Antes | Agora |
| --- | --- |
| `ThaisPet@.html` (painel) | `admin.html`; a URL antiga redireciona |
| `script.js` | `assets/js/admin-login.js` |
| `admin.js` | `assets/js/admin.js` |
| `solicitacoes-admin.js` | `assets/js/solicitacoes-admin.js` |
| `solicitacao-publica.js` | `assets/js/solicitacao-publica.js` |
| `style.css` | `assets/css/admin.css` |
| `publico.css`, `institucional.css` | `assets/css/` |
| `LogoPet.jpg` | `assets/imagens/logo-pet.jpg` |
| Favicon e fotos na raiz | `assets/imagens/` |
| SQL na raiz | `supabase/migrations/001-...` até `006-...` |

Os caminhos de HTML e testes foram atualizados. Foram adicionados testes de estrutura, `.gitignore`, `package.json` com o comando de testes e documentação. Nenhuma regra de agendamento, valor, telefone ou permissão do banco foi alterada nesta reorganização.

Para adaptar a organização a outro projeto, veja [docs/padrao-organizacao.md](docs/padrao-organizacao.md).
