const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const listaCorridas = document.getElementById("lista-corridas");

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

        <button class="botao-inscricao" data-corrida-id="${corrida.id}">
          Quero me inscrever
        </button>
      </article>
    `;
  }).join("");
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

carregarCorridas();
