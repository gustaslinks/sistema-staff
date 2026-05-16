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
  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

function formatarHoraBR(valorIso) {
  if (!valorIso) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(valorIso));
  } catch (error) {
    return "-";
  }
}

function minutosDoHorario(hora) {
  if (!hora) return null;
  const partes = String(hora).split(":").map(Number);
  if (partes.length < 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  return partes[0] * 60 + partes[1];
}

function minutosDoDate(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function estaForaDoHorario(checkinIso, dia) {
  const inicio = minutosDoHorario(dia && dia.horario_inicio);
  if (inicio === null || !checkinIso) return false;
  const feito = minutosDoDate(new Date(checkinIso));
  return feito > inicio + TOLERANCIA_MINUTOS;
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function normalizarStatusInscricao(status) {
  return String(status || "").trim().toLowerCase();
}

async function buscarStaffsDoDia() {
  const { data: corrida, error: erroCorrida } = await supabaseClient
    .from("corridas")
    .select("id, nome, local")
    .eq("id", corridaId)
    .maybeSingle();
  if (erroCorrida || !corrida) throw new Error("Não foi possível carregar a corrida.");

  const { data: dia, error: erroDia } = await supabaseClient
    .from("corrida_dias")
    .select("id, corrida_id, nome, tipo, data_dia, horario_inicio, horario_fim")
    .eq("id", diaId)
    .maybeSingle();
  if (erroDia || !dia) throw new Error("Não foi possível carregar o dia da corrida.");

  const { data: inscricoes, error: erroInscricoes } = await supabaseClient
    .from("inscricoes")
    .select("id, corrida_id, staff_id, status, staffs(id, nome_completo, cidade)")
    .eq("corrida_id", corridaId)
    .eq("status", "confirmado");
  if (erroInscricoes) throw new Error("Não foi possível buscar os confirmados.");

  const idsInscricao = (inscricoes || []).map((item) => item.id);
  let disponibilidades = [];
  if (idsInscricao.length) {
    const { data, error } = await supabaseClient
      .from("inscricao_disponibilidades")
      .select("inscricao_id, corrida_dia_id, disponivel")
      .eq("corrida_dia_id", diaId)
      .in("inscricao_id", idsInscricao);
    if (error) throw new Error("Não foi possível buscar a disponibilidade do dia.");
    disponibilidades = data || [];
  }

  const disponiveis = new Set(
    disponibilidades
      .filter((item) => item.disponivel !== false)
      .map((item) => String(item.inscricao_id))
  );

  const staffsDoDia = (inscricoes || [])
    .filter((item) => normalizarStatusInscricao(item.status) === "confirmado")
    .filter((item) => disponiveis.has(String(item.id)))
    .map((item) => ({
      inscricao_id: item.id,
      staff_id: item.staff_id,
      nome: (item.staffs && item.staffs.nome_completo) || "Staff",
      cidade: (item.staffs && item.staffs.cidade) || ""
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { corrida, dia, staffsDoDia };
}

async function carregar() {
  if (!corridaId || !diaId) {
    if (lista) lista.innerHTML = '<div class="dashboard-empty">Link inválido. Volte ao admin e abra o dashboard pelo dia da corrida.</div>';
    return;
  }

  try {
    setText("btnAtualizar", "Atualizando...");
    const { corrida, dia, staffsDoDia } = await buscarStaffsDoDia();

    const { data: checkins, error: erroCheckins } = await supabaseClient
      .from("checkins")
      .select("id, corrida_dia_id, staff_id, tipo, status, checkin_at")
      .eq("corrida_dia_id", diaId)
      .eq("tipo", "entrada");
    if (erroCheckins) throw new Error("Não foi possível carregar os check-ins. Confira as policies/RLS.");

    const mapaCheckins = new Map((checkins || []).map((item) => [String(item.staff_id), item]));

    registrosDashboard = staffsDoDia.map((staff) => {
      const checkin = mapaCheckins.get(String(staff.staff_id));
      const presente = !!checkin;
      const atrasado = presente && estaForaDoHorario(checkin.checkin_at, dia);
      return {
        ...staff,
        checkin,
        presente,
        atrasado,
        status: presente ? (atrasado ? "Fora do horário" : "Presente") : "Pendente",
        classe: presente ? (atrasado ? "late" : "ok") : "pending",
        horario: presente ? formatarHoraBR(checkin.checkin_at) : "—"
      };
    });

    const confirmados = registrosDashboard.length;
    const presentes = registrosDashboard.filter((item) => item.presente).length;
    const atrasados = registrosDashboard.filter((item) => item.atrasado).length;
    const pendentes = Math.max(confirmados - presentes, 0);
    const percentual = confirmados ? Math.round((presentes / confirmados) * 100) : 0;

    setText("statConfirmados", confirmados);
    setText("statPresentes", presentes);
    setText("statPendentes", pendentes);
    setText("statAtrasados", atrasados);

    const progress = el("dashboardProgressBar");
    if (progress) progress.style.width = `${percentual}%`;

    const titulo = document.querySelector(".dashboard-card h1");
    if (titulo) titulo.textContent = "Dashboard de Check-in";
    const eyebrow = document.querySelector(".checkin-eyebrow");
    if (eyebrow) eyebrow.textContent = `${corrida.nome || "Corrida"} · ${dia.nome || dia.tipo || "Dia"} · ${formatarDataBR(dia.data_dia)}`;

    renderizarLista();
  } catch (error) {
    console.error("Erro no dashboard de check-in:", error);
    if (lista) lista.innerHTML = `<div class="dashboard-empty">${escapeHtml(error.message || "Não foi possível carregar o dashboard.")}</div>`;
  } finally {
    setText("btnAtualizar", "Atualizar");
  }
}

function renderizarLista() {
  const termo = String((busca && busca.value) || "").trim().toLowerCase();
  const filtrados = registrosDashboard.filter((item) => !termo || `${item.nome} ${item.status} ${item.horario}`.toLowerCase().includes(termo));
  if (!lista) return;
  if (!filtrados.length) {
    lista.innerHTML = '<div class="dashboard-empty">Nenhum staff encontrado para este filtro.</div>';
    return;
  }
  lista.innerHTML = filtrados.map((item) => `
    <div class="dashboard-item ${item.classe}">
      <div>
        <strong>${escapeHtml(item.nome)}</strong>
        <small>${escapeHtml(item.status)}${item.cidade ? ` · ${escapeHtml(item.cidade)}` : ""}</small>
      </div>
      <div class="dashboard-item-hora">${escapeHtml(item.horario)}</div>
    </div>
  `).join("");
}

function imprimirRelatorio() {
  window.print();
}

if (el("btnAtualizar")) el("btnAtualizar").onclick = carregar;
if (el("btnPdf")) el("btnPdf").onclick = imprimirRelatorio;
if (busca) busca.addEventListener("input", renderizarLista);

setInterval(carregar, 15000);
carregar();
