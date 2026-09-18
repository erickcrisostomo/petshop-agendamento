const SUPABASE_URL = 'https://cjfofohvanlraxkjbftc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DldDRI623dY73et-9oWc6Q_zlbwwXMb';
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('btn-sair')?.addEventListener('click', async (event) => {
  event.preventDefault();
  await clienteSupabase.auth.signOut();
  window.location.href = 'index.html';
});
