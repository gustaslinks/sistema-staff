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
const botaoEditarCadastro = document.getElementById("botao-editar-cadastro");

// STAFF LOGADO
const staffLogado = JSON.parse(localStorage.getItem("staffLogado"));

// BLOQUEIA ACESSO SEM LOGIN
if (!staffLogado || !staffLogado.id) {
  window.location.href = "index.html";
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
  window.location.href = "index.html";
});

if (staffLogado.is_admin === true) {
  botaoAdmin.classList.remove("hidden");
}

botaoAdmin.addEventListener("click", function () {
  window.location.href = "admin.html";
});

botaoEditarCadastro.addEventListener("click", function () {
  window.location.href = "cadastro.html?editar=1";
});

// =========================================================
// CORRIDAS DISPONÍVEIS
// =========================================================

async function encerrarCorridasLotadas(corridas, inscritosPorCorrida) {
  const corridasLotadas = (corridas || []).filter(corrida => {
    const vagasTotal = Number(corrida.vagas_total || 0);
    const totalInscritos = inscritosPorCorrida[corrida.id] || 0;

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
  }
}


async function carregarCorridas() {
  listaCorridas.innerHTML = `<p>Carregando corridas...</p>`;

  const { data: corridas, error: erroCorridas } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("status", "aberta")
    .order("data_corrida", { ascending: true });

  if (erroCorridas) {
    console.error("Erro ao buscar corridas:", erroCorridas);

    listaCorridas.innerHTML =
      `<p>Não foi possível carregar as corridas no momento.</p>`;

    return;
  }

  if (!corridas || corridas.length === 0) {
    listaCorridas.innerHTML =
      `<p>Não há corridas abertas para inscrição.</p>`;

    return;
  }

  const { data: inscricoes, error: erroInscricoes } =
    await supabaseClient
      .from("inscricoes")
      .select("corrida_id")
      .eq("staff_id", staffLogado.id);

  if (erroInscricoes) {
    console.error(
      "Erro ao buscar inscrições do staff:",
      erroInscricoes
    );
  }

  const corridasJaInscritas = inscricoes
    ? inscricoes.map(
        inscricao => inscricao.corrida_id
      )
    : [];

  // REMOVE CORRIDAS JÁ INSCRITAS
  const corridasDisponiveis = corridas.filter(
    corrida => !corridasJaInscritas.includes(corrida.id)
  );

  if (corridasDisponiveis.length === 0) {
    listaCorridas.innerHTML =
      `<p>Você já está inscrito em todas as corridas disponíveis.</p>`;

    return;
  }

  const corridaIds = corridasDisponiveis.map(
    corrida => corrida.id
  );

  const { data: diasCorridas, error: erroDias } =
    await supabaseClient
      .from("corrida_dias")
      .select("*")
      .in("corrida_id", corridaIds)
      .order("data_dia", { ascending: true });

  if (erroDias) {
    console.error(
      "Erro ao buscar dias das corridas:",
      erroDias
    );
  }

  const diasPorCorrida = {};

  if (diasCorridas) {
    diasCorridas.forEach(dia => {

      if (!diasPorCorrida[dia.corrida_id]) {
        diasPorCorrida[dia.corrida_id] = [];
      }

      diasPorCorrida[dia.corrida_id].push(dia);
    });
  }

  const { data: contagemInscricoes, error: erroContagemInscricoes } =
    await supabaseClient
      .from("inscricoes")
      .select("corrida_id, status")
      .in("corrida_id", corridaIds);

  if (erroContagemInscricoes) {
    console.error("Erro ao buscar contagem de inscrições:", erroContagemInscricoes);
  }

  const inscritosPorCorrida = {};

  if (contagemInscricoes) {
    contagemInscricoes.forEach(inscricao => {
      if (inscricao.status === "cancelado" || inscricao.status === "reserva" || inscricao.status === "lista_espera") return;

      inscritosPorCorrida[inscricao.corrida_id] =
        (inscritosPorCorrida[inscricao.corrida_id] || 0) + 1;
    });
  }

  await encerrarCorridasLotadas(corridasDisponiveis, inscritosPorCorrida);

  const corridasComVaga = corridasDisponiveis.filter(corrida => {
    const vagasTotal = Number(corrida.vagas_total || 0);
    const totalInscritos = inscritosPorCorrida[corrida.id] || 0;

    return vagasTotal <= 0 || totalInscritos < vagasTotal;
  });

  if (corridasComVaga.length === 0) {
    listaCorridas.innerHTML =
      `<p>Não há corridas com vagas abertas no momento.</p>`;

    return;
  }

  listaCorridas.innerHTML = corridasComVaga.map(corrida => {

    const dataFormatada =
      formatarPeriodoCorrida(corrida);

    const totalInscritos = inscritosPorCorrida[corrida.id] || 0;
    const vagasTotal = Number(corrida.vagas_total || 0);
    const textoVagas = vagasTotal > 0
      ? `${totalInscritos} de ${vagasTotal}`
      : "Não informado";

    const prazoFormatado =
      corrida.prazo_inscricao
        ? formatarData(corrida.prazo_inscricao)
        : "Não informado";

    const diasDaCorrida =
      diasPorCorrida[corrida.id] || [];

    const htmlDias =
      diasDaCorrida.length > 0
        ? `
        <div class="disponibilidade-corrida">

          <h4>Disponibilidade para trabalho</h4>

          <div class="texto-disponibilidade-info">
            <strong>
              Staffs com disponibilidade para TODOS os dias do evento
              terão prioridade na seleção.
            </strong>

            <span>
              Informe abaixo os dias em que você possui disponibilidade para trabalhar.
            </span>
          </div>

          <div class="texto-disponibilidade-alerta">
            <strong>Importante:</strong>

            O envio da inscrição NÃO garante convocação para a equipe.

            A confirmação da escala será realizada posteriormente
            pela organização via WhatsApp ou e-mail.
          </div>

          <div class="lista-dias-disponibilidade">

            ${diasDaCorrida.map(dia => `
              <label class="checkbox-dia-disponibilidade">

                <input
                  type="checkbox"
                  class="disponibilidade-dia"
                  data-corrida-id="${corrida.id}"
                  data-dia-id="${dia.id}"
                >

                <span>
                  <strong>${dia.nome}</strong>

                  <small>
                    ${formatarData(dia.data_dia)}

                    ${
                      dia.horario_inicio
                        ? ` • ${formatarHorario(dia.horario_inicio)}`
                        : ""
                    }

                    ${
                      dia.horario_inicio && !dia.horario_fim
                        ? " até o último atleta chegar"
                        : dia.horario_fim
                          ? ` às ${formatarHorario(dia.horario_fim)}`
                          : ""
                    }

                    ${
                      dia.valor_ajuda_custo !== null && dia.valor_ajuda_custo !== undefined
                        ? ` • Ajuda de custo: ${formatarMoeda(dia.valor_ajuda_custo)}`
                        : ""
                    }
                  </small>

                </span>

              </label>
            `).join("")}

          </div>

        </div>
      `
        : `
        <div class="disponibilidade-corrida aviso-disponibilidade">
          <p>
            Dias de trabalho ainda não cadastrados pelo administrador.
          </p>
        </div>
      `;

    return `
      <article class="card-corrida">

        <h2>${corrida.nome}</h2>

        <div class="corrida-status-card aberta">
          <strong>Inscrições abertas</strong>
          <span>${textoVagas} vagas preenchidas</span>
        </div>

        <p><strong>Período:</strong>
          ${dataFormatada}
        </p>

        <p><strong>Horário:</strong>
          ${formatarHorario(corrida.horario)}
        </p>

        <p><strong>Local:</strong><br>
          ${formatarTextoComQuebra(corrida.local || "Não informado")}
        </p>

        <p><strong>Vagas:</strong>
          ${textoVagas}
        </p>

        <p><strong>Prazo de inscrição:</strong>
          ${prazoFormatado}
        </p>

        ${htmlDias}

        <button
          class="botao-inscricao"
          data-corrida-id="${corrida.id}"
          disabled
        >
          Quero me inscrever
        </button>

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
  const checkboxes = document.querySelectorAll(".disponibilidade-dia");

checkboxes.forEach(checkbox => {
  checkbox.addEventListener("change", function () {
    const corridaId = checkbox.dataset.corridaId;

    const algumSelecionado = document.querySelectorAll(
      `.disponibilidade-dia[data-corrida-id="${corridaId}"]:checked`
    ).length > 0;

    const botao = document.querySelector(
      `.botao-inscricao[data-corrida-id="${corridaId}"]`
    );

    if (botao) {
      botao.disabled = !algumSelecionado;
    }
  });
});

  botoes.forEach(botao => {
    botao.addEventListener("click", async function () {
      const corridaId = Number(botao.dataset.corridaId);

      const checkboxesSelecionados = document.querySelectorAll(
        `.disponibilidade-dia[data-corrida-id="${corridaId}"]:checked`
      );

      if (checkboxesSelecionados.length === 0) {
        alert("Selecione pelo menos um dia de disponibilidade.");
        return;
      }

      botao.disabled = true;
      botao.textContent = "Inscrevendo...";

      const { data: inscricaoCriada, error } = await supabaseClient
        .from("inscricoes")
        .insert({
          staff_id: staffLogado.id,
          corrida_id: corridaId,
          status: "inscrito"
        })
        .select("id")
        .single();

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

      const disponibilidades = Array.from(checkboxesSelecionados).map(checkbox => {
        return {
          inscricao_id: inscricaoCriada.id,
          corrida_dia_id: Number(checkbox.dataset.diaId),
          disponivel: true
        };
      });

      const { error: erroDisponibilidades } = await supabaseClient
        .from("inscricao_disponibilidades")
        .insert(disponibilidades);

      if (erroDisponibilidades) {
        console.error("Erro ao salvar disponibilidade:", erroDisponibilidades);

        await supabaseClient
          .from("inscricoes")
          .delete()
          .eq("id", inscricaoCriada.id);

        alert("Não foi possível salvar sua disponibilidade. Tente novamente.");

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

  listaMinhasInscricoes.innerHTML =
    `<p>Carregando suas inscrições...</p>`;

  const { data: inscricoes, error: erroInscricoes } =
    await supabaseClient
      .from("inscricoes")
      .select("id, corrida_id, status, created_at")
      .eq("staff_id", staffLogado.id)
      .order("created_at", {
        ascending: false
      });

  if (erroInscricoes) {
    console.error(
      "Erro ao buscar minhas inscrições:",
      erroInscricoes
    );

    listaMinhasInscricoes.innerHTML =
      `<p>Não foi possível carregar suas inscrições no momento.</p>`;

    return;
  }

  if (!inscricoes || inscricoes.length === 0) {
    listaMinhasInscricoes.innerHTML =
      `<p>Você ainda não se inscreveu em nenhuma corrida.</p>`;

    return;
  }

  const corridaIds =
    inscricoes.map(
      inscricao => inscricao.corrida_id
    );

  const inscricaoIds =
    inscricoes.map(
      inscricao => inscricao.id
    );

  const { data: corridas, error: erroCorridas } =
    await supabaseClient
      .from("corridas")
      .select("*")
      .in("id", corridaIds);

  if (erroCorridas) {
    console.error(
      "Erro ao buscar dados das corridas:",
      erroCorridas
    );

    listaMinhasInscricoes.innerHTML =
      `<p>Não foi possível carregar os dados das corridas.</p>`;

    return;
  }

  const {
    data: disponibilidades,
    error: erroDisponibilidades
  } = await supabaseClient
    .from("inscricao_disponibilidades")
    .select(`
      inscricao_id,
      corrida_dias (
        id,
        nome,
        data_dia,
        horario_inicio,
        horario_fim
      )
    `)
    .in("inscricao_id", inscricaoIds);

  if (erroDisponibilidades) {
    console.error(
      "Erro ao buscar disponibilidades:",
      erroDisponibilidades
    );
  }

  const corridasPorId = {};
  const disponibilidadesPorInscricao = {};

  corridas.forEach(corrida => {
    corridasPorId[corrida.id] = corrida;
  });

  if (disponibilidades) {

    disponibilidades.forEach(item => {

      if (!disponibilidadesPorInscricao[item.inscricao_id]) {
        disponibilidadesPorInscricao[item.inscricao_id] = [];
      }

      disponibilidadesPorInscricao[item.inscricao_id]
        .push(item.corrida_dias);
    });
  }

  listaMinhasInscricoes.innerHTML =
    inscricoes.map(inscricao => {

      const corrida =
        corridasPorId[inscricao.corrida_id];

      const diasDisponiveis =
        disponibilidadesPorInscricao[inscricao.id] || [];

      if (!corrida) {
        return "";
      }

      return `
        <article class="card-minha-inscricao">

          <div class="conteudo-minha-inscricao">

            <h3>${corrida.nome}</h3>

            <p>
              <strong>Data:</strong>
              ${formatarPeriodoCorrida(corrida)}
            </p>

            <p>
              <strong>Local:</strong>
              ${formatarTextoComQuebra(corrida.local || "Não informado")}
            </p>

            <div class="minha-disponibilidade">

              <p>
                <strong>Minha disponibilidade:</strong>
              </p>

              <div class="tags-disponibilidade">

                ${diasDisponiveis.map(dia => `
                  <span class="tag-disponibilidade">
                    ${dia.nome}
                  </span>
                `).join("")}

              </div>

            </div>

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
  if (!dataISO) return "Não informado";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarHorario(horario) {
  if (!horario) return "Não informado";

  return horario.slice(0, 5);
}


function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "Não informado";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
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
    inscrito: "Pendente",
    pendente: "Pendente",
    confirmado: "Confirmado",
    reserva: "Lista de espera",
    lista_espera: "Lista de espera",
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