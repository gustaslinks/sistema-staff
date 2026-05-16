const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

function normalizarEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function salvarStaffLogado(staff) {
  localStorage.setItem("staffLogado", JSON.stringify({
    ...staff,
    is_admin: staff.is_admin === true || staff.is_admin === "true" || staff.is_admin === 1 || staff.is_admin === "1"
  }));
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

  salvarStaffLogado(data);
  return data;
}

async function verificarSessaoExistente() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data && data.session && data.session.user;
  if (!user) return;

  try {
    const staff = await carregarStaffDaSessao(user.id);
    window.location.href = staff.is_admin ? "admin.html" : "corridas.html";
  } catch (error) {
    console.warn("Sessão existente não carregada:", error);
  }
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  try {
    const email = normalizarEmail(loginEmail.value);
    const password = loginPassword.value;

    if (!email || !password) {
      throw new Error("Digite e-mail e senha.");
    }

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const user = authData && authData.user;
    if (!user) {
      throw new Error("Não foi possível iniciar a sessão.");
    }

    const staff = await carregarStaffDaSessao(user.id);
    window.location.href = staff.is_admin ? "admin.html" : "corridas.html";

  } catch (error) {
    alert(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

verificarSessaoExistente();
