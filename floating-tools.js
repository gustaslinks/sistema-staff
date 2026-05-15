(function () {
  const WHATSAPP_NUMBER = "5511986238604";
  const WHATSAPP_TEXT = "Olá, tenho uma dúvida sobre o cadastro/inscrição no Sistema Staff.";
  const YESCOM_URL = "https://www.yescom.com.br/site/calendario.html";

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function getPaginaAtual() {
    const arquivo = window.location.pathname.split("/").pop() || "index.html";
    return arquivo.toLowerCase();
  }

  function getStaffLogado() {
    try {
      return JSON.parse(localStorage.getItem("staffLogado") || "null");
    } catch (error) {
      return null;
    }
  }

  function criarBotaoWhatsapp() {
    if (document.querySelector(".floating-whatsapp")) return;

    const link = document.createElement("a");
    link.className = "floating-whatsapp";
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Falar pelo WhatsApp");
    link.innerHTML = `
      <span class="floating-whatsapp-icon" aria-hidden="true">✆</span>
      <span class="floating-whatsapp-text">Dúvidas?</span>
    `;

    document.body.appendChild(link);
  }

  function criarCalendarioAdmin() {
    if (document.querySelector(".floating-calendar-btn")) return;

    const hoje = new Date();
    let mesAtual = hoje.getMonth();
    let anoAtual = hoje.getFullYear();

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "floating-calendar-btn";
    botao.setAttribute("aria-label", "Abrir calendário");
    botao.innerHTML = `<span aria-hidden="true">📅</span>`;

    const modal = document.createElement("div");
    modal.className = "floating-calendar-modal hidden";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="floating-calendar-backdrop" data-fechar-calendario="true"></div>
      <section class="floating-calendar-box" role="dialog" aria-modal="true" aria-labelledby="floating-calendar-title">
        <div class="floating-calendar-header">
          <div>
            <p class="floating-calendar-label">Consulta rápida</p>
            <h2 id="floating-calendar-title">Calendário</h2>
          </div>
          <button type="button" class="floating-calendar-close" data-fechar-calendario="true" aria-label="Fechar calendário">×</button>
        </div>

        <div class="floating-calendar-controls">
          <button type="button" class="floating-calendar-today">Hoje</button>
          <div class="floating-calendar-nav-row">
            <button type="button" class="floating-calendar-nav" data-cal-nav="prev-month">‹ Mês</button>
            <button type="button" class="floating-calendar-nav" data-cal-nav="next-month">Mês ›</button>
          </div>
          <div class="floating-calendar-nav-row">
            <button type="button" class="floating-calendar-nav" data-cal-nav="prev-year">‹ Ano</button>
            <button type="button" class="floating-calendar-nav" data-cal-nav="next-year">Ano ›</button>
          </div>
        </div>

        <div class="floating-calendar-selects">
          <select class="floating-calendar-month" aria-label="Selecionar mês"></select>
          <input class="floating-calendar-year" type="number" min="1900" max="2999" step="1" aria-label="Selecionar ano">
        </div>

        <div class="floating-calendar-grid floating-calendar-weekdays"></div>
        <div class="floating-calendar-grid floating-calendar-days"></div>
      </section>
    `;

    document.body.appendChild(botao);
    document.body.appendChild(modal);

    const titulo = modal.querySelector("#floating-calendar-title");
    const selectMes = modal.querySelector(".floating-calendar-month");
    const inputAno = modal.querySelector(".floating-calendar-year");
    const semanaEl = modal.querySelector(".floating-calendar-weekdays");
    const diasEl = modal.querySelector(".floating-calendar-days");
    const btnHoje = modal.querySelector(".floating-calendar-today");

    meses.forEach((mes, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = mes;
      selectMes.appendChild(option);
    });

    diasSemana.forEach((dia) => {
      const item = document.createElement("div");
      item.className = "floating-calendar-weekday";
      item.textContent = dia;
      semanaEl.appendChild(item);
    });

    function renderizarCalendario() {
      titulo.textContent = `${meses[mesAtual]} ${anoAtual}`;
      selectMes.value = String(mesAtual);
      inputAno.value = String(anoAtual);
      diasEl.innerHTML = "";

      const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
      const totalDias = new Date(anoAtual, mesAtual + 1, 0).getDate();
      const totalDiasMesAnterior = new Date(anoAtual, mesAtual, 0).getDate();

      for (let i = primeiroDia - 1; i >= 0; i--) {
        const dia = document.createElement("div");
        dia.className = "floating-calendar-day muted";
        dia.textContent = String(totalDiasMesAnterior - i);
        diasEl.appendChild(dia);
      }

      for (let diaNumero = 1; diaNumero <= totalDias; diaNumero++) {
        const dia = document.createElement("button");
        dia.type = "button";
        dia.className = "floating-calendar-day";
        dia.textContent = String(diaNumero);

        const ehHoje =
          diaNumero === hoje.getDate() &&
          mesAtual === hoje.getMonth() &&
          anoAtual === hoje.getFullYear();

        if (ehHoje) {
          dia.classList.add("today");
          dia.setAttribute("aria-label", `Hoje, ${diaNumero} de ${meses[mesAtual]} de ${anoAtual}`);
        }

        diasEl.appendChild(dia);
      }

      const resto = diasEl.children.length % 7;
      if (resto !== 0) {
        for (let i = 1; i <= 7 - resto; i++) {
          const dia = document.createElement("div");
          dia.className = "floating-calendar-day muted";
          dia.textContent = String(i);
          diasEl.appendChild(dia);
        }
      }
    }

    function alterarMes(delta) {
      mesAtual += delta;
      if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
      }
      if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
      }
      renderizarCalendario();
    }

    function abrirCalendario() {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      renderizarCalendario();
      setTimeout(() => modal.querySelector(".floating-calendar-close")?.focus(), 0);
    }

    function fecharCalendario() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      botao.focus();
    }

    botao.addEventListener("click", abrirCalendario);

    modal.addEventListener("click", (event) => {
      if (event.target?.dataset?.fecharCalendario === "true") {
        fecharCalendario();
      }
    });

    modal.querySelectorAll("[data-cal-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const acao = btn.dataset.calNav;
        if (acao === "prev-month") alterarMes(-1);
        if (acao === "next-month") alterarMes(1);
        if (acao === "prev-year") {
          anoAtual--;
          renderizarCalendario();
        }
        if (acao === "next-year") {
          anoAtual++;
          renderizarCalendario();
        }
      });
    });

    btnHoje.addEventListener("click", () => {
      mesAtual = hoje.getMonth();
      anoAtual = hoje.getFullYear();
      renderizarCalendario();
    });

    selectMes.addEventListener("change", () => {
      mesAtual = Number(selectMes.value);
      renderizarCalendario();
    });

    inputAno.addEventListener("change", () => {
      const anoDigitado = Number(inputAno.value);
      if (Number.isFinite(anoDigitado) && anoDigitado >= 1900 && anoDigitado <= 2999) {
        anoAtual = anoDigitado;
      } else {
        inputAno.value = String(anoAtual);
      }
      renderizarCalendario();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        fecharCalendario();
      }
    });

    renderizarCalendario();
  }

  function iniciarFloatingTools() {
    const pagina = getPaginaAtual();
    const staff = getStaffLogado();

    if (pagina === "admin.html") {
      criarCalendarioAdmin();
      return;
    }

    if (pagina === "corridas.html") {
      criarBotaoWhatsapp();
      return;
    }

    if (pagina === "cadastro.html") {
      const params = new URLSearchParams(window.location.search);
      const temIdUrl = params.has("id");
      const usuarioAdmin = staff && (staff.is_admin === true || staff.is_admin === "true");

      if (!usuarioAdmin && !temIdUrl) {
        criarBotaoWhatsapp();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarFloatingTools);
  } else {
    iniciarFloatingTools();
  }
})();
