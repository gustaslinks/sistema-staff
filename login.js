const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("loginForm");
const cpf = document.getElementById("cpf");
const nascimento = document.getElementById("nascimento");
const loginBtn = document.getElementById("loginBtn");

function onlyNumbers(value) {
  return value.replace(/\D/g, "");
}

function maskCPF(value) {
  value = onlyNumbers(value).slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

function maskDate(value) {
  value = onlyNumbers(value).slice(0, 8);
  value = value.replace(/(\d{2})(\d)/, "$1/$2");
  value = value.replace(/(\d{2})(\d)/, "$1/$2");
  return value;
}

function dateToSupabase(value) {
  const numbers = onlyNumbers(value);

  if (numbers.length !== 8) return "";

  const dia = numbers.slice(0, 2);
  const mes = numbers.slice(2, 4);
  const ano = numbers.slice(4, 8);

  return ano + "-" + mes + "-" + dia;
}

cpf.addEventListener("input", function () {
  cpf.value = maskCPF(cpf.value);
});

nascimento.addEventListener("input", function () {
  nascimento.value = maskDate(nascimento.value);
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  try {
    const dataNascimento = dateToSupabase(nascimento.value);

    if (!dataNascimento) {
      throw new Error("Digite a data no formato dd/mm/aaaa.");
    }

    const { data, error } = await supabaseClient
      .from("staffs")
      .select("*")
      .eq("cpf", cpf.value)
      .eq("data_nascimento", dataNascimento)
      .single();

    if (error || !data) {
      throw new Error("Cadastro não encontrado.");
    }

localStorage.setItem("staffLogado", JSON.stringify({
  id: data.id,
  nome_completo: data.nome_completo,
  cpf: data.cpf,
  email: data.email,
  cidade: data.cidade,
  foto_url: data.foto_url,
  is_admin: data.is_admin
}));

    window.location.href = "corridas.html";

  } catch (error) {
    alert(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});
