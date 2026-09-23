const test = require('node:test');
const assert = require('node:assert/strict');
const criarSolicitacao = require('../api/solicitacoes');

const DataOriginal = Date;
const instanteFixo = DataOriginal.parse('2026-09-23T13:00:00Z');
global.Date = class extends DataOriginal {
  constructor(...args) { super(...(args.length ? args : [instanteFixo])); }
  static now() { return instanteFixo; }
};
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const pedido = {
  nomeTutor: 'João', telefone: '(38) 99999-9999', nomePet: 'Mel',
  especie: 'Cão', porte: 'Pequeno', temperamento: 'Calmo',
  servicos: ['banho'], dataDesejada: '2026-09-25', horarioDesejado: '14:00',
  tipoChegada: 'Cliente levará ao pet shop', pagamento: 'Pix'
};

function resposta() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    setHeader(nome, valor) { this.headers[nome] = valor; return this; },
    send(corpo) { this.body = JSON.parse(corpo); return this; }
  };
}

test('repete o código de um pedido pendente sem criar outro registro', async () => {
  const chamadas = [];
  global.fetch = async (url, opcoes) => {
    chamadas.push({ url: String(url), opcoes });
    return { ok: true, json: async () => [{
      codigo: 'TH-TESTE', valor_estimado: 40, data_desejada: '2026-09-25',
      horario_desejado: '14:00', status: 'aguardando_confirmacao'
    }] };
  };
  const res = resposta();
  await criarSolicitacao({ method: 'POST', body: pedido }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { codigo: 'TH-TESTE', valorEstimado: 40, existente: true });
  assert.equal(chamadas.length, 1);
});

test('limita a três solicitações por telefone em uma hora', async () => {
  global.fetch = async () => ({ ok: true, json: async () => [
    { status: 'recusado' }, { status: 'recusado' }, { status: 'recusado' }
  ] });
  const res = resposta();
  await criarSolicitacao({ method: 'POST', body: pedido }, res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '3600');
});

test('registra normalmente quando não há pedidos recentes', async () => {
  const chamadas = [];
  global.fetch = async (url, opcoes) => {
    chamadas.push({ url: String(url), opcoes });
    return { ok: true, json: async () => [] };
  };
  const res = resposta();
  await criarSolicitacao({ method: 'POST', body: pedido }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.valorEstimado, 40);
  assert.equal(chamadas.length, 2);
  assert.equal(JSON.parse(chamadas[1].opcoes.body).telefone, '5538999999999');
});
