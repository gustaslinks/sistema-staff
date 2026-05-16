const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const titleEl = document.getElementById("checkinTitle");
const messageEl = document.getElementById("checkinMessage");
const detailsEl = document.getElementById("checkinDetails");
const iconEl = document.getElementById("checkinStatusIcon");
const primaryAction = document.getElementById("checkinPrimaryAction");

function setCheckinState(type, title, message, detailsHtml = "") {
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (iconEl) iconEl.className = `checkin-status-icon is-${type}`;
  if (detailsEl) {
    detailsEl.innerHTML = detailsHtml || "";
    detailsEl.classList.toggle("hidden", !detailsHtml);
  }
  if (primaryAction) primaryAction.classList.toggle("hidden", type === "loading");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

function obterTokenUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("t") || params.get("token") || "").trim();
}

function redirectLoginComRetorno() {
  const atual = `${window.location.pathname.split('/').pop() || 'checkin.html'}${window.location.search}`;
  window.location.replace(`index.html?redirect=${encodeURIComponent(atual)}`);
}

async function carregarStaffDaSessao(userId) {
  const { data, error } = await supabaseClient
    .from("staffs")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Seu login não está vinculado a um cadastro de staff.");
  localStorage.setItem("staffLogado", JSON.stringify({
    ...data,
    is_admin: data.is_admin === true || data.is_admin === "true" || data.is_admin === 1 || data.is_admin === "1"
  }));
  return data;
}

async function executarCheckin() {
  const token = obterTokenUrl();
  if (!token) {
    setCheckinState("error", "QR Code inválido", "Este link de check-in não possui um token válido. Peça para a coordenação gerar a lista novamente.");
    return;
  }

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData && userData.user;
  if (!user) {
    sessionStorage.setItem("checkinPendente", window.location.href);
    setCheckinState("loading", "Login necessário", "Você precisa entrar com seu CPF/e-mail e senha para confirmar o check-in.");
    redirectLoginComRetorno();
    return;
  }

  let staff;
  try {
    staff = await carregarStaffDaSessao(user.id);
  } catch (error) {
    setCheckinState("error", "Cadastro não localizado", error.message || "Não foi possível localizar seu cadastro de staff.");
    return;
  }

  const { data: tokenData, error: tokenError } = await supabaseClient
    .from("checkin_tokens")
    .select("id, token, ativo, corrida_id, corrida_dia_id, inscricao_id, staff_id, used_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenData) {
    setCheckinState("error", "QR Code não autorizado", "Este QR não pertence ao seu login ou não está mais disponível. Confira se você leu a linha correta da lista.");
    return;
  }

  if (!tokenData.ativo) {
    setCheckinState("error", "QR Code desativado", "Este QR foi desativado pela coordenação.");
    return;
  }

  if (String(tokenData.staff_id) !== String(staff.id)) {
    setCheckinState("error", "QR de outro staff", "Este QR Code não pertence ao usuário logado neste celular. Entre com o login correto ou leia a sua própria linha na lista.");
    return;
  }

  const { data: dia } = await supabaseClient
    .from("corrida_dias")
    .select("id, nome, tipo, data_dia, horario_inicio, horario_fim")
    .eq("id", tokenData.corrida_dia_id)
    .maybeSingle();

  const { data: corrida } = await supabaseClient
    .from("corridas")
    .select("id, nome")
    .eq("id", tokenData.corrida_id)
    .maybeSingle();

  const { data: existente } = await supabaseClient
    .from("checkins")
    .select("id, checkin_at")
    .eq("corrida_dia_id", tokenData.corrida_dia_id)
    .eq("staff_id", staff.id)
    .eq("tipo", "entrada")
    .maybeSingle();

  const detalhesBase = `
    <dl>
      <div><dt>Staff</dt><dd>${escapeHtml(staff.nome_completo || "")}</dd></div>
      <div><dt>Evento</dt><dd>${escapeHtml((corrida && corrida.nome) || "Corrida")}</dd></div>
      <div><dt>Dia</dt><dd>${escapeHtml((dia && (dia.nome || dia.tipo)) || "Período")} · ${formatarDataBR(dia && dia.data_dia)}</dd></div>
    </dl>
  `;

  if (existente) {
    setCheckinState("success", "Check-in já realizado", `Sua presença já estava registrada às ${formatarHoraBR(existente.checkin_at)}.`, detalhesBase);
    return;
  }

  const payload = {
    corrida_id: tokenData.corrida_id,
    corrida_dia_id: tokenData.corrida_dia_id,
    inscricao_id: tokenData.inscricao_id,
    staff_id: staff.id,
    token_id: tokenData.id,
    tipo: "entrada",
    status: "presente",
    user_agent: navigator.userAgent || null
  };

  const { data: criado, error: insertError } = await supabaseClient
    .from("checkins")
    .insert(payload)
    .select("id, checkin_at")
    .single();

  if (insertError) {
    const msg = String(insertError.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      setCheckinState("success", "Check-in já registrado", "Sua presença já consta no sistema para este dia.", detalhesBase);
      return;
    }
    console.error("Erro ao registrar check-in:", insertError);
    setCheckinState("error", "Não foi possível registrar", "O QR foi validado, mas houve erro ao salvar sua presença. Avise a coordenação.", detalhesBase);
    return;
  }

  try {
    await supabaseClient
      .from("checkin_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);
  } catch (error) {
    console.warn("Não foi possível atualizar used_at do token:", error);
  }

  setCheckinState("success", "Check-in confirmado", `Presença registrada às ${formatarHoraBR(criado && criado.checkin_at)}.`, detalhesBase);
}

executarCheckin().catch((error) => {
  console.error("Erro inesperado no check-in:", error);
  setCheckinState("error", "Erro inesperado", "Não foi possível concluir o check-in agora. Avise a coordenação.");
});
