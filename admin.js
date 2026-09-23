// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = 'pretin@thpet.com.br';

let dataSelecionadaAdmin = '';
let dataAtualPainel = '';

function hojeNoBrasil() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((valores, parte) => ({ ...valores, [parte.type]: parte.value }), {});
  return new Date(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
}

function dataISOAdmin(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function formatarDataCurta(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit'
  });
}

// ==========================================
// INICIALIZAÇÃO DA TELA DE ADMIN
// ==========================================
document.addEventListener('DOMContentLoaded', async function () {
  // A proteção definitiva deve estar nas políticas RLS do Supabase. Esta checagem
  // também evita que clientes autenticados naveguem para o painel pela URL.
  const { data: { session }, error } = await _supabase.auth.getSession();

  if (error || !session || session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    window.location.href = 'index.html';
    return;
  }

  const btnSair = document.getElementById('btn-sair');
  btnSair?.addEventListener('click', async (event) => {
    event.preventDefault();
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  gerarDiasSemanaAdmin();
  atualizarResumoFinanceiro();
  dataAtualPainel = dataISOAdmin(hojeNoBrasil());
  setInterval(sincronizarDataPainel, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarDataPainel();
  });
});

function sincronizarDataPainel() {
  const hojeISO = dataISOAdmin(hojeNoBrasil());
  if (hojeISO === dataAtualPainel) return;
  const semanaAtual = document.querySelector('.btn-dia-admin')?.dataset.data;
  dataAtualPainel = hojeISO;
  const novaSegunda = new Date(`${hojeISO}T12:00:00`);
  const dia = novaSegunda.getDay();
  novaSegunda.setDate(novaSegunda.getDate() + (dia === 0 ? 1 : 1 - dia));
  if (semanaAtual !== dataISOAdmin(novaSegunda)) {
    gerarDiasSemanaAdmin();
  } else if (dataSelecionadaAdmin) {
    carregarAgendamentosDoDia(dataSelecionadaAdmin);
  }
  atualizarResumoFinanceiro();
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatarTelefone(telefone) {
  const numeros = normalizarTelefone(telefone);
  if (numeros.length === 11) return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (numeros.length === 10) return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return escaparHtml(telefone || 'Não informado');
}

function normalizarTelefone(telefone) {
  const numeros = String(telefone ?? '').replace(/\D/g, '');
  return numeros.length >= 12 && numeros.startsWith('55') ? numeros.slice(2) : numeros;
}

// 1. Calcula e gera os dias da semana atual no admin
function gerarDiasSemanaAdmin() {
  const containerDias = document.getElementById('container-dias-admin');
  if (!containerDias) return;

  const hoje = hojeNoBrasil();
  const diaAtual = hoje.getDay();

  const segundaFeira = new Date(hoje);
  if (diaAtual === 0) {
    segundaFeira.setDate(hoje.getDate() + 1);
  } else {
    segundaFeira.setDate(hoje.getDate() - (diaAtual - 1));
  }

  const nomesDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  containerDias.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const dataDia = new Date(segundaFeira);
    dataDia.setDate(segundaFeira.getDate() + i);

    const dataISO = dataISOAdmin(dataDia);

    const dataFormatada = dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-dia-admin' + (i === 0 ? ' selecionado' : '');
    btn.dataset.data = dataISO; // Atributo necessário para identificar a data selecionada

    btn.innerHTML = `
      <span class="semana">${nomesDias[i]}</span>
      <span class="data">${dataFormatada}</span>
    `;

    if (i === 0) {
      dataSelecionadaAdmin = dataISO;
      atualizarDiaSelecionado(dataISO);
      carregarAgendamentosDoDia(dataISO);
    }

    btn.addEventListener('click', function () {
      document.querySelectorAll('.btn-dia-admin').forEach(b => b.classList.remove('selecionado'));
      this.classList.add('selecionado');
      dataSelecionadaAdmin = dataISO;
      atualizarDiaSelecionado(dataISO);
      carregarAgendamentosDoDia(dataISO);
    });

    containerDias.appendChild(btn);
  }
}

// 2. Busca e renderiza agendamentos no painel
async function carregarAgendamentosDoDia(dataISO) {
  const containerLista = document.getElementById('lista-horarios-admin');
  if (!containerLista) return;

  containerLista.innerHTML = '<p class="estado-agenda">Carregando agendamentos...</p>';

  const { data: agendamentos, error } = await _supabase
    .from('agendamentos')
    .select('*')
    .eq('data_agendamento', dataISO)
    .order('horario', { ascending: true });

  if (error) {
    console.error('Erro ao buscar agendamentos:', error.message);
    containerLista.innerHTML = '<p class="estado-agenda">Erro ao carregar dados.</p>';
    return;
  }

  containerLista.innerHTML = '';

  if (agendamentos.length === 0) {
    containerLista.innerHTML = '<div class="estado-agenda vazio"><strong>Agenda livre</strong><span>Nenhum atendimento confirmado para este dia.</span></div>';
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement('div');
    const status = item.cancelado_em ? 'cancelado' : item.status === 'bloqueado' ? 'bloqueado' : 'confirmado';
    const estaBloqueado = status === 'bloqueado';
    const estaCancelado = status === 'cancelado';

    let listaServicosHTML = '';
    if (item.servico) {
      const servicosArray = item.servico.split(/,\s*(?![0-9]{2}\b)/);
      listaServicosHTML = servicosArray
        .map(s => `<li>• ${escaparHtml(s.trim())}</li>`)
        .join('');
    } else {
      listaServicosHTML = '<li>• Nenhum serviço especificado</li>';
    }

    const valorFormatado = parseFloat(item.valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    const telefoneNumeros = normalizarTelefone(item.telefone_cliente);
    const contatoHtml = telefoneNumeros
      ? `<a class="link-contato" href="https://wa.me/55${telefoneNumeros}" target="_blank" rel="noopener noreferrer">${formatarTelefone(telefoneNumeros)}</a>`
      : 'Não informado';
    const tipoBusca = escaparHtml(item.tipo_busca || 'Não informado');
    const enderecoBusca = item.endereco_busca ? escaparHtml(item.endereco_busca) : '';
    const pagamento = escaparHtml(item.pagamento || 'Não informado');

    card.className = `card-agendamento ${estaCancelado ? 'cancelado' : estaBloqueado ? 'bloqueado' : ''}`;
    card.innerHTML = `
      <div class="card-linha-topo">
        <div class="horario-tag">${escaparHtml(item.horario)}</div>
        <div class="header-pet">
          <strong class="nome-pet">${escaparHtml(item.nome_pet)}</strong>
          <span class="porte-badge">${escaparHtml(item.porte_especie)}</span>
        </div>
        <div class="acoes-card">
          <span class="badge ${status}">${status}</span>
          ${estaBloqueado ? '<button type="button" class="btn-acao ativar">Reativar atendimento</button>' : ''}
          ${status === 'confirmado' ? '<button type="button" class="btn-acao cancelar">Cancelar agendamento</button>' : ''}
        </div>
      </div>

      <div class="card-corpo">
        <div class="bloco-servicos">
          <small class="titulo-servicos">SERVIÇOS CONTRATADOS:</small>
          <ul class="lista-servicos">
            ${listaServicosHTML}
          </ul>
          <div class="detalhes-cliente">
            <span><strong>WhatsApp:</strong> ${contatoHtml}</span>
            <span><strong>Chegada:</strong> ${tipoBusca}</span>
            ${enderecoBusca ? `<span><strong>Endereço para busca:</strong> ${enderecoBusca}</span>` : ''}
            <span><strong>Pagamento:</strong> ${pagamento}</span>
          </div>
        </div>
        
        <div class="valor-destaque">
          <span>Total:</span> <strong>${valorFormatado}</strong>
        </div>
      </div>
    `;
    card.querySelector('.btn-acao.ativar')?.addEventListener('click', () => {
      alternarStatusAgendamento(item.id, status);
    });
    card.querySelector('.btn-acao.cancelar')?.addEventListener('click', () => {
      cancelarAgendamento(item, card);
    });
    containerLista.appendChild(card);
  });
}

async function cancelarAgendamento(item, card) {
  if (!window.confirm(`Cancelar o agendamento de ${item.nome_pet} em ${formatarDataCurta(item.data_agendamento)} às ${item.horario}? O horário ficará disponível novamente.`)) return;
  const botao = card.querySelector('.btn-acao.cancelar');
  botao.disabled = true;
  botao.textContent = 'Cancelando...';

  const { data, error } = await _supabase
    .from('agendamentos')
    .update({ cancelado_em: new Date().toISOString() })
    .eq('id', item.id)
    .is('cancelado_em', null)
    .select('id');

  if (error || !data?.length) {
    alert(error ? `Não foi possível cancelar: ${error.message}` : 'Este agendamento já foi alterado. Atualize a agenda.');
    botao.disabled = false;
    botao.textContent = 'Cancelar agendamento';
    return;
  }

  await carregarAgendamentosDoDia(dataSelecionadaAdmin);
  await atualizarResumoFinanceiro();
}

// Itens antigos bloqueados podem ser reativados. A confirmação da solicitação
// já reserva o horário, portanto atendimentos confirmados não são bloqueados daqui.
async function alternarStatusAgendamento(id, statusAtual) {
  if (statusAtual !== 'bloqueado') return;
  const novoStatus = 'confirmado';

  const { error } = await _supabase
    .from('agendamentos')
    .update({ status: novoStatus })
    .eq('id', id)
    .is('cancelado_em', null);

  if (error) {
    alert('Erro ao atualizar status: ' + error.message);
  } else {
    if (dataSelecionadaAdmin) {
      await carregarAgendamentosDoDia(dataSelecionadaAdmin);
    }
    await atualizarResumoFinanceiro();
  }
}

// 4. Cálculo do Resumo Financeiro
async function atualizarResumoFinanceiro() {
  const elFatSemanal = document.getElementById('fat-semanal');
  const elFatMensal = document.getElementById('fat-mensal');
  const elTotalPets = document.getElementById('total-pets');
  const elPeriodoSemanal = document.getElementById('periodo-semanal');
  const elPeriodoMensal = document.getElementById('periodo-mensal');
  const elPeriodoAgendamentos = document.getElementById('periodo-agendamentos');

  const hoje = hojeNoBrasil();

  // Define segunda-feira e sábado da semana atual
  const diaSemana = hoje.getDay();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() + (diaSemana === 0 ? 1 : 1 - diaSemana));

  const sabado = new Date(segunda);
  sabado.setDate(segunda.getDate() + 5);

  const formatarData = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const inicioSemanaISO = formatarData(segunda);
  const fimSemanaISO = formatarData(sabado);

  // Mês Atual: do dia 1 do mês atual até o último dia do mês atual
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const inicioMesISO = formatarData(primeiroDiaMes);
  const fimMesISO = formatarData(ultimoDiaMes);
  const periodoLegivel = (inicio, fim) => `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`;

  // Consulta Semanal
  const { data: dadosSemana } = await _supabase
    .from('agendamentos')
    .select('valor')
    .eq('status', 'confirmado')
    .is('cancelado_em', null)
    .gte('data_agendamento', inicioSemanaISO)
    .lte('data_agendamento', fimSemanaISO);

  // Faturamento previsto no mês-calendário atual: somente agendamentos confirmados.
  const { data: dadosMes } = await _supabase
    .from('agendamentos')
    .select('valor')
    .eq('status', 'confirmado')
    .is('cancelado_em', null)
    .gte('data_agendamento', inicioMesISO)
    .lte('data_agendamento', fimMesISO);

  // Função auxiliar para tratar string ou número
  const converterParaNumero = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Limpa caracteres de moeda e substitui vírgula por ponto
    const limpo = String(val).replace('R$', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  const totalSemana = dadosSemana
    ? dadosSemana.reduce((acc, item) => acc + converterParaNumero(item.valor), 0)
    : 0;

  const totalPetsSemana = dadosSemana ? dadosSemana.length : 0;

  const totalMes = dadosMes
    ? dadosMes.reduce((acc, item) => acc + converterParaNumero(item.valor), 0)
    : 0;

  if (elFatSemanal) {
    elFatSemanal.textContent = totalSemana.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  if (elFatMensal) {
    elFatMensal.textContent = totalMes.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  if (elTotalPets) {
    elTotalPets.textContent = `${totalPetsSemana} Pet${totalPetsSemana !== 1 ? 's' : ''}`;
  }

  if (elPeriodoSemanal) elPeriodoSemanal.textContent = periodoLegivel(segunda, sabado);
  if (elPeriodoMensal) elPeriodoMensal.textContent = periodoLegivel(primeiroDiaMes, ultimoDiaMes);
  if (elPeriodoAgendamentos) elPeriodoAgendamentos.textContent = `Confirmados de ${periodoLegivel(segunda, sabado)}`;
}

function atualizarDiaSelecionado(dataISO) {
  const elemento = document.getElementById('dia-selecionado-admin');
  if (elemento) elemento.textContent = formatarDataCurta(dataISO);
}
