const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const params = new URLSearchParams(location.search);
const corridaId = params.get("corrida");
const diaId = params.get("dia");
const TOLERANCIA_MINUTOS = 30;
let registrosDashboard = [];
let contextoDashboard = { corrida: null, dia: null };

const el = (id) => document.getElementById(id);
const lista = el("dashboardLista");
const busca = el("buscaCheckin");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarDataBR(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = String(dataIso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

function formatarHoraBR(valorIso) {
  if (!valorIso) return "-";
  try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(valorIso)); }
  catch { return "-"; }
}

function minutosDoHorario(hora) {
  if (!hora) return null;
  const partes = String(hora).split(":").map(Number);
  if (partes.length < 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  return partes[0] * 60 + partes[1];
}
function minutosDoDate(date) { return date.getHours() * 60 + date.getMinutes(); }
function estaForaDoHorario(checkinIso, dia) {
  const inicio = minutosDoHorario(dia && dia.horario_inicio);
  if (inicio === null || !checkinIso) return false;
  return minutosDoDate(new Date(checkinIso)) > inicio + TOLERANCIA_MINUTOS;
}
function setText(id, value) { const node = el(id); if (node) node.textContent = value; }
function normalizarStatusInscricao(status) { return String(status || "").trim().toLowerCase(); }

function obterBaseUrlSistema() {
  const basePath = window.location.pathname.replace(/[^/]*$/, "");
  return `${window.location.origin}${basePath}`;
}
function gerarTokenCheckinLocal() {
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(24);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
async function gerarQRCodeDataURL(url, width = 260) {
  if (!window.QRCode || !window.QRCode.toDataURL) throw new Error("Biblioteca de QR Code não carregada.");
  return await window.QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width });
}

async function buscarStaffsDoDia() {
  const { data: corrida, error: erroCorrida } = await supabaseClient.from("corridas").select("id, nome, local").eq("id", corridaId).maybeSingle();
  if (erroCorrida || !corrida) throw new Error("Não foi possível carregar a corrida.");

  const { data: dia, error: erroDia } = await supabaseClient.from("corrida_dias").select("id, corrida_id, nome, tipo, data_dia, horario_inicio, horario_fim").eq("id", diaId).maybeSingle();
  if (erroDia || !dia) throw new Error("Não foi possível carregar o dia da corrida.");

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient.from("inscricoes").select("id, corrida_id, staff_id, status, staffs(id, nome_completo, cidade)").eq("corrida_id", corridaId).eq("status", "confirmado");
  if (erroInscricoes) throw new Error("Não foi possível buscar os confirmados.");

  const idsInscricao = (inscricoes || []).map((item) => item.id);
  let disponibilidades = [];
  if (idsInscricao.length) {
    const { data, error } = await supabaseClient.from("inscricao_disponibilidades").select("inscricao_id, corrida_dia_id, disponivel").eq("corrida_dia_id", diaId).in("inscricao_id", idsInscricao);
    if (error) throw new Error("Não foi possível buscar a disponibilidade do dia.");
    disponibilidades = data || [];
  }

  const disponiveis = new Set(disponibilidades.filter((item) => item.disponivel !== false).map((item) => String(item.inscricao_id)));
  const staffsDoDia = (inscricoes || [])
    .filter((item) => normalizarStatusInscricao(item.status) === "confirmado")
    .filter((item) => disponiveis.has(String(item.id)))
    .map((item) => ({ inscricao_id: item.id, staff_id: item.staff_id, nome: (item.staffs && item.staffs.nome_completo) || "Staff", cidade: (item.staffs && item.staffs.cidade) || "" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { corrida, dia, staffsDoDia };
}

async function garantirTokensCheckin(corrida, dia, staffsDoDia) {
  if (!staffsDoDia.length) return new Map();
  const { data: tokensExistentes, error: erroTokens } = await supabaseClient.from("checkin_tokens").select("id, token, staff_id, inscricao_id, corrida_dia_id").eq("corrida_dia_id", dia.id);
  if (erroTokens) throw new Error("Não foi possível acessar os tokens de check-in.");
  const mapa = new Map((tokensExistentes || []).map((t) => [String(t.staff_id), t]));
  const novos = staffsDoDia.filter((s) => !mapa.has(String(s.staff_id))).map((s) => ({ corrida_id: corrida.id, corrida_dia_id: dia.id, inscricao_id: s.inscricao_id, staff_id: s.staff_id, token: gerarTokenCheckinLocal(), ativo: true }));
  if (novos.length) {
    const { data: criados, error } = await supabaseClient.from("checkin_tokens").insert(novos).select("id, token, staff_id, inscricao_id, corrida_dia_id");
    if (error) throw new Error("Não foi possível criar tokens de check-in. Confira as policies/RLS.");
    (criados || []).forEach((t) => mapa.set(String(t.staff_id), t));
  }
  return mapa;
}

async function carregar() {
  if (!corridaId || !diaId) { if (lista) lista.innerHTML = '<div class="dashboard-empty">Link inválido. Volte ao admin e abra o dashboard pelo dia da corrida.</div>'; return; }
  try {
    setText("btnAtualizar", "Atualizando...");
    const { corrida, dia, staffsDoDia } = await buscarStaffsDoDia();
    contextoDashboard = { corrida, dia };
    const mapaTokens = await garantirTokensCheckin(corrida, dia, staffsDoDia);

    const { data: checkins, error: erroCheckins } = await supabaseClient.from("checkins").select("id, corrida_dia_id, staff_id, tipo, status, checkin_at").eq("corrida_dia_id", diaId).eq("tipo", "entrada");
    if (erroCheckins) throw new Error("Não foi possível carregar os check-ins. Confira as policies/RLS.");
    const mapaCheckins = new Map((checkins || []).map((item) => [String(item.staff_id), item]));

    registrosDashboard = staffsDoDia.map((staff) => {
      const checkin = mapaCheckins.get(String(staff.staff_id));
      const token = mapaTokens.get(String(staff.staff_id));
      const presente = !!checkin;
      const atrasado = presente && estaForaDoHorario(checkin.checkin_at, dia);
      return { ...staff, token: token && token.token, checkin, presente, atrasado, status: presente ? (atrasado ? "Fora do horário" : "Presente") : "Pendente", classe: presente ? (atrasado ? "late" : "ok") : "pending", horario: presente ? formatarHoraBR(checkin.checkin_at) : "—" };
    });

    const confirmados = registrosDashboard.length;
    const presentes = registrosDashboard.filter((item) => item.presente).length;
    const atrasados = registrosDashboard.filter((item) => item.atrasado).length;
    const pendentes = Math.max(confirmados - presentes, 0);
    const percentual = confirmados ? Math.round((presentes / confirmados) * 100) : 0;
    setText("statConfirmados", confirmados); setText("statPresentes", presentes); setText("statPendentes", pendentes); setText("statAtrasados", atrasados);
    const progress = el("dashboardProgressBar"); if (progress) progress.style.width = `${percentual}%`;
    const eyebrow = document.querySelector(".checkin-eyebrow"); if (eyebrow) eyebrow.textContent = `${corrida.nome || "Corrida"} · ${dia.nome || dia.tipo || "Dia"} · ${formatarDataBR(dia.data_dia)}`;
    renderizarLista();
  } catch (error) {
    console.error("Erro no dashboard de check-in:", error);
    if (lista) lista.innerHTML = `<div class="dashboard-empty">${escapeHtml(error.message || "Não foi possível carregar o dashboard.")}</div>`;
  } finally { setText("btnAtualizar", "Atualizar"); }
}

function renderizarLista() {
  const termo = String((busca && busca.value) || "").trim().toLowerCase();
  const filtrados = registrosDashboard.filter((item) => !termo || `${item.nome} ${item.status} ${item.horario}`.toLowerCase().includes(termo));
  if (!lista) return;
  if (!filtrados.length) { lista.innerHTML = '<div class="dashboard-empty">Nenhum staff encontrado para este filtro.</div>'; return; }
  lista.innerHTML = filtrados.map((item) => {
    const botaoQr = !item.presente ? `<button type="button" class="dashboard-qr-toggle" data-staff-id="${item.staff_id}" title="Mostrar QR de check-in" aria-label="Mostrar QR de check-in">▦</button>` : `<span class="dashboard-qr-placeholder">✓</span>`;
    return `
      <div class="dashboard-item ${item.classe}" data-staff-id="${item.staff_id}" ${!item.presente ? 'role="button" tabindex="0" aria-label="Abrir QR de check-in de '+escapeHtml(item.nome)+'"' : ''}>
        <div class="dashboard-item-main">
          ${botaoQr}
          <div>
            <strong>${escapeHtml(item.nome)}</strong>
            <small>${escapeHtml(item.status)}${item.cidade ? ` · ${escapeHtml(item.cidade)}` : ""}</small>
          </div>
        </div>
        <div class="dashboard-item-hora">${escapeHtml(item.horario)}</div>
        <div class="dashboard-qr-collapse" id="qr-staff-${item.staff_id}" hidden>
          <div class="dashboard-qr-box"><div class="dashboard-qr-img" data-token="${escapeHtml(item.token || "")}"></div><p>Aponte a câmera do celular para realizar o check-in.</p></div>
        </div>
      </div>`;
  }).join("");
  lista.querySelectorAll(".dashboard-qr-toggle").forEach((btn) => btn.addEventListener("click", (event) => {
    event.stopPropagation();
    alternarQrStaff(btn.dataset.staffId);
  }));
  lista.querySelectorAll(".dashboard-item[data-staff-id]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      const item = registrosDashboard.find((r) => String(r.staff_id) === String(card.dataset.staffId));
      if (!item || item.presente) return;
      alternarQrStaff(card.dataset.staffId);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const item = registrosDashboard.find((r) => String(r.staff_id) === String(card.dataset.staffId));
      if (!item || item.presente) return;
      event.preventDefault();
      alternarQrStaff(card.dataset.staffId);
    });
  });
}

async function alternarQrStaff(staffId) {
  const box = document.getElementById(`qr-staff-${staffId}`);
  if (!box) return;
  const willOpen = box.hidden;
  document.querySelectorAll(".dashboard-qr-collapse").forEach((item) => { if (item !== box) item.hidden = true; });
  box.hidden = !willOpen;
  if (!willOpen) return;
  const item = registrosDashboard.find((r) => String(r.staff_id) === String(staffId));
  if (!item || !item.token) { box.innerHTML = '<div class="dashboard-empty">Token de check-in indisponível.</div>'; return; }
  const imgWrap = box.querySelector(".dashboard-qr-img");
  if (imgWrap && !imgWrap.dataset.rendered) {
    const url = `${obterBaseUrlSistema()}checkin.html?t=${encodeURIComponent(item.token)}`;
    const dataUrl = await gerarQRCodeDataURL(url, 320);
    imgWrap.innerHTML = `<img src="${dataUrl}" alt="QR Code de check-in de ${escapeHtml(item.nome)}">`;
    imgWrap.dataset.rendered = "1";
  }
}

function gerarPDFRelatorio() {
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFConstructor) { window.print(); return; }
  const { corrida, dia } = contextoDashboard;
  const doc = new jsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const presentes = registrosDashboard.filter((r) => r.presente).length;
  const pendentes = registrosDashboard.filter((r) => !r.presente).length;
  const atrasados = registrosDashboard.filter((r) => r.atrasado).length;
  const total = registrosDashboard.length;
  const perc = total ? Math.round((presentes / total) * 100) : 0;
  doc.setFillColor(17, 24, 39); doc.rect(0,0,pageW,30,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("RCP STAFF · RELATÓRIO DE PRESENÇA", margin, 11);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.text(`${(corrida && corrida.nome) || "Corrida"} · ${(dia && (dia.nome || dia.tipo)) || "Dia"} · ${formatarDataBR(dia && dia.data_dia)}`, margin, 18);
  doc.text(`Confirmados: ${total}  |  Presentes: ${presentes}  |  Pendentes: ${pendentes}  |  Fora do horário: ${atrasados}  |  Presença: ${perc}%`, margin, 25);
  let y = 40;
  doc.setTextColor(17,24,39); doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("Nome", margin, y); doc.text("Status", 105, y); doc.text("Check-in", 160, y);
  y += 3; doc.setDrawColor(203,213,225); doc.line(margin, y, pageW-margin, y); y += 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  registrosDashboard.forEach((r) => {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.setTextColor(17,24,39); doc.text(doc.splitTextToSize(r.nome, 85), margin, y);
    doc.setTextColor(r.classe === "late" ? 180 : r.classe === "ok" ? 20 : 90, r.classe === "late" ? 83 : r.classe === "ok" ? 140 : 90, r.classe === "late" ? 9 : r.classe === "ok" ? 70 : 90);
    doc.text(r.status, 105, y);
    doc.setTextColor(17,24,39); doc.text(r.horario, 160, y);
    y += 7;
  });
  const nomeArquivo = `presenca-${((corrida && corrida.nome) || "corrida").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${(dia && dia.data_dia) || "dia"}.pdf`;
  doc.save(nomeArquivo);
}

if (el("btnAtualizar")) el("btnAtualizar").onclick = carregar;
if (el("btnPdf")) el("btnPdf").onclick = gerarPDFRelatorio;
if (busca) busca.addEventListener("input", renderizarLista);
setInterval(carregar, 15000);
carregar();
