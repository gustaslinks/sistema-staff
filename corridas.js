const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ELEMENTOS DA PÁGINA
const listaCorridas = document.getElementById("lista-corridas");
const listaMinhasInscricoes = document.getElementById("lista-minhas-inscricoes");
const nomeStaff = document.getElementById("nome-staff");
const cidadeStaff = document.getElementById("cidade-staff");
const emailStaff = document.getElementById("email-staff");
const fotoStaff = document.getElementById("foto-staff");
const botaoSair = document.getElementById("botao-sair");
const botaoAdmin = document.getElementById("botao-admin");

// STAFF LOGADO
const staffLogado = JSON.parse(localStorage.getItem("staffLogado"));

// BLOQUEIA ACESSO SEM LOGIN
if (!staffLogado || !staffLogado.id) {
  window.location.href = "login.html";
}


// =========================================================
// CARD DO STAFF
// =========================================================

function carregarCardStaff() {
  nomeStaff.textContent = staffLogado.nome_completo || "Staff";

  cidadeStaff.textContent = staffLogado.cidade
    ? `Cidade: ${staffLogado.cidade}`
    : "Cidade não informada";

  emailStaff.textContent = staffLogado.email
    ? `E-mail: ${staffLogado.email}`
    : "E-mail não informado";

  fotoStaff.src = staffLogado.foto_url || "https://placehold.co/120x120?text=Foto";
}

botaoSair.addEventListener("click", function () {
  localStorage.removeItem("staffLogado");
  window.location.href = "login.html";
});

if (staffLogado.is_admin === true) {
  botaoAdmin.classList.remove("hidden");
}

botaoAdmin.addEventListener("click", function () {
  window.location.href = "admin.html";
});


// =========================================================
// CORRIDAS DISPONÍVEIS
// =========================================================

async function carregarCorridas() {
  listaCorridas.innerHTML = `<p>Carregando corridas...</p>`;

  const { data: corridas, error: erroCorridas } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("status", "aberta")
    .order("data_corrida", { ascending: true });

  if (erroCorridas) {
    console.error("Erro ao buscar corridas:", erroCorridas);

    listaCorridas.innerHTML = `
      <p>Não foi possível carregar as corridas no momento.</p>
    `;
    return;
  }

  if (!corridas || corridas.length === 0) {
    listaCorridas.innerHTML = `
      <p>Não há corridas abertas para inscrição.</p>
    `;
    return;
  }

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("corrida_id")
    .eq("staff_id", staffLogado.id);

  if (erroInscricoes) {
    console.error("Erro ao buscar inscrições do staff:", erroInscricoes);
  }

  const corridasJaInscritas = inscricoes
    ? inscricoes.map(inscricao => inscricao.corrida_id)
    : [];

  listaCorridas.innerHTML = corridas.map(corrida => {
    const dataFormatada = formatarData(corrida.data_corrida);

    const prazoFormatado = corrida.prazo_inscricao
      ? formatarData(corrida.prazo_inscricao)
      : "Não informado";

    const valorFormatado = corrida.valor_ajuda_custo !== null
      ? Number(corrida.valor_ajuda_custo).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })
      : "Não informado";

    const jaInscrito = corridasJaInscritas.includes(corrida.id);

    return `
      <article class="card-corrida">
        <h2>${corrida.nome}</h2>

        <p><strong>Data:</strong> ${dataFormatada}</p>
        <p><strong>Horário:</strong> ${formatarHorario(corrida.horario)}</p>
        <p><strong>Local:</strong> ${corrida.local || "Não informado"}</p>
        <p><strong>Cidade:</strong> ${corrida.cidade || "Não informada"}</p>
        <p><strong>Distância:</strong> ${corrida.distancia || "Não informada"}</p>
        <p><strong>Ajuda de custo:</strong> ${valorFormatado}</p>
        <p><strong>Prazo de inscrição:</strong> ${prazoFormatado}</p>

        ${
          jaInscrito
            ? `
              <button disabled>
                Inscrição realizada
              </button>
            `
            : `
              <button
                class="botao-inscricao"
                data-corrida-id="${corrida.id}"
              >
                Quero me inscrever
              </button>
            `
        }
      </article>
    `;
  }).join("");

  ativarBotoesInscricao();
}


// =========================================================
// INSCRIÇÃO EM CORRIDA
// =========================================================

function ativarBotoesInscricao() {
  const botoes = document.querySelectorAll(".botao-inscricao");

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);

      botao.disabled = true;
      botao.textContent = "Inscrevendo...";

      const { error } = await supabaseClient
        .from("inscricoes")
        .insert({
          staff_id: staffLogado.id,
          corrida_id: corridaId
        });

      if (error) {
        console.error("Erro ao realizar inscrição:", error);

        if (error.code === "23505") {
          alert("Você já está inscrito nesta corrida.");
        } else {
          alert("Não foi possível realizar a inscrição. Tente novamente.");
        }

        botao.disabled = false;
        botao.textContent = "Quero me inscrever";
        return;
      }

      alert("Inscrição realizada com sucesso!");
carregarCorridas();
carregarMinhasInscricoes();
    });
  });
}

// =========================================================
// MINHAS INSCRIÇÕES
// =========================================================

async function carregarMinhasInscricoes() {
  listaMinhasInscricoes.innerHTML = `<p>Carregando suas inscrições...</p>`;

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("id, corrida_id, status, created_at")
    .eq("staff_id", staffLogado.id)
    .order("created_at", { ascending: false });

  if (erroInscricoes) {
    console.error("Erro ao buscar minhas inscrições:", erroInscricoes);

    listaMinhasInscricoes.innerHTML = `
      <p>Não foi possível carregar suas inscrições no momento.</p>
    `;
    return;
  }

  if (!inscricoes || inscricoes.length === 0) {
    listaMinhasInscricoes.innerHTML = `
      <p>Você ainda não se inscreveu em nenhuma corrida.</p>
    `;
    return;
  }

  const corridaIds = inscricoes.map(inscricao => inscricao.corrida_id);

  const { data: corridas, error: erroCorridas } = await supabaseClient
    .from("corridas")
    .select("id, nome, data_corrida, local, cidade")
    .in("id", corridaIds);

  if (erroCorridas) {
    console.error("Erro ao buscar dados das corridas inscritas:", erroCorridas);

    listaMinhasInscricoes.innerHTML = `
      <p>Não foi possível carregar os dados das corridas.</p>
    `;
    return;
  }

  const corridasPorId = {};

  corridas.forEach(corrida => {
    corridasPorId[corrida.id] = corrida;
  });

  listaMinhasInscricoes.innerHTML = inscricoes.map(inscricao => {
    const corrida = corridasPorId[inscricao.corrida_id];

    if (!corrida) {
      return "";
    }

    return `
      <article class="card-minha-inscricao">
        <div class="conteudo-minha-inscricao">
          <h3>${corrida.nome}</h3>

          <p><strong>Data:</strong> ${formatarData(corrida.data_corrida)}</p>
          <p><strong>Local:</strong> ${corrida.local || "Não informado"}</p>
          <p><strong>Cidade:</strong> ${corrida.cidade || "Não informada"}</p>
        </div>

        <div class="status-inscricao status-${inscricao.status}">
          ${formatarStatusInscricao(inscricao.status)}
        </div>
      </article>
    `;
  }).join("");
}

// =========================================================
// FORMATAÇÕES
// =========================================================

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHorario(horario) {
  if (!horario) return "Não informado";

  return horario.slice(0, 5);
}

function formatarStatusInscricao(status) {
  const statusFormatados = {
    inscrito: "Inscrito",
    confirmado: "Confirmado",
    cancelado: "Cancelado"
  };

  return statusFormatados[status] || status;
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

carregarCardStaff();
carregarCorridas();
carregarMinhasInscricoes();
