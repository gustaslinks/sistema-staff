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
      <span class="floating-whatsapp-icon" aria-hidden="true">
        <svg class="whatsapp-logo-svg" viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.02 3.35C9.07 3.35 3.43 8.88 3.43 15.68c0 2.18.59 4.3 1.7 6.16L3.38 28.65l7.05-1.78a12.9 12.9 0 0 0 5.59 1.27c6.95 0 12.6-5.53 12.6-12.34S22.97 3.35 16.02 3.35Z" fill="white"/>
          <path d="M16.02 5.24c5.88 0 10.66 4.7 10.66 10.47 0 5.78-4.78 10.48-10.66 10.48-1.78 0-3.53-.44-5.08-1.27l-.36-.2-4.15 1.05 1.02-3.95-.24-.39a10.25 10.25 0 0 1-1.84-5.72c0-5.77 4.78-10.47 10.65-10.47Z" fill="#20C263"/>
          <path d="M12.5 10.15c-.25-.55-.51-.57-.75-.58h-.64c-.22 0-.58.08-.88.4-.3.33-1.16 1.1-1.16 2.7 0 1.58 1.19 3.12 1.35 3.34.16.22 2.3 3.58 5.7 4.88 2.82 1.08 3.4.86 4.02.8.61-.05 1.98-.78 2.26-1.54.28-.76.28-1.4.2-1.54-.08-.14-.3-.22-.64-.38-.33-.16-1.98-.95-2.29-1.06-.3-.1-.52-.16-.75.16-.22.33-.86 1.06-1.05 1.28-.2.22-.39.24-.72.08-.33-.16-1.4-.5-2.67-1.61-.99-.86-1.65-1.93-1.84-2.26-.2-.32-.02-.5.15-.66.15-.14.33-.38.5-.57.16-.19.22-.32.33-.54.11-.22.06-.41-.03-.57-.08-.16-.73-1.73-1.09-2.33Z" fill="white"/>
        </svg>
      </span>
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


  function criarBotaoYescom() {
    if (document.querySelector(".floating-yescom-btn")) return;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "floating-yescom-btn";
    botao.setAttribute("aria-label", "Abrir calendário Yescom");
    botao.innerHTML = `<span aria-hidden="true">🏁</span>`;

    const modal = document.createElement("div");
    modal.className = "floating-yescom-modal hidden";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="floating-yescom-backdrop" data-fechar-yescom="true"></div>
      <section class="floating-yescom-box" role="dialog" aria-modal="true" aria-labelledby="floating-yescom-title">
        <div class="floating-yescom-header">
          <h2 id="floating-yescom-title">Calendário Yescom</h2>
          <button type="button" class="floating-calendar-close" data-fechar-yescom="true" aria-label="Fechar calendário Yescom">×</button>
        </div>
        <p class="floating-yescom-help">Se a página não carregar dentro do sistema, use o botão abaixo para abrir em nova aba.</p>
        <iframe class="floating-yescom-frame" src="${YESCOM_URL}" title="Calendário Yescom"></iframe>
        <a class="floating-yescom-link" href="${YESCOM_URL}" target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>
      </section>
    `;

    function abrirYescom() {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    }

    function fecharYescom() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      botao.focus();
    }

    botao.addEventListener("click", abrirYescom);
    modal.addEventListener("click", (event) => {
      if (event.target?.dataset?.fecharYescom === "true") {
        fecharYescom();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        fecharYescom();
      }
    });

    document.body.appendChild(botao);
    document.body.appendChild(modal);
  }

  function iniciarFloatingTools() {
    const pagina = getPaginaAtual();
    const staff = getStaffLogado();

    if (pagina === "admin.html") {
      criarCalendarioAdmin();
      criarBotaoYescom();
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
