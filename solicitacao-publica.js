const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const SERVICOS = {
  banho_tosa: { nome: 'Banho e tosa completa', valor: 60 },
  banho: { nome: 'Apenas banho', valor: 40 },
  tosa_higienica: { nome: 'Tosa higiênica', valor: 25 },
  unhas_ouvidos: { nome: 'Unhas e ouvidos', valor: 15 },
  dentes: { nome: 'Escovação de dentes', valor: 10 }
};
const WHATSAPP_TH_PET = '553892086784';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-solicitacao');
  const diasEl = document.getElementById('container-dias');
  const blocoHorarios = document.getElementById('bloco-horarios');
  const horariosEl = document.getElementById('grid-horarios');
  const mensagem = document.getElementById('mensagem');
  const enderecoEl = document.getElementById('campo-endereco');
  const enderecoInput = document.getElementById('endereco');
  const totalEl = document.getElementById('valor-total');
  const resumoServicosEl = document.getElementById('resumo-servicos');
  const botao = form.querySelector('button[type="submit"]');
  let dataSelecionada = '';
  let horarioSelecionado = '';

  const dataISO = data => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  function horarioJaPassou(data, horario) {
    const agora = new Date();
    if (data !== dataISO(agora)) return false;
    const [hora, minuto] = horario.split(':').map(Number);
    return hora < agora.getHours() || (hora === agora.getHours() && minuto <= agora.getMinutes());
  }

  const exibirMensagem = (texto, tipo = '') => {
    mensagem.textContent = texto;
    mensagem.className = `mensagem-publica ${tipo}`;
  };

  const servicosSelecionados = () => Array.from(document.querySelectorAll('input[name="servico"]:checked')).map(input => input.value);

  function atualizarResumo() {
    const selecionados = servicosSelecionados();
    const total = selecionados.reduce((soma, id) => soma + SERVICOS[id].valor, 0);
    totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    resumoServicosEl.textContent = selecionados.length
      ? selecionados.map(id => SERVICOS[id].nome).join(' + ')
      : 'Nenhum serviço selecionado';
  }

  function gerarDias() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaDaSemana = hoje.getDay();
    const segunda = new Date(hoje);

    // O pet shop atende de segunda a sábado. No domingo, já exibimos a
    // próxima semana de atendimento em vez de uma agenda vazia.
    segunda.setDate(hoje.getDate() + (diaDaSemana === 0 ? 1 : 1 - diaDaSemana));
    diasEl.innerHTML = '';
    for (let i = 0; i < 6; i += 1) {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + i);
      if (data < hoje) continue;
      const botaoDia = document.createElement('button');
      botaoDia.type = 'button';
      botaoDia.className = 'dia-publico';
      botaoDia.innerHTML = `<span>${data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><strong>${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong>`;
      botaoDia.addEventListener('click', async () => {
        document.querySelectorAll('.dia-publico').forEach(item => item.classList.remove('selecionado'));
        botaoDia.classList.add('selecionado');
        dataSelecionada = dataISO(data);
        horarioSelecionado = '';
        await carregarHorarios(dataSelecionada);
      });
      diasEl.appendChild(botaoDia);
    }
  }

  async function carregarHorarios(data) {
    blocoHorarios.hidden = false;
    horariosEl.innerHTML = '<span>Consultando horários…</span>';
    try {
      const resposta = await fetch(`/api/disponibilidade?data=${encodeURIComponent(data)}`);
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível consultar a agenda.');
      const ocupados = new Set(resultado.ocupados || []);
      horariosEl.innerHTML = '';
      HORARIOS.forEach(horario => {
        const botaoHorario = document.createElement('button');
        botaoHorario.type = 'button';
        botaoHorario.className = 'hora-publica';
        botaoHorario.textContent = horario;
        const jaPassou = horarioJaPassou(data, horario);
        const estaOcupado = ocupados.has(horario);
        botaoHorario.disabled = estaOcupado || jaPassou;
        if (botaoHorario.disabled) {
          botaoHorario.title = jaPassou ? 'Este horário já passou' : 'Horário já confirmado';
        }
        botaoHorario.addEventListener('click', () => {
          document.querySelectorAll('.hora-publica').forEach(item => item.classList.remove('selecionado'));
          botaoHorario.classList.add('selecionado');
          horarioSelecionado = horario;
        });
        horariosEl.appendChild(botaoHorario);
      });
    } catch (erro) {
      horariosEl.innerHTML = '<span>Não foi possível carregar os horários. Tente novamente.</span>';
    }
  }

  document.querySelectorAll('input[name="servico"]').forEach(input => input.addEventListener('change', atualizarResumo));
  document.querySelectorAll('input[name="tipo-chegada"]').forEach(input => input.addEventListener('change', () => {
    const precisaBusca = input.checked && input.value === 'Solicitou busca em casa';
    enderecoEl.hidden = !precisaBusca;
    enderecoInput.required = precisaBusca;
    document.getElementById('aviso-busca').hidden = !precisaBusca;
  }));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    exibirMensagem('');
    const servicos = servicosSelecionados();
    const tipoChegada = document.querySelector('input[name="tipo-chegada"]:checked')?.value;
    const pagamento = document.querySelector('input[name="pagamento"]:checked')?.value;

    if (!servicos.length) return exibirMensagem('Selecione ao menos um serviço.', 'erro');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!dataSelecionada || !horarioSelecionado) return exibirMensagem('Escolha o dia e o horário desejados.', 'erro');
    if (!tipoChegada || !pagamento) return exibirMensagem('Informe a chegada do pet e a forma de pagamento.', 'erro');

    const payload = {
      nomeTutor: document.getElementById('nome-tutor').value,
      telefone: document.getElementById('telefone-tutor').value,
      nomePet: document.getElementById('nome-pet').value,
      especie: document.getElementById('especie').value,
      porte: document.getElementById('porte').value,
      temperamento: document.getElementById('temperamento').value,
      servicos,
      dataDesejada: dataSelecionada,
      horarioDesejado: horarioSelecionado,
      tipoChegada,
      endereco: enderecoInput.value,
      pagamento,
      observacoes: document.getElementById('observacoes').value,
      site: document.getElementById('site').value
    };

    botao.disabled = true;
    botao.innerHTML = 'Enviando solicitação…';
    try {
      const resposta = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível registrar a solicitação.');

      const valor = Number(resultado.valorEstimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const texto = resultado.existente ? [
        'Olá! Gostaria de confirmar ou alterar minha solicitação de agendamento.',
        '',
        `Código: ${resultado.codigo}`,
        'Já enviei este pedido pelo site. Podemos conferir os detalhes?'
      ].join('\n') : [
        'Olá! Gostaria de confirmar uma solicitação de agendamento.',
        '',
        `Código: ${resultado.codigo}`,
        `Tutor: ${payload.nomeTutor.trim()}`,
        `Pet: ${payload.nomePet.trim()} — ${payload.especie} ${payload.porte.toLowerCase()}`,
        `Serviços: ${servicos.map(id => SERVICOS[id].nome).join(', ')}`,
        `Data e horário desejados: ${new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString('pt-BR')} às ${horarioSelecionado}`,
        `Chegada: ${tipoChegada}`,
        tipoChegada === 'Solicitou busca em casa' ? `Endereço para busca: ${payload.endereco.trim()}` : '',
        `Valor estimado dos serviços: ${valor}`,
        tipoChegada === 'Solicitou busca em casa' ? 'Taxa de busca: a confirmar conforme endereço.' : '',
        `Pagamento escolhido: ${pagamento}`,
        '',
        'Aguardo a confirmação. Obrigado!'
      ].filter(Boolean).join('\n');

      exibirMensagem(`Solicitação ${resultado.codigo} ${resultado.existente ? 'já registrada' : 'registrada'}. Abrindo o WhatsApp para você enviar a mensagem…`, 'sucesso');
      window.location.href = `https://wa.me/${WHATSAPP_TH_PET}?text=${encodeURIComponent(texto)}`;
    } catch (erro) {
      exibirMensagem(erro.message, 'erro');
    } finally {
      botao.disabled = false;
      botao.innerHTML = 'Finalizar solicitação pelo WhatsApp <span>↗</span>';
    }
  });

  gerarDias();
  atualizarResumo();
});
