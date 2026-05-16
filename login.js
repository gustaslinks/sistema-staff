const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const form = document.getElementById("loginForm");
const loginCpf = document.getElementById("loginCpf");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const keepConnected = document.getElementById("keepConnected");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const loginStatus = document.getElementById("loginStatus");
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

async function processarLogoutManualNaTelaLogin() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("logout")) return false;
  sessionStorage.setItem(MANUAL_LOGOUT_KEY, "1");
  localStorage.setItem(MANUAL_LOGOUT_KEY, String(Date.now()));
  limparSessaoLocalSupabase();
  try {
    await supabaseClient.auth.signOut({ scope: "global" });
  } catch (error) {
    console.warn("Sessão remota já encerrada ou indisponível:", error);
  }
  limparSessaoLocalSupabase();
  history.replaceState({}, document.title, window.location.pathname);
  setStatus("Sessão encerrada. Entre novamente para acessar o sistema.", "success");
  return true;
}



function mensagemErroRecuperacaoSenha(error){
  const msg = String((error && error.message) || error || '').toLowerCase();
  if(msg.includes('rate limit')){
    return 'Muitas tentativas realizadas. Aguarde alguns minutos antes de solicitar um novo e-mail.';
  }
  if(msg.includes('invalid email')){
    return 'Digite um e-mail válido ou informe seu CPF cadastrado.';
  }
  if(msg.includes('not found') || msg.includes('não encontrado') || msg.includes('nenhum cadastro')){
    return 'Não encontramos um cadastro ativo com esse CPF ou e-mail.';
  }
  if(msg.includes('network') || msg.includes('failed to fetch')){
    return 'Não foi possível conectar agora. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível solicitar a recuperação de senha. Confira CPF/e-mail e tente novamente.';
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function maskCPF(value) {
  value = onlyNumbers(value).slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

function normalizarCpf(value) {
  return maskCPF(value);
}

function isEmailLogin(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function pareceEmail(value) {
  return /[a-zA-Z@]/.test(String(value || ""));
}

function pareceCpf(value) {
  const valor = String(value || "").trim();
  return !!valor && !pareceEmail(valor);
}

function setStatus(message, type = "info") {
  if (!loginStatus) return;
  loginStatus.textContent = message || "";
  loginStatus.className = `login-status ${type}`;
}

function salvarStaffLogado(staff) {
  localStorage.setItem("staffLogado", JSON.stringify({
    ...staff,
    is_admin: staff.is_admin === true || staff.is_admin === "true" || staff.is_admin === 1 || staff.is_admin === "1"
  }));
}

async function resolverEmailLogin(loginValue) {
  const valor = String(loginValue || "").trim();
  if (isEmailLogin(valor)) return valor.toLowerCase();
  return buscarEmailPorCpf(valor);
}

async function buscarEmailPorCpf(cpfValue) {
  const cpfFormatado = normalizarCpf(cpfValue);
  if (!cpfFormatado || onlyNumbers(cpfFormatado).length !== 11) {
    throw new Error("Digite um CPF válido.");
  }

  const { data, error } = await supabaseClient.rpc("get_login_email_by_cpf", {
    cpf_input: cpfFormatado
  });

  if (error) {
    console.error("Erro ao buscar e-mail por CPF:", error);
    throw new Error("Não foi possível localizar o CPF. Verifique se o SQL da v2.1 foi executado.");
  }

  if (!data) {
    throw new Error("CPF não encontrado ou sem e-mail vinculado.");
  }

  return String(data).trim().toLowerCase();
}

async function atualizarUltimoAcesso(userId) {
  try {
    await supabaseClient
      .from("staffs")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("auth_user_id", userId);
  } catch (error) {
    console.warn("Não foi possível atualizar último acesso:", error);
  }
}

async function carregarStaffDaSessao(userId) {
  const { data, error } = await supabaseClient
    .from("staffs")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("staffLogado");
    throw new Error("Login realizado, mas este usuário ainda não está vinculado a um cadastro de staff. Vincule o auth_user_id no Supabase.");
  }

  await atualizarUltimoAcesso(userId);
  const staffAtualizado = { ...data, ultimo_acesso: new Date().toISOString() };
  salvarStaffLogado(staffAtualizado);
  return staffAtualizado;
}

async function verificarSessaoExistente() {
  if (await processarLogoutManualNaTelaLogin()) return;
  const logoutStamp = Number(localStorage.getItem(MANUAL_LOGOUT_KEY) || "0");
  if (sessionStorage.getItem(MANUAL_LOGOUT_KEY) === "1" || (logoutStamp && Date.now() - logoutStamp < 15000)) return;
  const { data } = await supabaseClient.auth.getSession();
  const user = data && data.session && data.session.user;
  if (!user) return;

  try {
    if (keepConnected && !keepConnected.checked) {
      sessionStorage.setItem("sistemaStaffSessionOnly", "1");
    } else {
      sessionStorage.removeItem("sistemaStaffSessionOnly");
    }

    const staff = await carregarStaffDaSessao(user.id);
    window.location.href = staff.is_admin ? "admin.html" : "corridas.html";
  } catch (error) {
    console.warn("Sessão existente não carregada:", error);
  }
}

function configurarToggleSenha() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    const targetId = btn.getAttribute("data-toggle-password");
    const input = document.getElementById(targetId);
    if (!input) return;
    btn.addEventListener("click", () => {
      const visivel = input.type === "text";
      input.type = visivel ? "password" : "text";
      btn.setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
      btn.innerHTML = visivel ? '<span class="password-icon password-icon-eye" aria-hidden="true"></span>' : '<span class="password-icon password-icon-eye-off" aria-hidden="true"></span>';
      btn.classList.toggle('is-visible', !visivel);
    });
  });
}

if (loginCpf) {
  loginCpf.addEventListener("input", () => {
    const valor = loginCpf.value;
    // Permite e-mail normalmente. Só aplica máscara quando o campo tiver apenas números/pontuação de CPF.
    if (valor && !/[a-zA-Z@]/.test(valor)) {
      loginCpf.value = maskCPF(valor);
    }
    setStatus("");
  });
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  sessionStorage.removeItem(MANUAL_LOGOUT_KEY);
  localStorage.removeItem(MANUAL_LOGOUT_KEY);

  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";
  setStatus("");

  try {
    const cpf = loginCpf.value;
    const password = loginPassword.value;

    if (!cpf || !password) {
      throw new Error("Digite CPF/e-mail e senha.");
    }

    const email = await resolverEmailLogin(cpf);

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error("CPF/e-mail ou senha incorretos.");
    }

    const user = authData && authData.user;
    if (!user) {
      throw new Error("Não foi possível iniciar a sessão.");
    }

    if (keepConnected && !keepConnected.checked) {
      sessionStorage.setItem("sistemaStaffSessionOnly", "1");
    } else {
      sessionStorage.removeItem("sistemaStaffSessionOnly");
    }

    const staff = await carregarStaffDaSessao(user.id);
    window.location.href = staff.is_admin ? "admin.html" : "corridas.html";

  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

async function solicitarRecuperacaoSenha() {
  if (!forgotPasswordBtn || !loginCpf) return;

  const loginInformado = String(loginCpf.value || "").trim();

  if (!loginInformado) {
    setStatus("Digite seu CPF ou e-mail para receber o link de redefinição de senha.", "error");
    loginCpf.focus();
    return;
  }

  forgotPasswordBtn.disabled = true;
  const textoOriginal = forgotPasswordBtn.textContent;
  forgotPasswordBtn.textContent = "Enviando link...";
  setStatus("Verificando cadastro e solicitando o link de redefinição...", "info");

  try {
    const email = await resolverEmailLogin(loginInformado);
    const basePath = window.location.pathname.replace(/index\.html?$/i, "");
    const redirectTo = window.location.origin + basePath + "alterar-senha.html";

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;

    setStatus("Pronto. Se existir um cadastro ativo com esse CPF ou e-mail, enviaremos um link para redefinir sua senha.", "success");
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error);
    setStatus(mensagemErroRecuperacaoSenha(error), "error");
  } finally {
    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = textoOriginal || "Esqueci minha senha";
  }
}

if (forgotPasswordBtn) {
  forgotPasswordBtn.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    solicitarRecuperacaoSenha();
  };
}

configurarToggleSenha();
verificarSessaoExistente();
