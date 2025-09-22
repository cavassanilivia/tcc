// script.js — Access Path (corrigido: senha enviada em texto puro para o back)
(function () {
  "use strict";

  /* ================= Utils: aria-live + toast ================= */
  const srStatus = document.getElementById('sr-status');
  const toastEl  = document.getElementById('tts-toast');
  function announce(msg){ if(!srStatus) return; srStatus.textContent=''; setTimeout(()=>srStatus.textContent=msg,10); }
  function toast(msg, ms=2200){ if(!toastEl){ alert(msg); return; } toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),ms); }

  /* ================= Configuration ================= */
  const CONFIG = {
    apiBase:
      (typeof window!=='undefined' && window.AP_API_BASE) ||
      (document.querySelector('meta[name="ap-api-base"]')?.getAttribute('content')) ||
      'http://localhost:8080',
    endpoints: {
      signup: '/api/usuarios',
      login: '/api/auth/login',
      loginLegacy: '/api/auth/login-legacy',
      usuariosLegacy: '/api/usuarios',
      resolveByEmail: [
        '/api/usuarios/by-email/{email}',
        '/api/usuarios/by-email?email={email}',
        '/api/usuarios/email/{email}',
        '/api/usuarios?email={email}'
      ],
      compra: '/api/compras'
    },
    redirectAfterAuth: (new URLSearchParams(location.search).get('redirect') || 'compra.html')
  };

  /* ================= Auth store (localStorage + cookie) ================= */
  function setAuthCookie(on){
    if (on) document.cookie = "ap_auth=1; path=/; max-age=2592000; SameSite=Lax";
    else    document.cookie = "ap_auth=; path=/; max-age=0; SameSite=Lax";
  }
  function hasAuthCookie(){ return /(?:^|;\s*)ap_auth=1(?:;|$)/.test(document.cookie || ""); }

  function normalizeUser(u){
    if(!u) return null;
    const id =
      u.idUsuario ?? u.id_usuario ?? u.id ?? u.userId ?? u.iduser ?? u.id_user;
    const nome  = u.nome ?? u.name ?? u.fullName ?? u.usuario ?? null;
    const email = u.email ?? u.username ?? u.login ?? null;
    return { idUsuario: id ?? null, id_usuario: id ?? null, nome, email, _raw:u };
  }

  function markLoggedIn(user){
    const norm = normalizeUser(user) || {};
    try{
      localStorage.setItem('ap_auth','1');
      localStorage.setItem('ap_user', JSON.stringify(norm));
    }catch{}
    setAuthCookie(true);
    renderAuthBadge();
  }
  function markLoggedOut(){
    try{ localStorage.removeItem('ap_auth'); localStorage.removeItem('ap_user'); }catch{}
    setAuthCookie(false);
    renderAuthBadge();
  }
  function isLogged(){
    let ls=false; try{ ls = localStorage.getItem('ap_auth')==='1'; }catch{}
    return ls || hasAuthCookie();
  }
  function currentUser(){ try{ return JSON.parse(localStorage.getItem('ap_user')||'null'); }catch{ return null; } }

  // atalho para testes: ?logged=1
  (function maybeForceLoginFromQuery(){
    const q = new URLSearchParams(location.search);
    if (q.get('logged') === '1') {
      markLoggedIn(currentUser() || { email: 'demo@example.com' });
      q.delete('logged');
      const u = location.pathname + (q.toString() ? '?' + q.toString() : '' );
      history.replaceState({}, '', u);
    }
  })();

  /* ================= Header: badge de perfil + logout ================= */
  function ensureAuthBadge(){
    const navUl = document.querySelector('header .main-nav ul');
    if(!navUl) return;
    if(!document.getElementById('auth-indicator')){
      const liBadge = document.createElement('li');
      liBadge.className = 'auth-li';
      liBadge.innerHTML = `<span id="auth-indicator" class="auth-badge" data-state="out" aria-live="polite">🔒 Convidado</span>`;
      navUl.appendChild(liBadge);

      const liLogout = document.createElement('li');
      liLogout.className = 'auth-li';
      liLogout.innerHTML = `<a href="#" id="logout-link" class="logout-link" hidden>Sair</a>`;
      navUl.appendChild(liLogout);

      document.getElementById('logout-link')?.addEventListener('click',(e)=>{
        e.preventDefault();
        markLoggedOut();
        if (location.pathname.endsWith('compra.html')) location.reload();
      });
    }
    renderAuthBadge();
  }
  function renderAuthBadge(){
    const badge = document.getElementById('auth-indicator');
    const logout= document.getElementById('logout-link');
    if(!badge) return;
    if(isLogged()){
      const u = currentUser(); const nome = u?.nome || u?.name || u?.email || 'Usuário';
      badge.dataset.state='in'; badge.textContent = `✅ Logado: ${nome}`;
      if (logout) logout.hidden = false;
    } else {
      badge.dataset.state='out'; badge.textContent = '🔒 Convidado';
      if (logout) logout.hidden = true;
    }
  }

  /* ================= API helper ================= */
  const API_BASE =
    (typeof window!=='undefined' && window.AP_API_BASE) ||
    (document.querySelector('meta[name="ap-api-base"]')?.getAttribute('content')) ||
    'http://localhost:8080';

  async function apiFetchJSON(path, opts = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(opts.headers || {}) },
        ...opts
      });
    } catch (e) {
      throw new Error('Falha de rede/CORS: ' + e.message);
    }

    const ct = res.headers.get('content-type') || '';
    let payload = null, text = null;

    if (ct.includes('application/json')) {
      try { payload = await res.json(); } catch {}
    } else {
      try { text = await res.text(); } catch {}
    }

    if (!res.ok) {
      const msg = (payload && (payload.message || payload.error)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return payload ?? (text ? { message: text } : {});
  }

  // tenta achar id do usuário por e-mail
  async function tryResolveUserIdByEmail(email){
    if(!email) return null;
    for (const tpl of CONFIG.endpoints.resolveByEmail){
      const p = tpl.replace('{email}', encodeURIComponent(email));
      try{
        const r = await apiFetchJSON(p, { method:'GET' });
        if (!r) continue;
        const u = Array.isArray(r) ? r[0] : r;
        const id = u?.idUsuario ?? u?.id_usuario ?? u?.id ?? null;
        if (id) return id;
      }catch{}
    }
    return null;
  }

  /* ================= Login / Signup ================= */
  (function authForms(){
    const tabSignup=document.getElementById("tab-signup");
    const tabLogin =document.getElementById("tab-login");
    const panelSignup=document.getElementById("panel-signup");
    const panelLogin =document.getElementById("panel-login");
    function activateTab(which){ const isSignup=which==='signup';
      tabSignup?.classList.toggle('is-active',isSignup);
      tabLogin ?.classList.toggle('is-active',!isSignup);
      tabSignup?.setAttribute('aria-selected', isSignup?'true':'false');
      tabLogin ?.setAttribute('aria-selected',!isSignup?'true':'false');
      panelSignup?.toggleAttribute('hidden', !isSignup);
      panelLogin ?.toggleAttribute('hidden',  isSignup);
      (isSignup?panelSignup:panelLogin)?.focus();
    }
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode) activateTab(mode==='login'?'login':'signup');

    tabSignup?.addEventListener('click',()=>activateTab('signup'));
    tabLogin ?.addEventListener('click',()=>activateTab('login'));

    // ===== Signup (agora envia senha em texto puro) =====
    const formSignup = document.getElementById("form-cadastro-signup");
    if (formSignup){
      formSignup.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const inVal = (id)=>document.getElementById(id)?.value?.trim()||'';
        const nome=inVal("su-nome"), telefone=inVal("su-telefone"),
              email=inVal("su-email").toLowerCase(), email2=inVal("su-email-conf").toLowerCase();
        const s1=document.getElementById("su-senha")?.value||'';
        const s2=document.getElementById("su-senha-conf")?.value||'';
        const termos=document.getElementById("su-termos")?.checked;

        if(!nome || !email || !email2 || email!==email2 || s1.length<6 || s1!==s2 || !termos){
          toast("Revise os campos: e-mails iguais, senhas (mín. 6) e aceite os termos."); return;
        }

        try{
          let novo = await apiFetchJSON(CONFIG.endpoints.signup, {
            method:"POST",
            body: JSON.stringify({ nome, email, telefone, senha: s1 })
          });

          if (!novo?.idUsuario && !novo?.id && !novo?.id_usuario) {
            const id = await tryResolveUserIdByEmail(email);
            if (id) novo = { ...(novo||{}), idUsuario: id };
          }

          markLoggedIn(novo || { nome, email });
          toast("Usuário cadastrado!");
          location.href = CONFIG.redirectAfterAuth;

        }catch(e1){
          toast("Erro ao cadastrar: " + e1.message);
        }
      });
    }

    // ===== Login (agora envia senha em texto puro) =====
    const formLogin = document.getElementById("form-cadastro-login");
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("li-email")?.value?.trim().toLowerCase() || '';
        const senha = document.getElementById("li-senha")?.value || '';
        if (!email || !senha) { toast("Preencha e-mail e senha."); return; }

        try {
          const user = await apiFetchJSON(CONFIG.endpoints.login, {
            method: "POST",
            body: JSON.stringify({ email, senha })
          });

          markLoggedIn(user || { email });
          toast(`Bem-vindo(a), ${user?.nome || email}!`);
          location.href = CONFIG.redirectAfterAuth;

        } catch (e1) {
          toast("Login inválido: " + (e1.message || "erro"));
        }
      });
    }
  })();

  /* ================= Orçamento / Compra / Contato / Carousel / Acessibilidade ================= */
  // 🔹 Mantive tudo igual ao seu original — não precisa mudar essas partes
  // (para não ficar gigante aqui, mantive apenas as mudanças nas partes de login/cadastro)

  ensureAuthBadge();
  window.addEventListener('storage',(e)=>{ if(e.key==='ap_auth'||e.key==='ap_user'){ renderAuthBadge(); } });

})();
document.addEventListener('DOMContentLoaded', () => {
  const tel = document.getElementById('su-telefone');
  const signupForm = document.getElementById('form-cadastro-signup');

  if (tel) {
    tel.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, ''); // só números
      if (v.length > 11) v = v.slice(0, 11);      // limita em 11 dígitos

      if (v.length === 0) {
        e.target.value = ''; // vazio mesmo
      } else if (v.length <= 2) {
        e.target.value = `(${v}`;
      } else if (v.length <= 6) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length <= 10) {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
      } else {
        e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      }
    });
  }

  // validação extra no submit
  if (signupForm) {
    signupForm.addEventListener('submit', (ev) => {
      const phoneVal = tel?.value?.trim() || '';
      if (phoneVal) {
        const digits = phoneVal.replace(/\D/g, '');
        if (!(digits.length === 10 || digits.length === 11)) {
          ev.preventDefault();
          if (typeof toast === 'function') {
            toast('Telefone inválido: use 10 ou 11 dígitos.');
          } else {
            alert('Telefone inválido: use 10 ou 11 dígitos.');
          }
          tel.focus();
          return false;
        }
      }
      return true;
    });
  }
});
// ===== Mostrar / Ocultar senha =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.setAttribute('aria-pressed', 'true');
        btn.innerHTML = '<i class="fa fa-eye-slash"></i>'; // ícone olho aberto
      } else {
        input.type = 'password';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = '<i class="fa fa-eye"></i>'; // ícone olho fechado
      }
    });
  });
});

// script.js — Access Path (com Cadastro, Login, Compra e Contato)
(function () {
  "use strict";

  /* ================= Utils: aria-live + toast ================= */
  const srStatus = document.getElementById('sr-status');
  const toastEl = document.getElementById('tts-toast');
  function announce(msg) { if (!srStatus) return; srStatus.textContent = ''; setTimeout(() => srStatus.textContent = msg, 10); }
  function toast(msg, ms = 2200) { if (!toastEl) { alert(msg); return; } toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), ms); }

  /* ================= Configuration ================= */
  const CONFIG = {
    apiBase:
      (typeof window !== 'undefined' && window.AP_API_BASE) ||
      (document.querySelector('meta[name="ap-api-base"]')?.getAttribute('content')) ||
      'http://localhost:8080',
    endpoints: {
      signup: '/api/usuarios',
      login: '/api/auth/login',
      loginLegacy: '/api/auth/login-legacy',
      usuariosLegacy: '/api/usuarios',
      resolveByEmail: [
        '/api/usuarios/by-email/{email}',
        '/api/usuarios/by-email?email={email}',
        '/api/usuarios/email/{email}',
        '/api/usuarios?email={email}'
      ],
      compra: '/api/compras',
      contato: '/api/contatos' // 👈 agora tem o endpoint de contato
    },
    redirectAfterAuth: (new URLSearchParams(location.search).get('redirect') || 'compra.html')
  };

  /* ================= API helper ================= */
  const API_BASE =
    (typeof window !== 'undefined' && window.AP_API_BASE) ||
    (document.querySelector('meta[name="ap-api-base"]')?.getAttribute('content')) ||
    'http://localhost:8080';

  async function apiFetchJSON(path, opts = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    let res;
    try {
      res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(opts.headers || {}) },
        ...opts
      });
    } catch (e) {
      throw new Error('Falha de rede/CORS: ' + e.message);
    }

    const ct = res.headers.get('content-type') || '';
    let payload = null, text = null;

    if (ct.includes('application/json')) {
      try { payload = await res.json(); } catch { }
    } else {
      try { text = await res.text(); } catch { }
    }

    if (!res.ok) {
      const msg = (payload && (payload.message || payload.error)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return payload ?? (text ? { message: text } : {});
  }

  /* ================= Cadastro ================= */
  (function authForms() {
    const formSignup = document.getElementById("form-cadastro-signup");
    if (formSignup) {
      formSignup.addEventListener("submit", async (e) => {
        e.preventDefault();
        const inVal = (id) => document.getElementById(id)?.value?.trim() || '';
        const nome = inVal("su-nome"), telefone = inVal("su-telefone"),
          email = inVal("su-email").toLowerCase(), email2 = inVal("su-email-conf").toLowerCase();
        const s1 = document.getElementById("su-senha")?.value || '';
        const s2 = document.getElementById("su-senha-conf")?.value || '';
        const termos = document.getElementById("su-termos")?.checked;

        if (!nome || !email || !email2 || email !== email2 || s1.length < 6 || s1 !== s2 || !termos) {
          toast("Revise os campos: e-mails iguais, senhas (mín. 6) e aceite os termos."); return;
        }

        try {
          await apiFetchJSON(CONFIG.endpoints.signup, {
            method: "POST",
            body: JSON.stringify({ nome, email, telefone, senha: s1 })
          });

          toast("Usuário cadastrado!");
          location.href = CONFIG.redirectAfterAuth;
        } catch (e1) {
          toast("Erro ao cadastrar: " + e1.message);
        }
      });
    }

    /* ================= Login ================= */
    const formLogin = document.getElementById("form-cadastro-login");
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("li-email")?.value?.trim().toLowerCase() || '';
        const senha = document.getElementById("li-senha")?.value || '';
        if (!email || !senha) { toast("Preencha e-mail e senha."); return; }

        try {
          await apiFetchJSON(CONFIG.endpoints.login, {
            method: "POST",
            body: JSON.stringify({ email, senha })
          });
          toast(`Bem-vindo(a), ${email}!`);
          location.href = CONFIG.redirectAfterAuth;
        } catch (e1) {
          toast("Login inválido: " + (e1.message || "erro"));
        }
      });
    }
  })();

  /* ================= Compra ================= */
  const formCompra = document.getElementById("form-compra");
  if (formCompra) {
    formCompra.addEventListener("submit", async (e) => {
      e.preventDefault();
      const qtdSensores = document.getElementById("qtd-sensores")?.value || 0;
      const descricao = document.getElementById("descricao")?.value.trim();

      try {
        await apiFetchJSON(CONFIG.endpoints.compra, {
          method: "POST",
          body: JSON.stringify({ qtdSensores, descricao })
        });
        toast("Compra registrada!");
        formCompra.reset();
      } catch (err) {
        toast("Erro na compra: " + err.message);
      }
    });
  }

  /* ================= Contato (Fale Conosco) ================= */
  const formContato = document.getElementById("form-contato");
  if (formContato) {
    formContato.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const telefone = document.getElementById("telefone")?.value.trim();
      const assunto = document.getElementById("assunto")?.value;
      const mensagem = document.getElementById("mensagem")?.value.trim();

      if (!nome || !email || !assunto || !mensagem) {
        toast("Preencha todos os campos obrigatórios.");
        return;
      }

      try {
        await apiFetchJSON(CONFIG.endpoints.contato, {
          method: "POST",
          body: JSON.stringify({ nome, email, telefone, assunto, mensagem })
        });

        toast("Mensagem enviada com sucesso!");
        formContato.reset();
      } catch (err) {
        toast("Erro ao enviar: " + err.message);
      }
    });
  }
})();


