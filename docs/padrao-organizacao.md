# Padrão para pequenos projetos web

Este é um ponto de partida para sites com HTML/CSS/JavaScript e endpoints server-side. Não é uma obrigação para projetos com framework: nesses casos, use a estrutura da ferramenta.

## Estrutura sugerida

```text
projeto/
├── index.html
├── outras-paginas.html
├── assets/
│   ├── css/
│   ├── js/
│   └── imagens/
├── api/
├── supabase/migrations/       # Ou a pasta de migração do seu banco
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── package.json              # Comandos do projeto, quando usa Node
└── README.md
```

Crie apenas pastas que têm uma função real. Não adicione camadas, frameworks ou ferramentas só para parecer mais organizado.

## Nomes e responsabilidades

- Use nomes minúsculos em kebab-case: `admin-login.js`, `cadastro-produto.html`, `logo-loja.jpg`.
- Evite espaços, acentos e símbolos especiais nos nomes de arquivos novos.
- Prefira nomes de função claros a nomes como `script.js`, `novo2.js` ou `final.css`.
- HTML define conteúdo e estrutura; CSS define apresentação; JS define comportamento; `api/` valida solicitações e executa operações de servidor.
- Separe scripts por página ou funcionalidade. Extraia um módulo compartilhado quando houver uso real em mais de um lugar; preserve a ordem de carregamento e teste antes de mudar para ES modules.
- Use CSS compartilhado para elementos comuns e arquivos específicos para áreas com estilos próprios. Não duplique um arquivo inteiro para alterar um detalhe.
- Funções e variáveis seguem uma convenção consistente (por exemplo, camelCase; constantes de configuração em UPPER_SNAKE_CASE). Isso não exige renomear todo código antigo de uma vez.

## Caminhos e compatibilidade

- Respeite pastas especiais da hospedagem, como `api/` na Vercel.
- Atualize referências em HTML, CSS, JS e testes ao mover arquivos. URLs de imagens em CSS são relativas ao arquivo CSS, não ao HTML.
- Mudar o endereço de uma página exige manter um redirecionamento do endereço antigo quando ele já está em uso.
- Revise URLs usadas em e-mails, recuperação de senha e configurações de autenticação.
- Use uma branch para reorganizações grandes; separe refatoração de mudanças de comportamento e revise o diff.

## Segurança e banco

- Segredos ficam no servidor/variáveis de ambiente, nunca em `assets/` ou páginas públicas.
- `.env.example` documenta os nomes das variáveis com exemplos sem segredos; `.env` fica no `.gitignore`.
- `.gitignore` não remove segredos já versionados: se houve vazamento, revogue/rotacione as chaves e trate o histórico.
- Arquivos e URLs escondidos não são controle de acesso. Autenticação e autorização devem ser verificadas no servidor/banco.
- Migrações devem ter sequência clara. Não reaplique SQL antigo em produção nem edite migrações aplicadas para introduzir mudanças novas.

## Checklist para outro projeto

1. Liste os arquivos e encontre onde são referenciados.
2. Garanta um ponto de recuperação no Git e preserve alterações de outras pessoas.
3. Organize sem mudar regras de negócio ao mesmo tempo.
4. Atualize caminhos, testes e redirecionamentos.
5. Teste páginas, APIs, autenticação e comportamento responsivo.
6. Documente instalação, configuração, testes, publicação e limitações no README.
7. Publique e confira a versão realmente disponível no site.
