// script.js — Acess Path (carrossel + VLibras + voz + abas + login global + gate + orçamento + compra + contato)
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
      signup: '/api/usuarios',               // usa o mesmo endpoint que você já tem
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
      // se quiser, pode adicionar aqui: contato: ['/api/contatos','/api/contato','/api/mensagens','/api/fale-conosco']
    },
    redirectAfterAuth: (new URLSearchParams(location.search).get('redirect') || 'compra.html')
  };

  /* ================= Crypto helpers (Web Crypto) ================= */
  const enc = new TextEncoder();
  const buf2hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
  async function sha256Hex(s) {
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(s));
    return buf2hex(digest);
  }
  function getPepper() {
    const m = document.querySelector('meta[name="ap-pepper"]');
    return m ? (m.getAttribute('content') || '') : '';
  }

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
      const u = location.pathname + (q.toString() ? '?' + q.toString() : '');
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

  /* ================= Gate (compra.html) ================= */
  function setupGate(){
    const gate = document.getElementById('auth-gate');
    if(!gate) return;

    if (window.AP_DISABLE_GATE) {
      gate.hidden = true;
      document.body.classList.remove('modal-open');
      document.querySelectorAll('.is-blurred').forEach(el=>el.classList.remove('is-blurred'));
      return;
    }

    const redirect = encodeURIComponent('compra.html');
    const aSignup = document.getElementById('go-signup');
    const aLogin  = document.getElementById('go-login');
    if (aSignup) aSignup.href = `cadastro.html?mode=signup&redirect=${redirect}`;
    if (aLogin)  aLogin.href  = `cadastro.html?mode=login&redirect=${redirect}`;

    function blur(on){
      ['header','main','footer','#tts-mini','.enabled[vw]'].forEach(sel=>{
        const el=document.querySelector(sel);
        if(el) el.classList.toggle('is-blurred', on);
      });
      document.body.classList.toggle('modal-open',on);
    }
    function lock(){ blur(true); gate.hidden=false; }
    function unlock(){ blur(false); gate.hidden=true; }

    if (isLogged()) unlock(); else lock();

    gate.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ window.location.href='index.html'; } });

    window.addEventListener('storage',(e)=>{
      if (e.key==='ap_auth' || e.key==='ap_user'){ location.reload(); }
    });
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

  /* ================= Login / Signup (cadastro.html) ================= */
  (function authForms(){
    // Abas
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
    const mode = params.get('mode'); // signup|login
    if (mode) activateTab(mode==='login'?'login':'signup');

    tabSignup?.addEventListener('click',()=>activateTab('signup'));
    tabLogin ?.addEventListener('click',()=>activateTab('login'));

    // Mostrar/ocultar senha — ícone controlado por aria-pressed
    document.querySelectorAll('[data-toggle="password"], .field-pwd .pwd-toggle').forEach(btn=>{
      const input = btn.dataset.target
        ? document.getElementById(btn.dataset.target)
        : btn.closest('.field-pwd')?.querySelector('input');

      if(!input) return;

      const sync = () => {
        const visible = input.type === 'text';
        btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
        btn.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      };

      btn.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        sync();
      });

      sync();
    });

    // Máscara telefone
    const tel=document.getElementById('su-telefone');
    function maskTel(v){ return v.replace(/\D/g,'').replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/,(_,a,b,c)=>{let out=''; if(a) out='('+a+(a.length===2?') ':''); if(b) out+=b+(b.length===5?'-':''); if(c) out+=c; return out;}); }
    tel?.addEventListener('input', e=> e.target.value = maskTel(e.target.value));

    // ===== Signup (pré-hash SHA-256 no cliente)
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

        const prehash = await sha256Hex(`${email}:${s1}:${getPepper()}`);

        try{
          // >>> MUDANÇA AQUI: envia senhaHash (não senhaPrehash)
          let novo = await apiFetchJSON(CONFIG.endpoints.signup, {
            method:"POST",
            body: JSON.stringify({ nome, email, telefone, senhaHash: prehash }) // CHANGED
          });

          // (opcional) se o back não retornar corpo, resolvemos o id por e-mail
          if (!novo?.idUsuario && !novo?.id && !novo?.id_usuario) {
            const id = await tryResolveUserIdByEmail(email);
            if (id) novo = { ...(novo||{}), idUsuario: id };
          }

          markLoggedIn(novo || { nome, email });
          toast("Usuário cadastrado!");
          location.href = CONFIG.redirectAfterAuth;

        }catch(_e1){
          try{
            let legacy = await apiFetchJSON(CONFIG.endpoints.usuariosLegacy, {
              method:"POST",
              body: JSON.stringify({ nome, email, telefone, senhaHash: prehash }) // já era senhaHash
            });

            if (!legacy?.idUsuario && !legacy?.id && !legacy?.id_usuario) {
              const id = await tryResolveUserIdByEmail(email);
              if (id) legacy = { ...(legacy||{}), idUsuario: id };
            }

            markLoggedIn(legacy || { nome, email });
            toast("Usuário cadastrado!");
            location.href = CONFIG.redirectAfterAuth;
          }catch(e2){
            toast("Erro ao cadastrar: " + e2.message);
          }
        }
      });
    }

    // ===== Login (pré-hash SHA-256 no cliente)
    const formLogin = document.getElementById("form-cadastro-login");
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("li-email")?.value?.trim().toLowerCase() || '';
        const senha = document.getElementById("li-senha")?.value || '';
        if (!email || !senha) { toast("Preencha e-mail e senha."); return; }

        const prehash = await sha256Hex(`${email}:${senha}:${getPepper()}`);

        try {
          const user = await apiFetchJSON(CONFIG.endpoints.login, {
            method: "POST",
            body: JSON.stringify({ email, senhaHash: prehash })
          });

          markLoggedIn(user || { email });
          toast(`Bem-vindo(a), ${user?.nome || email}!`);
          location.href = CONFIG.redirectAfterAuth;

        } catch (e1) {
          try {
            const legacy = await apiFetchJSON(CONFIG.endpoints.loginLegacy, {
              method: "POST",
              body: JSON.stringify({ email, senhaHash: prehash })
            });
            markLoggedIn(legacy || { email });
            toast(`Bem-vindo(a), ${legacy?.nome || email}!`);
            location.href = CONFIG.redirectAfterAuth;
          } catch (e2) {
            toast("Login inválido: " + (e1.message || e2.message));
          }
        }
      });
    }
  })();

  /* ================= Orçamento (compra.html) ================= */
  let calcularOrcamentoRef = null;
  (function initBudget(){
    const $ = (sel) => document.querySelector(sel);

    const formOrc = $('#form-orcamento');
    const resultado = $('#resultado-orcamento');
    const tabela = $('#tabela-itens');
    const totalGeral = $('#total-geral');

    const inputAmb = $('#ambientes');
    const inputArea = $('#areaTotal');

    const precoSensor = $('#precoSensor');
    const precoFone = $('#precoFone');
    const precoMaoObra = $('#precoMaoObra');
    const m2PorSensor = $('#m2PorSensor');
    const minSensorAmb = $('#minSensorAmb');

    const btnCalc = $('#btnCalcular');

    const inputQtdCompra = $('#quantidade');
    const inputValorEstimado = $('#valorEstimado');
    const inputOrcamentoJson = $('#orcamento-json');

    function moeda(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

    function calcularOrcamento(){
      if (!formOrc || !resultado) return;

      const ambientes = Math.max(1, parseInt(inputAmb.value || '1', 10));
      const areaTotal = Math.max(1, parseInt(inputArea.value || '1', 10));

      const pSensor = Math.max(0, parseFloat(precoSensor.value || '0'));
      const pFone   = Math.max(0, parseFloat(precoFone.value   || '0'));
      const pMao    = Math.max(0, parseFloat(precoMaoObra.value|| '0'));
      const ratio   = Math.max(1, parseInt(m2PorSensor.value   || '1', 10));
      const minPorAmb = Math.max(1, parseInt(minSensorAmb.value|| '1', 10));

      const areaMediaAmb = areaTotal / ambientes;
      const sensoresPorAmb = Math.max(minPorAmb, Math.ceil(areaMediaAmb / ratio));
      const sensoresTotal = ambientes * sensoresPorAmb;

      const fonesTotal = ambientes;
      const maoObraTotal = ambientes;

      const subtotalSensores = sensoresTotal * pSensor;
      const subtotalFones    = fonesTotal    * pFone;
      const subtotalMaoObra  = maoObraTotal  * pMao;
      const total = subtotalSensores + subtotalFones + subtotalMaoObra;

      if (tabela) {
        tabela.innerHTML = `
          <div role="rowgroup">
            <div role="row" class="row head" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.5rem;font-weight:600">
              <div role="columnheader">Item</div>
              <div role="columnheader">Qtd.</div>
              <div role="columnheader">Unit.</div>
              <div role="columnheader">Subtotal</div>
            </div>
            <div role="row" class="row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.5rem;margin-top:.5rem">
              <div role="cell">Sensor RFID</div>
              <div role="cell">${sensoresTotal}</div>
              <div role="cell">${moeda(pSensor)}</div>
              <div role="cell">${moeda(subtotalSensores)}</div>
            </div>
            <div role="row" class="row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.5rem;margin-top:.25rem">
              <div role="cell">Kit núcleo (fone + receptor + Raspberry)</div>
              <div role="cell">${fonesTotal}</div>
              <div role="cell">${moeda(pFone)}</div>
              <div role="cell">${moeda(subtotalFones)}</div>
            </div>
            <div role="row" class="row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.5rem;margin-top:.25rem">
              <div role="cell">Mão de obra (por ambiente)</div>
              <div role="cell">${maoObraTotal}</div>
              <div role="cell">${moeda(pMao)}</div>
              <div role="cell">${moeda(subtotalMaoObra)}</div>
            </div>
          </div>
        `;
      }

      if (totalGeral) totalGeral.textContent = `Total estimado: ${moeda(total)}`;
      if (inputQtdCompra) inputQtdCompra.value = ambientes;
      if (inputValorEstimado) inputValorEstimado.value = total.toFixed(2);
      if (inputOrcamentoJson) {
        const payload = {
          ambientes, areaTotal,
          regras: { m2PorSensor: ratio, minimoSensoresPorAmbiente: minPorAmb },
          itens: {
            sensores: { quantidade: sensoresTotal, unitario: pSensor, subtotal: subtotalSensores },
            fones:    { quantidade: fonesTotal,    unitario: pFone,   subtotal: subtotalFones },
            maoDeObra:{ quantidade: maoObraTotal,  unitario: pMao,    subtotal: subtotalMaoObra }
          },
          total
        };
        inputOrcamentoJson.value = JSON.stringify(payload);
      }
    }

    if (btnCalc && formOrc && resultado) {
      btnCalc.addEventListener('click', () => {
        calcularOrcamento();
        toast('Orçamento atualizado!');
      });
      ['change','input'].forEach(evt=>{
        formOrc.addEventListener(evt,(e)=>{
          if (e.target.closest('details') && !e.target.closest('details').open) return;
          calcularOrcamento();
        });
      });
      calcularOrcamento();
    }

    calcularOrcamentoRef = calcularOrcamento;
  })();

  /* ================= Compra (envio ao Spring) ================= */
  (function initPurchase(){
    const formCompra = document.getElementById('form-compra');
    if (!formCompra) return;

    formCompra.addEventListener('submit', async (e)=>{
      e.preventDefault();

      if (!isLogged()) {
        toast('Faça login para concluir a compra.');
        setTimeout(()=> location.href = 'cadastro.html?mode=login&redirect=compra.html', 600);
        return;
      }

      let user = currentUser();
      let idUsuario = user?.idUsuario || user?.id_usuario || null;

      if (!idUsuario && user?.email) {
        idUsuario = await tryResolveUserIdByEmail(user.email);
        if (idUsuario) {
          const merged = { ...(user||{}), idUsuario, id_usuario: idUsuario };
          try { localStorage.setItem('ap_user', JSON.stringify(merged)); } catch {}
          user = merged;
        }
      }

      if (!idUsuario) {
        toast('Não consegui identificar seu ID de usuário. Entre novamente.');
        setTimeout(()=> location.href='cadastro.html?mode=login&redirect=compra.html', 800);
        return;
      }

      const quantidade   = parseInt(document.getElementById('quantidade').value || '0', 10);
      const pagamento    = document.getElementById('pagamento').value;
      const valorEstimado= parseFloat(document.getElementById('valorEstimado').value || '0');
      const orcamentoJson= document.getElementById('orcamento-json')?.value || null;

      if (!pagamento){ toast('Escolha a forma de pagamento.'); return; }
      if (!quantidade || quantidade < 1){ toast('Quantidade inválida.'); return; }
      if (!valorEstimado || valorEstimado <= 0){ toast('Calcule o orçamento antes de comprar.'); return; }

      const payload = {
        usuario: { idUsuario: Number(idUsuario) },
        quantidade: Number(quantidade),
        pagamento,
        valorEstimado: Number(valorEstimado),
        orcamentoJson
      };

      try{
        const resp = await apiFetchJSON(CONFIG.endpoints.compra, {
          method:'POST',
          body: JSON.stringify(payload)
        });
        toast('Pedido registrado com sucesso, em breve entraremos em contato!');
        formCompra.reset();
        if (typeof calcularOrcamentoRef === 'function') calcularOrcamentoRef();
        console.log('Compra criada:', resp);
      }catch(err){
        console.error(err);
        toast('Erro ao registrar compra: ' + err.message);
      }
    });
  })();

  /* ================= Contato (fale-conosco) ================= */
  (function contatoForm(){
    const form = document.getElementById('form-contato');
    if(!form) return;

    const txt = document.getElementById('mensagem');
    const counter = document.getElementById('contagem');
    if (txt && counter){
      const upd = () => counter.textContent = `${txt.value.length}/600`;
      txt.addEventListener('input', upd); upd();
    }

    async function postContato(payload){
      const tries = (CONFIG.endpoints && CONFIG.endpoints.contato) || ['/api/contatos'];
      let lastErr;
      for (const p of tries){
        try{
          return await apiFetchJSON(p, { method:'POST', body: JSON.stringify(payload) });
        }catch(e){ lastErr = e; }
      }
      throw lastErr || new Error('Falha ao enviar contato');
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const nome      = document.getElementById('nome')?.value?.trim();
      const email     = document.getElementById('email')?.value?.trim().toLowerCase();
      const telefone  = document.getElementById('telefone')?.value?.trim() || '';
      const assunto   = document.getElementById('assunto')?.value || '';
      const mensagem  = document.getElementById('mensagem')?.value?.trim();

      if(!nome || !email || !assunto || !mensagem){
        toast('Preencha nome, e-mail, assunto e mensagem.'); return;
      }

      const payload = {
        nome, email, telefone, assunto, mensagem,
        name:nome, phone:telefone.replace(/\D/g,''), subject:assunto, message:mensagem
      };

      try{
        await postContato(payload);
        toast('Mensagem enviada! Obrigado pelo contato.');
        announce('Mensagem enviada com sucesso.');
        form.reset();
        if (counter) counter.textContent = '0/600';
      }catch(err){
        console.error(err);
        toast('Falha ao enviar: ' + err.message);
        announce('Falha ao enviar a mensagem.');
      }
    });
  })();

  /* ================= Carrossel (se existir) ================= */
  (function initCarousel(){
    const carousel=document.querySelector('.carousel-fade'); if(!carousel) return;
    const slides=Array.from(carousel.querySelectorAll('.slide'));
    let dotsWrap=carousel.querySelector('.dots');
    const prevBtn=carousel.querySelector('.prev'); const nextBtn=carousel.querySelector('.next');
    const INTERVAL = Number(carousel.dataset.interval || 5000);

    if(!dotsWrap){ dotsWrap=document.createElement('div'); dotsWrap.className='dots'; carousel.appendChild(dotsWrap); }
    dotsWrap.innerHTML = slides.map((_,i)=>`<button class="dot" type="button" role="tab" aria-label="Ir para slide ${i+1}" data-index="${i}"></button>`).join('');
    let dots = Array.from(carousel.querySelectorAll('.dot'));

    let current = Math.max(0, slides.findIndex(s=>s.classList.contains('active'))); if(current<0) current=0;

    function setAria(i,active){
      slides[i]?.setAttribute('aria-hidden', active?'false':'true');
      if(dots[i]){ dots[i].classList.toggle('active',active); dots[i].setAttribute('aria-selected', active?'true':'false'); dots[i].setAttribute('tabindex', active?'0':'-1'); }
    }
    function showSlide(idx){
      if(!slides.length) return; const i=(idx+slides.length)%slides.length;
      slides.forEach((s,k)=> s.classList.toggle('active', k===i));
      slides.forEach((_,k)=> setAria(k, k===i)); current=i;
    }
    function next(){ showSlide(current+1); }
    function prev(){ showSlide(current-1); }

    prevBtn?.addEventListener('click',prev); nextBtn?.addEventListener('click',next);
    dots.forEach(dot=>{
      dot.addEventListener('click',()=>{ const i=parseInt(dot.dataset.index||'0',10); showSlide(i); });
      dot.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); dot.click(); }});
    });
    carousel.addEventListener('keydown',e=>{ if(e.key==='ArrowRight'){ e.preventDefault(); next(); } if(e.key==='ArrowLeft'){ e.preventDefault(); prev(); } });

    let timer=null; function start(){ stop(); timer=setInterval(next,INTERVAL); } function stop(){ if(timer) clearInterval(timer); timer=null; }
    [prevBtn, nextBtn, ...dots].forEach(el=>{ el?.addEventListener('mouseover',stop); el?.addEventListener('mouseout',start); el?.addEventListener('focus',stop); el?.addEventListener('blur',start); });
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) stop(); else start(); });

    showSlide(current); start();
  })();

  /* ================= VLibras + Leitor de Voz ================= */
  (function initAccessibility(){
    function initVLibras(){
      try{
        if(window.VLibras && window.VLibras.Widget){ new window.VLibras.Widget('https://vlibras.gov.br/app'); announce('VLibras carregado.'); }
        else setTimeout(initVLibras,600);
      }catch(e){}
    }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', initVLibras); } else { initVLibras(); }

    const btn=document.getElementById('tts-mini'); let ttsEnabled=false; let currentUtterance=null;
    function getSelectedText(){ const s=window.getSelection&&window.getSelection(); return s?String(s.toString()||''):''; }
    function stopSpeak(){ try{window.speechSynthesis.cancel();}catch{} btn?.setAttribute('data-speaking','false'); announce('Leitura interrompida.'); }
    function speak(text){
      if(!ttsEnabled) return;
      if(!('speechSynthesis' in window)){ toast('Seu navegador não suporta leitura por voz.'); return; }
      const cleaned=(text||'').replace(/\s+/g,' ').trim(); if(!cleaned){ toast('Selecione um texto ou clique em um parágrafo.'); return; }
      window.speechSynthesis.cancel(); currentUtterance=new SpeechSynthesisUtterance(cleaned);
      currentUtterance.lang='pt-BR'; currentUtterance.rate=1; currentUtterance.pitch=1;
      currentUtterance.onstart=()=>{ btn?.setAttribute('data-speaking','true'); announce('Leitura iniciada.'); };
      currentUtterance.onend  =()=>{ btn?.setAttribute('data-speaking','false'); announce('Leitura concluída.'); };
      currentUtterance.onerror=()=>{ btn?.setAttribute('data-speaking','false'); toast('Falha ao reproduzir a voz.'); };
      window.speechSynthesis.speak(currentUtterance);
    }
    btn?.addEventListener('click',(e)=>{
      e.stopPropagation();
      if(ttsEnabled){ ttsEnabled=false; btn.removeAttribute('data-enabled'); btn.setAttribute('data-speaking','false'); stopSpeak(); toast('Leitura por voz desativada.'); }
      else { ttsEnabled=true; btn.setAttribute('data-enabled','true'); toast('Leitura por voz ativada.'); if(getSelectedText().trim()){ toast('Texto selecionado: clique em um parágrafo para ouvir.',1800); } }
    });
    function attachSpeakHandlers(){
      const selectors=['.speakable p','.speakable h1','.speakable h2','.speakable h3','.speakable li','main p','main h1','main h2','main h3','main li'];
      document.querySelectorAll(selectors.join(',')).forEach(el=>{
        el.addEventListener('click',(ev)=>{
          if(!ttsEnabled) return;
          if(ev.target.closest('[vw],[vw-plugin-wrapper],[vw-access-button]')) return;
          if(ev.target.closest('a')) return;
          const sel=getSelectedText(); const txt=sel.trim()?sel:(el.innerText||el.textContent||''); speak(txt);
        });
      });
    }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', attachSpeakHandlers); } else { attachSpeakHandlers(); }

    function getVLibrasButton(){ return document.querySelector('[vw-access-button]')||document.querySelector('[vw] [vw-access-button]')||document.querySelector('.vpw-toggle')||document.querySelector('.vpw-bt-acessibilidade'); }
    function syncWithVLibras(){
      const acc=getVLibrasButton(); const btn=document.getElementById('tts-mini'); if(!acc||!btn) return;
      const r=acc.getBoundingClientRect(); const rb=btn.getBoundingClientRect(); const GAP=12;
      const rightEdge=window.innerWidth-r.right; const centerShift=(r.width-rb.width)/2; const right=Math.max(12,rightEdge+centerShift);
      btn.style.right=right+'px'; if(toastEl) toastEl.style.right=right+'px';
      const bottomEdge=window.innerHeight-r.bottom; const bottom=Math.max(12,bottomEdge+r.height+GAP);
      btn.style.bottom=bottom+'px'; if(toastEl) toastEl.style.bottom=(bottom+rb.height+8)+'px';
    }
    window.addEventListener('load',()=>{ syncWithVLibras(); setTimeout(syncWithVLibras,600); setTimeout(syncWithVLibras,1200); });
    window.addEventListener('resize',syncWithVLibras);
    new MutationObserver(syncWithVLibras).observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('beforeunload',()=>stopSpeak());
  })();

  /* ================= Inicializações globais ================= */
  ensureAuthBadge();
  setupGate();
  window.addEventListener('storage',(e)=>{ if(e.key==='ap_auth'||e.key==='ap_user'){ renderAuthBadge(); } });

  
})();
