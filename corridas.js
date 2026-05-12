const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const listaCorridas = document.getElementById("lista-corridas");

const staffLogado = JSON.parse(localStorage.getItem("staffLogado"));

if (!staffLogado || !staffLogado.id) {
  window.location.href = "login.html";
}

async function carregarCorridas() {
  const { data: corridas, error } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("status", "aberta")
    .order("data_corrida", { ascending: true });

  if (error) {
    console.error("Erro ao buscar corridas:", error);
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
    console.error("Erro ao buscar inscrições:", erroInscricoes);
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
        <p><strong>Horário:</strong> ${corrida.horario || "Não informado"}</p>
        <p><strong>Local:</strong> ${corrida.local || "Não informado"}</p>
        <p><strong>Cidade:</strong> ${corrida.cidade || "Não informada"}</p>
        <p><strong>Distância:</strong> ${corrida.distancia || "Não informada"}</p>
        <p><strong>Ajuda de custo:</strong> ${valorFormatado}</p>
        <p><strong>Prazo de inscrição:</strong> ${prazoFormatado}</p>

        ${
          jaInscrito
            ? `<button disabled>Inscrição realizada</button>`
            : `<button class="botao-inscricao" data-corrida-id="${corrida.id}">
                Quero me inscrever
              </button>`
        }
      </article>
    `;
  }).join("");

  adicionarEventosInscricao();
}

function adicionarEventosInscricao() {
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
    });
  });
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

carregarCorridas();
