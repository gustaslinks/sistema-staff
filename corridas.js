const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);


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
  localStorage.setItem(MANUAL_LOGOUT_KEY, String(Date.now()));
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
async function validarSessaoSupabaseObrigatoria() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data && data.user ? data.user : null;
  if (!user) {
    localStorage.removeItem("staffLogado");
    window.location.replace("index.html");
    throw new Error("Sessão expirada.");
  }
  const staffCache = (() => {
    try { return JSON.parse(localStorage.getItem("staffLogado") || "null"); } catch (e) { return null; }
  })();
  if (staffCache && staffCache.auth_user_id && staffCache.auth_user_id !== user.id) {
    await sairDoSistemaSeguro();
    window.location.replace("index.html");
    throw new Error("Sessão inválida.");
  }
}
validarSessaoSupabaseObrigatoria().catch(console.warn);

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
const labelCardStaff = document.querySelector("#card-staff .label-card");

// STAFF LOGADO
const staffLogado = JSON.parse(localStorage.getItem("staffLogado"));

// BLOQUEIA ACESSO SEM LOGIN
if (!staffLogado || !staffLogado.id) {
  window.location.replace("index.html");
}

// =========================================================
// CARD DO STAFF
// =========================================================

function carregarCardStaff() {
  const adminLogado = staffLogado.is_admin === true || staffLogado.is_admin === "true";
  if (labelCardStaff) labelCardStaff.textContent = adminLogado ? "Administrador logado" : "Você está logado como";
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
  sairDoSistemaSeguro();
});

if (staffLogado.is_admin === true || staffLogado.is_admin === "true") {
  botaoAdmin.classList.remove("hidden");
}

botaoAdmin.addEventListener("click", function () {
  window.location.href = "admin.html";
});

botaoEditarCadastro.addEventListener("click", function () {
  window.location.href = 'cadastro.html?editar=1';
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

  const { data: corridasRaw, error: erroCorridas } = await supabaseClient
    .from("corridas")
    .select("*")
    .order("data_corrida", { ascending: true });

  const corridas = (corridasRaw || []).filter(corridaEstaVigenteParaStaff);

  if (erroCorridas) {
    console.error("Erro ao buscar corridas:", erroCorridas);

    listaCorridas.innerHTML =
      `<p>Não foi possível carregar as corridas no momento.</p>`;

    return;
  }

  if (!corridas || corridas.length === 0) {
    listaCorridas.innerHTML =
      `<p>Não há corridas disponíveis no momento.</p>`;

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

  // Remove corridas em que o staff já está inscrito.
  // Corridas encerradas continuam visíveis como informação até a data do evento.
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

  const corridasParaExibir = corridasDisponiveis.map(corrida => {
    const vagasTotal = Number(corrida.vagas_total || 0);
    const totalInscritos = inscritosPorCorrida[corrida.id] || 0;

    if (corrida.status === "aberta" && vagasTotal > 0 && totalInscritos >= vagasTotal) {
      return { ...corrida, status: "encerrada" };
    }

    return corrida;
  });

  if (corridasParaExibir.length === 0) {
    listaCorridas.innerHTML =
      `<p>Não há corridas disponíveis no momento.</p>`;

    return;
  }

  listaCorridas.innerHTML = corridasParaExibir.map(corrida => {

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

    const inscricaoAberta = corrida.status === "aberta";

    const htmlDias =
      inscricaoAberta && diasDaCorrida.length > 0
        ? `
        <div class="disponibilidade-corrida">

          <h4>Disponibilidade para trabalho</h4>

          <div class="texto-disponibilidade-info">
            <div class="aviso-icone" aria-hidden="true">★</div>
            <div>
              <strong>Prioridade na seleção</strong>
              <span>Staffs com disponibilidade para <b>TODOS</b> os dias do evento terão prioridade. Informe abaixo os dias em que você pode trabalhar.</span>
            </div>
          </div>

          <div class="texto-disponibilidade-alerta">
            <div class="aviso-icone" aria-hidden="true">!</div>
            <div>
              <strong>Importante</strong>
              <span>O envio da inscrição <b>NÃO garante convocação</b>. A confirmação da escala será realizada posteriormente pela organização via WhatsApp ou e-mail.</span>
            </div>
          </div>

          <label class="checkbox-todos-dias">
            <input type="checkbox" class="disponibilidade-todos" data-corrida-id="${corrida.id}">
            <span>Tenho disponibilidade para todos os dias</span>
          </label>

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
        : inscricaoAberta
          ? `
        <div class="disponibilidade-corrida aviso-disponibilidade">
          <p>
            Dias de trabalho ainda não cadastrados pelo administrador.
          </p>
        </div>
      `
          : `
        <div class="disponibilidade-corrida aviso-disponibilidade aviso-inscricao-encerrada">
          <p>
            Esta corrida permanece visível para consulta, mas as inscrições estão encerradas.
          </p>
        </div>
      `;

    const bannerUrl = obterBannerCorridaUrl(corrida);

    return `
      <article class="card-corrida ${bannerUrl ? "card-corrida-com-banner" : "card-corrida-sem-banner"}">

        ${bannerUrl ? `
          <div class="corrida-banner-wrap">
            <img class="corrida-card-banner" src="${escapeHtml(bannerUrl)}" alt="Banner da corrida ${escapeHtml(corrida.nome || "")}">
          </div>
        ` : ""}

        <div class="corrida-card-head">
          <div>
            <span class="corrida-eyebrow">Corrida disponível</span>
            <h2>${corrida.nome}</h2>
          </div>
          <div class="corrida-status-card ${inscricaoAberta ? "aberta" : "encerrada"}">
            <div>
              <strong>${inscricaoAberta ? "Inscrições abertas" : "Inscrições encerradas"}</strong>
              <span>${inscricaoAberta ? `${textoVagas} vagas preenchidas` : "Inscrições finalizadas. Acompanhe as próximas corridas"}</span>
            </div>
            <span class="status-semaforo-indicador ${inscricaoAberta ? "status-aberto" : "status-fechado"}" aria-hidden="true"></span>
          </div>
        </div>

        <div class="corrida-resumo-grid">
          <div class="corrida-resumo-item"><strong>Período</strong><span>${dataFormatada}</span></div>
          <div class="corrida-resumo-item"><strong>Horário</strong><span>${formatarHorario(corrida.horario)}</span></div>
          <div class="corrida-resumo-item"><strong>Vagas</strong><span>${textoVagas}</span></div>
          <div class="corrida-resumo-item"><strong>Prazo</strong><span>${prazoFormatado}</span></div>
          <div class="corrida-resumo-item corrida-resumo-local"><strong>Local</strong><span>${formatarTextoComQuebra(corrida.local || "Não informado")}</span></div>
        </div>

        ${htmlDias}

        ${inscricaoAberta ? `
        <button
          class="botao-inscricao"
          data-corrida-id="${corrida.id}"
          disabled
        >
          Quero me inscrever
        </button>
        ` : ``}

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
  const checkTodos = document.querySelectorAll(".disponibilidade-todos");

checkTodos.forEach(checkTodosItem => {
  checkTodosItem.addEventListener("change", function () {
    const corridaId = checkTodosItem.dataset.corridaId;
    const dias = document.querySelectorAll(`.disponibilidade-dia[data-corrida-id="${corridaId}"]`);
    dias.forEach(dia => { dia.checked = checkTodosItem.checked; });
    const botao = document.querySelector(`.botao-inscricao[data-corrida-id="${corridaId}"]`);
    if (botao) botao.disabled = !checkTodosItem.checked && document.querySelectorAll(`.disponibilidade-dia[data-corrida-id="${corridaId}"]:checked`).length === 0;
  });
});

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
    const todos = document.querySelector(`.disponibilidade-todos[data-corrida-id="${corridaId}"]`);
    if (todos) {
      const total = document.querySelectorAll(`.disponibilidade-dia[data-corrida-id="${corridaId}"]`).length;
      const marcados = document.querySelectorAll(`.disponibilidade-dia[data-corrida-id="${corridaId}"]:checked`).length;
      todos.checked = total > 0 && total === marcados;
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

  const { data: diasMinhasCorridas, error: erroDiasMinhasCorridas } = await supabaseClient
    .from("corrida_dias")
    .select("id, corrida_id, nome, data_dia, horario_inicio, horario_fim")
    .in("corrida_id", corridaIds);

  if (erroDiasMinhasCorridas) {
    console.error(
      "Erro ao buscar dias das minhas corridas:",
      erroDiasMinhasCorridas
    );
  }

  const {
    data: disponibilidades,
    error: erroDisponibilidades
  } = await supabaseClient
    .from("inscricao_disponibilidades")
    .select("inscricao_id, corrida_dia_id, disponivel")
    .in("inscricao_id", inscricaoIds);

  if (erroDisponibilidades) {
    console.error(
      "Erro ao buscar disponibilidades:",
      erroDisponibilidades
    );
  }

  const corridasPorId = {};
  const diasPorId = {};
  const disponibilidadesPorInscricao = {};

  corridas.forEach(corrida => {
    corridasPorId[corrida.id] = corrida;
  });

  (diasMinhasCorridas || []).forEach(dia => {
    diasPorId[Number(dia.id)] = dia;
  });

  if (disponibilidades) {

    disponibilidades.forEach(item => {

      const dia = diasPorId[Number(item.corrida_dia_id)];

      if (item.disponivel === false || !dia) {
        return;
      }

      if (!disponibilidadesPorInscricao[item.inscricao_id]) {
        disponibilidadesPorInscricao[item.inscricao_id] = [];
      }

      disponibilidadesPorInscricao[item.inscricao_id]
        .push(dia);
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

      const bannerMinhaInscricao = obterBannerCorridaUrl(corrida);
      const inscricaoAbertaMinha = corrida.status === "aberta";

      return `
        <article class="card-minha-inscricao ${bannerMinhaInscricao ? "card-minha-com-banner" : "card-minha-sem-banner"}">

          ${bannerMinhaInscricao ? `<div class="corrida-banner-wrap"><img class="corrida-card-banner minha-inscricao-banner" src="${escapeHtml(bannerMinhaInscricao)}" alt="Banner da corrida ${escapeHtml(corrida.nome || "")}"></div>` : ""}

          <div class="conteudo-minha-inscricao">

            <h3>${corrida.nome}</h3>

            <div class="corrida-status-card minha-inscricao-status ${inscricaoAbertaMinha ? "aberta" : "encerrada"}">
              <div>
                <strong>${inscricaoAbertaMinha ? "Inscrições abertas" : "Inscrições encerradas"}</strong>
                <span>${inscricaoAbertaMinha ? "A corrida ainda está recebendo inscrições" : "Obrigado por participar. Até a próxima corrida"}</span>
              </div>
              <span class="status-semaforo-indicador ${inscricaoAbertaMinha ? "status-aberto" : "status-fechado"}" aria-hidden="true"></span>
            </div>

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

function obterBannerCorridaUrl(corrida) {
  if (!corrida) return "";
  if (corrida.banner_url) return corrida.banner_url;
  if (corrida.banner_path && typeof supabaseClient !== "undefined") {
    const { data } = supabaseClient.storage
      .from("corrida-banners")
      .getPublicUrl(corrida.banner_path);
    return data && data.publicUrl ? data.publicUrl : "";
  }
  return "";
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obterDataFinalCorrida(corrida) {
  return corrida.data_fim || corrida.data_corrida || corrida.data_inicio || null;
}

function normalizarDataLocal(dataISO) {
  if (!dataISO) return null;
  const partes = String(dataISO).slice(0, 10).split("-").map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  return new Date(partes[0], partes[1] - 1, partes[2], 23, 59, 59, 999);
}

function corridaEstaVigenteParaStaff(corrida) {
  const dataFinal = normalizarDataLocal(obterDataFinalCorrida(corrida));
  if (!dataFinal) return true;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return dataFinal >= hoje;
}

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
// v185 - leitura de minhas disponibilidades corrigida usando corrida_dia_id.
