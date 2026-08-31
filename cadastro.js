// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formCadastro = document.getElementById('form-cadastro');
const campoNome = document.getElementById('campo-nome');
const campoTelefone = document.getElementById('campo-telefone');
const campoEmail = document.getElementById('campo-email');
const campoSenha = document.getElementById('campo-senha');
const campoConfirmarSenha = document.getElementById('campo-confirmar-senha');
const caixaMensagem = document.getElementById('mensagem');

if (formCadastro) {
  formCadastro.addEventListener('submit', async function (event) {
    event.preventDefault();

    const nome = campoNome.value.trim();
    const telefone = campoTelefone.value.trim();
    const email = campoEmail.value.trim();
    const senha = campoSenha.value.trim();
    const confirmarSenha = campoConfirmarSenha.value.trim();

    if (nome === '' || telefone === '' || email === '' || senha === '' || confirmarSenha === '') {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'Por favor, preencha todos os campos.';
      return;
    }

    if (senha !== confirmarSenha) {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'As senhas não coincidem!';
      return;
    }

    caixaMensagem.className = 'mensagem';
    caixaMensagem.textContent = 'Criando conta...';

    // Cadastra o cliente no Supabase Auth e salva os dados adicionais no user_metadata
    const { data, error } = await _supabase.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: {
          nome_completo: nome,
          telefone: telefone
        }
      }
    });

    if (error) {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'Erro ao cadastrar: ' + error.message;
    } else {
      caixaMensagem.className = 'mensagem sucesso';
      caixaMensagem.textContent = 'Cadastro realizado com sucesso! Redirecionando...';

      setTimeout(() => {
        window.location.href = 'agendamento.html';
      }, 1500);
    }
  });
}