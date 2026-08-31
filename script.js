// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formLogin = document.getElementById('form-login');
const campoEmail = document.getElementById('campo-email');
const campoSenha = document.getElementById('campo-senha');
const caixaMensagem = document.getElementById('mensagem');

if (formLogin) {
  formLogin.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value.trim();

    if (email === '' || senha === '') {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'Por favor, preencha todos os campos.';
      return;
    }

    caixaMensagem.className = 'mensagem';
    caixaMensagem.textContent = 'Autenticando...';

    // Autenticação oficial no Supabase
    const { data, error } = await _supabase.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'E-mail ou senha inválidos!';
    } else {
      caixaMensagem.className = 'mensagem sucesso';
      caixaMensagem.textContent = 'Login efetuado com sucesso! Redirecionando...';

      setTimeout(() => {
        window.location.href = 'ThaisPet@.html';
      }, 1500);
    }
  });
}