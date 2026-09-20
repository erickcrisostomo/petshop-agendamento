const STATUS_AGUARDANDO = 'aguardando_confirmacao';

function escaparSolicitacao(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function moedaSolicitacao(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function telefoneParaLink(telefone) {
  return String(telefone || '').replace(/\D/g, '');
}

async function carregarSolicitacoes() {
  const lista = document.getElementById('lista-solicitacoes');
  if (!lista) return;
  lista.innerHTML = '<p>Carregando solicitações...</p>';

  const { data, error } = await _supabase
    .from('solicitacoes_agendamento')
    .select('*')
    .eq('status', STATUS_AGUARDANDO)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao carregar solicitações:', error.message);
    lista.innerHTML = '<p>Não foi possível carregar as solicitações.</p>';
    return;
  }

  if (!data.length) {
    lista.innerHTML = '<p class="sem-solicitacoes">Nenhuma solicitação aguardando confirmação.</p>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(solicitacao => {
    const servicos = Array.isArray(solicitacao.servicos)
      ? solicitacao.servicos.map(servico => escaparSolicitacao(servico.nome)).join(', ')
      : 'Não informado';
    const telefone = telefoneParaLink(solicitacao.telefone);
    const endereco = solicitacao.endereco
      ? `<p><strong>Endereço para busca:</strong> ${escaparSolicitacao(solicitacao.endereco)}</p>`
      : '';
    const observacoes = solicitacao.observacoes
      ? `<p><strong>Observações:</strong> ${escaparSolicitacao(solicitacao.observacoes)}</p>`
      : '';

    const card = document.createElement('article');
    card.className = 'card-solicitacao-admin';
    card.innerHTML = `
      <div class="cabecalho-solicitacao">
        <div><span class="codigo-solicitacao">${escaparSolicitacao(solicitacao.codigo)}</span><h3>${escaparSolicitacao(solicitacao.nome_pet)} <small>${escaparSolicitacao(solicitacao.especie)} — ${escaparSolicitacao(solicitacao.porte)}</small></h3></div>
        <strong class="valor-solicitacao">${moedaSolicitacao(solicitacao.valor_estimado)}</strong>
      </div>
      <p><strong>Tutor:</strong> ${escaparSolicitacao(solicitacao.nome_tutor)}${telefone ? ` · <a href="https://wa.me/${telefone}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}</p>
      <p><strong>Deseja:</strong> ${escaparSolicitacao(solicitacao.data_desejada)} às ${escaparSolicitacao(solicitacao.horario_desejado)} · ${escaparSolicitacao(solicitacao.tipo_chegada)}</p>
      <p><strong>Serviços:</strong> ${servicos}</p>
      <p><strong>Pagamento:</strong> ${escaparSolicitacao(solicitacao.pagamento)}</p>
      ${endereco}${observacoes}
      <button type="button" class="btn-confirmar-solicitacao">Confirmar e reservar horário</button>
    `;
    card.querySelector('.btn-confirmar-solicitacao').addEventListener('click', () => confirmarSolicitacao(solicitacao.id, card));
    lista.appendChild(card);
  });
}

async function confirmarSolicitacao(id, card) {
  const botao = card.querySelector('.btn-confirmar-solicitacao');
  botao.disabled = true;
  botao.textContent = 'Confirmando...';

  const { data, error } = await _supabase.rpc('confirmar_solicitacao_agendamento', { solicitacao_id: id });
  if (error) {
    alert(`Não foi possível confirmar: ${error.message}`);
  } else if (data?.[0]?.resultado === 'horario_indisponivel') {
    alert('Este horário foi confirmado para outro cliente. Combine um novo horário pelo WhatsApp.');
  } else if (data?.[0]?.resultado === 'confirmado') {
    await carregarSolicitacoes();
    if (typeof dataSelecionadaAdmin !== 'undefined' && dataSelecionadaAdmin) carregarAgendamentosDoDia(dataSelecionadaAdmin);
    atualizarResumoFinanceiro();
    return;
  } else {
    alert('Esta solicitação já foi processada.');
  }
  botao.disabled = false;
  botao.textContent = 'Confirmar e reservar horário';
}

document.addEventListener('DOMContentLoaded', carregarSolicitacoes);
