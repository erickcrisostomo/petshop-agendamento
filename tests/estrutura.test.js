const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter(nome => nome.endsWith('.html'));

test('as páginas apontam para arquivos locais existentes', () => {
  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
    for (const [, referencia] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(referencia)) continue;
      const arquivo = referencia.split(/[?#]/)[0];
      if (!arquivo) continue;
      assert.ok(fs.existsSync(path.resolve(raiz, arquivo)), `${pagina}: ${referencia}`);
    }
  }
});

test('o endereço antigo do painel redireciona para admin.html', () => {
  const html = fs.readFileSync(path.join(raiz, 'ThaisPet@.html'), 'utf8');
  assert.match(html, /http-equiv="refresh" content="0; url=admin\.html"/);
  assert.ok(fs.existsSync(path.join(raiz, 'admin.html')));
});

test('o login aponta para a nova página e o painel mantém a verificação de acesso', () => {
  const login = fs.readFileSync(path.join(raiz, 'assets/js/admin-login.js'), 'utf8');
  const admin = fs.readFileSync(path.join(raiz, 'assets/js/admin.js'), 'utf8');
  assert.match(login, /window\.location\.href = 'admin\.html'/);
  assert.match(admin, /auth\.getSession\(/);
  assert.match(admin, /ADMIN_EMAIL/);
});
