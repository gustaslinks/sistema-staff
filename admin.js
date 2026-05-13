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
const corridaCidade = document.getElementById("corrida-cidade");
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
    cidade: corridaCidade.value.trim() || null,
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
      .select("corrida_id");

  if (erroInscricoes) {
    console.error(
      "Erro ao buscar inscrições:",
      erroInscricoes
    );
  }

  listaCorridasAdmin.innerHTML = corridas.map(corrida => {
    const totalInscritos = inscricoes
      ? inscricoes.filter(
          inscricao => inscricao.corrida_id === corrida.id
        ).length
      : 0;

    return `
      <article class="card-corrida-admin">

        <h3>${corrida.nome}</h3>

        <p><strong>Período:</strong>
          ${formatarPeriodoCorrida(corrida)}
        </p>

        <p><strong>Cidade:</strong>
          ${corrida.cidade || "Não informada"}
        </p>

        <p><strong>Local:</strong><br>
          ${formatarTextoComQuebra(corrida.local || "Não informado")}
        </p>

        <p><strong>Vagas:</strong>
          ${corrida.vagas_total || "Não informadas"}
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
          <h4>Dias cadastrados</h4>
          <div id="dias-corrida-${corrida.id}"></div>
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
  corridaCidade.value = corrida.cidade || "";
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

  const { data: diasCorrida, error: erroDiasCorrida } =
    await supabaseClient
      .from("corrida_dias")
      .select("id")
      .eq("corrida_id", corridaId);

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
      .eq("corrida_id", corridaId)
      .order("created_at", {
        ascending: false
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
        data_dia
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

  areaInscritos.innerHTML = inscricoesComPrioridade.map(inscricao => {

    const staff = inscricao.staffs;

    const diasDisponiveis =
      inscricao.diasDisponiveis || [];

    const textoQuantidadeDias = formatarQuantidadeDiasDisponiveis(
      inscricao.quantidadeDiasDisponiveis,
      totalDiasCorrida
    );

    return `
      <article class="card-inscrito-admin">

        <img
          class="foto-inscrito-admin"
          src="${
            staff.foto_url ||
            "https://placehold.co/80x80?text=Foto"
          }"
          alt="Foto de ${staff.nome_completo}"
        >

        <div class="dados-inscrito-admin">

          <div class="admin-inscrito-topo">

            <h4>${staff.nome_completo}</h4>

            <span class="admin-badge-prioridade ${inscricao.prioridade.classe}">
              ${inscricao.prioridade.texto}
            </span>

          </div>

          <p>
            <strong>Dias disponíveis:</strong>
            ${textoQuantidadeDias}
          </p>

          <p>
            <strong>Cidade:</strong>
            ${staff.cidade || "Não informada"}
          </p>

          <p>
            <strong>Telefone:</strong>
            ${staff.telefone || "Não informado"}
          </p>

          <p>
            <strong>E-mail:</strong>
            ${staff.email || "Não informado"}
          </p>

          <p>
            <strong>Status:</strong>
            ${formatarStatusInscricao(inscricao.status)}
          </p>

          <div class="admin-disponibilidade-staff">

            <p>
              <strong>Disponibilidade:</strong>
            </p>

            <div class="admin-tags-disponibilidade">

              ${diasDisponiveis.length > 0
                ? diasDisponiveis.map(dia => `
                  <span class="admin-tag-disponibilidade">
                    ${dia.nome}
                  </span>
                `).join("")
                : `<span class="admin-tag-disponibilidade sem-disponibilidade">
                    Nenhum dia selecionado
                  </span>`
              }

            </div>

          </div>

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

  const botoesConfirmar =
    document.querySelectorAll(
      ".botao-confirmar-inscrito"
    );

  const botoesCancelar =
    document.querySelectorAll(
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
      "Não foi possível atualizar o status."
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


function adicionarPeriodoCadastro() {
  if (!novoDiaInicio.value || !novoDiaFim.value) {
    alert("Informe a data inicial e final do período.");
    return;
  }

  const inicio = new Date(`${novoDiaInicio.value}T00:00:00`);
  const fim = new Date(`${novoDiaFim.value}T00:00:00`);

  if (fim < inicio) {
    alert("A data final do período não pode ser anterior à data inicial.");
    return;
  }

  const tipo = novoDiaTipo.value;
  const ajuda = novoDiaAjuda.value ? Number(novoDiaAjuda.value) : null;
  const horarioInicio = novoDiaHorarioInicio.value || null;
  const horarioFim = novoDiaHorarioFim.value || null;

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
      ${formatarHorario(dia.horario_inicio)}
      até
      ${formatarHorario(dia.horario_fim)}
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
        ${formatarHorario(dia.horario_inicio)}
        até
        ${formatarHorario(dia.horario_fim)}
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
  corridaCidade.value = "";
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

function formatarStatusInscricao(status) {

  const statusFormatados = {
    inscrito: "Inscrito",
    confirmado: "Confirmado",
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

      await exportarPlanilhaCorrida(corridaId);
    });
  });
}

async function exportarPlanilhaCorrida(corridaId) {

  const { data: corrida, error: erroCorrida } =
    await supabaseClient
      .from("corridas")
      .select("*")
      .eq("id", corridaId)
      .single();

  if (erroCorrida || !corrida) {
    alert("Erro ao buscar corrida.");
    return;
  }

  const { data: inscricoes, error } =
    await supabaseClient
      .from("inscricoes")
      .select(`
        status,
        staffs (
          nome_completo,
          cpf,
          rg,
          telefone,
          chave_pix
        )
      `)
      .eq("corrida_id", corridaId)
      .neq("status", "cancelado");

  if (error) {
    console.error(error);

    alert("Erro ao gerar planilha.");

    return;
  }

  const inscritosOrdenados = inscricoes
    .map(item => item.staffs)
    .sort((a, b) =>
      a.nome_completo.localeCompare(
        b.nome_completo,
        "pt-BR"
      )
    );

  const dados = inscritosOrdenados.map(staff => ({
    Nome: staff.nome_completo || "",
    CPF: staff.cpf || "",
    RG: staff.rg || "",
    "Celular/Whatsapp": staff.telefone || "",
    "Chave PIX": staff.chave_pix || "",
    Assinatura: ""
  }));

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet(dados, {
    origin: "A3"
  });

  XLSX.utils.sheet_add_aoa(
    worksheet,
    [[corrida.nome]],
    { origin: "A1" }
  );

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 5 }
    }
  ];

  worksheet["!cols"] = [
    { wch: 40 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 24 }
  ];
  worksheet["!rows"] = [];

for (let i = 0; i <= dados.length + 3; i++) {
  worksheet["!rows"].push({
    hpx: 30
  });
}

  const range = XLSX.utils.decode_range(
    worksheet["!ref"]
  );

  for (let C = range.s.c; C <= range.e.c; ++C) {

    const cellAddress =
      XLSX.utils.encode_cell({
        r: 2,
        c: C
      });

    if (!worksheet[cellAddress]) continue;

worksheet[cellAddress].s = {
  fill: {
    fgColor: { rgb: "2F6B58" }
  },
  font: {
    bold: true,
    color: { rgb: "FFFFFF" }
  },
  alignment: {
    horizontal: "center",
    vertical: "center"
  }
};
  }

worksheet["A1"].s = {
  font: {
    bold: true,
    sz: 18
  },
  alignment: {
    horizontal: "center",
    vertical: "center"
  }
};

  worksheet["!autofilter"] = {
    ref: `A3:F${dados.length + 3}`
  };

const rangeCompleto = XLSX.utils.decode_range(
  worksheet["!ref"]
);

for (
  let R = rangeCompleto.s.r;
  R <= rangeCompleto.e.r;
  ++R
) {

  for (
    let C = rangeCompleto.s.c;
    C <= rangeCompleto.e.c;
    ++C
  ) {

    const cellAddress =
      XLSX.utils.encode_cell({
        r: R,
        c: C
      });

    if (!worksheet[cellAddress]) continue;

    if (!worksheet[cellAddress].s) {
      worksheet[cellAddress].s = {};
    }

    if (R >= 3) {
      worksheet[cellAddress].s.font = {
        sz: 12
      };
    }

    worksheet[cellAddress].s.alignment = {
      vertical: "center"
    };
  }
}

for (
  let R = rangeCompleto.s.r;
  R <= rangeCompleto.e.r;
  ++R
) {

  for (
    let C = rangeCompleto.s.c;
    C <= rangeCompleto.e.c;
    ++C
  ) {

    const cellAddress =
      XLSX.utils.encode_cell({
        r: R,
        c: C
      });

    if (!worksheet[cellAddress]) continue;

    if (!worksheet[cellAddress].s) {
      worksheet[cellAddress].s = {};
    }

worksheet[cellAddress].s.alignment = {
  vertical: "center"
};

worksheet[cellAddress].s.font = {
  sz: 12
};
  }
}

worksheet["A1"].s = {
  font: {
    bold: true,
    sz: 18
  },
  alignment: {
    horizontal: "center",
    vertical: "center"
  }
};

for (let C = 0; C <= 5; ++C) {

  const cellAddress =
    XLSX.utils.encode_cell({
      r: 2,
      c: C
    });

  if (!worksheet[cellAddress]) continue;

  worksheet[cellAddress].s = {
    fill: {
      fgColor: { rgb: "2F6B58" }
    },
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
      sz: 12
    },
    alignment: {
      horizontal: "center",
      vertical: "center"
    }
  };
}

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Inscritos"
  );

  XLSX.writeFile(
    workbook,
    `${corrida.nome}.xlsx`
  );
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