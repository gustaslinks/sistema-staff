const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ELEMENTOS
const novaCorridaBtn = document.getElementById("nova-corrida-btn");
const formNovaCorrida = document.getElementById("form-nova-corrida");
const salvarCorridaBtn = document.getElementById("salvar-corrida-btn");
const listaCorridasAdmin = document.getElementById("lista-corridas-admin");

// CAMPOS
const corridaNome = document.getElementById("corrida-nome");
const corridaData = document.getElementById("corrida-data");
const corridaHorario = document.getElementById("corrida-horario");
const corridaCidade = document.getElementById("corrida-cidade");
const corridaLocal = document.getElementById("corrida-local");
const corridaDistancia = document.getElementById("corrida-distancia");
const corridaAjuda = document.getElementById("corrida-ajuda");
const corridaPrazo = document.getElementById("corrida-prazo");
const corridaObservacoes = document.getElementById("corrida-observacoes");

// STAFF LOGADO
const staffLogado = JSON.parse(localStorage.getItem("staffLogado"));

if (!staffLogado || staffLogado.is_admin !== true) {
  alert("Acesso restrito ao administrador.");
  window.location.href = "login.html";
}

// MOSTRAR / ESCONDER FORM
novaCorridaBtn.addEventListener("click", function () {
  formNovaCorrida.classList.toggle("hidden");
});

// SALVAR CORRIDA
salvarCorridaBtn.addEventListener("click", async function () {
  if (!corridaNome.value || !corridaData.value) {
    alert("Preencha pelo menos o nome e a data da corrida.");
    return;
  }

  salvarCorridaBtn.disabled = true;
  salvarCorridaBtn.textContent = "Salvando...";

  const { error } = await supabaseClient
    .from("corridas")
    .insert({
      nome: corridaNome.value.trim(),
      data_corrida: corridaData.value,
      horario: corridaHorario.value || null,
      cidade: corridaCidade.value.trim() || null,
      local: corridaLocal.value.trim() || null,
      distancia: corridaDistancia.value.trim() || null,
      valor_ajuda_custo: corridaAjuda.value ? Number(corridaAjuda.value) : null,
      prazo_inscricao: corridaPrazo.value || null,
      observacoes: corridaObservacoes.value.trim() || null,
      status: "aberta"
    });

  if (error) {
    console.error("Erro ao salvar corrida:", error);
    alert("Não foi possível salvar a corrida.");
    salvarCorridaBtn.disabled = false;
    salvarCorridaBtn.textContent = "Salvar corrida";
    return;
  }

  alert("Corrida cadastrada com sucesso!");

  limparFormularioCorrida();
  formNovaCorrida.classList.add("hidden");

  salvarCorridaBtn.disabled = false;
  salvarCorridaBtn.textContent = "Salvar corrida";

  carregarCorridasAdmin();
});

// LISTAR CORRIDAS
async function carregarCorridasAdmin() {
  listaCorridasAdmin.innerHTML = `<p>Carregando corridas...</p>`;

  const { data: corridas, error } = await supabaseClient
    .from("corridas")
    .select("*")
    .order("data_corrida", { ascending: false });

  if (error) {
    console.error("Erro ao buscar corridas:", error);
    listaCorridasAdmin.innerHTML = `<p>Não foi possível carregar as corridas.</p>`;
    return;
  }

  if (!corridas || corridas.length === 0) {
    listaCorridasAdmin.innerHTML = `<p>Nenhuma corrida cadastrada ainda.</p>`;
    return;
  }

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("corrida_id");

  if (erroInscricoes) {
    console.error("Erro ao buscar inscrições:", erroInscricoes);
  }

  listaCorridasAdmin.innerHTML = corridas.map(corrida => {
    const totalInscritos = inscricoes
      ? inscricoes.filter(inscricao => inscricao.corrida_id === corrida.id).length
      : 0;

    return `
      <article class="card-corrida-admin">
        <h3>${corrida.nome}</h3>

        <p><strong>Data:</strong> ${formatarData(corrida.data_corrida)}</p>
        <p><strong>Horário:</strong> ${formatarHorario(corrida.horario)}</p>
        <p><strong>Cidade:</strong> ${corrida.cidade || "Não informada"}</p>
        <p><strong>Local:</strong> ${corrida.local || "Não informado"}</p>
        <p><strong>Distância:</strong> ${corrida.distancia || "Não informada"}</p>
        <p><strong>Ajuda de custo:</strong> ${formatarMoeda(corrida.valor_ajuda_custo)}</p>
        <p><strong>Prazo:</strong> ${
          corrida.prazo_inscricao ? formatarData(corrida.prazo_inscricao) : "Não informado"
        }</p>
        <p><strong>Inscritos:</strong> ${totalInscritos}</p>

        <span class="admin-status ${corrida.status}">
          ${corrida.status}
        </span>
      </article>
    `;
  }).join("");
}

// LIMPAR FORM
function limparFormularioCorrida() {
  corridaNome.value = "";
  corridaData.value = "";
  corridaHorario.value = "";
  corridaCidade.value = "";
  corridaLocal.value = "";
  corridaDistancia.value = "";
  corridaAjuda.value = "";
  corridaPrazo.value = "";
  corridaObservacoes.value = "";
}

// FORMATADORES
function formatarData(dataISO) {
  if (!dataISO) return "Não informado";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHorario(horario) {
  if (!horario) return "Não informado";
  return horario.slice(0, 5);
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return "Não informado";

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// INICIALIZAÇÃO
carregarCorridasAdmin();
