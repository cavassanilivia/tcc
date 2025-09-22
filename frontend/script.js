// script.js — Access Path (único/limpo)
(function () {
  "use strict";

  /* =============== Utils: aria-live + toast =============== */
  const srStatus = document.getElementById("sr-status");
  const toastEl  = document.getElementById("tts-toast");
  function announce(msg) { if (!srStatus) return; srStatus.textContent = ""; setTimeout(() => srStatus.textContent = msg, 10); }
  function toast(msg, ms = 2200) {
    if (!toastEl) { alert(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* =============== Config / API helper =============== */
  const API_BASE =
    (typeof window !== "undefined" && window.AP_API_BASE) ||
    (document.querySelector('meta[name="ap-api-base"]')?.getAttribute("content")) ||
    "http://localhost:8080";

  const ENDPOINTS = {
    signup:   "/api/usuarios",
    login:    "/api/auth/login",
    compras:  "/api/compras",
    contato:  "/api/contatos",
  };

  async function apiFetchJSON(path, opts = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        headers: { "Content-Type": "application/json", "Accept": "application/json", ...(opts.headers || {}) },
        ...opts,
      });
    } catch (e) {
      throw new Error("Falha de rede/CORS: " + e.message);
    }

    const ct = res.headers.get("content-type") || "";
    let payload = null, text = null;

    if (ct.includes("application/json")) { try { payload = await res.json(); } catch {} }
    else { try { text = await res.text(); } catch {} }

    if (!res.ok) {
      const msg = (payload && (payload.message || payload.error)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return payload ?? (text ? { message: text } : {});
  }

  /* =============== Auth store (localStorage + cookie) =============== */
  function setAuthCookie(on) {
    if (on) document.cookie = "ap_auth=1; path=/; max-age=2592000; SameSite=Lax";
    else    document.cookie = "ap_auth=; path=/; max-age=0; SameSite=Lax";
  }
  function hasAuthCookie(){ return /(?:^|;\s*)ap_auth=1(?:;|$)/.test(document.cookie || ""); }

  function normalizeUser(u){
    if(!u) return null;
    const id = u.idUsuario ?? u.id_usuario ?? u.id ?? u.userId ?? u.iduser ?? u.id_user;
    const nome  = u.nome ?? u.name ?? u.fullName ?? u.usuario ?? null;
    const email = u.email ?? u.username ?? u.login ?? null;
    return { idUsuario: id ?? null, id_usuario: id ?? null, nome, email, _raw:u };
  }

  function markLoggedIn(user){
    const norm = normalizeUser(user) || {};
    try{
      localStorage.setItem("ap_auth", "1");
      localStorage.setItem("ap_user", JSON.stringify(norm));
    }catch{}
    setAuthCookie(true);
    renderAuthBadge();
  }
  function markLoggedOut(){
    try{
      localStorage.removeItem("ap_auth");
      localStorage.removeItem("ap_user");
    }catch{}
    setAuthCookie(false);
    renderAuthBadge();
  }
  function isLogged(){
    let ls=false; try{ ls = localStorage.getItem("ap_auth") === "1"; }catch{}
    return ls || hasAuthCookie();
  }
  function currentUser(){ try{ return JSON.parse(localStorage.getItem("ap_user") || "null"); }catch{ return null; } }

  // atalho para testes: ?logged=1
  (function maybeForceLoginFromQuery(){
    const q = new URLSearchParams(location.search);
    if (q.get("logged") === "1") {
      markLoggedIn(currentUser() || { email: "demo@example.com" });
      q.delete("logged");
      const u = location.pathname + (q.toString() ? "?" + q.toString() : "");
      history.replaceState({}, "", u);
    }
  })();

  /* =============== Header: badge + logout =============== */
  function ensureAuthBadge(){
    const navUl = document.querySelector("header .main-nav ul");
    if(!navUl) return;
    if(!document.getElementById("auth-indicator")){
      const liBadge = document.createElement("li");
      liBadge.className = "auth-li";
      liBadge.innerHTML = `<span id="auth-indicator" class="auth-badge" data-state="out" aria-live="polite">🔒 Convidado</span>`;
      navUl.appendChild(liBadge);

      const liLogout = document.createElement("li");
      liLogout.className = "auth-li";
      liLogout.innerHTML = `<a href="#" id="logout-link" class="logout-link" hidden>Sair</a>`;
      navUl.appendChild(liLogout);

      document.getElementById("logout-link")?.addEventListener("click",(e)=>{
        e.preventDefault();
        markLoggedOut();
        if (location.pathname.endsWith("compra.html")) location.reload();
      });
    }
    renderAuthBadge();
  }
  function renderAuthBadge(){
    const badge = document.getElementById("auth-indicator");
    const logout= document.getElementById("logout-link");
    if(!badge) return;
    if(isLogged()){
      const u = currentUser(); const nome = u?.nome || u?.name || u?.email || "Usuário";
      badge.dataset.state="in"; badge.textContent = `✅ Logado: ${nome}`;
      if (logout) logout.hidden = false;
    } else {
      badge.dataset.state="out"; badge.textContent = "🔒 Convidado";
      if (logout) logout.hidden = true;
    }
  }

  /* =============== Auth: Signup / Login =============== */
  function wireSignup(){
    const form = document.getElementById("form-cadastro-signup");
    if (!form) return;
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const v = id => document.getElementById(id)?.value?.trim() || "";
      const nome=v("su-nome"), telefone=v("su-telefone"),
            email=v("su-email").toLowerCase(), email2=v("su-email-conf").toLowerCase();
      const s1=document.getElementById("su-senha")?.value || "";
      const s2=document.getElementById("su-senha-conf")?.value || "";
      const termos=document.getElementById("su-termos")?.checked;

      if(!nome || !email || !email2 || email!==email2 || s1.length<6 || s1!==s2 || !termos){
        toast("Revise os campos: e-mails iguais, senhas (mín. 6) e aceite os termos.");
        return;
      }
      try{
        const novo = await apiFetchJSON(ENDPOINTS.signup, {
          method:"POST",
          body: JSON.stringify({ nome, email, telefone, senha: s1 })
        });
        markLoggedIn(novo || { nome, email });
        toast("Usuário cadastrado!");
        location.href = "compra.html";
      }catch(err){ toast("Erro ao cadastrar: " + err.message); }
    });
  }

  function wireLogin(){
    const form = document.getElementById("form-cadastro-login");
    if (!form) return;
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const email = document.getElementById("li-email")?.value?.trim().toLowerCase() || "";
      const senha = document.getElementById("li-senha")?.value || "";
      if(!email || !senha){ toast("Preencha e-mail e senha."); return; }
      try{
        const user = await apiFetchJSON(ENDPOINTS.login, {
          method:"POST",
          body: JSON.stringify({ email, senha })
        });
        markLoggedIn(user || { email });
        toast(`Bem-vindo(a), ${user?.nome || email}!`);
        location.href = "compra.html";
      }catch(err){ toast("Login inválido: " + err.message); }
    });
  }

  /* =============== Acessórios: máscara de telefone / toggle senha =============== */
  function wirePhoneMask(){
    const tel = document.getElementById("su-telefone");
    const form = document.getElementById("form-cadastro-signup");
    if (tel){
      tel.addEventListener("input",(e)=>{
        let v = e.target.value.replace(/\D/g,"");
        if (v.length>11) v = v.slice(0,11);
        if (v.length===0) e.target.value = "";
        else if (v.length<=2) e.target.value = `(${v}`;
        else if (v.length<=6) e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
        else if (v.length<=10) e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
        else e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
      });
    }
    if (form){
      form.addEventListener("submit",(ev)=>{
        const digits = (tel?.value || "").replace(/\D/g,"");
        if (digits && !(digits.length===10 || digits.length===11)){
          ev.preventDefault();
          toast("Telefone inválido: use 10 ou 11 dígitos.");
          tel?.focus();
        }
      });
    }
  }

  function wirePwdToggle(){
    document.querySelectorAll(".pwd-toggle").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if(!input) return;
        if (input.type==="password"){
          input.type="text";
          btn.setAttribute("aria-pressed","true");
          btn.innerHTML = '<i class="fa fa-eye-slash"></i>';
        } else {
          input.type="password";
          btn.setAttribute("aria-pressed","false");
          btn.innerHTML = '<i class="fa fa-eye"></i>';
        }
      });
    });
  }

  /* =============== Orçamento =============== */
  function wireOrcamento(){
    const btnCalc = document.getElementById("btnCalcular");
    if (!btnCalc) return;

    btnCalc.addEventListener("click", ()=>{
      const ambientes   = parseInt(document.getElementById("ambientes").value) || 0;
      const areaTotal   = parseFloat(document.getElementById("areaTotal").value) || 0;
      const precoSensor = parseFloat(document.getElementById("precoSensor").value);
      const precoFone   = parseFloat(document.getElementById("precoFone").value);
      const precoMao    = parseFloat(document.getElementById("precoMaoObra").value);
      const m2PorSensor = parseFloat(document.getElementById("m2PorSensor").value);
      const minSensorAmb= parseInt(document.getElementById("minSensorAmb").value);

      if (ambientes<=0 || areaTotal<=0){ toast("Preencha ambientes e área."); return; }

      const sensoresPorArea = Math.ceil(areaTotal / m2PorSensor);
      const sensoresPorAmb  = ambientes * minSensorAmb;
      const qtdSensores = Math.max(sensoresPorArea, sensoresPorAmb);

      const custoSensores = qtdSensores * precoSensor;
      const custoFone     = precoFone;
      const custoMaoObra  = precoMao * ambientes;
      const total         = custoSensores + custoFone + custoMaoObra;

      const tabela = document.getElementById("tabela-itens");
      if (tabela){
        tabela.innerHTML = `
          <div>📡 Sensores (${qtdSensores} un.) - R$ ${custoSensores.toFixed(2)}</div>
          <div>🎧 Kit Fone - R$ ${custoFone.toFixed(2)}</div>
          <div>🛠️ Mão de obra (${ambientes} ambientes) - R$ ${custoMaoObra.toFixed(2)}</div>
        `;
      }
      const totalEl = document.getElementById("total-geral");
      if (totalEl) totalEl.textContent = `Total estimado: R$ ${total.toFixed(2)}`;

      document.getElementById("valorEstimado").value = total.toFixed(2);
      document.getElementById("orcamento-json").value = JSON.stringify({
        ambientes, areaTotal, qtdSensores, custoSensores, custoFone, custoMaoObra, total
      });
    });
  }

  /* =============== Compra (POST /api/compras) =============== */
  function wireCompra(){
    const form = document.getElementById("form-compra");
    if (!form) return;

    form.addEventListener("submit", async (e)=>{
      e.preventDefault();

      const user = currentUser();
      if (!isLogged() || !user?.idUsuario){
        toast("Você precisa estar logado.");
        return;
      }

      const pagamento = document.getElementById("pagamento").value;
      if (!pagamento){
        toast("Escolha a forma de pagamento.");
        return;
      }

      const valorEstimado = parseFloat(document.getElementById("valorEstimado").value);
      const orcamentoJson = document.getElementById("orcamento-json").value || "";

      if (!isFinite(valorEstimado) || !orcamentoJson){
        toast("Calcule o orçamento antes de registrar.");
        return;
      }

      const quantidade = parseInt(document.getElementById("ambientes").value) || 1;

      const payload = {
        usuario: { idUsuario: user.idUsuario }, // bate com @ManyToOne
        quantidade,
        pagamento,                               // pix | cartao | boleto
        valorEstimado,
        orcamentoJson
      };

      try{
        await apiFetchJSON(ENDPOINTS.compras, { method:"POST", body: JSON.stringify(payload) });
        toast("Pedido registrado com sucesso!");
        announce("Pedido registrado com sucesso!");
        // NÃO damos reset no orçamento para o usuário poder imprimir/salvar
      }catch(err){
        console.error("Erro ao registrar pedido:", err);
        toast("Erro ao registrar pedido: " + err.message);
      }
    });
  }

  /* =============== Contato (opcional) =============== */
  function wireContato(){
    const form = document.getElementById("form-contato");
    if (!form) return;
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const nome = document.getElementById("nome")?.value.trim();
      const email= document.getElementById("email")?.value.trim();
      const telefone = document.getElementById("telefone")?.value.trim();
      const assunto = document.getElementById("assunto")?.value;
      const mensagem= document.getElementById("mensagem")?.value.trim();

      if (!nome || !email || !assunto || !mensagem){ toast("Preencha os campos obrigatórios."); return; }
      try{
        await apiFetchJSON(ENDPOINTS.contato, { method:"POST", body: JSON.stringify({ nome, email, telefone, assunto, mensagem }) });
        toast("Mensagem enviada com sucesso!");
        form.reset();
      }catch(err){ toast("Erro ao enviar: " + err.message); }
    });
  }

  /* =============== Boot =============== */
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureAuthBadge();
    wireSignup();
    wireLogin();
    wirePhoneMask();
    wirePwdToggle();
    wireOrcamento();
    wireCompra();
    wireContato();
  });

})();
