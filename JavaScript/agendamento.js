// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// LÓGICA DA TELA DE AGENDAMENTO
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('form-agendamento');
  const checkboxes = document.querySelectorAll('input[name="servico"]');
  const valorTotalEl = document.getElementById('valor-total');
  const containerDias = document.getElementById('container-dias');
  const blocoHorarios = document.getElementById('bloco-horarios');
  const btnsHorario = document.querySelectorAll('.btn-horario');
  const caixaMensagem = document.getElementById('mensagem');
  const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;

  let diaSelecionado = null;
  let horarioSelecionado = null;

  // Função para garantir que a data no padrão ISO respeite o fuso horário local
  function formatarDataLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // 1. Gera dinamicamente os dias da semana
  function gerarDiasSemanaAtual() {
    const hoje = new Date();
    const diaAtual = hoje.getDay();
    
    const segundaFeira = new Date(hoje);
    if (diaAtual === 0) {
      segundaFeira.setDate(hoje.getDate() + 1);
    } else {
      segundaFeira.setDate(hoje.getDate() - (diaAtual - 1));
    }

    const nomesDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    if (containerDias) {
      containerDias.innerHTML = '';

      for (let i = 0; i < 6; i++) {
        const dataDia = new Date(segundaFeira);
        dataDia.setDate(segundaFeira.getDate() + i);

        const dataParaComparar = new Date(dataDia.getFullYear(), dataDia.getMonth(), dataDia.getDate());
        const hojeParaComparar = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

        const ePassado = dataParaComparar < hojeParaComparar;
        const dataFormatada = dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        // Uso da nova função que ignora o erro de UTC do toISOString()
        const dataISO = formatarDataLocal(dataDia);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-dia';
        btn.disabled = ePassado;

        btn.innerHTML = `
          <span class="semana">${nomesDias[i]}</span>
          <span class="data">${dataFormatada}</span>
        `;

        btn.addEventListener('click', async function () {
          document.querySelectorAll('.btn-dia').forEach(b => b.classList.remove('selecionado'));
          this.classList.add('selecionado');
          diaSelecionado = dataISO;
          horarioSelecionado = null;
          btnsHorario.forEach(b => b.classList.remove('selecionado'));

          // Atualiza a disponibilidade dos horários para o dia escolhido
          await atualizarHorariosOcupados(dataISO);

          if (blocoHorarios) {
            blocoHorarios.classList.remove('esconde');
          }
        });

        containerDias.appendChild(btn);
      }
    }
  }

  // 2. Desabilita horários ocupados E horários que já passaram no dia de hoje
  async function atualizarHorariosOcupados(dataISO) {
    const { data: agendamentosExistentes } = await _supabase
      .from('agendamentos')
      .select('horario')
      .eq('data_agendamento', dataISO);

    const horariosOcupados = agendamentosExistentes ? agendamentosExistentes.map(a => a.horario) : [];

    const agora = new Date();
    // Usa a mesma função local para garantir a igualdade de string
    const hojeISO = formatarDataLocal(agora);
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    btnsHorario.forEach(btn => {
      const horaText = btn.textContent.trim();
      const [horaBtn, minutoBtn] = horaText.split(':').map(Number);

      let jaPassou = false;

      if (dataISO === hojeISO) {
        if (horaBtn < horaAtual || (horaBtn === horaAtual && minutoBtn <= minutoAtual)) {
          jaPassou = true;
        }
      }

      const estaOcupado = horariosOcupados.includes(horaText);

      if (estaOcupado || jaPassou) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
        btn.title = jaPassou ? 'Horário já passou' : 'Horário já reservado';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.title = '';
      }
    });
  }

  gerarDiasSemanaAtual();

  // 3. Seleção de horário
  btnsHorario.forEach(btn => {
    btn.addEventListener('click', function () {
      if (this.disabled) return;
      btnsHorario.forEach(b => b.classList.remove('selecionado'));
      this.classList.add('selecionado');
      horarioSelecionado = this.textContent.trim();
    });
  });

  // 4. Cálculo do valor total
  checkboxes.forEach(chk => {
    chk.addEventListener('change', function () {
      let total = 0;
      checkboxes.forEach(item => {
        if (item.checked) {
          total += parseFloat(item.value);
        }
      });
      if (valorTotalEl) {
        valorTotalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
      }
    });
  });

  // 5. Envio do formulário com proteção anti-duplicidade
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const servicosSelecionados = Array.from(checkboxes)
        .filter(chk => chk.checked)
        .map(chk => chk.parentElement.textContent.trim());

      if (servicosSelecionados.length === 0) {
        caixaMensagem.className = 'mensagem erro';
        caixaMensagem.textContent = 'Selecione ao menos um serviço para o pet.';
        return;
      }

      if (!diaSelecionado) {
        caixaMensagem.className = 'mensagem erro';
        caixaMensagem.textContent = 'Selecione um dia da semana para o agendamento.';
        return;
      }

      if (!horarioSelecionado) {
        caixaMensagem.className = 'mensagem erro';
        caixaMensagem.textContent = 'Selecione um horário disponível.';
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Agendando...';
      }

      try {
        const { data: conflito } = await _supabase
          .from('agendamentos')
          .select('id')
          .eq('data_agendamento', diaSelecionado)
          .eq('horario', horarioSelecionado);

        if (conflito && conflito.length > 0) {
          caixaMensagem.className = 'mensagem erro';
          caixaMensagem.textContent = 'Este horário acabou de ser reservado! Por favor, escolha outro.';
          await atualizarHorariosOcupados(diaSelecionado);
          return;
        }

        const nomePet = document.getElementById('nome-pet')?.value || 'Pet sem nome';
        const porteEspecie = document.getElementById('porte-especie')?.value || 'Não informado';
        const valorTotal = parseFloat(valorTotalEl.textContent.replace('R$', '').replace(',', '.').trim()) || 0;

        const { error } = await _supabase
          .from('agendamentos')
          .insert([
            {
              data_agendamento: diaSelecionado,
              horario: horarioSelecionado,
              nome_pet: nomePet,
              porte_especie: porteEspecie,
              servico: servicosSelecionados.join(', '),
              valor: valorTotal,
              status: 'confirmado'
            }
          ]);

        if (error) {
          caixaMensagem.className = 'mensagem erro';
          caixaMensagem.textContent = 'Erro ao agendar: ' + error.message;
        } else {
          caixaMensagem.className = 'mensagem sucesso';
          caixaMensagem.textContent = `Agendamento efetuado com sucesso para ${diaSelecionado} às ${horarioSelecionado}!`;

          setTimeout(() => {
            form.reset();
            if (valorTotalEl) valorTotalEl.textContent = 'R$ 0,00';
            document.querySelectorAll('.btn-dia').forEach(b => b.classList.remove('selecionado'));
            btnsHorario.forEach(b => b.classList.remove('selecionado'));
            if (blocoHorarios) blocoHorarios.classList.add('esconde');
            diaSelecionado = null;
            horarioSelecionado = null;
            caixaMensagem.textContent = '';
          }, 3000);
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Confirmar Agendamento';
        }
      }
    });
  }
});