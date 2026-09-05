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

    // Trava de tamanho de caracteres no front-end
    if (email.length > 100) {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'O e-mail digitado excede o limite de 100 caracteres.';
      return;
    }

    if (senha.length > 72) {
      caixaMensagem.className = 'mensagem erro';
      caixaMensagem.textContent = 'A senha digitada excede o limite permitido.';
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
      
      // Tratamento específico para cada mensagem de erro do Supabase
      const msgErro = error.message.toLowerCase();

      if (msgErro.includes('exceed') || msgErro.includes('length') || msgErro.includes('too long')) {
        caixaMensagem.textContent = 'O e-mail ou senha excede o limite de caracteres permitido.';
      } else if (msgErro.includes('invalid login credentials')) {
        caixaMensagem.textContent = 'E-mail ou senha inválidos!';
      } else if (msgErro.includes('email not confirmed')) {
        caixaMensagem.textContent = 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
      } else {
        caixaMensagem.textContent = 'Erro ao efetuar login. Tente novamente.';
      }
    } else {
      caixaMensagem.className = 'mensagem sucesso';
      caixaMensagem.textContent = 'Login efetuado com sucesso! Redirecionando...';

      setTimeout(() => {
        window.location.href = 'ThaisPet@.html';
      }, 1500);
    }
  });
}