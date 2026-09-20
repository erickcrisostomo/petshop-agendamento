const HORARIOS_VALIDOS = new Set(['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']);

function responder(res, status, corpo) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(corpo));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return responder(res, 405, { erro: 'Método não permitido.' });

  const data = String(req.query.data || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return responder(res, 400, { erro: 'Data inválida.' });

  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return responder(res, 503, { erro: 'Agenda temporariamente indisponível.' });

  try {
    // O navegador recebe apenas a lista de horários ocupados, nunca dados de clientes.
    const resposta = await fetch(
      `${url}/rest/v1/agendamentos?select=horario&data_agendamento=eq.${encodeURIComponent(data)}`,
      { headers: { apikey: chave, Authorization: `Bearer ${chave}` } }
    );
    if (!resposta.ok) throw new Error('Falha na consulta ao banco.');
    const agendamentos = await resposta.json();
    const ocupados = agendamentos
      .map(item => item.horario)
      .filter(horario => HORARIOS_VALIDOS.has(horario));
    return responder(res, 200, { ocupados });
  } catch (erro) {
    console.error('Erro de disponibilidade:', erro.message);
    return responder(res, 500, { erro: 'Não foi possível consultar os horários.' });
  }
};
