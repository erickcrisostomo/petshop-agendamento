const { randomUUID } = require('crypto');

const SERVICOS = {
  banho_tosa: { nome: 'Banho e tosa completa', valor: 60 },
  banho: { nome: 'Apenas banho', valor: 40 },
  tosa_higienica: { nome: 'Tosa higiênica', valor: 25 },
  unhas_ouvidos: { nome: 'Unhas e ouvidos', valor: 15 },
  dentes: { nome: 'Escovação de dentes', valor: 10 }
};
const HORARIOS = new Set(['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
const TIPOS_CHEGADA = new Set(['Cliente levará ao pet shop', 'Solicitou busca em casa']);
const PAGAMENTOS = new Set(['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro']);

function responder(res, status, corpo) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(corpo));
}

function texto(valor, tamanhoMaximo) {
  return typeof valor === 'string' ? valor.trim().slice(0, tamanhoMaximo) : '';
}

function agoraNoBrasil() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((objeto, parte) => ({ ...objeto, [parte.type]: parte.value }), {});
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    hora: Number(partes.hour),
    minuto: Number(partes.minute)
  };
}

function pertenceASemanaDeAtendimento(data, hoje) {
  const inicio = new Date(`${hoje}T12:00:00Z`);
  const diaDaSemana = inicio.getUTCDay();
  inicio.setUTCDate(inicio.getUTCDate() + (diaDaSemana === 0 ? 1 : 1 - diaDaSemana));
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 5);
  const formatar = valor => valor.toISOString().slice(0, 10);
  return data >= formatar(inicio) && data <= formatar(fim);
}

function horarioJaPassouHoje(data, horario, agora) {
  if (data !== agora.data) return false;
  const [hora, minuto] = horario.split(':').map(Number);
  return hora < agora.hora || (hora === agora.hora && minuto <= agora.minuto);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Método não permitido.' });

  let corpo;
  try {
    corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return responder(res, 400, { erro: 'Dados da solicitação inválidos.' });
  }
  if (texto(corpo.site, 100)) return responder(res, 400, { erro: 'Não foi possível enviar a solicitação.' });

  const nomeTutor = texto(corpo.nomeTutor, 100);
  const telefone = texto(corpo.telefone, 20);
  const nomePet = texto(corpo.nomePet, 80);
  const especie = texto(corpo.especie, 30);
  const porte = texto(corpo.porte, 30);
  const temperamento = texto(corpo.temperamento, 50);
  const dataDesejada = texto(corpo.dataDesejada, 10);
  const horarioDesejado = texto(corpo.horarioDesejado, 5);
  const tipoChegada = texto(corpo.tipoChegada, 50);
  const endereco = texto(corpo.endereco, 220);
  const pagamento = texto(corpo.pagamento, 40);
  const observacoes = texto(corpo.observacoes, 500);
  const telefoneInformado = telefone.replace(/\D/g, '');
  const telefoneNumeros = telefoneInformado.length >= 12 && telefoneInformado.startsWith('55')
    ? telefoneInformado.slice(2)
    : telefoneInformado;
  const idsServicos = Array.isArray(corpo.servicos) ? [...new Set(corpo.servicos.filter(id => typeof id === 'string'))] : [];
  const servicos = idsServicos.map(id => SERVICOS[id]).filter(Boolean);
  const agora = agoraNoBrasil();

  if (!nomeTutor || !nomePet || !especie || !porte || !temperamento || telefoneNumeros.length < 10 ||
    servicos.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dataDesejada) ||
    !pertenceASemanaDeAtendimento(dataDesejada, agora.data) ||
    !HORARIOS.has(horarioDesejado) || !TIPOS_CHEGADA.has(tipoChegada) || !PAGAMENTOS.has(pagamento) ||
    horarioJaPassouHoje(dataDesejada, horarioDesejado, agora) ||
    (tipoChegada === 'Solicitou busca em casa' && !endereco)) {
    return responder(res, 400, { erro: 'Confira os dados obrigatórios da solicitação.' });
  }

  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return responder(res, 503, { erro: 'Solicitações temporariamente indisponíveis.' });

  const valorEstimado = servicos.reduce((soma, servico) => soma + servico.valor, 0);
  const codigo = `TH-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const registro = {
    codigo,
    nome_tutor: nomeTutor,
    telefone: `55${telefoneNumeros}`,
    nome_pet: nomePet,
    especie,
    porte,
    temperamento,
    servicos: idsServicos.map(id => ({ id, ...SERVICOS[id] })),
    valor_estimado: valorEstimado,
    data_desejada: dataDesejada,
    horario_desejado: horarioDesejado,
    tipo_chegada: tipoChegada,
    endereco: tipoChegada === 'Solicitou busca em casa' ? endereco : null,
    pagamento,
    observacoes: observacoes || null,
    status: 'aguardando_confirmacao'
  };

  try {
    // Limite persistente entre instâncias da Vercel: evita reenvios acidentais
    // e impede que um telefone encha a fila de pedidos em pouco tempo.
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const consulta = new URL(`${url}/rest/v1/solicitacoes_agendamento`);
    consulta.searchParams.set('select', 'codigo,valor_estimado,data_desejada,horario_desejado,status,created_at');
    consulta.searchParams.set('telefone', `eq.55${telefoneNumeros}`);
    consulta.searchParams.set('created_at', `gte.${desde}`);
    consulta.searchParams.set('order', 'created_at.desc');
    consulta.searchParams.set('limit', '4');
    const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };
    const consultaRecente = await fetch(consulta, { headers: cabecalhos });
    if (!consultaRecente.ok) throw new Error('Falha ao consultar solicitações recentes.');
    const recentes = await consultaRecente.json();
    const pedidoIgual = recentes.find(item => item.data_desejada === dataDesejada && item.horario_desejado === horarioDesejado &&
      item.status === 'aguardando_confirmacao');
    if (pedidoIgual) {
      return responder(res, 200, { codigo: pedidoIgual.codigo, valorEstimado: pedidoIgual.valor_estimado, existente: true });
    }
    if (recentes.some(item => item.data_desejada === dataDesejada && item.horario_desejado === horarioDesejado &&
      item.status === 'confirmado')) {
      return responder(res, 409, { erro: 'Este horário já foi confirmado para esse telefone. Fale conosco pelo WhatsApp se precisar alterar algo.' });
    }
    if (recentes.length >= 3) {
      res.setHeader('Retry-After', '3600');
      return responder(res, 429, { erro: 'Limite de solicitações atingido. Aguarde um pouco ou fale conosco pelo WhatsApp.' });
    }

    // A chave de serviço permanece somente na Vercel. Ela nunca é enviada ao navegador.
    const resposta = await fetch(`${url}/rest/v1/solicitacoes_agendamento`, {
      method: 'POST',
      headers: {
        ...cabecalhos,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(registro)
    });
    if (!resposta.ok) throw new Error(await resposta.text());
    return responder(res, 201, { codigo, valorEstimado });
  } catch (erro) {
    console.error('Erro ao criar solicitação:', erro.message);
    return responder(res, 500, { erro: 'Não foi possível registrar a solicitação. Tente novamente.' });
  }
};
