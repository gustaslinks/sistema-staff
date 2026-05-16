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
      let arquivoParaOtimizar = arquivo;

      if (window.StaffPhotoCropper && typeof window.StaffPhotoCropper.open === "function") {
        const recortado = await window.StaffPhotoCropper.open(arquivo, corridaBannerInput, {
          title: "Ajustar banner da corrida",
          description: "Posicione o banner no formato horizontal 16:9. Use pinça ou a barra de zoom para enquadrar a imagem.",
          help: "Arraste a imagem para posicionar. No celular, use pinça para aproximar/afastar. O arquivo salvo será horizontal e otimizado para o card da corrida.",
          saveText: "Usar este banner",
          aspectRatio: 16 / 9,
          outputWidth: 1200,
          outputHeight: 675,
          mimeType: "image/webp",
          quality: 0.86,
          filePrefix: "banner-corrida",
          shape: "rect",
          updatePreview: false,
          setCurrentFile: false
        });

        if (!recortado) {
          corridaBannerInput.value = "";
          return;
        }

        arquivoParaOtimizar = recortado;
      }

      corridaBannerArquivo = await otimizarBannerCorrida(arquivoParaOtimizar);
      corridaBannerRemovido = false;
      const urlPreview = URL.createObjectURL(corridaBannerArquivo);
      const tamanhoMb = (corridaBannerArquivo.size / (1024 * 1024)).toFixed(2).replace(".", ",");
      atualizarPreviewBannerCorrida(urlPreview, `Novo banner recortado e otimizado • ${tamanhoMb} MB`);
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
      const ateUltimoAtleta = dia.ate_ultimo_atleta === true;
      const dadosDia = {
        corrida_id: corridaId,
        nome: dia.nome,
        data_dia: dia.data_dia,
        horario_inicio: dia.horario_inicio || null,
        horario_fim: ateUltimoAtleta ? null : (dia.horario_fim || null),
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
    const pendentesCorrida = contarInscritosPorStatus(inscricoes || [], corrida.id, "pendente");
    const vagasTotal = Number(corrida.vagas_total || 0);
    const vagasLivresBarra = Math.max(vagasTotal - confirmadosCorrida - pendentesCorrida, 0);
    const percentualConfirmadosSegmento = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
    const percentualPendentesSegmento = calcularPercentualPreenchimento(pendentesCorrida, vagasTotal);
    const percentualLivresSegmento = Math.max(0, 100 - percentualConfirmadosSegmento - percentualPendentesSegmento);
    const percentualInscritos = calcularPercentualPreenchimento(totalInscritos, vagasTotal);
    const percentualConfirmados = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
    const classeProgressoInscritos = obterClasseProgressoVagas(percentualInscritos);
    const classeProgressoConfirmados = "confirmados-verde";
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
              <strong class="corrida-status-label corrida-status-label-destaque">${corrida.status === "aberta" ? "Inscrições abertas" : "Inscrições encerradas"}</strong>
              <span class="corrida-status-subtitulo">${corrida.status === "aberta" ? "Cadastro liberado para staffs" : "Cadastro bloqueado para novas inscrições"}</span>
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

        </div>

        ${vagasTotal > 0 ? `
          <div class="corrida-progressos-fora-card" aria-label="Resumo de preenchimento da corrida">
            <div class="corrida-progresso-vagas corrida-progresso-inscritos" aria-label="Inscritos em relação às vagas">
              <div class="corrida-progresso-topo">
                <span class="corrida-progresso-rotulo corrida-inscritos-texto">Inscritos: ${textoInscritos}</span>
                <strong class="corrida-progresso-percentual corrida-progresso-inscritos-percentual">${percentualInscritos}%</strong>
              </div>
              <div class="corrida-progresso-trilho">
                <div class="corrida-progresso-barra corrida-progresso-inscritos-barra ${classeProgressoInscritos}" style="width: ${percentualInscritos}%;"></div>
              </div>
            </div>

            <div class="corrida-progresso-vagas corrida-progresso-confirmados" aria-label="Confirmados em relação às vagas">
              <div class="corrida-progresso-topo">
                <span class="corrida-progresso-rotulo corrida-confirmados-texto">Confirmados: ${textoConfirmados}</span>
                <strong class="corrida-progresso-percentual corrida-progresso-confirmados-percentual">${percentualConfirmados}%</strong>
              </div>
              <div class="corrida-progresso-trilho">
                <div class="corrida-progresso-barra corrida-progresso-confirmados-barra ${classeProgressoConfirmados}" style="width: ${percentualConfirmados}%;"></div>
              </div>
            </div>

            <div class="corrida-progresso-segmentado" aria-label="Ocupação das vagas por status">
              <div class="corrida-progresso-topo corrida-progresso-segmentado-topo">
                <span class="corrida-progresso-rotulo">Ocupação das vagas</span>
                <strong>${confirmadosCorrida + pendentesCorrida} de ${vagasTotal}</strong>
              </div>
              <div class="corrida-progresso-segmentado-trilho">
                <span class="segmento segmentado-confirmados" style="width: ${percentualConfirmadosSegmento}%;" title="${confirmadosCorrida} confirmado(s)"></span>
                <span class="segmento segmentado-pendentes" style="width: ${percentualPendentesSegmento}%;" title="${pendentesCorrida} pendente(s)"></span>
                <span class="segmento segmentado-livres" style="width: ${percentualLivresSegmento}%;" title="${vagasLivresBarra} vaga(s) livre(s)"></span>
              </div>
              <div class="corrida-progresso-segmentado-legenda">
                <span><i class="legenda-cor confirmados"></i>${confirmadosCorrida} confirmados</span>
                <span><i class="legenda-cor pendentes"></i>${pendentesCorrida} pendentes</span>
                <span><i class="legenda-cor livres"></i>${vagasLivresBarra} livres</span>
              </div>
            </div>
          </div>
        ` : ""}

        <div class="corrida-resumo-sutil corrida-resumo-sutil-v187">
          <div class="corrida-resumo-periodo"><strong>Período</strong><span>${formatarPeriodoCorrida(corrida)}</span></div>
          <div class="corrida-resumo-duas-colunas">
            <div><strong>Vagas</strong><span>${vagasTotal > 0 ? vagasTotal : "Não informadas"}</span></div>
            <div><strong>Prazo</strong><span>${corrida.prazo_inscricao ? formatarData(corrida.prazo_inscricao) : "Não informado"}</span></div>
          </div>
        </div>

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
                  <button type="button" class="relatorio-acao" data-relatorio="em-branco">Em branco</button>
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
    ate_ultimo_atleta: !dia.horario_fim,
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

      const posicaoScroll = window.scrollY;
      await carregarCorridasAdmin();
      requestAnimationFrame(() => {
    window.scrollTo({ top: posicaoScroll, left: 0 });
    setTimeout(() => window.scrollTo({ top: posicaoScroll, left: 0 }), 0);
  });
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
      .select("id, nome, data_dia, tipo, horario_inicio, horario_fim, valor_ajuda_custo")
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
    .select("inscricao_id, corrida_dia_id, disponivel")
    .in("inscricao_id", inscricaoIds);

  if (erroDisponibilidades) {
    console.error(
      "Erro ao buscar disponibilidades:",
      erroDisponibilidades
    );
  }

  const diasCorridaPorId = {};
  (diasCorrida || []).forEach(dia => {
    diasCorridaPorId[Number(dia.id)] = dia;
  });

  const disponibilidadesPorInscricao = {};

  if (disponibilidades) {

    disponibilidades.forEach(item => {

      const dia = diasCorridaPorId[Number(item.corrida_dia_id)];

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

  const diasFiltro = Array.from(
    new Map(
      inscricoesComPrioridade
        .flatMap(inscricao => inscricao.diasDisponiveis || [])
        .filter(dia => dia && dia.id)
        .map(dia => [String(dia.id), dia])
    ).values()
  ).sort((a, b) => {
    const dataA = a.data_dia ? new Date(a.data_dia).getTime() : 0;
    const dataB = b.data_dia ? new Date(b.data_dia).getTime() : 0;
    return dataA - dataB;
  });

  const opcoesDiasFiltro = diasFiltro.map(dia => `
    <option value="${escapeHtml(String(dia.id))}">${escapeHtml(dia.nome || formatarData(dia.data_dia))}</option>
  `).join("");

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

      <div class="admin-inscritos-filtros admin-inscritos-filtros-v188">
        <div class="admin-filtros-grid-v188">
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

          <label class="admin-busca-wrap-v186">
            <span>Buscar nome</span>
            <input
              type="search"
              class="admin-busca-inscrito"
              placeholder="Digite o nome..."
            >
          </label>
        </div>

        <div class="admin-toggles-tipo" aria-label="Filtrar por tipo de dia">
          <button type="button" class="admin-toggle-tipo ativo" data-tipo="kit"><span class="btn-ico">📦</span><span>Kit</span></button>
          <button type="button" class="admin-toggle-tipo ativo" data-tipo="corrida"><span class="btn-ico">🏁</span><span>Corrida</span></button>
        </div>

        <label class="admin-dia-filtro-wrap">
          <span>Dia</span>
          <select class="admin-dia-select">
            <option value="todos" selected>Todos os dias</option>
            ${opcoesDiasFiltro}
          </select>
        </label>

        <div class="admin-selecao-clean-row">
          <label class="admin-selecionar-exibidos">
            <input type="checkbox" class="checkbox-selecionar-exibidos">
            <span>Selecionar exibidos</span>
          </label>
          <label class="admin-somente-selecionados">
            <input type="checkbox" class="checkbox-somente-selecionados">
            <span>Somente selecionados</span>
          </label>
        </div>

        <div class="admin-inscritos-contagem-exibidos admin-tag-exibindo" aria-live="polite">
          Exibindo 0 de ${inscricoesComPrioridade.length} inscritos
        </div>
      </div>

      <div class="admin-lista-compacta-inscritos">
        ${inscricoesComPrioridade.map(inscricao => gerarLinhaInscritoAdmin(
          inscricao,
          corridaIdNumerico,
          totalDiasCorrida,
          corridaAtual
        )).join("")}
      </div>

      <div class="admin-barra-lote-v188" aria-live="polite">
        <div class="admin-contador-selecao">
          <strong class="admin-selecao-texto">0 selecionado(s)</strong>
          ${totalVagasCorrida ? `<span>Vagas livres: ${vagasLivres}</span>` : ""}
        </div>
        <button type="button" class="botao-admin-batch botao-confirmar-selecionados botao-confirmar-selecionados-final">
          Confirmar selecionados
        </button>
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
  const diaIdsFiltro = diasDisponiveis.map(dia => String(dia.id)).filter(Boolean).join(",");
  const fotoUrl = staff.foto_url || "";
  const mensagemWhatsappConfirmacao = gerarMensagemConfirmacaoWhatsapp({
    staff,
    corrida: corridaAtual || {},
    dias: diasDisponiveis
  });
  const linkWhatsappConfirmacao = criarLinkWhatsapp(staff.telefone, mensagemWhatsappConfirmacao);
  const botaoWhatsappConfirmacao = status === "confirmado" && linkWhatsappConfirmacao
    ? `<a class="botao-acao-inscrito botao-whatsapp-inscrito botao-whatsapp-confirmado" href="${escapeHtml(linkWhatsappConfirmacao)}" target="_blank" rel="noopener" title="Enviar WhatsApp de confirmação" aria-label="Enviar WhatsApp de confirmação"><svg class="icone-whatsapp-oficial-v188" viewBox="0 0 32 32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M16 3.4A12.4 12.4 0 0 0 5.5 22.3L4 28l5.9-1.5A12.4 12.4 0 1 0 16 3.4Z" fill="currentColor"/><path d="M22.9 18.9c-.3-.2-2-.9-2.3-1-.3-.1-.5-.2-.8.2-.2.3-.9 1-1.1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6 0-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4Z" fill="#fff"/></svg></a>`
    : `<button type="button" class="botao-acao-inscrito botao-whatsapp-inscrito botao-whatsapp-bloqueado" disabled title="WhatsApp liberado após confirmar" aria-label="WhatsApp liberado após confirmar"><svg class="icone-whatsapp-oficial-v188" viewBox="0 0 32 32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M16 3.4A12.4 12.4 0 0 0 5.5 22.3L4 28l5.9-1.5A12.4 12.4 0 1 0 16 3.4Z" fill="currentColor"/><path d="M22.9 18.9c-.3-.2-2-.9-2.3-1-.3-.1-.5-.2-.8.2-.2.3-.9 1-1.1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6 0-.2-.8-1.9-1.1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4Z" fill="#fff"/></svg></button>`;

  return `
    <article
      class="linha-inscrito-admin is-collapsed"
      data-inscricao-id="${inscricao.id}"
      data-corrida-id="${corridaId}"
      data-status="${status}"
      data-prioridade="${inscricao.prioridade.classe}"
      data-tipo-disponibilidade="${tipoDisponibilidadeFiltro}"
      data-tem-kit="${possuiEntregaKit ? "1" : "0"}"
      data-tem-corrida="${possuiDiaCorrida ? "1" : "0"}"
      data-dia-ids="${escapeHtml(diaIdsFiltro)}"
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
          <svg class="icone-expandir-inscrito" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <div class="linha-inscrito-nome">
          <strong>${escapeHtml(staff.nome_completo || "Nome não informado")}</strong>
          <small>${textoQuantidadeDias}</small>
        </div>

        <div class="linha-inscrito-icones" aria-label="Tipos de disponibilidade">
          <span class="icone-tipo-dia ${possuiEntregaKit ? "ativo" : "inativo"}" title="Entrega de kit">📦</span>
          <span class="icone-tipo-dia ${possuiDiaCorrida ? "ativo" : "inativo"}" title="Dia da corrida">🏁</span>
        </div>

        <span class="admin-status-inscricao ${status}">
          ${formatarStatusInscricao(status)}
        </span>

        <div class="linha-inscrito-acoes linha-inscrito-acoes-rapidas" aria-label="Ações rápidas da inscrição">
          <button
            type="button"
            class="botao-acao-inscrito botao-confirmar-inscrito"
            data-inscricao-id="${inscricao.id}"
            data-corrida-id="${corridaId}"
            ${status === "confirmado" ? "disabled" : ""}
            title="Confirmar inscrição"
            aria-label="Confirmar inscrição"
          ><svg class="icone-acao-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></button>

          <button
            type="button"
            class="botao-acao-inscrito botao-lista-espera-inscrito"
            data-inscricao-id="${inscricao.id}"
            data-corrida-id="${corridaId}"
            ${status === "lista_espera" ? "disabled" : ""}
            title="Colocar em lista de espera"
            aria-label="Colocar em lista de espera"
          ><svg class="icone-acao-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg></button>

          <button
            type="button"
            class="botao-acao-inscrito botao-cancelar-inscrito"
            data-inscricao-id="${inscricao.id}"
            data-corrida-id="${corridaId}"
            ${status === "cancelado" ? "disabled" : ""}
            title="Cancelar inscrição"
            aria-label="Cancelar inscrição"
          ><svg class="icone-acao-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>

          ${botaoWhatsappConfirmacao}
        </div>
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
  const diaSelect = areaInscritos.querySelector(".admin-dia-select");
  const somenteSelecionados = areaInscritos.querySelector(".checkbox-somente-selecionados");
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

  if (diaSelect) {
    diaSelect.addEventListener("change", () => {
      limparSelecaoInscritos(areaInscritos);
      filtrarInscritosAdmin(areaInscritos);
      atualizarContadorSelecao(areaInscritos, totalVagasCorrida);
    });
  }

  if (somenteSelecionados) {
    somenteSelecionados.addEventListener("change", () => {
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
      const somenteSelecionadosAtual = areaInscritos.querySelector(".checkbox-somente-selecionados");
      if (somenteSelecionadosAtual && somenteSelecionadosAtual.checked) {
        filtrarInscritosAdmin(areaInscritos);
      }
    });
  });

  botoesExpandir.forEach(botao => {
    botao.addEventListener("click", () => {
      const linha = botao.closest(".linha-inscrito-admin");
      const detalhes = linha.querySelector(".linha-inscrito-detalhes");
      if (!linha || !detalhes) return;

      const fechado = detalhes.classList.toggle("hidden");
      linha.classList.toggle("is-collapsed", fechado);
      linha.classList.toggle("is-expanded", !fechado);
      botao.setAttribute("aria-expanded", String(!fechado));
      botao.setAttribute("aria-label", fechado ? "Ver detalhes" : "Ocultar detalhes");
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
  const diaSelect = areaInscritos.querySelector(".admin-dia-select");
  const somenteSelecionados = areaInscritos.querySelector(".checkbox-somente-selecionados");
  const termo = busca ? busca.value.trim().toLowerCase() : "";
  const filtroStatus = statusSelect ? statusSelect.value : "pendente";
  const filtroDia = diaSelect ? diaSelect.value : "todos";
  const filtrarSelecionados = !!(somenteSelecionados && somenteSelecionados.checked);
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
    const diaIds = (linha.dataset.diaIds || "").split(",").filter(Boolean);
    const checkboxLinha = linha.querySelector(".checkbox-inscrito-batch");

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

    const passaDia = filtroDia === "todos" || diaIds.includes(String(filtroDia));
    const passaSelecionados = !filtrarSelecionados || !!(checkboxLinha && checkboxLinha.checked);

    const exibido = passaBusca && passaStatus && passaTipo && passaDia && passaSelecionados;
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

  const barraLote = areaInscritos.querySelector(".admin-barra-lote-v188");
  if (barraLote) {
    barraLote.classList.toggle("ativo", selecionados > 0);
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
  const pendentesCorrida = (inscricoes || []).filter(inscricao => {
    return normalizarStatusInscricao(inscricao.status) === "pendente";
  }).length;
  const vagasTotal = Number(corrida.vagas_total || 0);
  const vagasLivresBarra = Math.max(vagasTotal - confirmadosCorrida - pendentesCorrida, 0);
  const percentualConfirmadosSegmento = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
  const percentualPendentesSegmento = calcularPercentualPreenchimento(pendentesCorrida, vagasTotal);
  const percentualLivresSegmento = Math.max(0, 100 - percentualConfirmadosSegmento - percentualPendentesSegmento);
  const percentualInscritos = calcularPercentualPreenchimento(totalInscritos, vagasTotal);
  const percentualConfirmados = calcularPercentualPreenchimento(confirmadosCorrida, vagasTotal);
  const classeProgressoInscritos = obterClasseProgressoVagas(percentualInscritos);
  const classeProgressoConfirmados = "confirmados-verde";

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
    barraConfirmadosEl.classList.remove("baixo", "medio", "alto", "completo", "confirmados-verde");
    barraConfirmadosEl.classList.add(classeProgressoConfirmados);
  }

  const segConfirmados = card.querySelector(".segmentado-confirmados");
  const segPendentes = card.querySelector(".segmentado-pendentes");
  const segLivres = card.querySelector(".segmentado-livres");
  if (segConfirmados) segConfirmados.style.width = `${percentualConfirmadosSegmento}%`;
  if (segPendentes) segPendentes.style.width = `${percentualPendentesSegmento}%`;
  if (segLivres) segLivres.style.width = `${percentualLivresSegmento}%`;

  const segTopo = card.querySelector(".corrida-progresso-segmentado-topo strong");
  if (segTopo) segTopo.textContent = `${confirmadosCorrida + pendentesCorrida} de ${vagasTotal}`;

  const legenda = card.querySelector(".corrida-progresso-segmentado-legenda");
  if (legenda) {
    legenda.innerHTML = `
      <span><i class="legenda-cor confirmados"></i>${confirmadosCorrida} confirmados</span>
      <span><i class="legenda-cor pendentes"></i>${pendentesCorrida} pendentes</span>
      <span><i class="legenda-cor livres"></i>${vagasLivresBarra} livres</span>
    `;
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
  requestAnimationFrame(() => {
    window.scrollTo({ top: posicaoScroll, left: 0 });
    setTimeout(() => window.scrollTo({ top: posicaoScroll, left: 0 }), 0);
  });
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
  const ehBotaoIcone = botao.classList && botao.classList.contains("botao-acao-inscrito");

  botao.disabled = true;
  botao.textContent = ehBotaoIcone ? "…" : "Salvando...";

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

  requestAnimationFrame(() => {
    window.scrollTo({ top: posicaoScroll, left: 0 });
    setTimeout(() => window.scrollTo({ top: posicaoScroll, left: 0 }), 0);
  });
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

  dia.ate_ultimo_atleta = marcado === true;

  if (dia.ate_ultimo_atleta) {
    dia.horario_fim = null;
  } else if (!dia.horario_fim) {
    dia.horario_fim = "";
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
    const ateUltimo = dia.ate_ultimo_atleta === true;
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

function formatarDataCurtaParaMensagem(valor) {
  if (!valor) return "data não informada";
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[1]}/${br[2]}`;
  return formatarData(valor);
}

function formatarDiaParaMensagem(dia) {
  const data = formatarDataCurtaParaMensagem(dia.data_dia);
  const diaSemana = dia.data_dia ? obterDiaSemana(dia.data_dia) : "dia a confirmar";
  const horario = formatarHorarioPeriodo(dia.horario_inicio, dia.horario_fim);

  return [
    `${data} — ${diaSemana}`,
    `Horário: ${horario}`
  ].join("\n");
}

function agruparDiasConfirmacaoWhatsapp(dias) {
  const diasKit = [];
  const diasCorrida = [];
  const diasOutros = [];

  (dias || []).forEach(dia => {
    const tipoBase = dia.tipo || dia.nome || "";
    if (ehTipoEntregaKit(tipoBase)) {
      diasKit.push(dia);
    } else if (ehTipoDiaCorrida(tipoBase)) {
      diasCorrida.push(dia);
    } else {
      diasOutros.push(dia);
    }
  });

  return { diasKit, diasCorrida, diasOutros };
}

function montarBlocoDiasWhatsapp(titulo, emoji, dias) {
  if (!dias || !dias.length) return "";

  return [
    "────────────────────",
    `${emoji} ${titulo}`,
    "────────────────────",
    dias.map(formatarDiaParaMensagem).join("\n\n")
  ].join("\n");
}

function gerarMensagemConfirmacaoWhatsapp({ staff, corrida, dias }) {
  const nome = staff && staff.nome_completo ? staff.nome_completo.split(" ")[0] : "tudo bem";
  const diasUnicos = removerDiasDuplicados(dias || []);
  const grupos = agruparDiasConfirmacaoWhatsapp(diasUnicos);
  const blocosDias = [
    montarBlocoDiasWhatsapp("Entrega de kit", "📦", grupos.diasKit),
    montarBlocoDiasWhatsapp("Corrida", "🏁", grupos.diasCorrida),
    montarBlocoDiasWhatsapp("Outros dias", "📌", grupos.diasOutros)
  ].filter(Boolean).join("\n\n");
  const diasTexto = blocosDias || "• Dias/horários: conferir com a organização.";
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
    "",
    "",
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
  return Promise.reject(new Error("Biblioteca de QR Code não carregada. Confira se o arquivo qrcode.min.js está carregado no projeto."));
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
          chave_pix,
          numero_calcado
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
      .select("inscricao_id, corrida_dia_id, disponivel")
      .in("inscricao_id", inscricaoIds);

    if (error) {
      throw new Error("Erro ao buscar disponibilidades.");
    }

    disponibilidades = data || [];
  }

  const diasCorridaPorId = {};
  (diasCorrida || []).forEach(dia => {
    diasCorridaPorId[Number(dia.id)] = dia;
  });

  const disponibilidadesPorInscricao = {};

  disponibilidades.forEach(item => {
    const dia = diasCorridaPorId[Number(item.corrida_dia_id)];
    if (item.disponivel === false || !dia) return;

    if (!disponibilidadesPorInscricao[item.inscricao_id]) {
      disponibilidadesPorInscricao[item.inscricao_id] = [];
    }

    disponibilidadesPorInscricao[item.inscricao_id].push(dia);
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

          let nomeArquivoGerado = "";

          if (relatorio === "lista-geral") {
            nomeArquivoGerado = await exportarInscritosCorrida(corridaId, { formato, filtro: "1" });
          } else if (relatorio === "por-tipo") {
            nomeArquivoGerado = await exportarInscritosCorrida(corridaId, { formato, filtro: "2" });
          } else if (relatorio === "por-dia") {
            nomeArquivoGerado = await exportarInscritosCorrida(corridaId, { formato, filtro: "3" });
          } else if (relatorio === "em-branco") {
            nomeArquivoGerado = await exportarRelatorioEmBranco(corridaId);
          } else if (relatorio === "pagamento-pix") {
            nomeArquivoGerado = await exportarRelatorioPagamentoPix(corridaId, formato);
          } else if (relatorio === "resumo-tenis") {
            nomeArquivoGerado = await exportarInscritosCorrida(corridaId, { formato, filtro: "4" });
          } else if (relatorio === "tabela-numeracao") {
            nomeArquivoGerado = await exportarTabelaNumeracaoTenis(corridaId, formato);
          }

          definirFeedbackRelatorio(wrapper, nomeArquivoGerado ? `Arquivo gerado: ${nomeArquivoGerado}` : "Arquivo gerado.", "sucesso");
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
  const colunasStaff = "id, nome_completo, cpf, rg, telefone, cidade, email, foto_url, chave_pix, numero_calcado";
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
      .select("inscricao_id, corrida_dia_id, disponivel")
      .in("inscricao_id", inscricaoIds);

    if (error) {
      console.error("Erro detalhado ao buscar disponibilidades:", error);
      throw new Error(`Erro ao buscar disponibilidades: ${error.message || error.details || "verifique o console"}`);
    }

    disponibilidades = data || [];
  }

  const diasCorridaPorId = {};
  (diasCorrida || []).forEach(dia => {
    diasCorridaPorId[Number(dia.id)] = dia;
  });

  const disponibilidadesPorInscricao = {};
  disponibilidades.forEach(item => {
    const dia = diasCorridaPorId[Number(item.corrida_dia_id)];
    if (item.disponivel === false || !dia) return;
    if (!disponibilidadesPorInscricao[item.inscricao_id]) {
      disponibilidadesPorInscricao[item.inscricao_id] = [];
    }
    disponibilidadesPorInscricao[item.inscricao_id].push(dia);
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
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.pdf`;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(corrida.nome || "Corrida", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Tabela de numeração", pageWidth / 2, 26, { align: "center" });
  const startY = 36;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margemInferior = 14;
  const alturaLinhaEstimativa = 7.1;
  const maxLinhasPorColuna = Math.max(1, Math.floor((pageHeight - startY - margemInferior) / alturaLinhaEstimativa));

  doc.autoTable({
    head: [["Nome", "Número", "Nome", "Número"]],
    body: montarLinhasTabelaNumeracao4Colunas(lista, maxLinhasPorColuna),
    startY,
    theme: "grid",
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8.5, cellPadding: 2.2, halign: "center", valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [47, 107, 88], textColor: [255,255,255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 72, halign: "left" }, 1: { cellWidth: 23 }, 2: { cellWidth: 72, halign: "left" }, 3: { cellWidth: 23 } }
  });
  doc.save(nomeArquivo);
  return nomeArquivo;
}

function exportarExcelTabelaNumeracao(corrida, inscritos) {
  const lista = ordenarInscritosAlfabetico(inscritos || []);
  if (!lista.length) throw new Error("Não há inscritos para gerar a tabela de numeração.");
  const dados = montarLinhasTabelaNumeracao4Colunas(lista, 40);
  const worksheet = XLSX.utils.aoa_to_sheet([[corrida.nome || "Corrida"], ["Tabela de numeração"], [], ["Nome", "Número", "Nome", "Número"], ...dados]);
  worksheet["!cols"] = [{ wch: 42 }, { wch: 12 }, { wch: 42 }, { wch: 12 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela numeração");
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
  return nomeArquivo;
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

/* v185 - corrige leitura de disponibilidade por corrida_dia_id; sem depender de relacionamento embutido */
/* v185 - ajustes reais nos relatórios PDF solicitados */
/* v185 - corrige busca de numero_calcado na exportacao dos PDFs de tenis */
/* v185 - tabela numeracao preenche coluna esquerda inteira antes da direita */
function obterDataDiaRelatorio(dia) {
  if (!dia || !dia.data_dia) return null;
  const partes = String(dia.data_dia).split("-");
  if (partes.length >= 3) {
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  }
  const data = new Date(dia.data_dia);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataCurtaRelatorio(dataDia) {
  const data = dataDia instanceof Date ? dataDia : obterDataDiaRelatorio({ data_dia: dataDia });
  if (!data) return "";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatarDiaSemanaRelatorio(dataDia) {
  const data = dataDia instanceof Date ? dataDia : obterDataDiaRelatorio({ data_dia: dataDia });
  if (!data) return "";
  const texto = data.toLocaleDateString("pt-BR", { weekday: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function montarPeriodoDiasRelatorio(dias, prefixoSingular = "") {
  const lista = (dias || [])
    .filter(dia => dia && dia.data_dia)
    .sort((a, b) => String(a.data_dia).localeCompare(String(b.data_dia)));

  if (!lista.length) return "";

  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  const dataPrimeiro = obterDataDiaRelatorio(primeiro);
  const dataUltimo = obterDataDiaRelatorio(ultimo);

  if (lista.length === 1) {
    const diaSemana = formatarDiaSemanaRelatorio(dataPrimeiro);
    const data = formatarDataCurtaRelatorio(dataPrimeiro);
    return `${prefixoSingular || "Dia"}: ${diaSemana}, ${data}`;
  }

  return `De ${formatarDiaSemanaRelatorio(dataPrimeiro)}, ${formatarDataCurtaRelatorio(dataPrimeiro)} a ${formatarDiaSemanaRelatorio(dataUltimo)}, ${formatarDataCurtaRelatorio(dataUltimo)}`;
}

function montarSubtituloSecaoRelatorio(secao, dadosExportacao, filtro) {
  const diasCorrida = dadosExportacao && dadosExportacao.diasCorrida ? dadosExportacao.diasCorrida : [];
  const titulo = secao && secao.titulo ? secao.titulo : "";

  if (filtro === "2") {
    const ehEntrega = /entrega/i.test(titulo);
    const diasFiltrados = diasCorrida.filter(dia => ehEntrega ? ehTipoEntregaKit(dia.tipo || dia.nome) : ehTipoDiaCorrida(dia.tipo || dia.nome));
    return `${titulo} - ${montarPeriodoDiasRelatorio(diasFiltrados, titulo)}`;
  }

  if (filtro === "3") {
    return titulo;
  }

  return `Todos os inscritos - ${montarPeriodoDiasRelatorio(diasCorrida, "Dia")}`;
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
        subtitulo: montarSubtituloSecaoRelatorio({ titulo }, dadosExportacao, filtro),
        inscritos: ordenarInscritosAlfabetico(lista)
      }));
  }

  if (filtro === "3") {
    return diasCorrida.map(dia => ({
      titulo: `${dia.nome} - ${formatarData(dia.data_dia)}`,
      subtitulo: `${dia.nome} - ${formatarDiaSemanaRelatorio(dia.data_dia)}, ${formatarDataCurtaRelatorio(dia.data_dia)}`,
      inscritos: ordenarInscritosAlfabetico(
        inscritos.filter(inscrito =>
          inscrito.diasDisponiveis.some(d => d.id === dia.id)
        )
      )
    }));
  }

  return [{
    titulo: "Todos os inscritos",
    subtitulo: montarSubtituloSecaoRelatorio({ titulo: "Todos os inscritos" }, dadosExportacao, filtro),
    inscritos: ordenarInscritosAlfabetico(inscritos)
  }];
}

function obterNumeracaoStaff(staff) {
  if (!staff) return "";
  const valor = staff.numero_calcado ?? staff.calcado ?? staff.numeroCalcado ?? staff.numeracao ?? "";
  return valor === null || valor === undefined || String(valor).trim() === "" ? "" : String(valor).trim();
}

function montarLinhasExportacao(inscritos, incluirPrioridade = false, incluirNumeracao = true) {
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
      "Chave PIX": staff.chave_pix || ""
    };

    if (incluirNumeracao) linha["Numeração"] = obterNumeracaoStaff(staff);
    linha["Dias disponíveis"] = dias;

    if (incluirPrioridade) linha.Prioridade = inscrito.prioridade.texto;
    linha.Assinatura = "";
    return linha;
  });
}

function exportarPDFCorrida(corrida, secoes, filtro) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");

  const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
  const incluirPrioridade = false;
  const incluirNumeracao = corridaPossuiPatrocinioTenis(corrida);
  const headers = [
    "Nome",
    "CPF",
    "RG",
    "Celular/Whatsapp",
    "Chave PIX",
    ...(incluirNumeracao ? ["Numeração"] : []),
    ...(incluirPrioridade ? ["Prioridade"] : []),
    "Assinatura"
  ];
  const pageWidth = doc.internal.pageSize.getWidth();
  const larguraTabela = incluirNumeracao ? 246 : 224;
  const margemHorizontal = Math.max(8, (pageWidth - larguraTabela) / 2);
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-${filtro === "2" ? "por-tipo" : filtro === "3" ? "por-data" : "lista-geral"}.pdf`;

  secoes.forEach((secao, index) => {
    if (index > 0) doc.addPage();
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(corrida.nome || "Corrida", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10.5);
    doc.setFont(undefined, "normal");
    const subtitulo = secao.subtitulo || secao.titulo || "Inscritos";
    doc.text(subtitulo, pageWidth / 2, 22, { align: "center" });

    const body = secao.inscritos.map(inscrito => {
      const staff = inscrito.staff || {};
      const base = [
        staff.nome_completo || "",
        staff.cpf || "",
        staff.rg || "",
        staff.telefone || "",
        staff.chave_pix || ""
      ];
      if (incluirNumeracao) base.push(obterNumeracaoStaff(staff) || "");
      if (incluirPrioridade) base.push(inscrito.prioridade.texto || "");
      base.push("");
      return base;
    });

    const columnStyles = incluirNumeracao
      ? { 0: { cellWidth: 54, halign: "left" }, 1: { cellWidth: 28 }, 2: { cellWidth: 22 }, 3: { cellWidth: 32 }, 4: { cellWidth: 52 }, 5: { cellWidth: 24 }, 6: { cellWidth: 34 } }
      : { 0: { cellWidth: 58, halign: "left" }, 1: { cellWidth: 30 }, 2: { cellWidth: 24 }, 3: { cellWidth: 34 }, 4: { cellWidth: 56 }, 5: { cellWidth: 34 } };

    doc.autoTable({
      head: [headers],
      body,
      startY: 29,
      theme: "grid",
      margin: { left: margemHorizontal, right: margemHorizontal },
      tableWidth: "wrap",
      styles: { fontSize: 8, cellPadding: 2, minCellHeight: 8, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: [47, 107, 88], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
      columnStyles,
      didDrawPage: function () {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 12, pageHeight - 6, { align: "right" });
      }
    });
  });

  doc.save(nomeArquivo);
  return nomeArquivo;
}

function exportarExcelCorrida(corrida, secoes, filtro) {
  const workbook = XLSX.utils.book_new();
  const incluirPrioridade = false;
  const incluirNumeracao = corridaPossuiPatrocinioTenis(corrida);
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-${filtro === "2" ? "por-tipo" : filtro === "3" ? "por-data" : "lista-geral"}.xlsx`;

  secoes.forEach((secao, index) => {
    const dados = montarLinhasExportacao(secao.inscritos, incluirPrioridade, incluirNumeracao);
    const headers = [
      "Nome",
      "CPF",
      "RG",
      "Celular/Whatsapp",
      "Chave PIX",
      ...(incluirNumeracao ? ["Numeração"] : []),
      "Dias disponíveis",
      ...(incluirPrioridade ? ["Prioridade"] : []),
      "Assinatura"
    ];
    const worksheet = XLSX.utils.json_to_sheet(dados, { header: headers, origin: "A4" });
    const ultimaColuna = headers.length - 1;
    XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome], [secao.subtitulo || secao.titulo]], { origin: "A1" });
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColuna } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColuna } }
    ];
    worksheet["!cols"] = headers.map(header => ({ wch: ({ Nome: 40, CPF: 18, RG: 16, "Celular/Whatsapp": 22, "Chave PIX": 28, "Numeração": 12, "Dias disponíveis": 42, Assinatura: 24, Prioridade: 20 }[header] || 20) }));
    const nomeAba = (secao.titulo || `Lista ${index + 1}`).replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || `Lista ${index + 1}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  });

  XLSX.writeFile(workbook, nomeArquivo);
  return nomeArquivo;
}

function agruparTenisPorNumeracao(inscritos) {
  const mapa = new Map();
  (inscritos || []).forEach(inscrito => {
    const numero = obterNumeracaoStaff(inscrito.staff) || "Não informado";
    mapa.set(numero, (mapa.get(numero) || 0) + 1);
  });
  return Array.from(mapa.entries())
    .map(([numero, quantidade]) => ({ numero, quantidade }))
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero), "pt-BR", { numeric: true }));
}

function exportarPDFResumoTenis(corrida, inscritos) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
  const resumo = agruparTenisPorNumeracao(inscritos);
  if (resumo.length === 0) throw new Error("Não há inscritos para gerar o relatório de tênis.");

  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-resumo-tenis.pdf`;
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
  doc.save(nomeArquivo);
  return nomeArquivo;
}

function exportarExcelResumoTenis(corrida, inscritos) {
  const resumo = agruparTenisPorNumeracao(inscritos);
  if (!resumo.length) throw new Error("Não há inscritos para gerar o relatório de tênis.");
  const dados = resumo.map(item => ({ "Numeração": item.numero, "Quantidade de pares": item.quantidade }));
  const worksheet = XLSX.utils.json_to_sheet(dados, { origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome || "Corrida"], ["Resumo de tênis por numeração"]], { origin: "A1" });
  worksheet["!cols"] = [{ wch: 18 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo tênis");
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-resumo-tenis.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
  return nomeArquivo;
}

function montarLinhasTabelaNumeracao4Colunas(inscritos, maxLinhasPorColuna = 28) {
  const lista = ordenarInscritosAlfabetico(inscritos || []);
  const limiteColuna = Math.max(1, Number(maxLinhasPorColuna) || 28);
  const linhas = [];

  // Preenchimento em fluxo de página: primeiro ocupa a coluna esquerda até o limite
  // físico da página. Só depois continua na coluna direita.
  for (let inicioBloco = 0; inicioBloco < lista.length; inicioBloco += limiteColuna * 2) {
    const colunaEsquerda = lista.slice(inicioBloco, inicioBloco + limiteColuna);
    const colunaDireita = lista.slice(inicioBloco + limiteColuna, inicioBloco + limiteColuna * 2);
    const totalLinhasBloco = Math.max(colunaEsquerda.length, colunaDireita.length);

    for (let i = 0; i < totalLinhasBloco; i++) {
      const staffA = colunaEsquerda[i] ? (colunaEsquerda[i].staff || {}) : null;
      const staffB = colunaDireita[i] ? (colunaDireita[i].staff || {}) : null;

      linhas.push([
        staffA ? (staffA.nome_completo || "") : "",
        staffA ? (obterNumeracaoStaff(staffA) || "Não informado") : "",
        staffB ? (staffB.nome_completo || "") : "",
        staffB ? (obterNumeracaoStaff(staffB) || "Não informado") : ""
      ]);
    }
  }

  return linhas;
}

function exportarPDFTabelaNumeracao(corrida, inscritos) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
  const lista = ordenarInscritosAlfabetico(inscritos || []);
  if (!lista.length) throw new Error("Não há inscritos para gerar a tabela de numeração.");

  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.pdf`;
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(corrida.nome || "Corrida", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Tabela de numeração", pageWidth / 2, 26, { align: "center" });
  const startY = 36;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margemInferior = 14;
  const alturaLinhaEstimativa = 7.1;
  const maxLinhasPorColuna = Math.max(1, Math.floor((pageHeight - startY - margemInferior) / alturaLinhaEstimativa));

  doc.autoTable({
    head: [["Nome", "Número", "Nome", "Número"]],
    body: montarLinhasTabelaNumeracao4Colunas(lista, maxLinhasPorColuna),
    startY,
    theme: "grid",
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8.5, cellPadding: 2.2, halign: "center", valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [47, 107, 88], textColor: [255,255,255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 72, halign: "left" }, 1: { cellWidth: 23 }, 2: { cellWidth: 72, halign: "left" }, 3: { cellWidth: 23 } }
  });
  doc.save(nomeArquivo);
  return nomeArquivo;
}

function exportarExcelTabelaNumeracao(corrida, inscritos) {
  const lista = ordenarInscritosAlfabetico(inscritos || []);
  if (!lista.length) throw new Error("Não há inscritos para gerar a tabela de numeração.");
  const dados = montarLinhasTabelaNumeracao4Colunas(lista, 40);
  const worksheet = XLSX.utils.aoa_to_sheet([[corrida.nome || "Corrida"], ["Tabela de numeração"], [], ["Nome", "Número", "Nome", "Número"], ...dados]);
  worksheet["!cols"] = [{ wch: 42 }, { wch: 12 }, { wch: 42 }, { wch: 12 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela numeração");
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-tabela-numeracao.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
  return nomeArquivo;
}

async function exportarTabelaNumeracaoTenis(corridaId, formato = "pdf") {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  if (!corridaPossuiPatrocinioTenis(dadosExportacao.corrida)) {
    throw new Error("Esta corrida não está marcada como patrocinada por tênis.");
  }
  const secoes = montarSecoesTabelaNumeracao(dadosExportacao.inscritos);
  const inscritos = secoes[0].inscritos;
  return formato === "excel"
    ? exportarExcelTabelaNumeracao(dadosExportacao.corrida, inscritos)
    : exportarPDFTabelaNumeracao(dadosExportacao.corrida, inscritos);
}


function montarSubtituloListaEmBranco(corrida) {
  const inicio = formatarData(corrida.data_inicio || corrida.data_corrida || "");
  const fim = formatarData(corrida.data_fim || corrida.data_corrida || "");
  if (inicio && fim && inicio !== fim) return `Lista em branco - De ${inicio} a ${fim}`;
  if (inicio) return `Lista em branco - ${inicio}`;
  return "Lista em branco";
}

function exportarPDFRelatorioEmBranco(corrida) {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");

  const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const incluirNumeracao = corridaPossuiPatrocinioTenis(corrida);
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-lista-em-branco.pdf`;

  const headers = [
    "Nome",
    "CPF",
    "RG",
    "Celular/Whatsapp",
    "Chave PIX",
    ...(incluirNumeracao ? ["Numeração"] : []),
    "Assinatura"
  ];

  const startY = 31;
  const marginLeft = 8;
  const marginRight = 8;
  const bottomMargin = 12;
  const alturaCabecalho = 8;
  // Mantém a lista em branco em uma única página.
  // A versão anterior deixava a tabela passar alguns pixels e o autoTable criava uma 2ª página só com cabeçalho.
  const linhas = 18;
  const alturaLinha = Math.floor(((pageHeight - startY - bottomMargin - alturaCabecalho) / linhas) * 10) / 10;
  const body = Array.from({ length: linhas }, () => headers.map(() => ""));

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(corrida.nome || "Corrida", pageWidth / 2, 16, { align: "center" });
  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(montarSubtituloListaEmBranco(corrida), pageWidth / 2, 23, { align: "center" });

  const columnStyles = incluirNumeracao
    ? { 0: { cellWidth: 58, halign: "left" }, 1: { cellWidth: 30 }, 2: { cellWidth: 24 }, 3: { cellWidth: 35 }, 4: { cellWidth: 52 }, 5: { cellWidth: 25 }, 6: { cellWidth: 55 } }
    : { 0: { cellWidth: 62, halign: "left" }, 1: { cellWidth: 32 }, 2: { cellWidth: 26 }, 3: { cellWidth: 38 }, 4: { cellWidth: 58 }, 5: { cellWidth: 62 } };

  doc.autoTable({
    head: [headers],
    body,
    startY,
    theme: "grid",
    margin: { left: marginLeft, right: marginRight, bottom: bottomMargin },
    tableWidth: "wrap",
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    showHead: "firstPage",
    styles: { fontSize: 7.6, cellPadding: 0.8, minCellHeight: alturaLinha, halign: "center", valign: "middle", overflow: "linebreak", lineWidth: 0.12 },
    headStyles: { fillColor: [47, 107, 88], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle", minCellHeight: alturaCabecalho, cellPadding: 0.8 },
    columnStyles
  });

  // Defesa extra: se alguma versão do autoTable ainda criar página vazia/cabeçalho residual, remove as páginas excedentes.
  while (doc.getNumberOfPages && doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  doc.save(nomeArquivo);
  return nomeArquivo;
}

async function exportarRelatorioEmBranco(corridaId) {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  return exportarPDFRelatorioEmBranco(dadosExportacao.corrida);
}

async function exportarInscritosCorrida(corridaId, opcoes) {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  if (opcoes.filtro === "4") {
    if (!corridaPossuiPatrocinioTenis(dadosExportacao.corrida)) {
      throw new Error("Esta corrida não está marcada como patrocinada por tênis.");
    }
    return opcoes.formato === "pdf"
      ? exportarPDFResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos)
      : exportarExcelResumoTenis(dadosExportacao.corrida, dadosExportacao.inscritos);
  }
  const secoes = montarSecoesExportacao(dadosExportacao, opcoes.filtro);
  if (secoes.every(secao => secao.inscritos.length === 0)) throw new Error("Não há inscritos para exportar.");
  return opcoes.formato === "pdf"
    ? exportarPDFCorrida(dadosExportacao.corrida, secoes, opcoes.filtro)
    : exportarExcelCorrida(dadosExportacao.corrida, secoes, opcoes.filtro);
}

function exportarExcelPagamentosPix(corrida, pagamentos) {
  const dados = pagamentos.map(pagamento => {
    const staff = pagamento.staff || {};
    const dias = pagamento.dias.length ? pagamento.dias.map(dia => `${dia.nome || dia.tipo || "Dia"} (${formatarMoeda(dia.valor_ajuda_custo)})`).join("; ") : "";
    return { Nome: staff.nome_completo || "", CPF: staff.cpf || "", Banco: "", "Tipo Pix": pagamento.tipoPix || "", "Chave Pix": staff.chave_pix || pagamento.chavePixQRCode || "", Cidade: staff.cidade || "", Valor: Number(pagamento.valorTotal || 0), "Código Pix copia e cola": pagamento.payloadPix || "", Dias: dias, Status: "" };
  });
  const headers = ["Nome", "CPF", "Banco", "Tipo Pix", "Chave Pix", "Cidade", "Valor", "Código Pix copia e cola", "Dias", "Status"];
  const worksheet = XLSX.utils.json_to_sheet(dados, { header: headers, origin: "A4" });
  XLSX.utils.sheet_add_aoa(worksheet, [[corrida.nome || "Corrida"], ["Relatório de Pagamento Pix"]], { origin: "A1" });
  worksheet["!cols"] = headers.map(header => ({ wch: ({ Nome: 38, CPF: 18, Banco: 18, "Tipo Pix": 14, "Chave Pix": 32, Cidade: 24, Valor: 14, "Código Pix copia e cola": 90, Dias: 44, Status: 14 }[header] || 20) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pagamentos Pix");
  const nomeArquivo = `${nomeArquivoSeguro(corrida.nome)}-pagamentos-pix.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
  return nomeArquivo;
}

async function exportarRelatorioPagamentoPix(corridaId, formato = "pdf") {
  const dadosExportacao = await buscarDadosExportacao(corridaId);
  const pagamentos = montarPagamentosPix(dadosExportacao);
  if (!pagamentos.length) throw new Error("Não há staffs confirmados para gerar pagamento Pix.");
  if (formato === "excel") return exportarExcelPagamentosPix(dadosExportacao.corrida, pagamentos);

  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) throw new Error("Biblioteca de PDF não carregada. Confira sua conexão e tente novamente.");
  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nomeArquivo = `${nomeArquivoSeguro(dadosExportacao.corrida.nome)}-pagamentos-pix.pdf`;
  let y = 14;
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("Relatório de Pagamento Pix", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(dadosExportacao.corrida.nome || "Corrida", pageWidth / 2, y, { align: "center" });
  y += 8;

  for (let index = 0; index < pagamentos.length; index++) {
    const pagamento = pagamentos[index];
    const staff = pagamento.staff || {};
    const alturaBloco = 46;
    if (y + alturaBloco > pageHeight - 8) {
      doc.addPage();
      y = 12;
    }
    const x = 10;
    const largura = pageWidth - 20;
    const qrDataUrl = await gerarQRCodeDataURLPix(pagamento.payloadPix);
    const diasTexto = pagamento.dias.length ? pagamento.dias.map(dia => dia.nome || dia.tipo || "Dia").join("; ") : "Nenhum dia encontrado";
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, largura, alturaBloco, 2.5, 2.5, "FD");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(staff.nome_completo || "Nome não informado", x + 4, y + 6);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.text(`CPF: ${staff.cpf || "Não informado"}`, x + 4, y + 11);
    doc.text(`Pix: ${pagamento.tipoPix || ""} - ${staff.chave_pix || "Não informada"}`, x + 4, y + 16, { maxWidth: 112 });
    doc.text(`Dias: ${diasTexto}`, x + 4, y + 21, { maxWidth: 112 });
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(`Total: ${formatarMoeda(pagamento.valorTotal)}`, x + 4, y + 28);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.text("Pago: (   ) Sim    (   ) Não", x + 4, y + 34);
    doc.text("Copia e cola:", x + 4, y + 40);
    doc.text(pagamento.payloadPix || "Código indisponível", x + 26, y + 40, { maxWidth: 115 });

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", x + largura - 36, y + 7, 28, 28);
      doc.setFontSize(6.5);
      doc.text("Pix QR Code", x + largura - 22, y + 39, { align: "center" });
    }
    y += alturaBloco + 4;
  }
  doc.save(nomeArquivo);
  return nomeArquivo;
}

/* v185 - tabela de numeração usa fluxo por altura de página: preenche a primeira coluna até o limite antes de iniciar a segunda. */

/* v185 - lista em branco com 18 linhas em uma única página. */
