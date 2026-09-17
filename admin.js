// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = 'pretin@thpet.com.br';

let dataSelecionadaAdmin = '';

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

  gerarDiasSemanaAdmin();
  atualizarResumoFinanceiro();
});

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1. Calcula e gera os dias da semana atual no admin
function gerarDiasSemanaAdmin() {
  const containerDias = document.getElementById('container-dias-admin');
  if (!containerDias) return;

  const hoje = new Date();
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

    const ano = dataDia.getFullYear();
    const mes = String(dataDia.getMonth() + 1).padStart(2, '0');
    const dia = String(dataDia.getDate()).padStart(2, '0');
    const dataISO = `${ano}-${mes}-${dia}`;

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
      carregarAgendamentosDoDia(dataISO);
    }

    btn.addEventListener('click', function () {
      document.querySelectorAll('.btn-dia-admin').forEach(b => b.classList.remove('selecionado'));
      this.classList.add('selecionado');
      dataSelecionadaAdmin = dataISO;
      carregarAgendamentosDoDia(dataISO);
    });

    containerDias.appendChild(btn);
  }
}

// 2. Busca e renderiza agendamentos no painel
async function carregarAgendamentosDoDia(dataISO) {
  const containerLista = document.getElementById('lista-horarios-admin');
  if (!containerLista) return;

  containerLista.innerHTML = '<p style="color: white;">Carregando agendamentos...</p>';

  const { data: agendamentos, error } = await _supabase
    .from('agendamentos')
    .select('*')
    .eq('data_agendamento', dataISO)
    .order('horario', { ascending: true });

  if (error) {
    console.error('Erro ao buscar agendamentos:', error.message);
    containerLista.innerHTML = '<p style="color: white;">Erro ao carregar dados.</p>';
    return;
  }

  containerLista.innerHTML = '';

  if (agendamentos.length === 0) {
    containerLista.innerHTML = '<p style="color: white; opacity: 0.8;">Nenhum agendamento para este dia.</p>';
    return;
  }

  agendamentos.forEach(item => {
    const card = document.createElement('div');
    const status = item.status === 'bloqueado' ? 'bloqueado' : 'confirmado';
    const estaBloqueado = status === 'bloqueado';

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

    card.className = `card-agendamento ${estaBloqueado ? 'bloqueado' : ''}`;
    card.innerHTML = `
      <div class="card-linha-topo">
        <div class="horario-tag">${escaparHtml(item.horario)}</div>
        <div class="header-pet">
          <strong class="nome-pet">${escaparHtml(item.nome_pet)}</strong>
          <span class="porte-badge">${escaparHtml(item.porte_especie)}</span>
        </div>
        <div class="acoes-card">
          <span class="badge ${status}">${status}</span>
          <button type="button" class="btn-acao ${estaBloqueado ? 'ativar' : 'desativar'}">
            ${estaBloqueado ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </div>

      <div class="card-corpo">
        <div class="bloco-servicos">
          <small class="titulo-servicos">SERVIÇOS CONTRATADOS:</small>
          <ul class="lista-servicos">
            ${listaServicosHTML}
          </ul>
        </div>
        
        <div class="valor-destaque">
          <span>Total:</span> <strong>${valorFormatado}</strong>
        </div>
      </div>
    `;
    card.querySelector('.btn-acao').addEventListener('click', () => {
      alternarStatusAgendamento(item.id, status);
    });
    containerLista.appendChild(card);
  });
}

// 3. Função ÚNICA para alternar Bloquear / Desbloquear
async function alternarStatusAgendamento(id, statusAtual) {
  const novoStatus = statusAtual === 'bloqueado' ? 'confirmado' : 'bloqueado';

  const { error } = await _supabase
    .from('agendamentos')
    .update({ status: novoStatus })
    .eq('id', id);

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

  const hoje = new Date();

  // Define segunda-feira e sábado da semana atual
  const diaSemana = hoje.getDay();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));

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

  // Consulta Semanal
  const { data: dadosSemana } = await _supabase
    .from('agendamentos')
    .select('valor')
    .eq('status', 'confirmado')
    .gte('data_agendamento', inicioSemanaISO)
    .lte('data_agendamento', fimSemanaISO);

  // Consulta Mensal (pega do dia 1 ao último dia do mês atual, incluindo futuros do mesmo mês)
  const { data: dadosMes } = await _supabase
    .from('agendamentos')
    .select('valor')
    .eq('status', 'confirmado')
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
}
