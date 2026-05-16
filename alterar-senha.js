const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";
const MANUAL_LOGOUT_KEY = "sistemaStaffManualLogout";
function limparSessaoLocalSupabase() {
  try {
    localStorage.removeItem("staffLogado");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Não foi possível limpar sessão local:", error);
  }
}
async function sairDoSistemaSeguro() {
  sessionStorage.setItem(MANUAL_LOGOUT_KEY, "1");
  limparSessaoLocalSupabase();
  try {
    await supabaseClient.auth.signOut({ scope: "global" });
  } catch (error) {
    console.warn("Falha ao encerrar sessão:", error);
  } finally {
    limparSessaoLocalSupabase();
    window.location.replace("index.html?logout=1&t=" + Date.now());
  }
}


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const form = document.getElementById('resetPasswordForm');
const newPassword = document.getElementById('newPassword');
const newPasswordConfirm = document.getElementById('newPasswordConfirm');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetStatus = document.getElementById('resetStatus');

function setStatus(message, type='info'){
  resetStatus.textContent = message || '';
  resetStatus.className = `login-status ${type}`;
}

function configurarToggleSenha(){
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    const input = document.getElementById(btn.getAttribute('data-toggle-password'));
    if(!input) return;
    btn.addEventListener('click', () => {
      const visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      btn.innerHTML = visivel ? '<span class="password-icon password-icon-eye" aria-hidden="true"></span>' : '<span class="password-icon password-icon-eye-off" aria-hidden="true"></span>';
      btn.classList.toggle('is-visible', !visivel);
    });
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const senha = newPassword.value || '';
  const confirmacao = newPasswordConfirm.value || '';
  if(senha.length < 6){ setStatus('A senha precisa ter pelo menos 6 caracteres.', 'error'); return; }
  if(senha !== confirmacao){ setStatus('A confirmação da senha não confere.', 'error'); return; }

  resetPasswordBtn.disabled = true;
  resetPasswordBtn.textContent = 'Salvando...';
  setStatus('');

  try{
    const { error } = await supabaseClient.auth.updateUser({ password: senha });
    if(error) throw error;
    setStatus('Senha alterada com sucesso. Redirecionando para o login...', 'success');
    setTimeout(() => { sairDoSistemaSeguro(); }, 900);
  }catch(error){
    console.error(error);
    setStatus('Erro ao alterar senha. Abra o link recebido novamente ou solicite outro reset.', 'error');
  }finally{
    resetPasswordBtn.disabled = false;
    resetPasswordBtn.textContent = 'Salvar nova senha';
  }
});

configurarToggleSenha();
