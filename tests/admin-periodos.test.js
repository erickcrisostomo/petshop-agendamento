const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const codigo = fs.readFileSync(require.resolve('../admin.js'), 'utf8');

async function consultarPeriodos(instante) {
  const intervalos = [];
  const elementos = new Map();
  const dataFixa = Date.parse(instante);
  const DataFalsa = class extends Date {
    constructor(...args) { super(...(args.length ? args : [dataFixa])); }
    static now() { return dataFixa; }
  };
  const cliente = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        is() { return this; },
        gte(_campo, valor) { this.inicio = valor; return this; },
        lte(_campo, valor) {
          intervalos.push([this.inicio, valor]);
          return Promise.resolve({ data: [] });
        }
      };
    }
  };
  const contexto = vm.createContext({
    Date: DataFalsa,
    Intl,
    supabase: { createClient: () => cliente },
    document: {
      addEventListener() {},
      getElementById(id) {
        if (!elementos.has(id)) elementos.set(id, { textContent: '' });
        return elementos.get(id);
      }
    }
  });
  vm.runInContext(codigo, contexto);
  await vm.runInContext('atualizarResumoFinanceiro()', contexto);
  return { intervalos, elementos };
}

test('o mês passa de setembro para outubro no horário de Brasília', async () => {
  const setembro = await consultarPeriodos('2026-10-01T02:59:00Z');
  const outubro = await consultarPeriodos('2026-10-01T03:01:00Z');
  assert.deepEqual(setembro.intervalos[1], ['2026-09-01', '2026-09-30']);
  assert.deepEqual(outubro.intervalos[1], ['2026-10-01', '2026-10-31']);
  assert.equal(outubro.elementos.get('fat-mensal').textContent, 'R$ 0,00');
});

test('no domingo o resumo semanal acompanha a próxima semana da agenda', async () => {
  const domingo = await consultarPeriodos('2026-10-04T15:00:00Z');
  assert.deepEqual(domingo.intervalos[0], ['2026-10-05', '2026-10-10']);
});
