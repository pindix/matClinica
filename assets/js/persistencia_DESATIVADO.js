// ============================================================================
// PERSISTÊNCIA UNIVERSAL - MatClínica
// Guarda e restaura os valores de todas as ferramentas.
// ============================================================================

(function() {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. CONFIGURAÇÃO
    // ------------------------------------------------------------------------
    
    // Deteta a ferramenta atual pelo caminho do URL.
    // Ex: /gestograma/index.html → "gestograma"
    function obterFerramentaAtual() {
        const path = window.location.pathname;
        const partes = path.split('/').filter(p => p && p !== 'index.html');
        return partes.length > 0 ? partes[partes.length - 1] : 'home';
    }

    const FERRAMENTA = obterFerramentaAtual();
    const CHAVE = `matclinica_${FERRAMENTA}`;

    // ------------------------------------------------------------------------
    // 2. CAMPOS A GUARDAR
    // ------------------------------------------------------------------------
    
    // Todos os campos com id, exceto os que tenham a classe "no-persist".
    function obterCamposPersistiveis() {
        const todos = document.querySelectorAll('input[id], select[id], textarea[id]');
        return Array.from(todos).filter(el => !el.classList.contains('no-persist'));
    }

    // ------------------------------------------------------------------------
    // 3. GUARDAR
    // ------------------------------------------------------------------------
    
    function guardarEstado() {
        const campos = obterCamposPersistiveis();
        const dados = {};

        campos.forEach(campo => {
            const id = campo.id;
            if (!id) return;

            if (campo.type === 'checkbox' || campo.type === 'radio') {
                dados[id] = campo.checked;
            } else if (campo.tagName === 'SELECT' && campo.multiple) {
                dados[id] = Array.from(campo.selectedOptions).map(o => o.value);
            } else {
                dados[id] = campo.value;
            }
        });

        // Guarda também o modo selecionado, se existir
        const modoSelecionado = document.getElementById('modoSelecionado');
        if (modoSelecionado) {
            dados['_modoSelecionado'] = modoSelecionado.textContent.trim();
        }

        // Guarda o estado do toggle horizontal
        const toggleModo = document.getElementById('toggleModo');
        if (toggleModo) {
            dados['_toggleModo'] = toggleModo.checked;
        }

        // Guarda o estado do toggle "não sei a DUM"
        const toggleNaoSeiDum = document.getElementById('toggleNaoSeiDum');
        if (toggleNaoSeiDum) {
            dados['_toggleNaoSeiDum'] = toggleNaoSeiDum.checked;
        }

        // Guarda o intervalo selecionado
        const intervaloAtivo = document.querySelector('.intervalo-valor.ativo');
        if (intervaloAtivo) {
            dados['_intervaloAtivo'] = intervaloAtivo.getAttribute('data-valor');
        }

        try {
            localStorage.setItem(CHAVE, JSON.stringify(dados));
        } catch (e) {
            console.warn('Persistência: erro ao guardar', e);
        }
    }

    // ------------------------------------------------------------------------
    // 4. RESTAURAR
    // ------------------------------------------------------------------------
    
    function restaurarEstado() {
        let dados;
        try {
            const raw = localStorage.getItem(CHAVE);
            if (!raw) return;
            dados = JSON.parse(raw);
        } catch (e) {
            console.warn('Persistência: erro ao ler', e);
            return;
        }

        const campos = obterCamposPersistiveis();

        campos.forEach(campo => {
            const id = campo.id;
            if (!id || !(id in dados)) return;

            const valor = dados[id];

            if (campo.type === 'checkbox' || campo.type === 'radio') {
                campo.checked = Boolean(valor);
            } else if (campo.tagName === 'SELECT' && campo.multiple) {
                Array.from(campo.options).forEach(opt => {
                    opt.selected = Array.isArray(valor) && valor.includes(opt.value);
                });
            } else {
                campo.value = valor;
            }

            // Dispara eventos para que outras lógicas reajam
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Restaura o modo selecionado
        if (dados['_modoSelecionado']) {
            const modoSelecionado = document.getElementById('modoSelecionado');
            if (modoSelecionado) {
                modoSelecionado.textContent = dados['_modoSelecionado'];
            }
        }

        // Restaura o toggle horizontal
        if (typeof dados['_toggleModo'] === 'boolean') {
            const toggleModo = document.getElementById('toggleModo');
            if (toggleModo) {
                toggleModo.checked = dados['_toggleModo'];
                toggleModo.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Restaura o toggle "não sei a DUM"
        if (typeof dados['_toggleNaoSeiDum'] === 'boolean') {
            const toggleNaoSeiDum = document.getElementById('toggleNaoSeiDum');
            if (toggleNaoSeiDum) {
                toggleNaoSeiDum.checked = dados['_toggleNaoSeiDum'];
                toggleNaoSeiDum.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Restaura o intervalo
        if (dados['_intervaloAtivo']) {
            const valores = document.querySelectorAll('.intervalo-valor');
            valores.forEach(v => {
                if (v.getAttribute('data-valor') === String(dados['_intervaloAtivo'])) {
                    v.click();
                }
            });
        }

        // Recalcula automaticamente se houver botão de calcular
        setTimeout(() => {
            const btnCalcular = document.getElementById('btnCalcular');
            if (btnCalcular) {
                btnCalcular.click();
            }
        }, 300);
    }

    // ------------------------------------------------------------------------
    // 5. LIMPAR
    // ------------------------------------------------------------------------
    
    function limparEstado() {
        try {
            localStorage.removeItem(CHAVE);
        } catch (e) {
            console.warn('Persistência: erro ao limpar', e);
        }
    }

    // Expor para uso externo (ex: botão de limpar)
    window.MatClinicaPersistencia = {
        guardar: guardarEstado,
        restaurar: restaurarEstado,
        limpar: limparEstado,
        ferramenta: FERRAMENTA
    };

    // ------------------------------------------------------------------------
    // 6. INICIALIZAÇÃO
    // ------------------------------------------------------------------------
    
    function init() {
        // Restaura ao carregar
        restaurarEstado();

        // Guarda automaticamente quando o utilizador altera algo
        const campos = obterCamposPersistiveis();
        campos.forEach(campo => {
            campo.addEventListener('change', guardarEstado);
            campo.addEventListener('input', guardarEstado);
        });

        // Guarda antes de sair da página (ex: ir para Ajuda)
        window.addEventListener('beforeunload', guardarEstado);

        // Guarda quando a página fica oculta (mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) guardarEstado();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();












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
