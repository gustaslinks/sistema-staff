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

// CAMPOS DA CORRIDA
const corridaNome = document.getElementById("corrida-nome");
const corridaDataInicio = document.getElementById("corrida-data-inicio");
const corridaDataFim = document.getElementById("corrida-data-fim");
const corridaLocal = document.getElementById("corrida-local");
const corridaPrazo = document.getElementById("corrida-prazo");
const corridaVagas = document.getElementById("corrida-vagas");
const corridaObservacoes = document.getElementById("corrida-observacoes");

// CAMPOS DOS DIAS NO CADASTRO
const novoDiaTipo = document.getElementById("novo-dia-tipo");
const novoDiaAjuda = document.getElementById("novo-dia-ajuda");
const novoDiaInicio = document.getElementById("novo-dia-inicio");
const novoDiaFim = document.getElementById("novo-dia-fim");
const novoDiaHorarioInicio = document.getElementById("novo-dia-horario-inicio");
const novoDiaHorarioFim = document.getElementById("novo-dia-horario-fim");
const novoDiaAteUltimo = document.getElementById("novo-dia-ate-ultimo");
const adicionarPeriodoBtn = document.getElementById("adicionar-periodo-btn");
const previewDiasCorrida = document.getElementById("preview-dias-corrida");

const OBSERVACOES_PADRAO = "Traje obrigatório: calça jeans ou preta. Não levar mochila grande. Levar documento com foto e chegar com antecedência ao local informado.";
let diasCadastroCorrida = [];
let corridaEmEdicaoId = null;

const staffLogadoRaw = localStorage.getItem("staffLogado");
let staffLogado = null;

try {
  staffLogado = staffLogadoRaw ? JSON.parse(staffLogadoRaw) : null;
} catch (error) {
  localStorage.removeItem("staffLogado");
  window.location.href = "index.html";
}

const isAdmin =
  staffLogado &&
  (staffLogado.is_admin === true || staffLogado.is_admin === "true");

if (!isAdmin) {
  window.location.href = "index.html";
}

document.getElementById("foto-staff").src =
  staffLogado.foto_url || "";

document.getElementById("nome-staff").textContent =
  staffLogado.nome_completo || "";

document.getElementById("cidade-staff").textContent =
  "Cidade: " + (staffLogado.cidade || "-");

document.getElementById("email-staff").textContent =
  "E-mail: " + (staffLogado.email || "-");


// MOSTRAR / ESCONDER FORM
novaCorridaBtn.addEventListener("click", function () {
  const estavaFechado = formNovaCorrida.classList.contains("hidden");

  if (estavaFechado) {
    prepararNovaCorrida();
    formNovaCorrida.classList.remove("hidden");
  } else {
    formNovaCorrida.classList.add("hidden");
  }
});

adicionarPeriodoBtn.addEventListener("click", function () {
  adicionarPeriodoCadastro();
});

if (novoDiaAteUltimo) {
  novoDiaAteUltimo.addEventListener("change", function () {
    if (novoDiaAteUltimo.checked) {
      novoDiaHorarioFim.value = "";
      novoDiaHorarioFim.disabled = true;
    } else {
      novoDiaHorarioFim.disabled = false;
    }
  });
}

// SALVAR / ATUALIZAR CORRIDA
salvarCorridaBtn.addEventListener("click", async function () {
  if (!corridaNome.value || !corridaDataInicio.value || !corridaDataFim.value) {
    alert("Preencha nome, data inicial e data final da corrida.");
    return;
  }

  if (new Date(`${corridaDataFim.value}T00:00:00`) < new Date(`${corridaDataInicio.value}T00:00:00`)) {
    alert("A data final não pode ser anterior à data inicial.");
    return;
  }

  if (!corridaVagas.value || Number(corridaVagas.value) <= 0) {
    alert("Informe o número de vagas disponíveis.");
    return;
  }

  if (diasCadastroCorrida.length === 0) {
    const confirmar = confirm(
      "Nenhum dia foi adicionado. Deseja salvar a corrida mesmo assim?"
    );

    if (!confirmar) return;
  }

  salvarCorridaBtn.disabled = true;
  salvarCorridaBtn.textContent = corridaEmEdicaoId ? "Atualizando..." : "Salvando...";

  const dadosCorrida = {
    nome: corridaNome.value.trim(),
    data_corrida: corridaDataFim.value,
    data_inicio: corridaDataInicio.value,
    data_fim: corridaDataFim.value,
    cidade: null,
    local: corridaLocal.value.trim() || null,
    vagas_total: Number(corridaVagas.value),
    prazo_inscricao: corridaPrazo.value || null,
    observacoes: corridaObservacoes.value.trim() || OBSERVACOES_PADRAO
  };

  let corridaId = corridaEmEdicaoId;

  if (corridaEmEdicaoId) {
    const { error } = await supabaseClient
      .from("corridas")
      .update(dadosCorrida)
      .eq("id", corridaEmEdicaoId);

    if (error) {
      console.error("Erro ao atualizar corrida:", error);
      alert("Não foi possível atualizar a corrida.");
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Atualizar corrida";
      return;
    }

    const { error: erroExcluirDias } = await supabaseClient
      .from("corrida_dias")
      .delete()
      .eq("corrida_id", corridaEmEdicaoId);

    if (erroExcluirDias) {
      console.error("Erro ao atualizar dias da corrida:", erroExcluirDias);
      alert("A corrida foi atualizada, mas não foi possível substituir os dias cadastrados.");
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Atualizar corrida";
      return;
    }
  } else {
    const { data: corridaCriada, error } = await supabaseClient
      .from("corridas")
      .insert({
        ...dadosCorrida,
        status: "aberta"
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao salvar corrida:", error);
      alert("Não foi possível salvar a corrida. Confira se as novas colunas foram criadas no Supabase.");
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Salvar corrida";
      return;
    }

    corridaId = corridaCriada.id;
  }

  if (diasCadastroCorrida.length > 0) {
    const diasParaInserir = diasCadastroCorrida.map(dia => ({
      corrida_id: corridaId,
      nome: dia.nome,
      data_dia: dia.data_dia,
      horario_inicio: dia.horario_inicio || null,
      horario_fim: dia.horario_fim || null,
      tipo: dia.tipo || null,
      valor_ajuda_custo: dia.valor_ajuda_custo,
      vagas: 0
    }));

    const { error: erroDias } = await supabaseClient
      .from("corrida_dias")
      .insert(diasParaInserir);

    if (erroDias) {
      console.error("Erro ao salvar dias da corrida:", erroDias);
      alert("A corrida foi salva, mas não foi possível salvar os dias. Confira se a coluna valor_ajuda_custo existe em corrida_dias.");
    }
  }

  alert(corridaEmEdicaoId ? "Corrida atualizada com sucesso!" : "Corrida cadastrada com sucesso!");

  limparFormularioCorrida();
  formNovaCorrida.classList.add("hidden");

  salvarCorridaBtn.disabled = false;
  salvarCorridaBtn.textContent = "Salvar corrida";

  carregarCorridasAdmin();
});


function contarInscritosValidos(inscricoes, corridaId) {
  if (!inscricoes) return 0;

  return inscricoes.filter(inscricao => {
    return inscricao.corrida_id === corridaId && inscricao.status !== "cancelado" && inscricao.status !== "lista_espera";
  }).length;
}

async function encerrarCorridasLotadas(corridas, inscricoes) {
  const corridasLotadas = (corridas || []).filter(corrida => {
    const vagasTotal = Number(corrida.vagas_total || 0);
    const totalInscritos = contarInscritosValidos(inscricoes, corrida.id);

    return corrida.status === "aberta" && vagasTotal > 0 && totalInscritos >= vagasTotal;
  });

  if (corridasLotadas.length === 0) return;

  const ids = corridasLotadas.map(corrida => corrida.id);

  const { error } = await supabaseClient
    .from("corridas")
    .update({ status: "encerrada" })
    .in("id", ids);

  if (error) {
    console.error("Erro ao encerrar corridas lotadas:", error);
    return;
  }

  corridas.forEach(corrida => {
    if (ids.includes(corrida.id)) {
      corrida.status = "encerrada";
    }
  });
}

// LISTAR CORRIDAS
async function carregarCorridasAdmin() {
  listaCorridasAdmin.innerHTML = `<p>Carregando corridas...</p>`;

  const { data: corridas, error } = await supabaseClient
    .from("corridas")
    .select("*")
    .order("data_corrida", { ascending: false });

  if (error) {
    console.error("Erro ao buscar corridas:", error);

    listaCorridasAdmin.innerHTML =
      `<p>Não foi possível carregar as corridas.</p>`;

    return;
  }

  if (!corridas || corridas.length === 0) {
    listaCorridasAdmin.innerHTML =
      `<p>Nenhuma corrida cadastrada ainda.</p>`;

    return;
  }

  const { data: inscricoes, error: erroInscricoes } =
    await supabaseClient
      .from("inscricoes")
      .select("corrida_id, status");

  if (erroInscricoes) {
    console.error(
      "Erro ao buscar inscrições:",
      erroInscricoes
    );
  }

  await encerrarCorridasLotadas(corridas, inscricoes || []);

  listaCorridasAdmin.innerHTML = corridas.map(corrida => {
    const totalInscritos = contarInscritosValidos(inscricoes || [], corrida.id);
    const vagasTotal = Number(corrida.vagas_total || 0);
    const textoVagas = vagasTotal > 0
      ? `${totalInscritos} de ${vagasTotal} vagas preenchidas`
      : `${totalInscritos} inscrito(s)`;

    return `
      <article class="card-corrida-admin">

        <h3>${corrida.nome}</h3>

        <div class="corrida-status-card ${corrida.status}">
          <strong>${corrida.status === "aberta" ? "Inscrições abertas" : "Inscrições encerradas"}</strong>
          <span>${textoVagas}</span>
        </div>

        <p><strong>Período:</strong>
          ${formatarPeriodoCorrida(corrida)}
        </p>

        <p><strong>Local:</strong><br>
          ${formatarTextoComQuebra(corrida.local || "Não informado")}
        </p>

        <p><strong>Vagas:</strong>
          ${vagasTotal > 0 ? vagasTotal : "Não informadas"}
        </p>

        <p><strong>Prazo:</strong>
          ${
            corrida.prazo_inscricao
              ? formatarData(corrida.prazo_inscricao)
              : "Não informado"
          }
        </p>

        <p><strong>Inscritos:</strong>
          ${totalInscritos}
        </p>

        <div class="gerenciar-dias">
          <button
            type="button"
            class="botao-toggle-dias"
            data-corrida-id="${corrida.id}"
          >
            Mostrar dias cadastrados
          </button>

          <div id="dias-corrida-${corrida.id}" class="dias-corrida-container hidden"></div>
        </div>

        <div class="admin-card-footer">

          <span class="admin-status ${corrida.status}">
            ${corrida.status}
          </span>

          <button
            class="botao-editar-corrida botao-admin-secundario"
            data-corrida-id="${corrida.id}"
          >
            Editar corrida
          </button>

          <button
            class="botao-excluir-corrida delete-btn"
            data-corrida-id="${corrida.id}"
            data-total-inscritos="${totalInscritos}"
          >
            Excluir corrida
          </button>

          <button
            class="botao-ver-inscritos"
            data-corrida-id="${corrida.id}"
          >
            Ver inscritos
          </button>

          <button
            class="botao-exportar-planilha botao-admin-secundario"
            data-corrida-id="${corrida.id}"
          >
            Exportar planilha
          </button>

          <button
            class="botao-alterar-status-corrida"
            data-corrida-id="${corrida.id}"
            data-status-atual="${corrida.status}"
          >
            ${
              corrida.status === "aberta"
                ? "Encerrar inscrições"
                : "Abrir inscrições"
            }
          </button>

        </div>

        <section
          id="inscritos-corrida-${corrida.id}"
          class="lista-inscritos-admin hidden"
        ></section>

      </article>
    `;
  }).join("");

  corridas.forEach(corrida => {
    carregarDiasCorrida(corrida.id);
  });

ativarBotoesEditarCorrida();
ativarBotoesExcluirCorrida();
ativarBotoesVerInscritos();
ativarBotoesExportarPlanilha();
ativarBotoesStatusCorrida();
ativarBotoesToggleDias();
}

function ativarBotoesToggleDias() {
  const botoes = document.querySelectorAll(".botao-toggle-dias");

  botoes.forEach(botao => {
    botao.addEventListener("click", function () {
      const corridaId = botao.dataset.corridaId;
      const container = document.getElementById(`dias-corrida-${corridaId}`);

      if (!container) return;

      const fechado = container.classList.contains("hidden");

      if (fechado) {
        container.classList.remove("hidden");
        botao.textContent = "Ocultar dias cadastrados";
      } else {
        container.classList.add("hidden");
        botao.textContent = "Mostrar dias cadastrados";
      }
    });
  });
}

// EDITAR CORRIDA
function ativarBotoesEditarCorrida() {
  const botoes = document.querySelectorAll(".botao-editar-corrida");

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);
      await carregarCorridaParaEdicao(corridaId);
    });
  });
}

async function carregarCorridaParaEdicao(corridaId) {
  const { data: corrida, error } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("id", corridaId)
    .single();

  if (error || !corrida) {
    console.error("Erro ao carregar corrida para edição:", error);
    alert("Não foi possível carregar a corrida para edição.");
    return;
  }

  const { data: dias, error: erroDias } = await supabaseClient
    .from("corrida_dias")
    .select("*")
    .eq("corrida_id", corridaId)
    .order("data_dia", { ascending: true });

  if (erroDias) {
    console.error("Erro ao carregar dias para edição:", erroDias);
    alert("A corrida foi carregada, mas os dias não puderam ser carregados.");
  }

  corridaEmEdicaoId = corridaId;

  corridaNome.value = corrida.nome || "";
  corridaDataInicio.value = corrida.data_inicio || corrida.data_corrida || "";
  corridaDataFim.value = corrida.data_fim || corrida.data_corrida || "";
  corridaLocal.value = corrida.local || "";
  corridaPrazo.value = corrida.prazo_inscricao || "";
  corridaVagas.value = corrida.vagas_total || "";
  corridaObservacoes.value = corrida.observacoes || OBSERVACOES_PADRAO;

  diasCadastroCorrida = (dias || []).map(dia => ({
    nome: dia.nome,
    data_dia: dia.data_dia,
    horario_inicio: dia.horario_inicio,
    horario_fim: dia.horario_fim,
    tipo: dia.tipo,
    valor_ajuda_custo: dia.valor_ajuda_custo
  }));

  renderizarPreviewDiasCadastro();

  salvarCorridaBtn.textContent = "Atualizar corrida";
  formNovaCorrida.classList.remove("hidden");
  formNovaCorrida.scrollIntoView({ behavior: "smooth", block: "start" });
}

// EXCLUIR CORRIDA
function ativarBotoesExcluirCorrida() {
  const botoes = document.querySelectorAll(".botao-excluir-corrida");

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);
      const totalInscritos = Number(botao.dataset.totalInscritos || 0);
      await excluirCorrida(corridaId, totalInscritos);
    });
  });
}

async function excluirCorrida(corridaId, totalInscritos) {
  const mensagemConfirmacao = totalInscritos > 0
    ? "Esta corrida possui inscritos. Ao excluir, todas as inscrições e disponibilidades vinculadas a esta corrida também serão removidas. O cadastro dos staffs NÃO será apagado. Deseja continuar?"
    : "Tem certeza que deseja excluir esta corrida? Essa ação também removerá os dias cadastrados para ela.";

  const confirmar = confirm(mensagemConfirmacao);

  if (!confirmar) return;

  const { data: inscricoesVinculadas, error: erroBuscarInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("id")
    .eq("corrida_id", corridaId);

  if (erroBuscarInscricoes) {
    console.error("Erro ao buscar inscrições vinculadas:", erroBuscarInscricoes);
    alert("Não foi possível verificar as inscrições vinculadas à corrida.");
    return;
  }

  const inscricaoIds = inscricoesVinculadas
    ? inscricoesVinculadas.map(inscricao => inscricao.id)
    : [];

  if (inscricaoIds.length > 0) {
    const { error: erroDisponibilidades } = await supabaseClient
      .from("inscricao_disponibilidades")
      .delete()
      .in("inscricao_id", inscricaoIds);

    if (erroDisponibilidades) {
      console.error("Erro ao excluir disponibilidades:", erroDisponibilidades);
      alert("Não foi possível excluir as disponibilidades vinculadas à corrida.");
      return;
    }

    const { error: erroInscricoes } = await supabaseClient
      .from("inscricoes")
      .delete()
      .eq("corrida_id", corridaId);

    if (erroInscricoes) {
      console.error("Erro ao excluir inscrições:", erroInscricoes);
      alert("Não foi possível excluir as inscrições vinculadas à corrida.");
      return;
    }
  }

  const { error: erroDias } = await supabaseClient
    .from("corrida_dias")
    .delete()
    .eq("corrida_id", corridaId);

  if (erroDias) {
    console.error("Erro ao excluir dias da corrida:", erroDias);
    alert("Não foi possível excluir os dias vinculados à corrida.");
    return;
  }

  const { error } = await supabaseClient
    .from("corridas")
    .delete()
    .eq("id", corridaId);

  if (error) {
    console.error("Erro ao excluir corrida:", error);
    alert("Não foi possível excluir a corrida.");
    return;
  }

  if (corridaEmEdicaoId === corridaId) {
    limparFormularioCorrida();
    formNovaCorrida.classList.add("hidden");
  }

  alert("Corrida excluída com sucesso.");
  carregarCorridasAdmin();
}

// VER INSCRITOS
function ativarBotoesVerInscritos() {
  const botoes = document.querySelectorAll(
    ".botao-ver-inscritos"
  );

  botoes.forEach(botao => {
    botao.addEventListener("click", async () => {

      const corridaId = botao.dataset.corridaId;

      const container = document.getElementById(
        `inscritos-corrida-${corridaId}`
      );

      if (!container) return;

      const estaAberto =
        !container.classList.contains("hidden");

      if (estaAberto) {
        container.classList.add("hidden");
        container.innerHTML = "";
        botao.textContent = "Ver inscritos";
        return;
      }

      container.classList.remove("hidden");
      botao.textContent = "Ocultar inscritos";

      await carregarInscritosDaCorrida(
        corridaId,
        container
      );
    });
  });
}

// STATUS DA CORRIDA
function ativarBotoesStatusCorrida() {
  const botoes = document.querySelectorAll(
    ".botao-alterar-status-corrida"
  );

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {

      const corridaId = Number(
        botao.dataset.corridaId
      );

      const statusAtual =
        botao.dataset.statusAtual;

      const novoStatus =
        statusAtual === "aberta"
          ? "encerrada"
          : "aberta";

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
        console.error(
          "Erro ao alterar status da corrida:",
          error
        );

        alert(
          "Não foi possível alterar o status da corrida."
        );

        botao.disabled = false;

        return;
      }

      carregarCorridasAdmin();
    });
  });
}

// CARREGAR INSCRITOS
async function carregarInscritosDaCorrida(
  corridaId,
  areaInscritos
) {

  areaInscritos.innerHTML =
    `<p>Carregando inscritos...</p>`;

  const corridaIdNumerico = Number(corridaId);

  const { data: corridaAtual } = await supabaseClient
    .from("corridas")
    .select("id, nome, vagas")
    .eq("id", corridaIdNumerico)
    .single();

  const totalVagasCorrida = corridaAtual && corridaAtual.vagas
    ? Number(corridaAtual.vagas)
    : 0;

  const { data: diasCorrida, error: erroDiasCorrida } =
    await supabaseClient
      .from("corrida_dias")
      .select("id")
      .eq("corrida_id", corridaIdNumerico);

  if (erroDiasCorrida) {
    console.error(
      "Erro ao buscar dias da corrida para prioridade:",
      erroDiasCorrida
    );
  }

  const totalDiasCorrida = diasCorrida
    ? diasCorrida.length
    : 0;

  const { data: inscricoes, error } =
    await supabaseClient
      .from("inscricoes")
      .select(`
        id,
        status,
        created_at,
          staffs (
            id,
            nome_completo,
            cpf,
            rg,
            cidade,
            telefone,
            email,
            chave_pix,
            foto_url
          )
      `)
      .eq("corrida_id", corridaIdNumerico)
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error(
      "Erro ao buscar inscritos:",
      error
    );

    areaInscritos.innerHTML =
      `<p>Não foi possível carregar os inscritos.</p>`;

    return;
  }

  if (!inscricoes || inscricoes.length === 0) {
    areaInscritos.innerHTML =
      `<p>Nenhum inscrito nesta corrida.</p>`;

    return;
  }

  const inscricaoIds = inscricoes.map(
    inscricao => inscricao.id
  );

  const {
    data: disponibilidades,
    error: erroDisponibilidades
  } = await supabaseClient
    .from("inscricao_disponibilidades")
    .select(`
      inscricao_id,
      disponivel,
      corrida_dias (
        id,
        nome,
        data_dia,
        tipo
      )
    `)
    .in("inscricao_id", inscricaoIds);

  if (erroDisponibilidades) {
    console.error(
      "Erro ao buscar disponibilidades:",
      erroDisponibilidades
    );
  }

  const disponibilidadesPorInscricao = {};

  if (disponibilidades) {

    disponibilidades.forEach(item => {

      if (item.disponivel === false || !item.corrida_dias) {
        return;
      }

      if (!disponibilidadesPorInscricao[item.inscricao_id]) {
        disponibilidadesPorInscricao[item.inscricao_id] = [];
      }

      disponibilidadesPorInscricao[item.inscricao_id]
        .push(item.corrida_dias);
    });
  }

  const inscricoesComPrioridade = inscricoes.map(inscricao => {

    const diasDisponiveis = removerDiasDuplicados(
      disponibilidadesPorInscricao[inscricao.id] || []
    );

    const prioridade = calcularPrioridadeInscricao(
      diasDisponiveis.length,
      totalDiasCorrida
    );

    return {
      ...inscricao,
      statusNormalizado: normalizarStatusInscricao(inscricao.status),
      diasDisponiveis,
      quantidadeDiasDisponiveis: diasDisponiveis.length,
      prioridade
    };
  });

  inscricoesComPrioridade.sort((a, b) => {
    if (
      b.quantidadeDiasDisponiveis !==
      a.quantidadeDiasDisponiveis
    ) {
      return b.quantidadeDiasDisponiveis -
        a.quantidadeDiasDisponiveis;
    }

    return new Date(a.created_at) -
      new Date(b.created_at);
  });

  let vagasPreSelecionadas = 0;

  inscricoesComPrioridade.forEach(inscricao => {
    const status = inscricao.statusNormalizado;
    const prioridadeAlta =
      totalDiasCorrida > 0 &&
      inscricao.quantidadeDiasDisponiveis >= totalDiasCorrida;

    const jaConfirmado = status === "confirmado";
    const podePreSelecionar =
      status !== "cancelado" &&
      status !== "lista_espera" &&
      (jaConfirmado || prioridadeAlta);

    if (podePreSelecionar && (!totalVagasCorrida || vagasPreSelecionadas < totalVagasCorrida)) {
      inscricao.preSelecionado = true;
      vagasPreSelecionadas += 1;
    } else {
      inscricao.preSelecionado = false;
    }
  });

  const resumo = gerarResumoInscricoes(inscricoesComPrioridade, totalVagasCorrida);

  areaInscritos.innerHTML = `
    <div class="admin-inscritos-painel" data-corrida-id="${corridaIdNumerico}">

      <div class="admin-inscritos-resumo">
        <div>
          <strong>${resumo.total}</strong>
          <span>inscritos</span>
        </div>
        <div>
          <strong>${resumo.confirmados}</strong>
          <span>confirmados</span>
        </div>
        <div>
          <strong>${resumo.pendentes}</strong>
          <span>pendentes</span>
        </div>
        <div>
          <strong>${resumo.listaEspera}</strong>
          <span>lista de espera</span>
        </div>
        <div>
          <strong>${totalVagasCorrida ? `${resumo.confirmados}/${totalVagasCorrida}` : resumo.confirmados}</strong>
          <span>vagas</span>
        </div>
      </div>

      <div class="admin-inscritos-acoes-massa">
        <button type="button" class="botao-admin-batch botao-selecionar-filtrados">
          Selecionar filtrados
        </button>
        <button type="button" class="botao-admin-batch botao-desselecionar-todos">
          Desselecionar todos
        </button>
        <button type="button" class="botao-admin-batch botao-confirmar-selecionados">
          Confirmar selecionados
        </button>
        <button type="button" class="botao-admin-batch botao-confirmar-reservar">
          Confirmar selecionados e colocar restantes em lista de espera
        </button>
      </div>

      <div class="admin-inscritos-filtros">
        <input
          type="search"
          class="admin-busca-inscrito"
          placeholder="Buscar por nome..."
        >
        <div class="admin-filtros-status">
          <button type="button" class="admin-filtro-inscrito ativo" data-filtro="todos">Todos</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="pendente">Pendentes</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="confirmado">Confirmados</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="lista_espera">Lista de espera</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="prioridade-alta">Prioridade alta</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="prioridade-media">Prioridade média</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="prioridade-baixa">Prioridade baixa</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="somente-kit">Somente entrega de kit</button>
          <button type="button" class="admin-filtro-inscrito" data-filtro="somente-corrida">Somente dia da corrida</button>
        </div>
      </div>

      <div class="admin-contador-selecao">
        <span class="admin-selecao-texto">${vagasPreSelecionadas} selecionado(s)</span>
        ${totalVagasCorrida ? `<span>Limite: ${totalVagasCorrida} vaga(s)</span>` : ""}
      </div>

      <div class="admin-lista-compacta-inscritos">
        ${inscricoesComPrioridade.map(inscricao => gerarLinhaInscritoAdmin(
          inscricao,
          corridaIdNumerico,
          totalDiasCorrida
        )).join("")}
      </div>
    </div>
  `;

  ativarControlesInscritosAdmin(areaInscritos, corridaIdNumerico, totalVagasCorrida);
}

function gerarLinhaInscritoAdmin(inscricao, corridaId, totalDiasCorrida) {
  const staff = inscricao.staffs || {};
  const diasDisponiveis = inscricao.diasDisponiveis || [];
  const status = inscricao.statusNormalizado;
  const textoQuantidadeDias = formatarQuantidadeDiasDisponiveis(
    inscricao.quantidadeDiasDisponiveis,
    totalDiasCorrida
  );
  const nomeBusca = String(staff.nome_completo || "").toLowerCase();
  const possuiEntregaKit = diasDisponiveis.some(dia => ehTipoEntregaKit(dia.tipo || dia.nome));
  const possuiDiaCorrida = diasDisponiveis.some(dia => ehTipoDiaCorrida(dia.tipo || dia.nome));
  const tipoDisponibilidadeFiltro =
    possuiEntregaKit && !possuiDiaCorrida
      ? "somente-kit"
      : possuiDiaCorrida && !possuiEntregaKit
        ? "somente-corrida"
        : possuiEntregaKit && possuiDiaCorrida
          ? "kit-e-corrida"
          : "sem-tipo";
  const fotoUrl = staff.foto_url || "";

  return `
    <article
      class="linha-inscrito-admin"
      data-inscricao-id="${inscricao.id}"
      data-corrida-id="${corridaId}"
      data-status="${status}"
      data-prioridade="${inscricao.prioridade.classe}"
      data-tipo-disponibilidade="${tipoDisponibilidadeFiltro}"
      data-nome="${escapeHtml(nomeBusca)}"
    >
      <div class="linha-inscrito-principal">
        <label class="linha-inscrito-check" title="Selecionar para ação em lote">
          <input
            type="checkbox"
            class="checkbox-inscrito-batch"
            data-inscricao-id="${inscricao.id}"
            ${inscricao.preSelecionado ? "checked" : ""}
            ${status === "cancelado" ? "disabled" : ""}
          >
          <span></span>
        </label>

        <button type="button" class="botao-expandir-inscrito" aria-label="Ver detalhes">
          ▸
        </button>

        <div class="linha-inscrito-nome">
          <div class="linha-inscrito-nome-topo">
            <strong>${escapeHtml(staff.nome_completo || "Nome não informado")}</strong>

            <div class="linha-inscrito-icones" aria-label="Tipos de disponibilidade">
              <span class="icone-tipo-dia ${possuiEntregaKit ? "ativo" : "inativo"}" title="Entrega de kit">📦</span>
              <span class="icone-tipo-dia ${possuiDiaCorrida ? "ativo" : "inativo"}" title="Dia da corrida">🏁</span>
            </div>
          </div>

          <small>${textoQuantidadeDias}</small>
        </div>

        <span class="admin-status-inscricao ${status}">
          ${formatarStatusInscricao(status)}
        </span>
      </div>

      <div class="linha-inscrito-detalhes hidden">
        <div class="detalhes-inscrito-header">
          <div class="foto-inscrito-admin">
            ${fotoUrl
              ? `<img src="${escapeHtml(fotoUrl)}" alt="Foto de ${escapeHtml(staff.nome_completo || "staff")}">`
              : `<div class="foto-inscrito-placeholder">Sem foto</div>`
            }
          </div>

          <div class="detalhes-inscrito-info-principal">
            <strong>${escapeHtml(staff.nome_completo || "Nome não informado")}</strong>
            <span class="admin-badge-prioridade ${inscricao.prioridade.classe}">
              ${inscricao.prioridade.texto}
            </span>
          </div>

          <div class="linha-inscrito-acoes">
            <button
              type="button"
              class="botao-confirmar-inscrito"
              data-inscricao-id="${inscricao.id}"
              data-corrida-id="${corridaId}"
              ${status === "confirmado" ? "disabled" : ""}
            >
              Confirmar
            </button>

            <button
              type="button"
              class="botao-lista-espera-inscrito"
              data-inscricao-id="${inscricao.id}"
              data-corrida-id="${corridaId}"
              ${status === "lista_espera" ? "disabled" : ""}
            >
              Lista de espera
            </button>

            <button
              type="button"
              class="botao-cancelar-inscrito"
              data-inscricao-id="${inscricao.id}"
              data-corrida-id="${corridaId}"
              ${status === "cancelado" ? "disabled" : ""}
            >
              Cancelar
            </button>
          </div>
        </div>

        <div class="detalhes-inscrito-grid">
          <p><strong>Cidade:</strong> ${escapeHtml(staff.cidade || "Não informada")}</p>
          <p><strong>Telefone:</strong> ${escapeHtml(staff.telefone || "Não informado")}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(staff.email || "Não informado")}</p>
          <p><strong>CPF:</strong> ${escapeHtml(staff.cpf || "Não informado")}</p>
          <p><strong>RG:</strong> ${escapeHtml(staff.rg || "Não informado")}</p>
          <p><strong>PIX:</strong> ${escapeHtml(staff.chave_pix || "Não informado")}</p>
        </div>

        <div class="admin-tags-disponibilidade">
          ${diasDisponiveis.map(dia => `
            <span class="admin-tag-disponibilidade">
              ${escapeHtml(dia.nome || formatarData(dia.data_dia))}
            </span>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function ativarControlesInscritosAdmin(areaInscritos, corridaId, totalVagasCorrida) {
  ativarBotoesStatusInscricao(areaInscritos);
  atualizarContadorSelecao(areaInscritos, totalVagasCorrida);

  const busca = areaInscritos.querySelector(".admin-busca-inscrito");
  const filtros = areaInscritos.querySelectorAll(".admin-filtro-inscrito");
  const checkboxes = areaInscritos.querySelectorAll(".checkbox-inscrito-batch");
  const botoesExpandir = areaInscritos.querySelectorAll(".botao-expandir-inscrito");

  if (busca) {
    busca.addEventListener("input", () => filtrarInscritosAdmin(areaInscritos));
  }

  filtros.forEach(botao => {
    botao.addEventListener("click", () => {
      filtros.forEach(item => item.classList.remove("ativo"));
      botao.classList.add("ativo");
      filtrarInscritosAdmin(areaInscritos);
    });
  });

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked && totalVagasCorrida > 0) {
        const selecionados = areaInscritos.querySelectorAll(
          ".checkbox-inscrito-batch:checked"
        ).length;

        if (selecionados > totalVagasCorrida) {
          checkbox.checked = false;
          alert(`Limite de ${totalVagasCorrida} vaga(s) atingido.`);
        }
      }

      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  });

  botoesExpandir.forEach(botao => {
    botao.addEventListener("click", () => {
      const linha = botao.closest(".linha-inscrito-admin");
      const detalhes = linha.querySelector(".linha-inscrito-detalhes");
      detalhes.classList.toggle("hidden");
      botao.textContent = detalhes.classList.contains("hidden") ? "▸" : "▾";
    });
  });

  const botaoSelecionarFiltrados = areaInscritos.querySelector(".botao-selecionar-filtrados");
  if (botaoSelecionarFiltrados) {
    botaoSelecionarFiltrados.addEventListener("click", () => {
      let selecionados = areaInscritos.querySelectorAll(
        ".checkbox-inscrito-batch:checked"
      ).length;

      areaInscritos.querySelectorAll(".linha-inscrito-admin:not(.hidden)").forEach(linha => {
        const checkbox = linha.querySelector(".checkbox-inscrito-batch");
        if (!checkbox || checkbox.disabled || checkbox.checked) return;

        const status = linha.dataset.status;
        if (status === "cancelado") return;

        if (totalVagasCorrida > 0 && selecionados >= totalVagasCorrida) return;

        checkbox.checked = true;
        selecionados += 1;
      });

      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  }

  const botaoDesselecionarTodos = areaInscritos.querySelector(".botao-desselecionar-todos");
  if (botaoDesselecionarTodos) {
    botaoDesselecionarTodos.addEventListener("click", () => {
      areaInscritos.querySelectorAll(".checkbox-inscrito-batch").forEach(checkbox => {
        if (!checkbox.disabled) checkbox.checked = false;
      });
      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  }

  const botaoConfirmar = areaInscritos.querySelector(".botao-confirmar-selecionados");
  if (botaoConfirmar) {
    botaoConfirmar.addEventListener("click", async () => {
      await confirmarSelecionadosEmLote(areaInscritos, corridaId, false);
    });
  }

  const botaoConfirmarReservar = areaInscritos.querySelector(".botao-confirmar-reservar");
  if (botaoConfirmarReservar) {
    botaoConfirmarReservar.addEventListener("click", async () => {
      await confirmarSelecionadosEmLote(areaInscritos, corridaId, true);
    });
  }
}

function filtrarInscritosAdmin(areaInscritos) {
  const busca = areaInscritos.querySelector(".admin-busca-inscrito");
  const filtroAtivo = areaInscritos.querySelector(".admin-filtro-inscrito.ativo");
  const termo = busca ? busca.value.trim().toLowerCase() : "";
  const filtro = filtroAtivo ? filtroAtivo.dataset.filtro : "todos";

  areaInscritos.querySelectorAll(".linha-inscrito-admin").forEach(linha => {
    const nome = linha.dataset.nome || "";
    const status = linha.dataset.status || "";
    const prioridade = linha.dataset.prioridade || "";
    const tipoDisponibilidade = linha.dataset.tipoDisponibilidade || "";

    const passaBusca = !termo || nome.includes(termo);
    const passaFiltro =
      filtro === "todos" ||
      filtro === status ||
      filtro === prioridade ||
      filtro === tipoDisponibilidade ||
      (filtro === "pendente" && (status === "inscrito" || status === "pendente"));

    linha.classList.toggle("hidden", !(passaBusca && passaFiltro));
  });
}

function atualizarContadorSelecao(areaInscritos, totalVagasCorrida) {
  const texto = areaInscritos.querySelector(".admin-selecao-texto");
  const selecionados = areaInscritos.querySelectorAll(
    ".checkbox-inscrito-batch:checked"
  ).length;

  if (texto) {
    texto.textContent = `${selecionados} selecionado(s)`;
  }
}

async function confirmarSelecionadosEmLote(areaInscritos, corridaId, reservarRestantes) {
  const linhas = Array.from(areaInscritos.querySelectorAll(".linha-inscrito-admin"));
  const idsSelecionados = linhas
    .filter(linha => {
      const checkbox = linha.querySelector(".checkbox-inscrito-batch");
      return checkbox && checkbox.checked && !checkbox.disabled;
    })
    .map(linha => Number(linha.dataset.inscricaoId));

  if (idsSelecionados.length === 0) {
    alert("Selecione pelo menos uma pessoa para confirmar.");
    return;
  }

  const mensagem = reservarRestantes
    ? `Confirmar ${idsSelecionados.length} selecionado(s) e colocar os demais pendentes em lista de espera?`
    : `Confirmar ${idsSelecionados.length} selecionado(s)?`;

  if (!confirm(mensagem)) {
    return;
  }

  const { error: erroConfirmar } = await supabaseClient
    .from("inscricoes")
    .update({ status: "confirmado" })
    .in("id", idsSelecionados);

  if (erroConfirmar) {
    console.error("Erro ao confirmar selecionados:", erroConfirmar);
    alert("Não foi possível confirmar os selecionados.");
    return;
  }

  if (reservarRestantes) {
    const idsReserva = linhas
      .filter(linha => {
        const id = Number(linha.dataset.inscricaoId);
        const status = linha.dataset.status;
        return !idsSelecionados.includes(id) && status !== "confirmado" && status !== "cancelado";
      })
      .map(linha => Number(linha.dataset.inscricaoId));

    if (idsReserva.length > 0) {
      const { error: erroReserva } = await supabaseClient
        .from("inscricoes")
        .update({ status: "lista_espera" })
        .in("id", idsReserva);

      if (erroReserva) {
        console.error("Erro ao colocar em lista de espera:", erroReserva);
        alert("Selecionados confirmados, mas não foi possível colocar os demais em lista de espera. Rode o SQL de ajuste do status no Supabase.");
      }
    }
  }

  await carregarInscritosDaCorrida(corridaId, areaInscritos);
}

// BOTÕES CONFIRMAR / CANCELAR / RESERVA
function ativarBotoesStatusInscricao(contexto) {

  const raiz = contexto || document;

  const botoesConfirmar = raiz.querySelectorAll(
    ".botao-confirmar-inscrito"
  );

  const botoesListaEspera = raiz.querySelectorAll(
    ".botao-lista-espera-inscrito"
  );

  const botoesCancelar = raiz.querySelectorAll(
    ".botao-cancelar-inscrito"
  );

  botoesConfirmar.forEach(botao => {
    botao.addEventListener("click", async function () {
      await atualizarStatusInscricao(
        botao,
        "confirmado"
      );
    });
  });

  botoesListaEspera.forEach(botao => {
    botao.addEventListener("click", async function () {
      await atualizarStatusInscricao(
        botao,
        "lista_espera"
      );
    });
  });

  botoesCancelar.forEach(botao => {
    botao.addEventListener("click", async function () {
      await atualizarStatusInscricao(
        botao,
        "cancelado"
      );
    });
  });
}

// ATUALIZAR STATUS
async function atualizarStatusInscricao(
  botao,
  novoStatus
) {

  const inscricaoId = Number(
    botao.dataset.inscricaoId
  );

  const corridaId = Number(
    botao.dataset.corridaId
  );

  const areaInscritos = document.getElementById(
    `inscritos-corrida-${corridaId}`
  );

  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "Salvando...";

  const { error } = await supabaseClient
    .from("inscricoes")
    .update({ status: novoStatus })
    .eq("id", inscricaoId);

  if (error) {
    console.error(
      "Erro ao atualizar inscrição:",
      error
    );

    alert(
      "Não foi possível atualizar o status. Se for Lista de espera, rode o SQL de ajuste do status no Supabase."
    );

    botao.disabled = false;
    botao.textContent = textoOriginal;

    return;
  }

  await carregarInscritosDaCorrida(
    corridaId,
    areaInscritos
  );
}

function gerarResumoInscricoes(inscricoes, totalVagasCorrida) {
  const resumo = {
    total: inscricoes.length,
    confirmados: 0,
    pendentes: 0,
    listaEspera: 0,
    cancelados: 0
  };

  inscricoes.forEach(inscricao => {
    const status = normalizarStatusInscricao(inscricao.status);

    if (status === "confirmado") resumo.confirmados += 1;
    else if (status === "lista_espera") resumo.listaEspera += 1;
    else if (status === "cancelado") resumo.cancelados += 1;
    else resumo.pendentes += 1;
  });

  return resumo;
}

function normalizarStatusInscricao(status) {
  if (!status) return "pendente";
  if (status === "inscrito") return "pendente";
  if (status === "reserva") return "lista_espera";
  return status;
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function adicionarPeriodoCadastro() {
  if (!novoDiaInicio.value) {
    alert("Informe a data inicial do período.");
    return;
  }

  const dataFinalInformada = novoDiaFim.value || novoDiaInicio.value;
  const inicio = new Date(`${novoDiaInicio.value}T00:00:00`);
  const fim = new Date(`${dataFinalInformada}T00:00:00`);

  if (fim < inicio) {
    alert("A data final do período não pode ser anterior à data inicial.");
    return;
  }

  const tipo = novoDiaTipo.value;
  const ajuda = novoDiaAjuda.value ? Number(novoDiaAjuda.value) : null;
  const horarioInicio = novoDiaHorarioInicio.value || null;
  const horarioFim = novoDiaAteUltimo && novoDiaAteUltimo.checked ? null : (novoDiaHorarioFim.value || null);

  const novosDias = [];
  const dataAtual = new Date(inicio);

  while (dataAtual <= fim) {
    const dataISO = dataAtual.toISOString().slice(0, 10);

    novosDias.push({
      nome: `${tipo} - ${obterDiaSemana(dataISO)}`,
      data_dia: dataISO,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      tipo: tipo,
      valor_ajuda_custo: ajuda
    });

    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  diasCadastroCorrida = [
    ...diasCadastroCorrida,
    ...novosDias
  ].sort((a, b) => a.data_dia.localeCompare(b.data_dia));

  renderizarPreviewDiasCadastro();

  novoDiaInicio.value = "";
  novoDiaFim.value = "";
  novoDiaHorarioFim.value = "";
  if (novoDiaAteUltimo) {
    novoDiaAteUltimo.checked = false;
    novoDiaHorarioFim.disabled = false;
  }
}

function removerDiaCadastro(index) {
  diasCadastroCorrida.splice(index, 1);
  renderizarPreviewDiasCadastro();
}

function renderizarPreviewDiasCadastro() {
  if (!previewDiasCorrida) return;

  if (diasCadastroCorrida.length === 0) {
    previewDiasCorrida.innerHTML = "<p>Nenhum dia adicionado ainda.</p>";
    return;
  }

previewDiasCorrida.innerHTML = diasCadastroCorrida.map((dia, index) => `
  <div class="dia-corrida-card">
    <p><strong>${dia.nome}</strong></p>

    <p>
      <strong>Data:</strong>
      ${formatarData(dia.data_dia)}
    </p>

    <p>
      <strong>Horário:</strong>
      ${formatarHorarioPeriodo(dia.horario_inicio, dia.horario_fim)}
    </p>

    <p>
      <strong>Tipo:</strong>
      ${dia.tipo || "-"}
    </p>

    <p>
      <strong>Ajuda de custo:</strong>
      ${formatarMoeda(dia.valor_ajuda_custo)}
    </p>

    <button
      type="button"
      class="delete-btn"
      onclick="removerDiaCadastro(${index})"
    >
      Remover
    </button>
  </div>
`).join("");
}

// CARREGAR DIAS
async function carregarDiasCorrida(corridaId) {

  const container = document.getElementById(
    `dias-corrida-${corridaId}`
  );

  if (!container) return;

  const { data: dias, error } =
    await supabaseClient
      .from("corrida_dias")
      .select("*")
      .eq("corrida_id", corridaId)
      .order("data_dia", {
        ascending: true
      });

  if (error) {
    console.error(
      "Erro ao carregar dias:",
      error
    );

    container.innerHTML =
      "<p>Erro ao carregar dias da corrida.</p>";

    return;
  }

  if (!dias || dias.length === 0) {
    container.innerHTML =
      "<p>Nenhum dia cadastrado para esta corrida.</p>";

    return;
  }

  container.innerHTML = dias.map(dia => `
    <div class="dia-corrida-card">

      <p><strong>${dia.nome}</strong></p>

      <p>
        <strong>Data:</strong>
        ${formatarData(dia.data_dia)}
      </p>

      <p>
        <strong>Horário:</strong>
        ${formatarHorarioPeriodo(dia.horario_inicio, dia.horario_fim)}
      </p>

      <p>
        <strong>Tipo:</strong>
        ${dia.tipo || "-"}
      </p>

      <p>
        <strong>Ajuda de custo:</strong>
        ${formatarMoeda(dia.valor_ajuda_custo)}
      </p>

      <button
        type="button"
        class="delete-btn"
        onclick="excluirDiaCorrida(${dia.id}, ${corridaId})"
      >
        Excluir dia
      </button>

    </div>
  `).join("");
}

// ADICIONAR DIA
async function adicionarDiaCorrida(corridaId) {

  const dataDia = document
    .getElementById(`dia-data-${corridaId}`)
    .value;

    const tipo = document
  .getElementById(`dia-tipo-${corridaId}`)
  .value;

const nome =
  `${tipo} - ${obterDiaSemana(dataDia)}`;

  const horarioInicio = document
    .getElementById(`dia-inicio-${corridaId}`)
    .value;

  const horarioFim = document
    .getElementById(`dia-fim-${corridaId}`)
    .value;

  const vagas = 0;

  if (!nome || !dataDia) {
    alert(
      "Preencha pelo menos o nome e a data do dia."
    );

    return;
  }

  const { error } = await supabaseClient
    .from("corrida_dias")
    .insert([
      {
        corrida_id: corridaId,
        nome: nome,
        data_dia: dataDia,
        horario_inicio: horarioInicio || null,
        horario_fim: horarioFim || null,
        tipo: tipo || null,
        vagas: vagas || 0
      }
    ]);

  if (error) {
    alert(
      "Erro ao cadastrar dia da corrida."
    );

    console.error(error);

    return;
  }

  document.getElementById(
    `dia-data-${corridaId}`
  ).value = "";

  document.getElementById(
    `dia-inicio-${corridaId}`
  ).value = "";

  document.getElementById(
    `dia-fim-${corridaId}`
  ).value = "";

  document.getElementById(
    `dia-tipo-${corridaId}`
  ).value = "";

  await carregarDiasCorrida(corridaId);

const areaInscritos = document.getElementById(
  `inscritos-corrida-${corridaId}`
);

if (areaInscritos && !areaInscritos.classList.contains("hidden")) {
  await carregarInscritosDaCorrida(corridaId, areaInscritos);
}
}

// EXCLUIR DIA
async function excluirDiaCorrida(
  diaId,
  corridaId
) {

  const confirmar = confirm(
    "Tem certeza que deseja excluir este dia da corrida?"
  );

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("corrida_dias")
    .delete()
    .eq("id", diaId);

  if (error) {
    alert(
      "Erro ao excluir dia da corrida."
    );

    console.error(error);

    return;
  }

  await carregarDiasCorrida(corridaId);
}

// LIMPAR FORM
function prepararNovaCorrida() {
  corridaEmEdicaoId = null;
  limparFormularioCorrida();
  salvarCorridaBtn.textContent = "Salvar corrida";
}

function limparFormularioCorrida() {
  corridaEmEdicaoId = null;
  corridaNome.value = "";
  corridaDataInicio.value = "";
  corridaDataFim.value = "";
  corridaLocal.value = "";
  corridaPrazo.value = "";
  corridaVagas.value = "";
  corridaObservacoes.value = OBSERVACOES_PADRAO;

  novoDiaTipo.value = "Entrega de kit";
  novoDiaAjuda.value = "";
  novoDiaInicio.value = "";
  novoDiaFim.value = "";
  novoDiaHorarioInicio.value = "";
  novoDiaHorarioFim.value = "";
  novoDiaHorarioFim.disabled = false;
  if (novoDiaAteUltimo) novoDiaAteUltimo.checked = false;
  diasCadastroCorrida = [];
  renderizarPreviewDiasCadastro();
  salvarCorridaBtn.textContent = "Salvar corrida";
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

function formatarHorarioPeriodo(inicio, fim) {
  if (!inicio && !fim) return "Não informado";
  if (inicio && fim) return `${formatarHorario(inicio)} até ${formatarHorario(fim)}`;
  if (inicio && !fim) return `${formatarHorario(inicio)} até o último atleta chegar`;
  return `Até ${formatarHorario(fim)}`;
}

function formatarMoeda(valor) {

  if (valor === null || valor === undefined) {
    return "Não informado";
  }

  return Number(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}


function formatarPeriodoCorrida(corrida) {
  const inicio = corrida.data_inicio || corrida.data_corrida;
  const fim = corrida.data_fim || corrida.data_corrida;

  if (!inicio && !fim) return "Não informado";
  if (inicio === fim) return formatarData(fim);

  return `${formatarData(inicio)} até ${formatarData(fim)}`;
}

function formatarTextoComQuebra(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}


function normalizarTextoTipoDia(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function ehTipoEntregaKit(valor) {
  const texto = normalizarTextoTipoDia(valor);
  return texto.includes("kit") || texto.includes("entrega");
}

function ehTipoDiaCorrida(valor) {
  const texto = normalizarTextoTipoDia(valor);
  return texto.includes("corrida") || texto.includes("evento");
}
function formatarStatusInscricao(status) {

  const statusFormatados = {
    inscrito: "Pendente",
    pendente: "Pendente",
    confirmado: "Confirmado",
    lista_espera: "Lista de espera",
    cancelado: "Cancelado"
  };

  return statusFormatados[status] || status;
}

function removerDiasDuplicados(dias) {
  const diasUnicos = [];
  const idsUsados = new Set();

  dias.forEach(dia => {
    if (!dia || idsUsados.has(dia.id)) return;

    idsUsados.add(dia.id);
    diasUnicos.push(dia);
  });

  return diasUnicos;
}

function calcularPrioridadeInscricao(
  quantidadeDiasDisponiveis,
  totalDiasCorrida
) {

  if (totalDiasCorrida <= 0) {
    return {
      texto: "Sem dias cadastrados",
      classe: "prioridade-neutra"
    };
  }

  if (quantidadeDiasDisponiveis >= totalDiasCorrida) {
    return {
      texto: "Prioridade alta",
      classe: "prioridade-alta"
    };
  }

  const percentualDisponibilidade =
    quantidadeDiasDisponiveis / totalDiasCorrida;

  if (percentualDisponibilidade >= 0.5) {
    return {
      texto: "Prioridade média",
      classe: "prioridade-media"
    };
  }

  if (quantidadeDiasDisponiveis > 0) {
    return {
      texto: "Prioridade baixa",
      classe: "prioridade-baixa"
    };
  }

  return {
    texto: "Sem disponibilidade",
    classe: "prioridade-baixa"
  };
}

function formatarQuantidadeDiasDisponiveis(
  quantidadeDiasDisponiveis,
  totalDiasCorrida
) {

  if (totalDiasCorrida <= 0) {
    return `${quantidadeDiasDisponiveis} dia(s)`;
  }

  return `${quantidadeDiasDisponiveis} de ${totalDiasCorrida} dia(s)`;
}

function inserirEstilosPrioridadeAdmin() {
  if (document.getElementById("estilos-prioridade-admin")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "estilos-prioridade-admin";
  style.textContent = `
    .admin-inscrito-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }

    .admin-inscrito-topo h4 {
      margin: 0;
    }

    .admin-badge-prioridade {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .admin-badge-prioridade.prioridade-alta {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }

    .admin-badge-prioridade.prioridade-media {
      background: #fef9c3;
      color: #854d0e;
      border: 1px solid #fde047;
    }

    .admin-badge-prioridade.prioridade-baixa {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .admin-badge-prioridade.prioridade-neutra {
      background: #e5e7eb;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .admin-tag-disponibilidade.sem-disponibilidade {
      opacity: 0.75;
    }
  `;

  document.head.appendChild(style);
}


function obterDiaSemana(dataISO) {

  const diasSemana = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado"
  ];

  const data = new Date(`${dataISO}T00:00:00`);

  return diasSemana[data.getDay()];
}


function ativarBotoesExportarPlanilha() {

  const botoes = document.querySelectorAll(
    ".botao-exportar-planilha"
  );

  botoes.forEach(botao => {

    botao.addEventListener("click", async () => {

      const corridaId = Number(
        botao.dataset.corridaId
      );

      await abrirFluxoExportacao(corridaId);
    });
  });
}

async function abrirFluxoExportacao(corridaId) {
  const formato = prompt(
    "Exportar em qual formato?\n\n1 - Excel (.xlsx)\n2 - PDF (.pdf)",
    "1"
  );

  if (formato === null) return;

  const filtro = prompt(
    "Escolha o filtro de exportação:\n\n1 - Todos em ordem alfabética\n2 - Por prioridade\n3 - Por dia\n4 - Por tipo (Entrega de kit / Dia da corrida)",
    "1"
  );

  if (filtro === null) return;

  const formatoNormalizado = String(formato).trim();
  const filtroNormalizado = String(filtro).trim();

  if (!["1", "2"].includes(formatoNormalizado)) {
    alert("Formato inválido.");
    return;
  }

  if (!["1", "2", "3", "4"].includes(filtroNormalizado)) {
    alert("Filtro inválido.");
    return;
  }

  await exportarInscritosCorrida(corridaId, {
    formato: formatoNormalizado === "2" ? "pdf" : "excel",
    filtro: filtroNormalizado
  });
}

async function buscarDadosExportacao(corridaId) {
  const { data: corrida, error: erroCorrida } =
    await supabaseClient
      .from("corridas")
      .select("*")
      .eq("id", corridaId)
      .single();

  if (erroCorrida || !corrida) {
    throw new Error("Erro ao buscar corrida.");
  }

  const { data: diasCorrida, error: erroDias } = await supabaseClient
    .from("corrida_dias")
    .select("id, nome, data_dia, tipo, horario_inicio, horario_fim")
    .eq("corrida_id", corridaId)
    .order("data_dia", { ascending: true });

  if (erroDias) {
    throw new Error("Erro ao buscar dias da corrida.");
  }

  const { data: inscricoes, error: erroInscricoes } =
    await supabaseClient
      .from("inscricoes")
      .select(`
        id,
        status,
        created_at,
        staffs (
          nome_completo,
          cpf,
          rg,
          telefone,
          cidade,
          chave_pix
        )
      `)
      .eq("corrida_id", corridaId)
      .neq("status", "cancelado");

  if (erroInscricoes) {
    throw new Error("Erro ao buscar inscritos.");
  }

  const inscricaoIds = (inscricoes || []).map(inscricao => inscricao.id);

  let disponibilidades = [];

  if (inscricaoIds.length > 0) {
    const { data, error } = await supabaseClient
      .from("inscricao_disponibilidades")
      .select(`
        inscricao_id,
        disponivel,
        corrida_dias (
          id,
          nome,
          data_dia,
          tipo,
          horario_inicio,
          horario_fim
        )
      `)
      .in("inscricao_id", inscricaoIds);

    if (error) {
      throw new Error("Erro ao buscar disponibilidades.");
    }

    disponibilidades = data || [];
  }

  const disponibilidadesPorInscricao = {};

  disponibilidades.forEach(item => {
    if (item.disponivel === false || !item.corrida_dias) return;

    if (!disponibilidadesPorInscricao[item.inscricao_id]) {
      disponibilidadesPorInscricao[item.inscricao_id] = [];
    }

    disponibilidadesPorInscricao[item.inscricao_id].push(item.corrida_dias);
  });

  const totalDiasCorrida = (diasCorrida || []).length;

  const inscritos = (inscricoes || []).map(inscricao => {
    const diasDisponiveis = removerDiasDuplicados(
      disponibilidadesPorInscricao[inscricao.id] || []
    );

    const prioridade = calcularPrioridadeInscricao(
      diasDisponiveis.length,
      totalDiasCorrida
    );

    return {
      inscricao_id: inscricao.id,
      status: inscricao.status,
      created_at: inscricao.created_at,
      staff: inscricao.staffs || {},
      diasDisponiveis,
      quantidadeDiasDisponiveis: diasDisponiveis.length,
      prioridade
    };
  });

  return {
    corrida,
    diasCorrida: diasCorrida || [],
    inscritos
  };
}

async function exportarInscritosCorrida(corridaId, opcoes) {
  try {
    const dadosExportacao = await buscarDadosExportacao(corridaId);
    const secoes = montarSecoesExportacao(dadosExportacao, opcoes.filtro);

    if (secoes.every(secao => secao.inscritos.length === 0)) {
      alert("Não há inscritos para exportar.");
      return;
    }

    if (opcoes.formato === "pdf") {
      exportarPDFCorrida(dadosExportacao.corrida, secoes, opcoes.filtro);
    } else {
      exportarExcelCorrida(dadosExportacao.corrida, secoes, opcoes.filtro);
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao exportar inscritos.");
  }
}

function ordenarInscritosAlfabetico(inscritos) {
  return [...inscritos].sort((a, b) =>
    (a.staff.nome_completo || "").localeCompare(
      b.staff.nome_completo || "",
      "pt-BR"
    )
  );
}

function ordenarInscritosPrioridade(inscritos) {
  const pesos = {
    "Prioridade alta": 1,
    "Prioridade média": 2,
    "Prioridade baixa": 3,
    "Sem disponibilidade": 4,
    "Sem dias cadastrados": 5
  };

  return [...inscritos].sort((a, b) => {
    const pesoA = pesos[a.prioridade.texto] || 99;
    const pesoB = pesos[b.prioridade.texto] || 99;

    if (pesoA !== pesoB) return pesoA - pesoB;

    if (b.quantidadeDiasDisponiveis !== a.quantidadeDiasDisponiveis) {
      return b.quantidadeDiasDisponiveis - a.quantidadeDiasDisponiveis;
    }

    return (a.staff.nome_completo || "").localeCompare(
      b.staff.nome_completo || "",
      "pt-BR"
    );
  });
}

function montarSecoesExportacao(dadosExportacao, filtro) {
  const inscritos = dadosExportacao.inscritos || [];
  const diasCorrida = dadosExportacao.diasCorrida || [];

  if (filtro === "2") {
    return [{
      titulo: "Inscritos por prioridade",
      inscritos: ordenarInscritosPrioridade(inscritos)
    }];
  }

  if (filtro === "3") {
    return diasCorrida.map(dia => ({
      titulo: `${dia.nome} - ${formatarData(dia.data_dia)}`,
      inscritos: ordenarInscritosAlfabetico(
        inscritos.filter(inscrito =>
          inscrito.diasDisponiveis.some(d => d.id === dia.id)
        )
      )
    }));
  }

  if (filtro === "4") {
    const tipos = [...new Set(diasCorrida.map(dia => dia.tipo || "Sem tipo"))];

    return tipos.map(tipo => ({
      titulo: tipo,
      inscritos: ordenarInscritosAlfabetico(
        inscritos.filter(inscrito =>
          inscrito.diasDisponiveis.some(dia => (dia.tipo || "Sem tipo") === tipo)
        )
      )
    }));
  }

  return [{
    titulo: "Todos os inscritos",
    inscritos: ordenarInscritosAlfabetico(inscritos)
  }];
}

function montarLinhasExportacao(inscritos, incluirPrioridade = false) {
  return inscritos.map(inscrito => {
    const staff = inscrito.staff || {};
    const dias = removerDiasDuplicados(inscrito.diasDisponiveis || [])
      .map(dia => dia.nome)
      .join("; ");

    const linha = {
      Nome: staff.nome_completo || "",
      CPF: staff.cpf || "",
      RG: staff.rg || "",
      "Celular/Whatsapp": staff.telefone || "",
      "Chave PIX": staff.chave_pix || "",
      "Dias disponíveis": dias
    };

    if (incluirPrioridade) {
      linha.Prioridade = inscrito.prioridade.texto;
    }

    linha.Assinatura = "";

    return linha;
  });
}

function nomeArquivoSeguro(nome) {
  return String(nome || "corrida")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "corrida";
}

function exportarExcelCorrida(corrida, secoes, filtro) {
  const workbook = XLSX.utils.book_new();
  const incluirPrioridade = filtro === "2";

  secoes.forEach((secao, index) => {
    const dados = montarLinhasExportacao(secao.inscritos, incluirPrioridade);
    const headers = [
      "Nome",
      "CPF",
      "RG",
      "Celular/Whatsapp",
      "Chave PIX",
      "Dias disponíveis",
      ...(incluirPrioridade ? ["Prioridade"] : []),
      "Assinatura"
    ];
    const worksheet = XLSX.utils.json_to_sheet(dados, {
      header: headers,
      origin: "A4"
    });
    const ultimaColuna = headers.length - 1;

    XLSX.utils.sheet_add_aoa(
      worksheet,
      [[corrida.nome], [secao.titulo]],
      { origin: "A1" }
    );

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColuna } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColuna } }
    ];

    worksheet["!cols"] = headers.map(header => {
      const larguras = {
        Nome: 40,
        CPF: 18,
        RG: 16,
        "Celular/Whatsapp": 22,
        "Chave PIX": 28,
        "Dias disponíveis": 42,
        Assinatura: 24,
        Prioridade: 20
      };

      return { wch: larguras[header] || 20 };
    });

    worksheet["!rows"] = [];

    for (let i = 0; i <= dados.length + 5; i++) {
      worksheet["!rows"].push({ hpx: i === 0 ? 34 : 30 });
    }

    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = worksheet[cellAddress].s || {};
        worksheet[cellAddress].s.alignment = {
          horizontal: R >= 3 ? "center" : "center",
          vertical: "center",
          wrapText: true
        };
        worksheet[cellAddress].s.font = { sz: R === 0 ? 18 : 12, bold: R <= 3 };

        if (R === 3) {
          worksheet[cellAddress].s.fill = { fgColor: { rgb: "2F6B58" } };
          worksheet[cellAddress].s.font = {
            bold: true,
            color: { rgb: "FFFFFF" },
            sz: 12
          };
        }
      }
    }

    worksheet["!autofilter"] = {
      ref: `A4:${XLSX.utils.encode_col(ultimaColuna)}${dados.length + 4}`
    };

    const nomeAba = (secao.titulo || `Lista ${index + 1}`)
      .replace(/[\\/?*\[\]:]/g, " ")
      .slice(0, 31) || `Lista ${index + 1}`;

    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  });

  XLSX.writeFile(workbook, `${nomeArquivoSeguro(corrida.nome)}.xlsx`);
}

function exportarPDFCorrida(corrida, secoes, filtro) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;

  if (!jsPDFConstructor) {
    alert("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
    return;
  }

  const doc = new jsPDFConstructor({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const incluirPrioridade = filtro === "2";
  const headers = incluirPrioridade
    ? ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Prioridade", "Assinatura"]
    : ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Assinatura"];

  const pageWidth = doc.internal.pageSize.getWidth();

  secoes.forEach((secao, index) => {
    if (index > 0) doc.addPage();

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(corrida.nome || "Corrida", pageWidth / 2, 16, { align: "center" });

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(secao.titulo || "Inscritos", pageWidth / 2, 23, { align: "center" });

    const body = secao.inscritos.map(inscrito => {
      const staff = inscrito.staff || {};
      const base = [
        staff.nome_completo || "",
        staff.cpf || "",
        staff.rg || "",
        staff.telefone || "",
        staff.chave_pix || ""
      ];

      if (incluirPrioridade) {
        base.push(inscrito.prioridade.texto || "");
      }

      base.push("");
      return base;
    });

    doc.autoTable({
      head: [headers],
      body,
      startY: 30,
      theme: "grid",
      margin: { left: 8, right: 8 },
      tableWidth: "auto",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        minCellHeight: 8,
        halign: "center",
        valign: "middle",
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: [47, 107, 88],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        valign: "middle"
      },
      columnStyles: {
        0: { cellWidth: 54, halign: "left" },
        1: { cellWidth: 28 },
        2: { cellWidth: 24 },
        3: { cellWidth: 32 },
        4: { cellWidth: 48 },
        5: { cellWidth: incluirPrioridade ? 30 : 52 },
        6: { cellWidth: 44 }
      },
      didDrawPage: function () {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(
          `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageWidth - 12,
          pageHeight - 6,
          { align: "right" }
        );
      }
    });
  });

  doc.save(`${nomeArquivoSeguro(corrida.nome)}.pdf`);
}

// INICIALIZAÇÃO
inserirEstilosPrioridadeAdmin();
carregarCorridasAdmin();

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("staffLogado");
    window.location.href = "index.html";
  });
}