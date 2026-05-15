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
const corridaPatrocinadorTenis = document.getElementById("corrida-patrocinador-tenis");
const corridaBannerInput = document.getElementById("corrida-banner");
const corridaBannerPreview = document.getElementById("corrida-banner-preview");
const removerBannerCorridaBtn = document.getElementById("remover-banner-corrida");
const BANNER_BUCKET = "corrida-banners";
let corridaBannerArquivo = null;
let corridaBannerUrlAtual = null;
let corridaBannerPathAtual = null;
let corridaBannerRemovido = false;

// CAMPOS DOS DIAS NO CADASTRO
const novoDiaTipo = document.getElementById("novo-dia-tipo");
const novoDiaAjuda = document.getElementById("novo-dia-ajuda");
const novoDiaInicio = document.getElementById("novo-dia-inicio");
const novoDiaFim = document.getElementById("novo-dia-fim");
const novoDiaHorarioInicio = document.getElementById("novo-dia-horario-inicio");
const novoDiaHorarioFim = document.getElementById("novo-dia-horario-fim");
const novoDiaAteUltimo = document.getElementById("novo-dia-ate-ultimo");
const adicionarPeriodoBtn = document.getElementById("adicionar-periodo-btn");
const toggleNovoDiaBtn = document.getElementById("toggle-novo-dia-btn");
const novoDiaFormBloco = document.getElementById("novo-dia-form-bloco");
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

if (adicionarPeriodoBtn) {
  adicionarPeriodoBtn.addEventListener("click", function () {
    adicionarPeriodoCadastro();
  });
}

if (toggleNovoDiaBtn && novoDiaFormBloco) {
  toggleNovoDiaBtn.addEventListener("click", function () {
    const fechado = novoDiaFormBloco.classList.contains("hidden");
    novoDiaFormBloco.classList.toggle("hidden", !fechado);
    toggleNovoDiaBtn.textContent = fechado ? "Ocultar cadastro de novo dia" : "+ Cadastrar novo dia";
  });
}

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

if (corridaBannerInput) {
  corridaBannerInput.addEventListener("change", async function () {
    const arquivo = corridaBannerInput.files && corridaBannerInput.files[0] ? corridaBannerInput.files[0] : null;

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione uma imagem válida para o banner.");
      corridaBannerInput.value = "";
      return;
    }

    try {
      atualizarPreviewBannerCorrida(null);
      corridaBannerArquivo = await otimizarBannerCorrida(arquivo);
      corridaBannerRemovido = false;
      const urlPreview = URL.createObjectURL(corridaBannerArquivo);
      const tamanhoMb = (corridaBannerArquivo.size / (1024 * 1024)).toFixed(2).replace(".", ",");
      atualizarPreviewBannerCorrida(urlPreview, `Novo banner otimizado • ${tamanhoMb} MB`);
    } catch (erro) {
      console.error("Erro ao otimizar banner:", erro);
      alert("Não foi possível otimizar o banner. Tente outra imagem em JPG, PNG ou WebP.");
      corridaBannerInput.value = "";
      corridaBannerArquivo = null;
    }
  });
}

if (removerBannerCorridaBtn) {
  removerBannerCorridaBtn.addEventListener("click", function () {
    corridaBannerArquivo = null;
    corridaBannerRemovido = true;
    if (corridaBannerInput) corridaBannerInput.value = "";
    atualizarPreviewBannerCorrida(null);
  });
}



function canvasParaBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao gerar imagem otimizada."));
    }, mimeType, quality);
  });
}

async function carregarImagemParaBanner(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function otimizarBannerCorrida(arquivo) {
  const larguraFinal = 1200;
  const alturaFinal = 675;
  const limiteBytes = 1024 * 1024;
  const img = await carregarImagemParaBanner(arquivo);
  const canvas = document.createElement("canvas");
  canvas.width = larguraFinal;
  canvas.height = alturaFinal;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível no navegador.");

  const escala = Math.max(larguraFinal / img.naturalWidth, alturaFinal / img.naturalHeight);
  const drawWidth = img.naturalWidth * escala;
  const drawHeight = img.naturalHeight * escala;
  const dx = (larguraFinal - drawWidth) / 2;
  const dy = (alturaFinal - drawHeight) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, larguraFinal, alturaFinal);
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

  const qualidades = [0.86, 0.8, 0.74, 0.68, 0.62, 0.56];
  let blobFinal = null;
  for (const qualidade of qualidades) {
    const blob = await canvasParaBlob(canvas, "image/webp", qualidade);
    blobFinal = blob;
    if (blob.size <= limiteBytes) break;
  }

  if (!blobFinal) throw new Error("Falha ao otimizar banner.");
  if (blobFinal.size > limiteBytes) {
    const blobJpg = await canvasParaBlob(canvas, "image/jpeg", 0.72);
    if (blobJpg.size < blobFinal.size) blobFinal = blobJpg;
  }

  const extensao = blobFinal.type === "image/jpeg" ? "jpg" : "webp";
  return new File([blobFinal], `banner-corrida-1200x675.${extensao}`, { type: blobFinal.type || "image/webp" });
}

function atualizarPreviewBannerCorrida(url, legenda = "Banner atual") {
  if (!corridaBannerPreview) return;

  if (!url) {
    corridaBannerPreview.classList.add("hidden");
    corridaBannerPreview.innerHTML = "";
    if (removerBannerCorridaBtn) removerBannerCorridaBtn.classList.add("hidden");
    return;
  }

  corridaBannerPreview.classList.remove("hidden");
  corridaBannerPreview.innerHTML = `
    <img src="${escapeHtml(url)}" alt="Preview do banner da corrida">
    <span>${escapeHtml(legenda)}</span>
  `;

  if (removerBannerCorridaBtn) removerBannerCorridaBtn.classList.remove("hidden");
}

function obterExtensaoArquivoBanner(arquivo) {
  const tipo = String(arquivo && arquivo.type ? arquivo.type : "").toLowerCase();
  if (tipo.includes("webp")) return "webp";
  if (tipo.includes("png")) return "png";
  return "jpg";
}

async function uploadBannerCorrida(corridaId) {
  if (!corridaBannerArquivo) {
    return {
      banner_url: corridaBannerRemovido ? null : corridaBannerUrlAtual,
      banner_path: corridaBannerRemovido ? null : corridaBannerPathAtual
    };
  }

  const extensao = obterExtensaoArquivoBanner(corridaBannerArquivo);
  const caminho = `${corridaId}/banner-${Date.now()}.${extensao}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from(BANNER_BUCKET)
    .upload(caminho, corridaBannerArquivo, {
      cacheControl: "3600",
      upsert: true,
      contentType: corridaBannerArquivo.type || "image/jpeg"
    });

  if (erroUpload) throw erroUpload;

  const { data: publicData } = supabaseClient.storage
    .from(BANNER_BUCKET)
    .getPublicUrl(caminho);

  return {
    banner_url: publicData && publicData.publicUrl ? publicData.publicUrl : null,
    banner_path: caminho
  };
}

async function atualizarBannerCorridaNoBanco(corridaId) {
  const dadosBanner = await uploadBannerCorrida(corridaId);

  const { error } = await supabaseClient
    .from("corridas")
    .update(dadosBanner)
    .eq("id", corridaId);

  if (error) throw error;

  corridaBannerUrlAtual = dadosBanner.banner_url;
  corridaBannerPathAtual = dadosBanner.banner_path;
  corridaBannerArquivo = null;
  corridaBannerRemovido = false;
}

function normalizarDataInput(valor) {
  if (!valor) return null;
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const partesBR = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (partesBR) return `${partesBR[3]}-${partesBR[2]}-${partesBR[1]}`;
  return texto;
}

async function atualizarCorridaComFallback(corridaId, dadosCorrida) {
  const tentar = async (payload) => supabaseClient
    .from("corridas")
    .update(payload)
    .eq("id", corridaId);

  let resultado = await tentar(dadosCorrida);
  if (!resultado.error) return resultado;

  const mensagem = String(resultado.error.message || "").toLowerCase();
  const payloadCompat = { ...dadosCorrida };

  // Compatibilidade para bancos que ainda não receberam alguma coluna nova.
  if (mensagem.includes("possui_patrocinador_tenis") || mensagem.includes("schema cache") || mensagem.includes("column")) {
    delete payloadCompat.possui_patrocinador_tenis;
    delete payloadCompat.possui_patrocinio_tenis;
    resultado = await tentar(payloadCompat);
    if (!resultado.error) return resultado;
  }

  return resultado;
}

function configurarModoFormularioCorrida(modo) {
  const editando = modo === "edicao";

  if (toggleNovoDiaBtn) {
    toggleNovoDiaBtn.classList.toggle("hidden", !editando);
    toggleNovoDiaBtn.textContent = "+ Cadastrar novo dia";
  }

  if (novoDiaFormBloco) {
    novoDiaFormBloco.classList.toggle("hidden", editando);
  }
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
    data_corrida: normalizarDataInput(corridaDataFim.value),
    data_inicio: normalizarDataInput(corridaDataInicio.value),
    data_fim: normalizarDataInput(corridaDataFim.value),
    cidade: null,
    local: corridaLocal.value.trim() || null,
    vagas_total: Number(corridaVagas.value),
    prazo_inscricao: normalizarDataInput(corridaPrazo.value),
    observacoes: corridaObservacoes.value.trim() || OBSERVACOES_PADRAO,
    possui_patrocinio_tenis: corridaPatrocinadorTenis ? corridaPatrocinadorTenis.checked : false
  };

  let corridaId = corridaEmEdicaoId;
  let diasJaSalvos = false;

  if (corridaEmEdicaoId) {
    const { error } = await atualizarCorridaComFallback(corridaEmEdicaoId, dadosCorrida);

    if (error) {
      console.error("Erro ao atualizar corrida:", error);
      alert(`Não foi possível atualizar a corrida. ${error && error.message ? error.message : ""}`);
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Atualizar corrida";
      return;
    }

    try {
      await atualizarBannerCorridaNoBanco(corridaEmEdicaoId);
    } catch (erroBanner) {
      console.error("Erro ao atualizar banner da corrida:", erroBanner);
      alert("A corrida foi atualizada, mas não foi possível salvar o banner. Confira o bucket corrida-banners no Supabase.");
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Atualizar corrida";
      return;
    }

    // Preserva os IDs dos dias já existentes para não quebrar as disponibilidades dos inscritos.
    const { data: diasExistentes, error: erroBuscarDiasExistentes } = await supabaseClient
      .from("corrida_dias")
      .select("id")
      .eq("corrida_id", corridaEmEdicaoId);

    if (erroBuscarDiasExistentes) {
      console.error("Erro ao buscar dias existentes da corrida:", erroBuscarDiasExistentes);
      alert("A corrida foi atualizada, mas não foi possível conferir os dias cadastrados.");
      salvarCorridaBtn.disabled = false;
      salvarCorridaBtn.textContent = "Atualizar corrida";
      return;
    }

    const idsMantidos = diasCadastroCorrida
      .filter(dia => dia.id)
      .map(dia => Number(dia.id));

    const idsParaExcluir = (diasExistentes || [])
      .map(dia => Number(dia.id))
      .filter(id => !idsMantidos.includes(id));

    if (idsParaExcluir.length > 0) {
      const { error: erroExcluirDiasRemovidos } = await supabaseClient
        .from("corrida_dias")
        .delete()
        .in("id", idsParaExcluir);

      if (erroExcluirDiasRemovidos) {
        console.error("Erro ao remover dias excluídos da corrida:", erroExcluirDiasRemovidos);
        alert("A corrida foi atualizada, mas não foi possível remover alguns dias cadastrados.");
        salvarCorridaBtn.disabled = false;
        salvarCorridaBtn.textContent = "Atualizar corrida";
        return;
      }
    }

    for (const dia of diasCadastroCorrida) {
      const dadosDia = {
        corrida_id: corridaId,
        nome: dia.nome,
        data_dia: dia.data_dia,
        horario_inicio: dia.horario_inicio || null,
        horario_fim: dia.horario_fim || null,
        tipo: dia.tipo || null,
        valor_ajuda_custo: dia.valor_ajuda_custo,
        vagas: 0
      };

      if (dia.id) {
        const { error: erroAtualizarDia } = await supabaseClient
          .from("corrida_dias")
          .update(dadosDia)
          .eq("id", dia.id);

        if (erroAtualizarDia) {
          console.error("Erro ao atualizar dia da corrida:", erroAtualizarDia);
          alert("A corrida foi atualizada, mas não foi possível atualizar um dos dias cadastrados.");
          salvarCorridaBtn.disabled = false;
          salvarCorridaBtn.textContent = "Atualizar corrida";
          return;
        }
      } else {
        const { error: erroInserirDia } = await supabaseClient
          .from("corrida_dias")
          .insert(dadosDia);

        if (erroInserirDia) {
          console.error("Erro ao inserir novo dia da corrida:", erroInserirDia);
          alert("A corrida foi atualizada, mas não foi possível inserir um novo dia cadastrado.");
          salvarCorridaBtn.disabled = false;
          salvarCorridaBtn.textContent = "Atualizar corrida";
          return;
        }
      }
    }

    diasJaSalvos = true;
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

    try {
      await atualizarBannerCorridaNoBanco(corridaId);
    } catch (erroBanner) {
      console.error("Erro ao salvar banner da corrida:", erroBanner);
      alert("A corrida foi cadastrada, mas não foi possível salvar o banner. Confira o bucket corrida-banners no Supabase.");
    }
  }

  if (!diasJaSalvos && diasCadastroCorrida.length > 0) {
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

  await carregarCorridasAdmin();
});


function contarInscritosValidos(inscricoes, corridaId) {
  if (!inscricoes) return 0;

  return inscricoes.filter(inscricao => {
    return inscricao.corrida_id === corridaId && inscricao.status !== "cancelado" && inscricao.status !== "lista_espera";
  }).length;
}

function contarInscritosPorStatus(inscricoes, corridaId, statusDesejado) {
  if (!inscricoes) return 0;

  return inscricoes.filter(inscricao => {
    return inscricao.corrida_id === corridaId && normalizarStatusInscricao(inscricao.status) === statusDesejado;
  }).length;
}

function calcularPercentualPreenchimento(valor, vagasTotal) {
  if (!vagasTotal || vagasTotal <= 0) return 0;
  return Math.min(100, Math.round((valor / vagasTotal) * 100));
}

function formatarResumoVagas(valor, vagasTotal, rotulo) {
  if (vagasTotal > 0) return `${valor} de ${vagasTotal} ${rotulo}`;
  return `${valor} ${rotulo}`;
}

function obterClasseProgressoVagas(percentual) {
  if (percentual >= 100) return "completo";
  if (percentual >= 80) return "alto";
  if (percentual >= 50) return "medio";
  return "baixo";
}

function corridaPossuiPatrocinioTenis(corrida) {
  if (!corrida) return false;

  return (
    corrida.possui_patrocinio_tenis === true ||
    corrida.possui_patrocinio_tenis === "true" ||
    corrida.possui_patrocinador_tenis === true ||
    corrida.possui_patrocinador_tenis === "true"
  );
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
    const confirmadosCorrida = contarInscritosPorStatus(inscricoes || [], corrida.id, "confirmado");
    const vagasTotal = Number(corrida.vagas_total || 0);
    const percentualInscritos = calcularPercentualPreenchimento(totalInscritos, vagasTotal);
    const percentualConfirmados = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
    const classeProgressoInscritos = obterClasseProgressoVagas(percentualInscritos);
    const classeProgressoConfirmados = obterClasseProgressoVagas(percentualConfirmados);
    const textoInscritos = formatarResumoVagas(totalInscritos, vagasTotal, "inscrito(s)");
    const textoConfirmados = formatarResumoVagas(confirmadosCorrida, vagasTotal, "confirmado(s)");

    return `
      <article class="card-corrida-admin" data-corrida-id="${corrida.id}">

        ${obterBannerCorridaUrl(corrida) ? `<img class="corrida-card-banner-admin" src="${escapeHtml(obterBannerCorridaUrl(corrida))}" alt="Banner da corrida ${escapeHtml(corrida.nome || "")}">` : ""}

        <h3>${corrida.nome}</h3>
        ${corridaPossuiPatrocinioTenis(corrida) ? `<div class="badge-tenis">👟 Patrocinador de tênis</div>` : ""}

        <div class="corrida-status-card ${corrida.status}">
          <div class="corrida-status-topo-linha">
            <div>
              <strong class="corrida-status-label">${corrida.status === "aberta" ? "Inscrições abertas" : "Inscrições encerradas"}</strong>
              <span class="corrida-vagas-texto corrida-inscritos-texto">Inscritos: ${textoInscritos}</span>
              <span class="corrida-vagas-texto corrida-confirmados-texto">Confirmados: ${textoConfirmados}</span>
            </div>

            <button
              type="button"
              class="botao-alterar-status-corrida botao-status-compacto ${corrida.status === "aberta" ? "acao-encerrar" : "acao-abrir"}"
              data-corrida-id="${corrida.id}"
              data-status-atual="${corrida.status}"
              title="${corrida.status === "aberta" ? "Encerrar inscrições" : "Abrir inscrições"}"
              aria-label="${corrida.status === "aberta" ? "Encerrar inscrições" : "Abrir inscrições"}"
            >
              <span class="status-semaforo-indicador ${corrida.status === "aberta" ? "status-aberto" : "status-fechado"}" aria-hidden="true"></span>
              <span class="status-semaforo-texto">${corrida.status === "aberta" ? "Inscrições abertas" : "Inscrições fechadas"}</span>
            </button>
          </div>

          ${vagasTotal > 0 ? `
            <div class="corrida-progresso-vagas corrida-progresso-inscritos" aria-label="Inscritos em relação às vagas">
              <div class="corrida-progresso-topo">
                <span>Inscritos</span>
                <strong class="corrida-progresso-percentual corrida-progresso-inscritos-percentual">${percentualInscritos}%</strong>
              </div>
              <div class="corrida-progresso-trilho">
                <div class="corrida-progresso-barra corrida-progresso-inscritos-barra ${classeProgressoInscritos}" style="width: ${percentualInscritos}%;"></div>
              </div>
            </div>

            <div class="corrida-progresso-vagas corrida-progresso-confirmados" aria-label="Confirmados em relação às vagas">
              <div class="corrida-progresso-topo">
                <span>Confirmados</span>
                <strong class="corrida-progresso-percentual corrida-progresso-confirmados-percentual">${percentualConfirmados}%</strong>
              </div>
              <div class="corrida-progresso-trilho">
                <div class="corrida-progresso-barra corrida-progresso-confirmados-barra ${classeProgressoConfirmados}" style="width: ${percentualConfirmados}%;"></div>
              </div>
            </div>
          ` : ""}
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
            <span class="btn-ico">📅</span><span>Mostrar dias cadastrados</span>
          </button>

          <div id="dias-corrida-${corrida.id}" class="dias-corrida-container hidden"></div>
        </div>

        <div class="admin-card-footer admin-card-footer-v128">

          <button
            type="button"
            class="botao-editar-corrida botao-admin-secundario"
            data-corrida-id="${corrida.id}"
          >
            <span class="btn-ico">✏️</span><span>Editar corrida</span>
          </button>

          <button
            type="button"
            class="botao-excluir-corrida delete-btn"
            data-corrida-id="${corrida.id}"
            data-total-inscritos="${totalInscritos}"
          >
            <span class="btn-ico">🗑️</span><span>Excluir corrida</span>
          </button>

          <div class="relatorios-admin" data-corrida-id="${corrida.id}" data-formato="pdf">
            <button
              type="button"
              class="botao-admin-secundario botao-relatorios-toggle"
              data-corrida-id="${corrida.id}"
              aria-expanded="false"
            >
              <span class="btn-ico">📄</span><span>Relatórios / Impressão</span>
            </button>

            <div class="relatorios-painel hidden" id="relatorios-painel-${corrida.id}">
              <div class="relatorios-secao">
                <span class="relatorios-label">Formato do arquivo</span>
                <div class="relatorios-formato-toggle" role="group" aria-label="Formato do arquivo">
                  <button type="button" class="relatorio-formato-opcao ativo" data-formato="pdf">📄 PDF</button>
                  <button type="button" class="relatorio-formato-opcao" data-formato="excel">📊 Excel</button>
                </div>
              </div>

              <div class="relatorios-secao">
                <span class="relatorios-label">Listas</span>
                <div class="relatorios-grid">
                  <button type="button" class="relatorio-acao" data-relatorio="lista-geral">Lista geral</button>
                  <button type="button" class="relatorio-acao" data-relatorio="por-tipo">Por tipo/período</button>
                  <button type="button" class="relatorio-acao" data-relatorio="por-dia">Por data</button>
                </div>
              </div>

              <div class="relatorios-secao">
                <span class="relatorios-label">Financeiro</span>
                <div class="relatorios-grid">
                  <button type="button" class="relatorio-acao" data-relatorio="pagamento-pix">Pagamentos Pix</button>
                </div>
              </div>

              ${corridaPossuiPatrocinioTenis(corrida) ? `
                <div class="relatorios-secao relatorios-tenis">
                  <span class="relatorios-label">Tênis</span>
                  <div class="relatorios-grid">
                    <button type="button" class="relatorio-acao" data-relatorio="tabela-numeracao">Tabela de numeração</button>
                    <button type="button" class="relatorio-acao" data-relatorio="resumo-tenis">Resumo de tênis</button>
                  </div>
                </div>
              ` : ""}

              <div class="relatorio-feedback" aria-live="polite"></div>
            </div>
          </div>

          <button
            type="button"
            class="botao-ver-inscritos"
            data-corrida-id="${corrida.id}"
          >
            <span class="btn-ico" aria-hidden="true">👥</span><span>Ver inscritos</span>
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
ativarBotoesRelatoriosAdmin();
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
        botao.innerHTML = `<span class="btn-ico">📅</span><span>Ocultar dias cadastrados</span>`;
      } else {
        container.classList.add("hidden");
        botao.innerHTML = `<span class="btn-ico">📅</span><span>Mostrar dias cadastrados</span>`;
      }
    });
  });
}

// EDITAR CORRIDA
function ativarBotoesEditarCorrida() {
  const botoes = document.querySelectorAll(".botao-editar-corrida");

  botoes.forEach(botao => {
    if (botao.dataset.listenerEditarCorrida === "1") return;
    botao.dataset.listenerEditarCorrida = "1";

    botao.addEventListener("click", async function (evento) {
      evento.preventDefault();
      evento.stopPropagation();

      const corridaId = Number(botao.dataset.corridaId);
      if (!corridaId) {
        alert("Não foi possível identificar a corrida para edição.");
        return;
      }

      botao.disabled = true;
      const htmlOriginal = botao.innerHTML;
      botao.innerHTML = `<span class="btn-ico">⏳</span><span>Carregando...</span>`;

      try {
        await carregarCorridaParaEdicao(corridaId);
      } catch (erro) {
        console.error("Erro inesperado ao abrir edição da corrida:", erro);
        alert("Não foi possível abrir a edição da corrida. Confira o console ou tente recarregar a página.");
      } finally {
        botao.disabled = false;
        botao.innerHTML = htmlOriginal;
      }
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

  let dias = [];
  const { data: diasCarregados, error: erroDias } = await supabaseClient
    .from("corrida_dias")
    .select("*")
    .eq("corrida_id", corridaId)
    .order("data_dia", { ascending: true });

  if (erroDias) {
    console.error("Erro ao carregar dias para edição:", erroDias);
    alert("A corrida foi carregada, mas os dias não puderam ser carregados.");
  } else {
    dias = diasCarregados || [];
  }

  corridaEmEdicaoId = corridaId;
  configurarModoFormularioCorrida("edicao");

  corridaNome.value = corrida.nome || "";
  corridaDataInicio.value = normalizarDataInput(corrida.data_inicio || corrida.data_corrida || "") || "";
  corridaDataFim.value = normalizarDataInput(corrida.data_fim || corrida.data_corrida || "") || "";
  corridaLocal.value = corrida.local || "";
  corridaPrazo.value = normalizarDataInput(corrida.prazo_inscricao || "") || "";
  corridaVagas.value = corrida.vagas_total || "";
  corridaObservacoes.value = corrida.observacoes || OBSERVACOES_PADRAO;
  if (corridaPatrocinadorTenis) corridaPatrocinadorTenis.checked = corridaPossuiPatrocinioTenis(corrida);
  corridaBannerArquivo = null;
  corridaBannerRemovido = false;
  corridaBannerUrlAtual = corrida.banner_url || null;
  corridaBannerPathAtual = corrida.banner_path || null;
  if (corridaBannerInput) corridaBannerInput.value = "";
  atualizarPreviewBannerCorrida(corridaBannerUrlAtual, "Banner atual");

  diasCadastroCorrida = (dias || []).map(dia => ({
    id: dia.id,
    nome: dia.nome,
    data_dia: dia.data_dia,
    horario_inicio: dia.horario_inicio,
    horario_fim: dia.horario_fim,
    tipo: dia.tipo,
    valor_ajuda_custo: dia.valor_ajuda_custo,
    aberto: false
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
        botao.innerHTML = htmlBotaoInscritos(false);
        return;
      }

      container.classList.remove("hidden");
      botao.innerHTML = htmlBotaoInscritos(true);

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
      botao.innerHTML = `<span class="status-semaforo-carregando" aria-hidden="true">↻</span><span class="status-semaforo-texto">Atualizando</span>`;

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
        botao.innerHTML = `<span class="status-semaforo-indicador ${statusAtual === "aberta" ? "status-aberto" : "status-fechado"}" aria-hidden="true"></span><span class="status-semaforo-texto">${statusAtual === "aberta" ? "Inscrições abertas" : "Inscrições fechadas"}</span>`;

        return;
      }

      await carregarCorridasAdmin();
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
    .select("*")
    .eq("id", corridaIdNumerico)
    .single();

  const totalVagasCorrida = corridaAtual && corridaAtual.vagas_total
    ? Number(corridaAtual.vagas_total)
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
        tipo,
        horario_inicio,
        horario_fim,
        valor_ajuda_custo
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
    inscricao.preSelecionado = false;
  });

  const resumo = gerarResumoInscricoes(inscricoesComPrioridade, totalVagasCorrida);

  const vagasLivres = totalVagasCorrida > 0
    ? Math.max(totalVagasCorrida - resumo.confirmados, 0)
    : 0;

  areaInscritos.innerHTML = `
    <div class="admin-inscritos-painel" data-corrida-id="${corridaIdNumerico}">

      <div class="admin-inscritos-resumo admin-inscritos-resumo-compacto admin-inscritos-resumo-v127" data-layout="compacto-v127">
        <div class="resumo-dupla">
          <div class="resumo-card resumo-card-total">
            <strong>${resumo.total}</strong>
            <span>inscritos</span>
          </div>
          <div class="resumo-card resumo-card-vagas">
            <strong>${totalVagasCorrida ? vagasLivres : "—"}</strong>
            <span>vagas livres</span>
          </div>
        </div>

        <div class="resumo-dupla">
          <div class="resumo-card resumo-card-confirmados">
            <strong>${resumo.confirmados}</strong>
            <span>confirmados</span>
          </div>
          <div class="resumo-card resumo-card-pendentes">
            <strong>${resumo.pendentes}</strong>
            <span>pendentes</span>
          </div>
        </div>

        <div class="resumo-dupla">
          <div class="resumo-card resumo-card-espera">
            <strong>${resumo.listaEspera}</strong>
            <span>lista de espera</span>
          </div>
          <div class="resumo-card resumo-card-cancelados">
            <strong>${resumo.cancelados}</strong>
            <span>cancelados</span>
          </div>
        </div>
      </div>

      <div class="admin-inscritos-filtros admin-inscritos-filtros-v127">
        <input
          type="search"
          class="admin-busca-inscrito"
          placeholder="Buscar por nome..."
        >

        <div class="admin-filtros-linha">
          <div class="admin-toggles-tipo" aria-label="Filtrar por tipo de dia">
            <button type="button" class="admin-toggle-tipo ativo" data-tipo="kit">📦 Entrega Kit</button>
            <button type="button" class="admin-toggle-tipo ativo" data-tipo="corrida">🏁 Dia da Corrida</button>
          </div>

          <label class="admin-status-select-wrap">
            <span>Status</span>
            <select class="admin-status-select">
              <option value="todos" selected>Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="confirmado">Confirmados</option>
              <option value="lista_espera">Lista de espera</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </label>
        </div>
      </div>

      <div class="admin-inscritos-contagem-exibidos" aria-live="polite">
        Exibindo 0 de ${inscricoesComPrioridade.length} inscritos
      </div>

      <div class="admin-inscritos-acoes-massa admin-inscritos-acoes-v127">
        <label class="admin-selecionar-exibidos">
          <input type="checkbox" class="checkbox-selecionar-exibidos">
          <span>Selecionar todos os exibidos</span>
        </label>

        <div class="admin-contador-selecao">
          <span class="admin-selecao-texto">0 selecionado(s)</span>
          ${totalVagasCorrida ? `<span>Vagas livres: ${vagasLivres}</span>` : ""}
        </div>

        <button type="button" class="botao-admin-batch botao-confirmar-selecionados">
          Confirmar selecionados
        </button>
      </div>

      <div class="admin-lista-compacta-inscritos">
        ${inscricoesComPrioridade.map(inscricao => gerarLinhaInscritoAdmin(
          inscricao,
          corridaIdNumerico,
          totalDiasCorrida,
          corridaAtual
        )).join("")}
      </div>
    </div>
  `;

  ativarControlesInscritosAdmin(areaInscritos, corridaIdNumerico, totalVagasCorrida);
}

function gerarLinhaInscritoAdmin(inscricao, corridaId, totalDiasCorrida, corridaAtual) {
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
  const mensagemWhatsappConfirmacao = gerarMensagemConfirmacaoWhatsapp({
    staff,
    corrida: corridaAtual || {},
    dias: diasDisponiveis
  });
  const linkWhatsappConfirmacao = criarLinkWhatsapp(staff.telefone, mensagemWhatsappConfirmacao);
  const botaoWhatsappConfirmacao = linkWhatsappConfirmacao
    ? `<a class="botao-whatsapp-inscrito" href="${escapeHtml(linkWhatsappConfirmacao)}" target="_blank" rel="noopener">WhatsApp confirmação</a>`
    : `<button type="button" class="botao-whatsapp-inscrito" disabled>Sem WhatsApp</button>`;

  return `
    <article
      class="linha-inscrito-admin"
      data-inscricao-id="${inscricao.id}"
      data-corrida-id="${corridaId}"
      data-status="${status}"
      data-prioridade="${inscricao.prioridade.classe}"
      data-tipo-disponibilidade="${tipoDisponibilidadeFiltro}"
      data-tem-kit="${possuiEntregaKit ? "1" : "0"}"
      data-tem-corrida="${possuiDiaCorrida ? "1" : "0"}"
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

            ${status === "confirmado" ? botaoWhatsappConfirmacao : ""}
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
  filtrarInscritosAdmin(areaInscritos);
  atualizarContadorSelecao(areaInscritos, totalVagasCorrida);

  const busca = areaInscritos.querySelector(".admin-busca-inscrito");
  const statusSelect = areaInscritos.querySelector(".admin-status-select");
  const togglesTipo = areaInscritos.querySelectorAll(".admin-toggle-tipo");
  const checkboxes = areaInscritos.querySelectorAll(".checkbox-inscrito-batch");
  const botoesExpandir = areaInscritos.querySelectorAll(".botao-expandir-inscrito");
  const checkboxSelecionarExibidos = areaInscritos.querySelector(".checkbox-selecionar-exibidos");

  if (busca) {
    busca.addEventListener("input", () => filtrarInscritosAdmin(areaInscritos));
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", () => {
      limparSelecaoInscritos(areaInscritos);
      filtrarInscritosAdmin(areaInscritos);
      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  }

  togglesTipo.forEach(botao => {
    botao.addEventListener("click", () => {
      botao.classList.toggle("ativo");
      limparSelecaoInscritos(areaInscritos);
      filtrarInscritosAdmin(areaInscritos);
      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  });

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked && totalVagasCorrida > 0) {
        const limite = obterLimiteSelecao(areaInscritos, totalVagasCorrida);
        const selecionados = areaInscritos.querySelectorAll(
          ".checkbox-inscrito-batch:checked"
        ).length;

        if (selecionados > limite) {
          checkbox.checked = false;
          alert(`Limite de ${limite} vaga(s) livre(s) atingido.`);
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

  if (checkboxSelecionarExibidos) {
    checkboxSelecionarExibidos.addEventListener("change", () => {
      if (!checkboxSelecionarExibidos.checked) {
        limparSelecaoInscritos(areaInscritos);
        atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
        return;
      }

      let selecionados = 0;
      const limite = obterLimiteSelecao(areaInscritos, totalVagasCorrida);

      areaInscritos.querySelectorAll(".linha-inscrito-admin:not(.hidden)").forEach(linha => {
        const checkbox = linha.querySelector(".checkbox-inscrito-batch");
        const status = linha.dataset.status;
        if (!checkbox || checkbox.disabled) return;
        if (status === "confirmado" || status === "cancelado") return;
        if (totalVagasCorrida > 0 && selecionados >= limite) return;

        checkbox.checked = true;
        selecionados += 1;
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
}

function limparSelecaoInscritos(areaInscritos) {
  areaInscritos.querySelectorAll(".checkbox-inscrito-batch").forEach(checkbox => {
    if (!checkbox.disabled) checkbox.checked = false;
  });

  const checkboxSelecionarExibidos = areaInscritos.querySelector(".checkbox-selecionar-exibidos");
  if (checkboxSelecionarExibidos) checkboxSelecionarExibidos.checked = false;
}

function obterLimiteSelecao(areaInscritos, totalVagasCorrida) {
  if (!totalVagasCorrida || totalVagasCorrida <= 0) return Infinity;

  const confirmados = areaInscritos.querySelectorAll(
    '.linha-inscrito-admin[data-status="confirmado"]'
  ).length;

  return Math.max(totalVagasCorrida - confirmados, 0);
}

function filtrarInscritosAdmin(areaInscritos) {
  const busca = areaInscritos.querySelector(".admin-busca-inscrito");
  const statusSelect = areaInscritos.querySelector(".admin-status-select");
  const termo = busca ? busca.value.trim().toLowerCase() : "";
  const filtroStatus = statusSelect ? statusSelect.value : "pendente";
  const tipoKitAtivo = !!areaInscritos.querySelector('.admin-toggle-tipo[data-tipo="kit"].ativo');
  const tipoCorridaAtivo = !!areaInscritos.querySelector('.admin-toggle-tipo[data-tipo="corrida"].ativo');

  let totalLinhas = 0;
  let totalExibidos = 0;

  areaInscritos.querySelectorAll(".linha-inscrito-admin").forEach(linha => {
    totalLinhas += 1;
    const nome = linha.dataset.nome || "";
    const status = linha.dataset.status || "";
    const temKit = linha.dataset.temKit === "1";
    const temCorrida = linha.dataset.temCorrida === "1";

    const passaBusca = !termo || nome.includes(termo);
    const passaStatus =
      filtroStatus === "todos" ||
      filtroStatus === status ||
      (filtroStatus === "pendente" && (status === "inscrito" || status === "pendente"));
    const semTipoVinculado = !temKit && !temCorrida;
    const passaTipo =
      (tipoKitAtivo && temKit) ||
      (tipoCorridaAtivo && temCorrida) ||
      (tipoKitAtivo && tipoCorridaAtivo && semTipoVinculado);

    const exibido = passaBusca && passaStatus && passaTipo;
    linha.classList.toggle("hidden", !exibido);
    if (exibido) totalExibidos += 1;
  });

  const contadorExibidos = areaInscritos.querySelector(".admin-inscritos-contagem-exibidos");
  if (contadorExibidos) {
    contadorExibidos.textContent = `Exibindo ${totalExibidos} de ${totalLinhas} inscritos`;
  }
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

async function atualizarResumoCorridaCard(corridaId) {
  const card = document.querySelector(`.card-corrida-admin[data-corrida-id="${corridaId}"]`);
  if (!card) return;

  const { data: corrida, error: erroCorrida } = await supabaseClient
    .from("corridas")
    .select("id, status, vagas_total")
    .eq("id", Number(corridaId))
    .maybeSingle();

  if (erroCorrida || !corrida) {
    console.warn("Não foi possível atualizar resumo da corrida:", erroCorrida);
    return;
  }

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("id, status")
    .eq("corrida_id", Number(corridaId));

  if (erroInscricoes) {
    console.warn("Não foi possível atualizar contadores da corrida:", erroInscricoes);
    return;
  }

  const totalInscritos = (inscricoes || []).filter(inscricao => {
    const status = normalizarStatusInscricao(inscricao.status);
    return status !== "cancelado" && status !== "lista_espera";
  }).length;
  const confirmadosCorrida = (inscricoes || []).filter(inscricao => {
    return normalizarStatusInscricao(inscricao.status) === "confirmado";
  }).length;
  const vagasTotal = Number(corrida.vagas_total || 0);
  const percentualInscritos = calcularPercentualPreenchimento(totalInscritos, vagasTotal);
  const percentualConfirmados = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
  const classeProgressoInscritos = obterClasseProgressoVagas(percentualInscritos);
  const classeProgressoConfirmados = obterClasseProgressoVagas(percentualConfirmados);

  const textoInscritosEl = card.querySelector(".corrida-inscritos-texto");
  if (textoInscritosEl) textoInscritosEl.textContent = `Inscritos: ${formatarResumoVagas(totalInscritos, vagasTotal, "inscrito(s)")}`;

  const textoConfirmadosEl = card.querySelector(".corrida-confirmados-texto");
  if (textoConfirmadosEl) textoConfirmadosEl.textContent = `Confirmados: ${formatarResumoVagas(confirmadosCorrida, vagasTotal, "confirmado(s)")}`;

  const percentualInscritosEl = card.querySelector(".corrida-progresso-inscritos-percentual");
  if (percentualInscritosEl) percentualInscritosEl.textContent = `${percentualInscritos}%`;

  const barraInscritosEl = card.querySelector(".corrida-progresso-inscritos-barra");
  if (barraInscritosEl) {
    barraInscritosEl.style.width = `${percentualInscritos}%`;
    barraInscritosEl.classList.remove("baixo", "medio", "alto", "completo");
    barraInscritosEl.classList.add(classeProgressoInscritos);
  }

  const percentualConfirmadosEl = card.querySelector(".corrida-progresso-confirmados-percentual");
  if (percentualConfirmadosEl) percentualConfirmadosEl.textContent = `${percentualConfirmados}%`;

  const barraConfirmadosEl = card.querySelector(".corrida-progresso-confirmados-barra");
  if (barraConfirmadosEl) {
    barraConfirmadosEl.style.width = `${percentualConfirmados}%`;
    barraConfirmadosEl.classList.remove("baixo", "medio", "alto", "completo");
    barraConfirmadosEl.classList.add(classeProgressoConfirmados);
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

  const posicaoScroll = window.scrollY;
  await carregarInscritosDaCorrida(corridaId, areaInscritos);
  await atualizarResumoCorridaCard(corridaId);
  requestAnimationFrame(() => window.scrollTo({ top: posicaoScroll, left: 0 }));
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

  const posicaoScroll = window.scrollY;

  await carregarInscritosDaCorrida(
    corridaId,
    areaInscritos
  );
  await atualizarResumoCorridaCard(corridaId);

  requestAnimationFrame(() => window.scrollTo({ top: posicaoScroll, left: 0 }));
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

function obterBannerCorridaUrl(corrida) {
  if (!corrida) return "";
  if (corrida.banner_url) return corrida.banner_url;
  if (corrida.banner_path && typeof supabaseClient !== "undefined") {
    const { data } = supabaseClient.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(corrida.banner_path);
    return data && data.publicUrl ? data.publicUrl : "";
  }
  return "";
}

function htmlBotaoInscritos(aberto) {
  return aberto
    ? '<span class="btn-ico" aria-hidden="true">👥</span><span>Ocultar inscritos</span>'
    : '<span class="btn-ico" aria-hidden="true">👥</span><span>Ver inscritos</span>';
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
      valor_ajuda_custo: ajuda,
      aberto: true
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

function atualizarCampoDiaCadastro(index, campo, valor) {
  const dia = diasCadastroCorrida[index];
  if (!dia) return;

  if (campo === "valor_ajuda_custo") {
    dia[campo] = valor === "" ? null : Number(valor);
  } else {
    dia[campo] = valor || null;
  }

  if (campo === "tipo" || campo === "data_dia") {
    const tipo = dia.tipo || "Dia";
    dia.nome = `${tipo} - ${obterDiaSemana(dia.data_dia)}`;
  }
}

function atualizarAteUltimoDiaCadastro(index, marcado) {
  const dia = diasCadastroCorrida[index];
  if (!dia) return;

  if (marcado) {
    dia.horario_fim = null;
  }

  renderizarPreviewDiasCadastro();
}

function formatarDataBR(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return texto;
  return formatarData ? formatarData(texto) : texto;
}

function renderizarPreviewDiasCadastro() {
  if (!previewDiasCorrida) return;

  if (diasCadastroCorrida.length === 0) {
    previewDiasCorrida.innerHTML = "<p>Nenhum dia adicionado ainda.</p>";
    return;
  }

  previewDiasCorrida.innerHTML = diasCadastroCorrida.map((dia, index) => {
    const ateUltimo = !dia.horario_fim;
    const aberto = dia.aberto === true;
    const resumoData = dia.data_dia ? formatarDataBR(dia.data_dia) : "Data não definida";
    const resumoHorario = ateUltimo
      ? `${(dia.horario_inicio || "").slice(0, 5) || "--:--"} até último atleta`
      : `${(dia.horario_inicio || "").slice(0, 5) || "--:--"} às ${(dia.horario_fim || "").slice(0, 5) || "--:--"}`;
    const resumoValor = dia.valor_ajuda_custo !== null && dia.valor_ajuda_custo !== undefined && dia.valor_ajuda_custo !== ""
      ? `R$ ${Number(dia.valor_ajuda_custo).toFixed(2).replace(".", ",")}`
      : "Sem ajuda informada";

    return `
      <div class="dia-corrida-card dia-corrida-card-editavel ${aberto ? "is-open" : "is-collapsed"}">
        <div class="dia-editavel-resumo">
          <button type="button" class="dia-resumo-toggle" onclick="alternarDiaCadastro(${index})" aria-expanded="${aberto ? "true" : "false"}">
            <span class="dia-toggle-ico">${aberto ? "−" : "+"}</span>
            <span class="dia-resumo-texto">
              <strong>${escapeHtml(dia.nome || "Dia da corrida")}</strong>
              <small>${escapeHtml(resumoData)} • ${escapeHtml(resumoHorario)} • ${escapeHtml(resumoValor)}</small>
            </span>
          </button>

          <button type="button" class="delete-btn delete-btn-dia-resumo" onclick="removerDiaCadastro(${index})">
            Remover
          </button>
        </div>

        <div class="dia-editavel-corpo ${aberto ? "" : "hidden"}">
          <div class="dia-editavel-topo">
            <strong>Editar informações do dia</strong>
            ${dia.id ? `<span class="badge-dia-existente">Dia cadastrado</span>` : `<span class="badge-dia-novo">Novo dia</span>`}
          </div>

          <div class="grid grid-dia-editavel">
            <div class="field">
              <label>Tipo do período</label>
              <select onchange="atualizarCampoDiaCadastro(${index}, 'tipo', this.value); renderizarPreviewDiasCadastro();">
                <option value="Entrega de kit" ${dia.tipo === "Entrega de kit" ? "selected" : ""}>Entrega de kit</option>
                <option value="Corrida" ${dia.tipo === "Corrida" ? "selected" : ""}>Dia da corrida</option>
              </select>
            </div>

            <div class="field">
              <label>Data</label>
              <input type="date" value="${dia.data_dia || ""}" onchange="atualizarCampoDiaCadastro(${index}, 'data_dia', this.value); renderizarPreviewDiasCadastro();">
            </div>

            <div class="field">
              <label>Horário início</label>
              <input type="time" value="${(dia.horario_inicio || "").slice(0, 5)}" onchange="atualizarCampoDiaCadastro(${index}, 'horario_inicio', this.value); renderizarPreviewDiasCadastro();">
            </div>

            <div class="field">
              <label>Horário fim</label>
              <input type="time" value="${(dia.horario_fim || "").slice(0, 5)}" ${ateUltimo ? "disabled" : ""} onchange="atualizarCampoDiaCadastro(${index}, 'horario_fim', this.value); renderizarPreviewDiasCadastro();">
            </div>

            <div class="field field-checkbox-admin field-ate-ultimo field-ate-ultimo-inline">
              <label class="checkbox-admin-card checkbox-admin-card-compacto checkbox-admin-inline">
                <input type="checkbox" ${ateUltimo ? "checked" : ""} onchange="atualizarAteUltimoDiaCadastro(${index}, this.checked);">
                <span><strong>Até o último atleta chegar</strong></span>
              </label>
            </div>

            <div class="field">
              <label>Ajuda de custo</label>
              <input type="number" min="0" step="0.01" value="${dia.valor_ajuda_custo ?? ""}" onchange="atualizarCampoDiaCadastro(${index}, 'valor_ajuda_custo', this.value); renderizarPreviewDiasCadastro();">
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function alternarDiaCadastro(index) {
  const dia = diasCadastroCorrida[index];
  if (!dia) return;
  dia.aberto = dia.aberto !== true;
  renderizarPreviewDiasCadastro();
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


    </div>
  `).join("");
}

// Gestão de dias cadastrados
// A edição oficial dos dias agora é feita dentro do formulário "Editar corrida",
// usando os cards editáveis renderizados por renderizarPreviewDiasCadastro().

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



function ativarBotoesGerarPagamentoPix() {
  document.querySelectorAll(".botao-gerar-pagamento-pix").forEach(botao => {
    botao.addEventListener("click", async () => {
      const corridaId = Number(botao.dataset.corridaId);
      await exportarRelatorioPagamentoPix(corridaId);
    });
  });
}

function normalizarTextoPix(valor, limite) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, limite);
}

function formatarCampoPix(id, valor) {
  const texto = String(valor || "");
  const tamanho = String(texto.length).padStart(2, "0");
  return `${id}${tamanho}${texto}`;
}

function crc16Pix(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizarChavePixParaQRCode(staff) {
  const chave = String(staff.chave_pix || "").trim();
  const cpf = String(staff.cpf || "").replace(/\D/g, "");
  const telefone = String(staff.telefone || "").replace(/\D/g, "");
  const email = String(staff.email || "").trim().toLowerCase();

  if (!chave) return "";
  if (chave.replace(/\D/g, "") === cpf && cpf.length === 11) return cpf;
  if (email && chave.trim().toLowerCase() === email) return email;

  const digitosChave = chave.replace(/\D/g, "");
  if (telefone && digitosChave === telefone) {
    return telefone.startsWith("55") ? `+${telefone}` : `+55${telefone}`;
  }

  return chave;
}

function identificarTipoPix(staff) {
  const chave = String(staff.chave_pix || "").trim();
  const cpf = String(staff.cpf || "").replace(/\D/g, "");
  const telefone = String(staff.telefone || "").replace(/\D/g, "");
  const email = String(staff.email || "").trim().toLowerCase();
  const chaveDigitos = chave.replace(/\D/g, "");

  if (cpf && chaveDigitos === cpf) return "CPF";
  if (email && chave.toLowerCase() === email) return "E-mail";
  if (telefone && chaveDigitos === telefone) return "Telefone";
  return "Outra";
}

function gerarPayloadPix({ chave, nome, cidade, valor, txid }) {
  const chavePix = String(chave || "").trim();
  if (!chavePix) return "";

  const valorNumerico = Number(valor || 0);
  const valorFormatado = valorNumerico > 0 ? valorNumerico.toFixed(2) : "";
  const merchantAccount = formatarCampoPix("00", "br.gov.bcb.pix") + formatarCampoPix("01", chavePix);
  const campos = [
    formatarCampoPix("00", "01"),
    formatarCampoPix("26", merchantAccount),
    formatarCampoPix("52", "0000"),
    formatarCampoPix("53", "986")
  ];

  if (valorFormatado) campos.push(formatarCampoPix("54", valorFormatado));

  campos.push(
    formatarCampoPix("58", "BR"),
    formatarCampoPix("59", normalizarTextoPix(nome || "STAFF", 25) || "STAFF"),
    formatarCampoPix("60", normalizarTextoPix(cidade || "SAO PAULO", 15) || "SAO PAULO"),
    formatarCampoPix("62", formatarCampoPix("05", normalizarTextoPix(txid || "STAFF", 25) || "STAFF"))
  );

  const semCRC = campos.join("") + "6304";
  return semCRC + crc16Pix(semCRC);
}

function montarPagamentosPix(dadosExportacao) {
  const confirmados = (dadosExportacao.inscritos || [])
    .filter(inscrito => normalizarStatusInscricao(inscrito.status) === "confirmado")
    .map(inscrito => {
      const staff = inscrito.staff || {};
      const dias = removerDiasDuplicados(inscrito.diasDisponiveis || []);
      const valorTotal = dias.reduce((total, dia) => total + Number(dia.valor_ajuda_custo || 0), 0);
      const chavePixQRCode = normalizarChavePixParaQRCode(staff);
      const txid = `COR${dadosExportacao.corrida.id || ""}STA${inscrito.inscricao_id || ""}`.slice(0, 25);
      const payloadPix = gerarPayloadPix({
        chave: chavePixQRCode,
        nome: staff.nome_completo || "STAFF",
        cidade: staff.cidade || "SAO PAULO",
        valor: valorTotal,
        txid
      });

      const tipoPix = identificarTipoPix(staff);
      const mensagemPagamentoWhatsapp = gerarMensagemPagamentoWhatsapp({
        staff,
        corrida: dadosExportacao.corrida || {},
        dias,
        valorTotal,
        tipoPix,
        chavePix: chavePixQRCode || staff.chave_pix || ""
      });
      const linkWhatsappPagamento = criarLinkWhatsapp(staff.telefone, mensagemPagamentoWhatsapp);

      return {
        inscricao_id: inscrito.inscricao_id,
        staff,
        dias,
        tipoPix,
        chavePixQRCode,
        valorTotal,
        payloadPix,
        linkWhatsappPagamento
      };
    })
    .sort((a, b) => (a.staff.nome_completo || "").localeCompare(b.staff.nome_completo || "", "pt-BR"));

  return confirmados;
}


function normalizarTelefoneWhatsapp(telefone) {
  let numero = String(telefone || "").replace(/\D/g, "");

  if (!numero) return "";

  if (numero.length === 10 || numero.length === 11) {
    numero = `55${numero}`;
  }

  if (!numero.startsWith("55") && numero.length >= 10) {
    numero = `55${numero}`;
  }

  return numero;
}

function criarLinkWhatsapp(telefone, mensagem) {
  const numero = normalizarTelefoneWhatsapp(telefone);
  if (!numero || !mensagem) return "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function formatarPixParaMensagem(staff) {
  const tipoPix = identificarTipoPix(staff);
  const chavePix = staff && staff.chave_pix ? staff.chave_pix : "não informada";
  return `${tipoPix}: ${chavePix}`;
}

function formatarDiaParaMensagem(dia) {
  const nome = dia.nome || dia.tipo || "Dia";
  const data = dia.data_dia ? formatarData(dia.data_dia) : "data não informada";
  const horario = formatarHorarioPeriodo(dia.horario_inicio, dia.horario_fim);
  const ajuda = dia.valor_ajuda_custo !== null && dia.valor_ajuda_custo !== undefined
    ? formatarMoeda(dia.valor_ajuda_custo)
    : "não informada";

  return `• ${nome} — ${data} — ${horario}\n  Ajuda de custo: ${ajuda}`;
}

function gerarMensagemConfirmacaoWhatsapp({ staff, corrida, dias }) {
  const nome = staff && staff.nome_completo ? staff.nome_completo.split(" ")[0] : "tudo bem";
  const diasUnicos = removerDiasDuplicados(dias || []);
  const diasTexto = diasUnicos.length
    ? diasUnicos.map(formatarDiaParaMensagem).join("\n")
    : "• Dias/horários: conferir com a organização.";
  const valorTotal = diasUnicos.reduce((total, dia) => total + Number(dia.valor_ajuda_custo || 0), 0);
  const valorTexto = valorTotal > 0 ? formatarMoeda(valorTotal) : "conforme dias confirmados";
  const observacoes = corrida && corrida.observacoes
    ? String(corrida.observacoes).trim()
    : OBSERVACOES_PADRAO;
  const local = corrida && corrida.local ? corrida.local : "local a confirmar";

  return [
    `Olá, ${nome}! Tudo bem?`,
    "",
    `Sua participação foi CONFIRMADA para: ${corrida.nome || "a corrida"}.`,
    "",
    `📍 Local:\n${local}`,
    "",
    "📅 Dias/horários confirmados:",
    diasTexto,
    "",
    `💰 Ajuda de custo prevista: ${valorTexto}`,
    "",
    `📌 Observações importantes:\n${observacoes}`,
    "",
    `💳 Pagamento: será feito via Pix na chave escolhida no seu cadastro (${formatarPixParaMensagem(staff)}).`,
    "Se essa chave Pix estiver antiga, incorreta ou for de uma conta sem acesso, revise seu cadastro antes do evento ou avise a organização.",
    "",
    "O pagamento normalmente é realizado no dia posterior à corrida.",
    "",
    "Qualquer dúvida, me chama por aqui."
  ].join("\n");
}

function gerarMensagemPagamentoWhatsapp({ staff, corrida, dias, valorTotal, tipoPix, chavePix }) {
  const nome = staff && staff.nome_completo ? staff.nome_completo.split(" ")[0] : "tudo bem";
  const diasUnicos = removerDiasDuplicados(dias || []);
  const diasTexto = diasUnicos.length
    ? diasUnicos.map(formatarDiaParaMensagem).join("\n")
    : "• Dias trabalhados conforme confirmação da organização.";

  return [
    `Olá, ${nome}! Tudo bem?`,
    "",
    `O pagamento referente à ${corrida.nome || "corrida"} foi realizado via Pix.`,
    "",
    `💰 Valor pago: ${formatarMoeda(valorTotal)}`,
    `💳 Chave Pix utilizada: ${tipoPix || "Pix"}: ${chavePix || "não informada"}`,
    "",
    "📅 Referente aos dias:",
    diasTexto,
    "",
    "Obrigado pela participação."
  ].join("\n");
}

function garantirBibliotecaQRCode() {
  if (window.QRCode && window.QRCode.toDataURL) return Promise.resolve();
  return Promise.reject(new Error("Biblioteca de QR Code não carregada. Confira se o arquivo qrcode.min.js está na raiz do projeto."));
}

async function gerarQRCodeDataURLPix(payload) {
  if (!payload) return "";

  await garantirBibliotecaQRCode();

  return await window.QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220
  });
}

async function exportarRelatorioPagamentoPix(corridaId) {
  try {
    const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;

    if (!jsPDFConstructor) {
      alert("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
      return;
    }

    const dadosExportacao = await buscarDadosExportacao(corridaId);
    const pagamentos = montarPagamentosPix(dadosExportacao);

    if (!pagamentos.length) {
      alert("Não há staffs confirmados para gerar pagamento Pix.");
      return;
    }

    const doc = new jsPDFConstructor({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 18;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Relatório de Pagamento Pix", pageWidth / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(dadosExportacao.corrida.nome || "Corrida", pageWidth / 2, y, { align: "center" });
    y += 12;

    for (let index = 0; index < pagamentos.length; index++) {
      const pagamento = pagamentos[index];
      const staff = pagamento.staff || {};
      const alturaBloco = 74;

      if (y + alturaBloco > pageHeight - 12) {
        doc.addPage();
        y = 16;
      }

      const x = 12;
      const largura = pageWidth - 24;
      const qrDataUrl = await gerarQRCodeDataURLPix(pagamento.payloadPix);
      const diasTexto = pagamento.dias.length
        ? pagamento.dias.map(dia => `${dia.nome || dia.tipo || "Dia"} (${formatarMoeda(dia.valor_ajuda_custo)})`).join("; ")
        : "Nenhum dia encontrado";

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, largura, alturaBloco, 3, 3, "FD");

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(staff.nome_completo || "Nome não informado", x + 5, y + 8);

      doc.setFontSize(8.5);
      doc.setFont(undefined, "normal");
      doc.text(`CPF: ${staff.cpf || "Não informado"}`, x + 5, y + 15);
      doc.text(`Tipo Pix: ${pagamento.tipoPix}`, x + 5, y + 21);
      doc.text(`Chave Pix: ${staff.chave_pix || "Não informada"}`, x + 5, y + 27, { maxWidth: 105 });
      doc.text(`Dias/ajuda: ${diasTexto}`, x + 5, y + 36, { maxWidth: 105 });

      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text(`Total: ${formatarMoeda(pagamento.valorTotal)}`, x + 5, y + 51);

      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text("Pago: (   ) Sim    (   ) Não", x + 5, y + 59);

      if (pagamento.linkWhatsappPagamento) {
        doc.setFillColor(220, 252, 231);
        doc.setDrawColor(34, 197, 94);
        doc.roundedRect(x + 5, y + 63, 45, 7, 2, 2, "FD");
        doc.setTextColor(22, 101, 52);
        doc.setFont(undefined, "bold");
        doc.text("Enviar WhatsApp", x + 27.5, y + 67.8, { align: "center" });
        doc.link(x + 5, y + 63, 45, 7, { url: pagamento.linkWhatsappPagamento });
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
      }

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", x + largura - 50, y + 8, 42, 42);
        doc.setFontSize(7);
        doc.text("Pix QR Code", x + largura - 29, y + 55, { align: "center" });
      } else {
        doc.setFontSize(8);
        doc.text("QR indisponível", x + largura - 29, y + 30, { align: "center" });
      }

      y += alturaBloco + 6;
    }

    doc.save(`${nomeArquivoSeguro(dadosExportacao.corrida.nome)}-pagamento-pix.pdf`);
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao gerar relatório de pagamento Pix.");
  }
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

      const formato = botao.dataset.formatoExportacao || "pdf";

      await abrirFluxoExportacao(corridaId, formato);
    });
  });
}

async function abrirFluxoExportacao(corridaId, formato = "pdf") {
  const { data: corrida } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("id", corridaId)
    .single();

  const corridaTemTenis = corrida && corridaPossuiPatrocinioTenis(corrida);
  const textoOpcaoTenis = corridaTemTenis
    ? "\n4 - Resumo de tênis por numeração"
    : "";

  const filtro = prompt(
    `Escolha o filtro de exportação:\n\n1 - Todos em ordem alfabética\n2 - Por tipo\n3 - Por dia${textoOpcaoTenis}`,
    "1"
  );

  if (filtro === null) return;

  const filtroNormalizado = String(filtro).trim();
  const filtrosPermitidos = corridaTemTenis ? ["1", "2", "3", "4"] : ["1", "2", "3"];

  if (!filtrosPermitidos.includes(filtroNormalizado)) {
    alert(corridaTemTenis ? "Filtro inválido." : "Filtro inválido. O resumo de tênis só aparece para corridas marcadas com patrocinador de tênis.");
    return;
  }

  await exportarInscritosCorrida(corridaId, {
    formato: formato === "excel" ? "excel" : "pdf",
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
    .select("id, nome, data_dia, tipo, horario_inicio, horario_fim, valor_ajuda_custo")
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
          email,
          foto_url,
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
          horario_fim,
          valor_ajuda_custo
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
    if (opcoes.filtro === "4") {
      if (!corridaPossuiPatrocinioTenis(dadosExportacao.corrida)) {
        alert("Esta corrida não está marcada como patrocinada por tênis.");
        return;
      }
      if (opcoes.formato === "pdf") {
        exportarPDFResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos);
      } else {
        exportarExcelResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos);
      }
      return;
    }

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
    const grupos = {
      "Entrega Kit": inscritos.filter(inscrito =>
        inscrito.diasDisponiveis.some(d => ehTipoEntregaKit(d.tipo || d.nome))
      ),
      "Corrida": inscritos.filter(inscrito =>
        inscrito.diasDisponiveis.some(d => ehTipoDiaCorrida(d.tipo || d.nome))
      )
    };

    return Object.entries(grupos)
      .filter(([, lista]) => lista.length > 0)
      .map(([titulo, lista]) => ({
        titulo,
        inscritos: ordenarInscritosAlfabetico(lista)
      }));
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
      "Calçado": staff.numero_calcado || "",
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
  const incluirPrioridade = false;

  secoes.forEach((secao, index) => {
    const dados = montarLinhasExportacao(secao.inscritos, incluirPrioridade);
    const headers = [
      "Nome",
      "CPF",
      "RG",
      "Celular/Whatsapp",
      "Chave PIX",
      "Calçado",
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
        "Calçado": 12,
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

  const incluirPrioridade = false;
  const headers = incluirPrioridade
    ? ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Calçado", "Prioridade", "Assinatura"]
    : ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Calçado", "Assinatura"];

  const pageWidth = doc.internal.pageSize.getWidth();
  const larguraTabela = incluirPrioridade ? 260 : 238;
  const margemHorizontal = Math.max(8, (pageWidth - larguraTabela) / 2);

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
        staff.chave_pix || "",
        staff.numero_calcado || ""
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
      margin: { left: margemHorizontal, right: margemHorizontal },
      tableWidth: "wrap",
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


function agruparTenisPorNumeracao(inscritos) {
  const mapa = {};
  (inscritos || []).forEach(inscrito => {
    const numero = String((inscrito.staff && inscrito.staff.numero_calcado) || "Não informado");
    mapa[numero] = (mapa[numero] || 0) + 1;
  });
  return Object.entries(mapa)
    .map(([numero, quantidade]) => ({ numero, quantidade }))
    .sort((a, b) => {
      const na = Number(a.numero);
      const nb = Number(b.numero);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.numero.localeCompare(b.numero, "pt-BR");
    });
}

function exportarPDFResumoTenis(corrida, inscritos) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) {
    alert("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
    return;
  }

  const resumo = agruparTenisPorNumeracao(inscritos);
  if (resumo.length === 0) {
    alert("Não há inscritos para gerar o relatório de tênis.");
    return;
  }

  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(corrida.nome || "Corrida", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Resumo de tênis por numeração", pageWidth / 2, 26, { align: "center" });

  doc.autoTable({
    head: [["Numeração", "Quantidade de pares"]],
    body: resumo.map(item => [item.numero, item.quantidade]),
    startY: 36,
    theme: "grid",
    margin: { left: 45, right: 45 },
    styles: { fontSize: 11, cellPadding: 3, halign: "center", valign: "middle" },
    headStyles: { fillColor: [79, 70, 229], textColor: [255,255,255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 70 } }
  });

  const total = resumo.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 50;
  doc.setFont(undefined, "bold");
  doc.text(`Total de pares: ${total}`, pageWidth / 2, finalY, { align: "center" });
  doc.save(`${nomeArquivoSeguro(corrida.nome)}-resumo-tenis.pdf`);
}

function exportarExcelResumoTenis(corrida, inscritos) {
  const resumo = agruparTenisPorNumeracao(inscritos);
  if (resumo.length === 0) {
    alert("Não há inscritos para gerar o relatório de tênis.");
    return;
  }
  const dados = resumo.map(item => ({ "Numeração": item.numero, "Quantidade de pares": item.quantidade }));
  const worksheet = XLSX.utils.json_to_sheet(dados, { origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome || "Corrida"], ["Resumo de tênis por numeração"]], { origin: "A1" });
  worksheet["!cols"] = [{ wch: 18 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo tênis");
  XLSX.writeFile(workbook, `${nomeArquivoSeguro(corrida.nome)}-resumo-tenis.xlsx`);
}



// v142 - painel visual de relatórios, exportação PDF/Excel e fallback de busca
function obterFormatoRelatorio(painelWrapper) {
  return painelWrapper && painelWrapper.dataset.formato === "excel" ? "excel" : "pdf";
}

function definirFeedbackRelatorio(painelWrapper, mensagem, tipo = "info") {
  const feedback = painelWrapper ? painelWrapper.querySelector(".relatorio-feedback") : null;
  if (!feedback) return;
  feedback.textContent = mensagem || "";
  feedback.className = `relatorio-feedback ${mensagem ? "ativo" : ""} ${tipo}`;
}

function ativarBotoesRelatoriosAdmin() {
  document.querySelectorAll(".relatorios-admin").forEach(wrapper => {
    const corridaId = Number(wrapper.dataset.corridaId);
    const toggle = wrapper.querySelector(".botao-relatorios-toggle");
    const painel = wrapper.querySelector(".relatorios-painel");

    if (toggle && painel) {
      toggle.addEventListener("click", () => {
        const estaAberto = !painel.classList.contains("hidden");
        painel.classList.toggle("hidden", estaAberto);
        toggle.setAttribute("aria-expanded", String(!estaAberto));
      });
    }

    wrapper.querySelectorAll(".relatorio-formato-opcao").forEach(botaoFormato => {
      botaoFormato.addEventListener("click", () => {
        const formato = botaoFormato.dataset.formato === "excel" ? "excel" : "pdf";
        wrapper.dataset.formato = formato;
        wrapper.querySelectorAll(".relatorio-formato-opcao").forEach(btn => {
          btn.classList.toggle("ativo", btn.dataset.formato === formato);
        });
        definirFeedbackRelatorio(wrapper, "");
      });
    });

    wrapper.querySelectorAll(".relatorio-acao").forEach(botaoAcao => {
      botaoAcao.addEventListener("click", async () => {
        const relatorio = botaoAcao.dataset.relatorio;
        const formato = obterFormatoRelatorio(wrapper);
        const textoOriginal = botaoAcao.textContent;

        try {
          botaoAcao.disabled = true;
          botaoAcao.textContent = "Gerando...";
          definirFeedbackRelatorio(wrapper, "Gerando arquivo...", "info");

          if (relatorio === "lista-geral") {
            await exportarInscritosCorrida(corridaId, { formato, filtro: "1" });
          } else if (relatorio === "por-tipo") {
            await exportarInscritosCorrida(corridaId, { formato, filtro: "2" });
          } else if (relatorio === "por-dia") {
            await exportarInscritosCorrida(corridaId, { formato, filtro: "3" });
          } else if (relatorio === "pagamento-pix") {
            await exportarRelatorioPagamentoPix(corridaId, formato);
          } else if (relatorio === "resumo-tenis") {
            await exportarInscritosCorrida(corridaId, { formato, filtro: "4" });
          } else if (relatorio === "tabela-numeracao") {
            await exportarTabelaNumeracaoTenis(corridaId, formato);
          }

          definirFeedbackRelatorio(wrapper, "Arquivo gerado. Você pode clicar em outro relatório na sequência.", "sucesso");
        } catch (error) {
          console.error("Erro ao gerar relatório:", error);
          definirFeedbackRelatorio(wrapper, error.message || "Erro ao gerar relatório.", "erro");
        } finally {
          botaoAcao.disabled = false;
          botaoAcao.textContent = textoOriginal;
        }
      });
    });
  });
}

async function buscarInscricoesExportacaoComFallback(corridaId) {
  const colunasStaff = "id, nome_completo, cpf, rg, telefone, cidade, email, foto_url, chave_pix";
  const consultaComRelacao = await supabaseClient
    .from("inscricoes")
    .select(`
      id,
      staff_id,
      status,
      created_at,
      staffs (${colunasStaff})
    `)
    .eq("corrida_id", corridaId)
    .neq("status", "cancelado");

  if (!consultaComRelacao.error) {
    return consultaComRelacao.data || [];
  }

  console.warn("Falha ao buscar inscritos com relação staffs. Tentando fallback.", consultaComRelacao.error);

  const consultaInscricoes = await supabaseClient
    .from("inscricoes")
    .select("id, staff_id, status, created_at")
    .eq("corrida_id", corridaId)
    .neq("status", "cancelado");

  if (consultaInscricoes.error) {
    console.error("Erro detalhado ao buscar inscritos:", consultaInscricoes.error);
    throw new Error(`Erro ao buscar inscritos: ${consultaInscricoes.error.message || consultaInscricoes.error.details || "verifique o console"}`);
  }

  const inscricoesSemStaff = consultaInscricoes.data || [];
  const staffIds = [...new Set(inscricoesSemStaff.map(item => item.staff_id).filter(Boolean))];
  let staffsPorId = {};

  if (staffIds.length > 0) {
    const consultaStaffs = await supabaseClient
      .from("staffs")
      .select(colunasStaff)
      .in("id", staffIds);

    if (consultaStaffs.error) {
      console.error("Erro detalhado ao buscar dados dos staffs:", consultaStaffs.error);
      throw new Error(`Erro ao buscar dados dos staffs: ${consultaStaffs.error.message || consultaStaffs.error.details || "verifique o console"}`);
    }

    staffsPorId = (consultaStaffs.data || []).reduce((mapa, staff) => {
      mapa[staff.id] = staff;
      return mapa;
    }, {});
  }

  return inscricoesSemStaff.map(inscricao => ({
    ...inscricao,
    staffs: staffsPorId[inscricao.staff_id] || {}
  }));
}

async function buscarDadosExportacao(corridaId) {
  const corridaIdNumerico = Number(corridaId);

  const { data: corrida, error: erroCorrida } = await supabaseClient
    .from("corridas")
    .select("*")
    .eq("id", corridaIdNumerico)
    .single();

  if (erroCorrida || !corrida) {
    console.error("Erro detalhado ao buscar corrida:", erroCorrida);
    throw new Error(`Erro ao buscar corrida: ${erroCorrida && erroCorrida.message ? erroCorrida.message : "corrida não encontrada"}`);
  }

  const { data: diasCorrida, error: erroDias } = await supabaseClient
    .from("corrida_dias")
    .select("id, nome, data_dia, tipo, horario_inicio, horario_fim, valor_ajuda_custo")
    .eq("corrida_id", corridaIdNumerico)
    .order("data_dia", { ascending: true });

  if (erroDias) {
    console.error("Erro detalhado ao buscar dias da corrida:", erroDias);
    throw new Error(`Erro ao buscar dias da corrida: ${erroDias.message || erroDias.details || "verifique o console"}`);
  }

  const inscricoes = await buscarInscricoesExportacaoComFallback(corridaIdNumerico);
  const inscricaoIds = (inscricoes || []).map(inscricao => inscricao.id).filter(Boolean);
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
          horario_fim,
          valor_ajuda_custo
        )
      `)
      .in("inscricao_id", inscricaoIds);

    if (error) {
      console.error("Erro detalhado ao buscar disponibilidades:", error);
      throw new Error(`Erro ao buscar disponibilidades: ${error.message || error.details || "verifique o console"}`);
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
    const diasDisponiveis = removerDiasDuplicados(disponibilidadesPorInscricao[inscricao.id] || []);
    const prioridade = calcularPrioridadeInscricao(diasDisponiveis.length, totalDiasCorrida);

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

function obterNumeracaoStaff(staff) {
  return staff && staff.numero_calcado ? String(staff.numero_calcado) : "";
}

function montarLinhasExportacao(inscritos, incluirPrioridade = false) {
  return inscritos.map(inscrito => {
    const staff = inscrito.staff || {};
    const dias = removerDiasDuplicados(inscrito.diasDisponiveis || [])
      .map(dia => dia.nome)
      .join("; ");
    const numeroTenis = obterNumeracaoStaff(staff);

    const linha = {
      Nome: staff.nome_completo || "",
      CPF: staff.cpf || "",
      RG: staff.rg || "",
      "Celular/Whatsapp": staff.telefone || "",
      "Chave PIX": staff.chave_pix || "",
      "Numeração": numeroTenis,
      "Calçado": numeroTenis,
      "Dias disponíveis": dias
    };

    if (incluirPrioridade) {
      linha.Prioridade = inscrito.prioridade.texto;
    }

    linha.Assinatura = "";
    return linha;
  });
}

function exportarExcelCorrida(corrida, secoes, filtro) {
  const workbook = XLSX.utils.book_new();
  const incluirPrioridade = false;

  secoes.forEach((secao, index) => {
    const dados = montarLinhasExportacao(secao.inscritos, incluirPrioridade);
    const headers = [
      "Nome",
      "CPF",
      "RG",
      "Celular/Whatsapp",
      "Chave PIX",
      "Numeração",
      "Dias disponíveis",
      ...(incluirPrioridade ? ["Prioridade"] : []),
      "Assinatura"
    ];
    const worksheet = XLSX.utils.json_to_sheet(dados, { header: headers, origin: "A4" });
    const ultimaColuna = headers.length - 1;

    XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome], [secao.titulo]], { origin: "A1" });
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
        "Chave PIX": 32,
        "Numeração": 14,
        "Dias disponíveis": 42,
        Assinatura: 24,
        Prioridade: 20
      };
      return { wch: larguras[header] || 20 };
    });
    worksheet["!rows"] = [];
    for (let i = 0; i <= dados.length + 5; i++) worksheet["!rows"].push({ hpx: i === 0 ? 34 : 30 });

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = worksheet[cellAddress].s || {};
        worksheet[cellAddress].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
        worksheet[cellAddress].s.font = { sz: R === 0 ? 18 : 12, bold: R <= 3 };
        if (R === 3) {
          worksheet[cellAddress].s.fill = { fgColor: { rgb: "2F6B58" } };
          worksheet[cellAddress].s.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 12 };
        }
      }
    }
    worksheet["!autofilter"] = { ref: `A4:${XLSX.utils.encode_col(ultimaColuna)}${dados.length + 4}` };
    const nomeAba = (secao.titulo || `Lista ${index + 1}`).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || `Lista ${index + 1}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  });

  XLSX.writeFile(workbook, `${nomeArquivoSeguro(corrida.nome)}-${filtro === "2" ? "por-tipo" : filtro === "3" ? "por-data" : "lista-geral"}.xlsx`);
}

function exportarPDFCorrida(corrida, secoes, filtro) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");

  const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
  const incluirPrioridade = false;
  const headers = incluirPrioridade
    ? ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Numeração", "Prioridade", "Assinatura"]
    : ["Nome", "CPF", "RG", "Celular/Whatsapp", "Chave PIX", "Numeração", "Assinatura"];
  const pageWidth = doc.internal.pageSize.getWidth();
  const larguraTabela = incluirPrioridade ? 270 : 246;
  const margemHorizontal = Math.max(8, (pageWidth - larguraTabela) / 2);

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
        staff.chave_pix || "",
        obterNumeracaoStaff(staff)
      ];
      if (incluirPrioridade) base.push(inscrito.prioridade.texto || "");
      base.push("");
      return base;
    });

    doc.autoTable({
      head: [headers],
      body,
      startY: 30,
      theme: "grid",
      margin: { left: margemHorizontal, right: margemHorizontal },
      tableWidth: "wrap",
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 8, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: [47, 107, 88], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
      columnStyles: {
        0: { cellWidth: 54, halign: "left" },
        1: { cellWidth: 28 },
        2: { cellWidth: 24 },
        3: { cellWidth: 32 },
        4: { cellWidth: 52 },
        5: { cellWidth: 24 },
        6: { cellWidth: 32 }
      },
      didDrawPage: function () {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 12, pageHeight - 6, { align: "right" });
      }
    });
  });

  doc.save(`${nomeArquivoSeguro(corrida.nome)}-${filtro === "2" ? "por-tipo" : filtro === "3" ? "por-data" : "lista-geral"}.pdf`);
}

function exportarExcelPagamentosPix(corrida, pagamentos) {
  const dados = pagamentos.map(pagamento => {
    const staff = pagamento.staff || {};
    const dias = pagamento.dias.length
      ? pagamento.dias.map(dia => `${dia.nome || dia.tipo || "Dia"} (${formatarMoeda(dia.valor_ajuda_custo)})`).join("; ")
      : "";

    return {
      Nome: staff.nome_completo || "",
      CPF: staff.cpf || "",
      Banco: "",
      "Tipo Pix": pagamento.tipoPix || "",
      "Chave Pix": staff.chave_pix || pagamento.chavePixQRCode || "",
      Cidade: staff.cidade || "",
      Valor: Number(pagamento.valorTotal || 0),
      "Código Pix copia e cola": pagamento.payloadPix || "",
      Dias: dias,
      Status: ""
    };
  });

  const headers = ["Nome", "CPF", "Banco", "Tipo Pix", "Chave Pix", "Cidade", "Valor", "Código Pix copia e cola", "Dias", "Status"];
  const worksheet = XLSX.utils.json_to_sheet(dados, { header: headers, origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome || "Corrida"], ["Relatório de Pagamento Pix"]], { origin: "A1" });
  worksheet["!cols"] = headers.map(header => ({ wch: {
    Nome: 38,
    CPF: 18,
    Banco: 18,
    "Tipo Pix": 14,
    "Chave Pix": 32,
    Cidade: 24,
    Valor: 14,
    "Código Pix copia e cola": 90,
    Dias: 44,
    Status: 14
  }[header] || 20 }));
  worksheet["!rows"] = [];
  for (let i = 0; i <= dados.length + 5; i++) worksheet["!rows"].push({ hpx: i === 0 ? 34 : 30 });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pagamentos Pix");
  XLSX.writeFile(workbook, `${nomeArquivoSeguro(corrida.nome)}-pagamentos-pix.xlsx`);
}

async function exportarRelatorioPagamentoPix(corridaId, formato = "pdf") {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  const pagamentos = montarPagamentosPix(dadosExportacao);

  if (!pagamentos.length) {
    throw new Error("Não há staffs confirmados para gerar pagamento Pix.");
  }

  if (formato === "excel") {
    exportarExcelPagamentosPix(dadosExportacao.corrida, pagamentos);
    return;
  }

  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");

  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 18;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Relatório de Pagamento Pix", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(dadosExportacao.corrida.nome || "Corrida", pageWidth / 2, y, { align: "center" });
  y += 12;

  for (let index = 0; index < pagamentos.length; index++) {
    const pagamento = pagamentos[index];
    const staff = pagamento.staff || {};
    const alturaBloco = 104;

    if (y + alturaBloco > pageHeight - 12) {
      doc.addPage();
      y = 16;
    }

    const x = 12;
    const largura = pageWidth - 24;
    const qrDataUrl = await gerarQRCodeDataURLPix(pagamento.payloadPix);
    const diasTexto = pagamento.dias.length
      ? pagamento.dias.map(dia => `${dia.nome || dia.tipo || "Dia"} (${formatarMoeda(dia.valor_ajuda_custo)})`).join("; ")
      : "Nenhum dia encontrado";

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, largura, alturaBloco, 3, 3, "FD");
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(staff.nome_completo || "Nome não informado", x + 5, y + 8);
    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.text(`CPF: ${staff.cpf || "Não informado"}`, x + 5, y + 15);
    doc.text(`Cidade: ${staff.cidade || "Não informada"}`, x + 5, y + 21);
    doc.text(`Tipo Pix: ${pagamento.tipoPix}`, x + 5, y + 27);
    doc.text(`Chave Pix: ${staff.chave_pix || "Não informada"}`, x + 5, y + 33, { maxWidth: 105 });
    doc.text(`Dias/ajuda: ${diasTexto}`, x + 5, y + 43, { maxWidth: 105 });
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Total: ${formatarMoeda(pagamento.valorTotal)}`, x + 5, y + 59);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Pago: (   ) Sim    (   ) Não", x + 5, y + 67);
    doc.setFont(undefined, "bold");
    doc.text("Código Pix copia e cola:", x + 5, y + 78);
    doc.setFont(undefined, "normal");
    doc.text(pagamento.payloadPix || "Código indisponível", x + 5, y + 84, { maxWidth: largura - 62 });

    if (pagamento.linkWhatsappPagamento) {
      doc.setFillColor(220, 252, 231);
      doc.setDrawColor(34, 197, 94);
      doc.roundedRect(x + 5, y + 94, 45, 7, 2, 2, "FD");
      doc.setTextColor(22, 101, 52);
      doc.setFont(undefined, "bold");
      doc.text("Enviar WhatsApp", x + 27.5, y + 98.8, { align: "center" });
      doc.link(x + 5, y + 94, 45, 7, { url: pagamento.linkWhatsappPagamento });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
    }

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", x + largura - 50, y + 10, 42, 42);
      doc.setFontSize(7);
      doc.text("Pix QR Code", x + largura - 29, y + 57, { align: "center" });
    } else {
      doc.setFontSize(8);
      doc.text("QR indisponível", x + largura - 29, y + 30, { align: "center" });
    }

    y += alturaBloco + 6;
  }

  doc.save(`${nomeArquivoSeguro(dadosExportacao.corrida.nome)}-pagamentos-pix.pdf`);
}

function montarSecoesTabelaNumeracao(inscritos) {
  const confirmados = (inscritos || []).filter(inscrito => normalizarStatusInscricao(inscrito.status) === "confirmado");
  return [{
    titulo: "Tabela de numeração",
    inscritos: ordenarInscritosAlfabetico(confirmados.length ? confirmados : inscritos)
  }];
}

function exportarPDFTabelaNumeracao(corrida, inscritos) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");

  const lista = ordenarInscritosAlfabetico(inscritos || []);
  if (!lista.length) throw new Error("Não há inscritos para gerar a tabela de numeração.");

  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(corrida.nome || "Corrida", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Tabela de numeração", pageWidth / 2, 26, { align: "center" });
  doc.autoTable({
    head: [["Nome", "CPF", "Numeração", "Assinatura"]],
    body: lista.map(inscrito => {
      const staff = inscrito.staff || {};
      return [staff.nome_completo || "", staff.cpf || "", obterNumeracaoStaff(staff) || "Não informado", ""];
    }),
    startY: 36,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5, halign: "center", valign: "middle" },
    headStyles: { fillColor: [47, 107, 88], textColor: [255,255,255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 75, halign: "left" }, 1: { cellWidth: 34 }, 2: { cellWidth: 28 }, 3: { cellWidth: 42 } }
  });
  doc.save(`${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.pdf`);
}

function exportarExcelTabelaNumeracao(corrida, inscritos) {
  const lista = ordenarInscritosAlfabetico(inscritos || []);
  if (!lista.length) throw new Error("Não há inscritos para gerar a tabela de numeração.");
  const dados = lista.map(inscrito => {
    const staff = inscrito.staff || {};
    return { Nome: staff.nome_completo || "", CPF: staff.cpf || "", "Numeração": obterNumeracaoStaff(staff) || "Não informado", Assinatura: "" };
  });
  const worksheet = XLSX.utils.json_to_sheet(dados, { origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome || "Corrida"], ["Tabela de numeração"]], { origin: "A1" });
  worksheet["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 14 }, { wch: 28 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela numeração");
  XLSX.writeFile(workbook, `${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.xlsx`);
}

async function exportarTabelaNumeracaoTenis(corridaId, formato = "pdf") {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  if (!corridaPossuiPatrocinioTenis(dadosExportacao.corrida)) {
    throw new Error("Esta corrida não está marcada como patrocinada por tênis.");
  }
  const secoes = montarSecoesTabelaNumeracao(dadosExportacao.inscritos);
  const inscritos = secoes[0].inscritos;
  if (formato === "excel") {
    exportarExcelTabelaNumeracao(dadosExportacao.corrida, inscritos);
  } else {
    exportarPDFTabelaNumeracao(dadosExportacao.corrida, inscritos);
  }
}


async function exportarInscritosCorrida(corridaId, opcoes) {
  const dadosExportacao = await buscarDadosExportacao(corridaId);

  if (opcoes.filtro === "4") {
    if (!corridaPossuiPatrocinioTenis(dadosExportacao.corrida)) {
      throw new Error("Esta corrida não está marcada como patrocinada por tênis.");
    }
    if (opcoes.formato === "pdf") {
      exportarPDFResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos);
    } else {
      exportarExcelResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos);
    }
    return;
  }

  const secoes = montarSecoesExportacao(dadosExportacao, opcoes.filtro);
  if (secoes.every(secao => secao.inscritos.length === 0)) {
    throw new Error("Não há inscritos para exportar.");
  }

  if (opcoes.formato === "pdf") {
    exportarPDFCorrida(dadosExportacao.corrida, secoes, opcoes.filtro);
  } else {
    exportarExcelCorrida(dadosExportacao.corrida, secoes, opcoes.filtro);
  }
}

function limparCamposNovoDia() {
  if (novoDiaTipo) novoDiaTipo.value = "Entrega de kit";
  if (novoDiaAjuda) novoDiaAjuda.value = "";
  if (novoDiaInicio) novoDiaInicio.value = "";
  if (novoDiaFim) novoDiaFim.value = "";
  if (novoDiaHorarioInicio) novoDiaHorarioInicio.value = "";
  if (novoDiaHorarioFim) {
    novoDiaHorarioFim.value = "";
    novoDiaHorarioFim.disabled = false;
  }
  if (novoDiaAteUltimo) novoDiaAteUltimo.checked = false;
}

function limparFormularioCorrida() {
  corridaEmEdicaoId = null;
  configurarModoFormularioCorrida("nova");

  if (corridaNome) corridaNome.value = "";
  if (corridaDataInicio) corridaDataInicio.value = "";
  if (corridaDataFim) corridaDataFim.value = "";
  if (corridaLocal) corridaLocal.value = "";
  if (corridaPrazo) corridaPrazo.value = "";
  if (corridaVagas) corridaVagas.value = "";
  if (corridaObservacoes) corridaObservacoes.value = OBSERVACOES_PADRAO;
  if (corridaPatrocinadorTenis) corridaPatrocinadorTenis.checked = false;
  corridaBannerArquivo = null;
  corridaBannerUrlAtual = null;
  corridaBannerPathAtual = null;
  corridaBannerRemovido = false;
  if (corridaBannerInput) corridaBannerInput.value = "";
  atualizarPreviewBannerCorrida(null);

  diasCadastroCorrida = [];
  limparCamposNovoDia();
  renderizarPreviewDiasCadastro();

  if (salvarCorridaBtn) {
    salvarCorridaBtn.disabled = false;
    salvarCorridaBtn.textContent = "Salvar corrida";
  }
}

function prepararNovaCorrida() {
  limparFormularioCorrida();
  configurarModoFormularioCorrida("nova");
}

// INICIALIZAÇÃO
inserirEstilosPrioridadeAdmin();
carregarCorridasAdmin();

const editarPerfilAdminBtn = document.getElementById("editarPerfilAdminBtn");

if (editarPerfilAdminBtn) {
  editarPerfilAdminBtn.addEventListener("click", function () {
    const idAdmin = staffLogado && staffLogado.id ? `&id=${encodeURIComponent(staffLogado.id)}` : "";
    window.location.href = `cadastro.html?editar=1${idAdmin}`;
  });
}

const abrirCorridasBtn = document.getElementById("abrir-corridas-btn");

if (abrirCorridasBtn) {
  abrirCorridasBtn.addEventListener("click", function () {
    window.location.href = "corridas.html";
  });
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("staffLogado");
    window.location.href = "index.html";
  });
}