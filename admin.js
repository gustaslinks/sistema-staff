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

        <div class="admin-card-footer">
          <span class="admin-status ${corrida.status}">
            ${corrida.status}
          </span>

          <button
            class="botao-ver-inscritos"
            data-corrida-id="${corrida.id}"
          >
            Ver inscritos
          </button>
          <button
            class="botao-alterar-status-corrida"
            data-corrida-id="${corrida.id}"
            data-status-atual="${corrida.status}"
          >
            ${corrida.status === "aberta" ? "Encerrar inscrições" : "Abrir inscrições"}
          </button>
        </div>

        <section
          id="inscritos-corrida-${corrida.id}"
          class="lista-inscritos-admin hidden"
        ></section>
      </article>
    `;
  }).join("");

  ativarBotoesVerInscritos();
  ativarBotoesStatusCorrida();
  }

// VER INSCRITOS
function ativarBotoesVerInscritos() {
  const botoes = document.querySelectorAll(".botao-ver-inscritos");

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);
      const areaInscritos = document.getElementById(`inscritos-corrida-${corridaId}`);

      if (!areaInscritos.classList.contains("hidden")) {
        areaInscritos.classList.add("hidden");
        botao.textContent = "Ver inscritos";
        return;
      }

      areaInscritos.classList.remove("hidden");
      botao.textContent = "Ocultar inscritos";
      areaInscritos.innerHTML = `<p>Carregando inscritos...</p>`;

      await carregarInscritosDaCorrida(corridaId, areaInscritos);
    });
  });
}

function ativarBotoesStatusCorrida() {
  const botoes = document.querySelectorAll(".botao-alterar-status-corrida");

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);
      const statusAtual = botao.dataset.statusAtual;
      const novoStatus = statusAtual === "aberta" ? "encerrada" : "aberta";

      const confirmar = confirm(
        novoStatus === "encerrada"
          ? "Deseja encerrar as inscrições desta corrida?"
          : "Deseja reabrir as inscrições desta corrida?"
      );

      if (!confirmar) return;

      botao.disabled = true;
      botao.textContent = "Atualizando...";

      const { error } = await supabaseClient
        .from("corridas")
        .update({ status: novoStatus })
        .eq("id", corridaId);

      if (error) {
        console.error("Erro ao alterar status da corrida:", error);
        alert("Não foi possível alterar o status da corrida.");
        botao.disabled = false;
        return;
      }

      carregarCorridasAdmin();
    });
  });
}

// CARREGAR INSCRITOS
async function carregarInscritosDaCorrida(corridaId, areaInscritos) {
  const { data: inscricoes, error } = await supabaseClient
    .from("inscricoes")
    .select(`
      id,
      status,
      created_at,
      staffs (
        id,
        nome_completo,
        cidade,
        telefone,
        email,
        foto_url
      )
    `)
    .eq("corrida_id", corridaId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar inscritos:", error);
    areaInscritos.innerHTML = `<p>Não foi possível carregar os inscritos.</p>`;
    return;
  }

  if (!inscricoes || inscricoes.length === 0) {
    areaInscritos.innerHTML = `<p>Nenhum inscrito nesta corrida.</p>`;
    return;
  }

  areaInscritos.innerHTML = inscricoes.map(inscricao => {
    const staff = inscricao.staffs;

    return `
      <article class="card-inscrito-admin">
        <img
          class="foto-inscrito-admin"
          src="${staff.foto_url || "https://placehold.co/80x80?text=Foto"}"
          alt="Foto de ${staff.nome_completo}"
        >

        <div class="dados-inscrito-admin">
          <h4>${staff.nome_completo}</h4>
          <p><strong>Cidade:</strong> ${staff.cidade || "Não informada"}</p>
          <p><strong>Telefone:</strong> ${staff.telefone || "Não informado"}</p>
          <p><strong>E-mail:</strong> ${staff.email || "Não informado"}</p>
          <p><strong>Status:</strong> ${formatarStatusInscricao(inscricao.status)}</p>
        </div>

        <div class="acoes-inscrito-admin">

  <button
    class="botao-confirmar-inscrito ${
      inscricao.status === "confirmado"
        ? "ativo-confirmado"
        : ""
    }"
    data-inscricao-id="${inscricao.id}"
    data-corrida-id="${corridaId}"
    ${
      inscricao.status === "confirmado"
        ? "disabled"
        : ""
    }
  >
    ${
      inscricao.status === "confirmado"
        ? "Confirmado"
        : "Confirmar"
    }
  </button>

  <button
    class="botao-cancelar-inscrito ${
      inscricao.status === "cancelado"
        ? "ativo-cancelado"
        : ""
    }"
    data-inscricao-id="${inscricao.id}"
    data-corrida-id="${corridaId}"
    ${
      inscricao.status === "cancelado"
        ? "disabled"
        : ""
    }
  >
    ${
      inscricao.status === "cancelado"
        ? "Cancelado"
        : "Cancelar"
    }
  </button>

</div>
      </article>
    `;
  }).join("");

  ativarBotoesStatusInscricao();
}

// BOTÕES CONFIRMAR / CANCELAR
function ativarBotoesStatusInscricao() {
  const botoesConfirmar = document.querySelectorAll(".botao-confirmar-inscrito");
  const botoesCancelar = document.querySelectorAll(".botao-cancelar-inscrito");

  botoesConfirmar.forEach(botao => {
    botao.addEventListener("click", async function () {
      await atualizarStatusInscricao(botao, "confirmado");
    });
  });

  botoesCancelar.forEach(botao => {
    botao.addEventListener("click", async function () {
      await atualizarStatusInscricao(botao, "cancelado");
    });
  });
}

// ATUALIZAR STATUS
async function atualizarStatusInscricao(botao, novoStatus) {
  const inscricaoId = Number(botao.dataset.inscricaoId);
  const corridaId = Number(botao.dataset.corridaId);
  const areaInscritos = document.getElementById(`inscritos-corrida-${corridaId}`);

  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Salvando...";

  const { error } = await supabaseClient
    .from("inscricoes")
    .update({ status: novoStatus })
    .eq("id", inscricaoId);

  if (error) {
    console.error("Erro ao atualizar inscrição:", error);
    alert("Não foi possível atualizar o status.");
    botao.disabled = false;
    botao.textContent = textoOriginal;
    return;
  }

  await carregarInscritosDaCorrida(corridaId, areaInscritos);
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

function formatarStatusInscricao(status) {
  const statusFormatados = {
    inscrito: "Inscrito",
    confirmado: "Confirmado",
    cancelado: "Cancelado"
  };

  return statusFormatados[status] || status;
}

// INICIALIZAÇÃO
carregarCorridasAdmin();
