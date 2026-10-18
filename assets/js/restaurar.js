/* =========================================================
   MatClínica - Restaurar estado da página
   Colocar em: assets/restaurar-estado.js

   Guarda campos, selects, resultados e scroll ao sair da página
   e restaura tudo quando o utilizador volta.
   ========================================================= */
(function () {
  "use strict";
  if (window.MatClinicaEstado) return; // evita carregar duas vezes

  /* ---------- CONFIGURAÇÃO (edite aqui) ---------- */
  var CONFIG = {
    // "session" = apaga ao fechar o separador (recomendado, dados de pacientes)
    // "local"   = mantém mesmo depois de fechar o navegador
    armazenamento: "session",
    validadeMinutos: 240,

    // Áreas de resultado a guardar (seletores CSS). Ex.: ["#resultado", ".caixa-resultado"]
    // Também funciona com o atributo data-persist-html no próprio HTML.
    containers: [],

    // Campos a ignorar (também funciona com o atributo data-persist-ignore)
    ignorar: "[data-persist-ignore], input[type=password], input[type=file], input[type=submit], input[type=button], input[type=reset], input[type=image]",

    // Dispara eventos input/change ao restaurar, para que selects personalizados
    // e cálculos automáticos se atualizem sozinhos.
    // Para um campo específico não disparar, use data-persist-silent.
    dispararEventos: true,

    janelaMs: 6000,          // tempo máximo à espera de conteúdo criado por JS
    tamanhoMaxHtml: 300000,  // limite por área de resultado (caracteres)
    prefixo: "matclinica:estado:"
  };

  /* ---------- Armazenamento ---------- */
  var st = null;
  try {
    st = CONFIG.armazenamento === "local" ? window.localStorage : window.sessionStorage;
    st.getItem("__teste");
  } catch (e) { st = null; }
  if (!st) return;

  var CHAVE = CONFIG.prefixo + location.pathname.replace(/index\.html$/i, "").replace(/\/+$/, "/");

  var estado = null;             // estado lido do armazenamento
  var pendentes = {};            // campos guardados ainda não aplicados
  var htmlPendente = false;      // áreas de resultado ainda por restaurar
  var scrollPendente = false;
  var terminou = false;
  var usuarioInteragiu = false;
  var passadaTimer = null;
  var finalTimer = null;
  var obs = null;

  /* ---------- Campos ---------- */
  function chaveDe(el, contagem) {
    var tipo = (el.type || el.tagName).toLowerCase();
    if (tipo === "radio") return "r:" + (el.name || el.id || "") + ":" + el.value;
    var base;
    if (el.id) base = "#" + el.id;
    else if (el.name) base = "n:" + el.name + (tipo === "checkbox" ? ":" + el.value : "");
    else {
      var t = el.tagName.toLowerCase() + "[" + tipo + "]";
      contagem[t] = (contagem[t] || 0) + 1;
      base = "i:" + t + ":" + contagem[t];
    }
    return base;
  }

  function coletarCampos() {
    var mapa = {}, contagem = {}, dup = {};
    var els = document.querySelectorAll("input, select, textarea");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.matches(CONFIG.ignorar) || el.closest("[data-persist-ignore]")) continue;
      var k = chaveDe(el, contagem);
      if (mapa[k] !== undefined) {
        dup[k] = (dup[k] || 1) + 1;
        k += "~" + dup[k];
      }
      mapa[k] = el;
    }
    return mapa;
  }

  function lerCampo(el) {
    var t = (el.type || "").toLowerCase();
    if (t === "checkbox" || t === "radio") return { c: el.checked };
    if (el.tagName === "SELECT" && el.multiple) {
      var sel = [];
      for (var i = 0; i < el.options.length; i++) if (el.options[i].selected) sel.push(el.options[i].value);
      return { m: sel };
    }
    return { v: el.value };
  }

  function temOpcao(sel, valor) {
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === valor) return true;
    return false;
  }

  function disparar(el) {
    if (!CONFIG.dispararEventos || el.hasAttribute("data-persist-silent")) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Devolve true se aplicou (ou se não havia nada a mudar)
  function aplicarCampo(el, s) {
    var t = (el.type || "").toLowerCase();
    var mudou = false;
    if (t === "checkbox" || t === "radio") {
      if (typeof s.c !== "boolean") return true;
      if (el.checked !== s.c) { el.checked = s.c; mudou = true; }
    } else if (el.tagName === "SELECT" && el.multiple) {
      if (!s.m) return true;
      for (var i = 0; i < el.options.length; i++) {
        var marcar = s.m.indexOf(el.options[i].value) !== -1;
        if (el.options[i].selected !== marcar) { el.options[i].selected = marcar; mudou = true; }
      }
    } else {
      if (s.v === undefined) return true;
      if (el.tagName === "SELECT" && !temOpcao(el, s.v)) return false; // opções ainda não existem
      if (el.value !== s.v) { el.value = s.v; mudou = true; }
    }
    if (mudou) disparar(el);
    return true;
  }

  /* ---------- Áreas de resultado ---------- */
  function listaContainers() {
    var seletores = CONFIG.containers.slice();
    seletores.push("[data-persist-html]");
    var els = document.querySelectorAll(seletores.join(","));
    var out = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      out[el.id ? "#" + el.id : "i" + i] = el;
    }
    return out;
  }

  function lerContainers() {
    var out = {}, lista = listaContainers();
    for (var k in lista) {
      var el = lista[k];
      if (el.innerHTML.length > CONFIG.tamanhoMaxHtml) continue;
      out[k] = { h: el.innerHTML, c: el.className, s: el.style.cssText, x: el.hidden };
    }
    return out;
  }

  function restaurarContainers() {
    if (!estado || !estado.cont || usuarioInteragiu) return;
    var lista = listaContainers();
    for (var k in estado.cont) {
      var el = lista[k], s = estado.cont[k];
      // só preenche se o próprio script da página não recalculou o resultado
      if (el && el.innerHTML.trim() === "" && s.h.trim() !== "") {
        el.innerHTML = s.h;
        el.className = s.c;
        el.style.cssText = s.s;
        el.hidden = !!s.x;
      }
    }
  }

  /* ---------- details, scroll ---------- */
  function lerDetails() {
    var out = [], els = document.querySelectorAll("details");
    for (var i = 0; i < els.length; i++) out.push(els[i].open);
    return out;
  }

  function restaurarDetails() {
    if (!estado || !estado.det) return;
    var els = document.querySelectorAll("details");
    for (var i = 0; i < els.length && i < estado.det.length; i++) els[i].open = !!estado.det[i];
  }

  function restaurarScroll() {
    if (!scrollPendente) return;
    scrollPendente = false;
    if (location.hash || usuarioInteragiu || !estado || !estado.y) return;
    window.scrollTo(0, estado.y);
  }

  /* ---------- Salvar ---------- */
  function salvar() {
    try {
      var mapa = coletarCampos(), campos = {}, k;
      for (k in mapa) {
        campos[k] = pendentes[k] ? (estado.campos[k]) : lerCampo(mapa[k]);
      }
      // campos ainda pendentes cujo elemento não existe: preservar
      for (k in pendentes) if (campos[k] === undefined) campos[k] = estado.campos[k];

      var cont = htmlPendente && estado ? estado.cont : lerContainers();
      var y = scrollPendente && estado ? estado.y : window.scrollY;

      st.setItem(CHAVE, JSON.stringify({
        t: Date.now(), campos: campos, cont: cont, det: lerDetails(), y: y
      }));
    } catch (e) { /* armazenamento cheio ou bloqueado: ignora */ }
  }

  var salvarTimer = null;
  function agendarSalvar() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(salvar, 400);
  }

  /* ---------- Restaurar ---------- */
  function passada() {
    if (terminou || !estado) return;
    var mapa = coletarCampos();
    for (var k in pendentes) {
      var el = mapa[k];
      if (!el) continue;
      if (aplicarCampo(el, estado.campos[k])) delete pendentes[k];
    }
    if (Object.keys(pendentes).length === 0 && !finalTimer) {
      // deixa 800 ms para os cálculos da página regenerarem os resultados
      finalTimer = setTimeout(finalizar, 800);
    }
  }

  function agendarPassada() {
    clearTimeout(passadaTimer);
    passadaTimer = setTimeout(passada, 60);
  }

  function finalizar() {
    if (terminou) return;
    terminou = true;
    clearTimeout(passadaTimer);
    clearTimeout(finalTimer);
    if (obs) obs.disconnect();
    pendentes = {};
    restaurarContainers();
    htmlPendente = false;
    restaurarDetails();
    restaurarScroll();
  }

  function iniciar() {
    try {
      var bruto = st.getItem(CHAVE);
      if (bruto) estado = JSON.parse(bruto);
    } catch (e) { estado = null; }

    if (estado && (!estado.t || Date.now() - estado.t > CONFIG.validadeMinutos * 60000)) {
      try { st.removeItem(CHAVE); } catch (e) {}
      estado = null;
    }
    if (!estado || !estado.campos) { estado = null; terminou = true; return; }

    for (var k in estado.campos) pendentes[k] = true;
    htmlPendente = !!estado.cont && Object.keys(estado.cont).length > 0;
    scrollPendente = true;

    passada();

    // conteúdo criado depois pelo JS da página (ex.: selects preenchidos a partir da base de dados)
    obs = new MutationObserver(agendarPassada);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(finalizar, CONFIG.janelaMs);
  }

  /* ---------- API pública ---------- */
  window.MatClinicaEstado = {
    salvar: salvar,
    limpar: function () {
      try { st.removeItem(CHAVE); } catch (e) {}
      estado = null; pendentes = {}; htmlPendente = false; scrollPendente = false;
    }
  };

  /* ---------- Eventos ---------- */
  ["input", "change", "click", "keyup"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.isTrusted) usuarioInteragiu = true;
      agendarSalvar();
    }, true);
  });

  document.addEventListener("reset", function () {
    setTimeout(salvar, 0);
  }, true);

  window.addEventListener("pagehide", salvar);
  window.addEventListener("beforeunload", salvar);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") salvar();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
