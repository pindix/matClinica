/* =========================================================
   MatClínica - Pop-up do botão "Baixar APP"
   Colocar em: assets/baixar-app.js
   Funciona em todas as páginas que incluírem este script.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- CONFIGURAÇÃO (edite aqui) ---------- */
  var CONFIG = {
    titulo: "Baixar a MatClínica",
    mensagem: "A aplicação estará disponível em breve. Enquanto isso, pode continuar a usar todas as ferramentas diretamente no navegador.",
    // Quando tiver o link do APK/loja, coloque aqui. Vazio = mostra só a mensagem.
    linkDownload: "",
    textoDownload: "Baixar agora",
    textoFechar: "Fechar",
    corPrincipal: "#00843d"
  };

  /* Um elemento (a ou button) é tratado como botão "Baixar APP" se:
     - tiver o atributo data-baixar-app, OU
     - o texto dele contiver "baixar app" / "baixar o app" */
  var REGEX_TEXTO = /baixar\s+(o\s+)?app/i;

  function ehBotaoBaixar(el) {
    if (!el) return false;
    if (el.hasAttribute("data-baixar-app")) return true;
    return REGEX_TEXTO.test((el.textContent || "").replace(/\s+/g, " ").trim());
  }

  /* ---------- Estilos (injetados uma vez) ---------- */
  function injetarEstilos() {
    if (document.getElementById("baixar-app-style")) return;
    var css = [
      ".ba-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s ease}",
      ".ba-overlay.ba-aberto{opacity:1;visibility:visible}",
      ".ba-modal{font-family:'Poppins',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;width:100%;max-width:380px;background:#fff;color:#1d2a24;border-radius:18px;padding:28px 24px 22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);transform:translateY(12px) scale(.97);transition:transform .2s ease}",
      ".ba-overlay.ba-aberto .ba-modal{transform:none}",
      ".ba-icone{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:" + CONFIG.corPrincipal + "1a;color:" + CONFIG.corPrincipal + "}",
      ".ba-icone svg{width:28px;height:28px}",
      ".ba-modal h2{margin:0 0 8px;font-size:1.2rem;font-weight:600}",
      ".ba-modal p{margin:0 0 20px;font-size:.92rem;line-height:1.5;opacity:.8}",
      ".ba-acoes{display:flex;flex-direction:column;gap:8px}",
      ".ba-btn{font:inherit;font-weight:500;font-size:.95rem;border:0;border-radius:10px;padding:11px 16px;cursor:pointer;text-decoration:none;display:block}",
      ".ba-btn-primario{background:" + CONFIG.corPrincipal + ";color:#fff}",
      ".ba-btn-primario:hover{filter:brightness(1.08)}",
      ".ba-btn-secundario{background:transparent;color:inherit;opacity:.7}",
      ".ba-btn-secundario:hover{opacity:1}",
      ".ba-btn:focus-visible{outline:2px solid " + CONFIG.corPrincipal + ";outline-offset:2px}",
      "@media (prefers-color-scheme:dark){.ba-modal{background:#1c2420;color:#eef3f0}}",
      "[data-theme='dark'] .ba-modal,.dark .ba-modal,.dark-mode .ba-modal{background:#1c2420;color:#eef3f0}"
    ].join("\n");
    var style = document.createElement("style");
    style.id = "baixar-app-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Pop-up ---------- */
  var overlay = null;
  var ultimoFoco = null;

  function criarPopup() {
    if (overlay) return overlay;
    injetarEstilos();

    overlay = document.createElement("div");
    overlay.className = "ba-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ba-titulo");

    var temLink = !!CONFIG.linkDownload;
    overlay.innerHTML =
      '<div class="ba-modal">' +
        '<div class="ba-icone" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>' +
          '</svg>' +
        '</div>' +
        '<h2 id="ba-titulo"></h2>' +
        '<p id="ba-msg"></p>' +
        '<div class="ba-acoes">' +
          (temLink ? '<a class="ba-btn ba-btn-primario" id="ba-download" target="_blank" rel="noopener"></a>' : '') +
          '<button type="button" class="ba-btn ' + (temLink ? 'ba-btn-secundario' : 'ba-btn-primario') + '" id="ba-fechar"></button>' +
        '</div>' +
      '</div>';

    overlay.querySelector("#ba-titulo").textContent = CONFIG.titulo;
    overlay.querySelector("#ba-msg").textContent = CONFIG.mensagem;
    overlay.querySelector("#ba-fechar").textContent = CONFIG.textoFechar;
    if (temLink) {
      var a = overlay.querySelector("#ba-download");
      a.textContent = CONFIG.textoDownload;
      a.href = CONFIG.linkDownload;
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) fechar();
    });
    overlay.querySelector("#ba-fechar").addEventListener("click", fechar);

    document.body.appendChild(overlay);
    return overlay;
  }

  function abrir() {
    criarPopup();
    ultimoFoco = document.activeElement;
    overlay.classList.add("ba-aberto");
    var alvo = overlay.querySelector("#ba-download") || overlay.querySelector("#ba-fechar");
    if (alvo) alvo.focus();
  }

  function fechar() {
    if (!overlay) return;
    overlay.classList.remove("ba-aberto");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  /* ---------- Eventos ---------- */
  // Delegação de eventos: funciona mesmo para botões criados depois (menus dinâmicos).
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("a, button, [data-baixar-app]") : null;
    if (!el || !ehBotaoBaixar(el)) return;
    e.preventDefault();
    abrir();
  }, true);

  document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("ba-aberto")) return;
    if (e.key === "Escape") {
      fechar();
    } else if (e.key === "Tab") {
      // Mantém o foco dentro do pop-up
      var focaveis = overlay.querySelectorAll("a[href], button");
      if (!focaveis.length) return;
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  });
})();
