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
          corrida.prazo_inscricao
            ? formatarData(corrida.prazo_inscricao)
            : "Não informado"
        }</p>

        <p><strong>Inscritos:</strong> ${totalInscritos}</p>

        <div class="gerenciar-dias">
          <h4>Dias da corrida</h4>

          <input
            type="text"
            id="dia-nome-${corrida.id}"
            placeholder="Nome. Ex: Entrega de kit - Quinta"
          >

          <input
            type="date"
            id="dia-data-${corrida.id}"
          >

          <input
            type="time"
            id="dia-inicio-${corrida.id}"
          >

          <input
            type="time"
            id="dia-fim-${corrida.id}"
          >

          <input
            type="text"
            id="dia-tipo-${corrida.id}"
            placeholder="Tipo. Ex: Entrega de kit"
          >

          <input
            type="number"
            id="dia-vagas-${corrida.id}"
            placeholder="Vagas"
          >

          <button onclick="adicionarDiaCorrida(${corrida.id})">
            Adicionar dia
          </button>

          <div id="dias-corrida-${corrida.id}"></div>
        </div>

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

  ativarBotoesVerInscritos();
  ativarBotoesStatusCorrida();
}

// VER INSCRITOS
function ativarBotoesVerInscritos() {
  const botoes = document.querySelectorAll(".botao-ver-inscritos");

  botoes.forEach(botao => {
    botao.addEventListener("click", async () => {
      const corridaId = botao.dataset.corridaId;

      const container = document.getElementById(
        `inscritos-corrida-${corridaId}`
      );

      if (!container) return;

      const estaAberto = !container.classList.contains("hidden");

      if (estaAberto) {
        container.classList.add("hidden");
        container.innerHTML = "";
        botao.textContent = "Ver inscritos";
        return;
      }

      container.classList.remove("hidden");
      botao.textContent = "Ocultar inscritos";

      await carregarInscritosDaCorrida(corridaId, container);
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
      const corridaId = Number(botao.dataset.corridaId);

      const statusAtual = botao.dataset.statusAtual;

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

        alert("Não foi possível alterar o status da corrida.");

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

    areaInscritos.innerHTML =
      `<p>Não foi possível carregar os inscritos.</p>`;

    return;
  }

  if (!inscricoes || inscricoes.length === 0) {
    areaInscritos.innerHTML =
      `<p>Nenhum inscrito nesta corrida.</p>`;

    return;
  }

  areaInscritos.innerHTML = inscricoes.map(inscricao => {
    const staff = inscricao.staffs;

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
          <h4>${staff.nome_completo}</h4>

          <p><strong>Cidade:</strong>
            ${staff.cidade || "Não informada"}
          </p>

          <p><strong>Telefone:</strong>
            ${staff.telefone || "Não informado"}
          </p>

          <p><strong>E-mail:</strong>
            ${staff.email || "Não informado"}
          </p>

          <p><strong>Status:</strong>
            ${formatarStatusInscricao(inscricao.status)}
          </p>
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

// DIAS DA CORRIDA
async function carregarDiasCorrida(corridaId) {
  const container = document.getElementById(
    `dias-corrida-${corridaId}`
  );

  if (!container) return;

  const { data: dias, error } = await supabaseClient
    .from("corrida_dias")
    .select("*")
    .eq("corrida_id", corridaId)
    .order("data_dia", { ascending: true });

  if (error) {
    console.error("Erro ao carregar dias:", error);

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

      <p><strong>Data:</strong>
        ${formatarData(dia.data_dia)}
      </p>

      <p><strong>Horário:</strong>
        ${dia.horario_inicio || "-"}
        até
        ${dia.horario_fim || "-"}
      </p>

      <p><strong>Tipo:</strong>
        ${dia.tipo || "-"}
      </p>

      <p><strong>Vagas:</strong>
        ${dia.vagas || 0}
      </p>

      <button
        onclick="excluirDiaCorrida(${dia.id}, ${corridaId})"
      >
        Excluir dia
      </button>

    </div>
  `).join("");
}

// ADICIONAR DIA
async function adicionarDiaCorrida(corridaId) {
  const nome = document
    .getElementById(`dia-nome-${corridaId}`)
    .value
    .trim();

  const dataDia = document
    .getElementById(`dia-data-${corridaId}`)
    .value;

  const horarioInicio = document
    .getElementById(`dia-inicio-${corridaId}`)
    .value;

  const horarioFim = document
    .getElementById(`dia-fim-${corridaId}`)
    .value;

  const tipo = document
    .getElementById(`dia-tipo-${corridaId}`)
    .value
    .trim();

  const vagas = Number(
    document.getElementById(`dia-vagas-${corridaId}`).value
  );

  if (!nome || !dataDia) {
    alert("Preencha pelo menos o nome e a data do dia.");
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
    alert("Erro ao cadastrar dia da corrida.");

    console.error(error);

    return;
  }

  document.getElementById(`dia-nome-${corridaId}`).value = "";
  document.getElementById(`dia-data-${corridaId}`).value = "";
  document.getElementById(`dia-inicio-${corridaId}`).value = "";
  document.getElementById(`dia-fim-${corridaId}`).value = "";
  document.getElementById(`dia-tipo-${corridaId}`).value = "";
  document.getElementById(`dia-vagas-${corridaId}`).value = "";

  await carregarDiasCorrida(corridaId);
}

// EXCLUIR DIA
async function excluirDiaCorrida(diaId, corridaId) {
  const confirmar = confirm(
    "Tem certeza que deseja excluir este dia da corrida?"
  );

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("corrida_dias")
    .delete()
    .eq("id", diaId);

  if (error) {
    alert("Erro ao excluir dia da corrida.");

    console.error(error);

    return;
  }

  await carregarDiasCorrida(corridaId);
}
