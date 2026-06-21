/* ==========================================================================
   FRONTLINE — Sub-page interactions
   Shared across interior pages: scroll reveal, FAQ accordion, role filters,
   form validation + simulated submit. All progressive — pages work without JS.
   ========================================================================== */

/* ---------- scroll reveal ---------- */
(function(){
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.12});
  els.forEach(el=>io.observe(el));
})();

/* ---------- FAQ accordion ---------- */
(function(){
  document.querySelectorAll('.faq-q').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item = btn.closest('.faq-item');
      const open = item.classList.contains('open');
      // optional single-open behaviour within the same .faq group
      const group = item.closest('.faq');
      if(group){ group.querySelectorAll('.faq-item.open').forEach(i=>{ if(i!==item) i.classList.remove('open'); }); }
      item.classList.toggle('open', !open);
    });
  });
})();

/* ---------- role listing: filter + pagination ---------- */
(function(){
  const grid = document.getElementById('roles-list');
  if(!grid) return;
  const chips = document.querySelectorAll('.chip[data-filter]');
  const countEl = document.getElementById('filter-count');
  const empty = document.getElementById('empty-state');
  const pager = document.getElementById('pager');
  const cards = Array.from(grid.querySelectorAll('[data-cat]'));
  const PER_PAGE = 6;
  let filter = 'all';
  let page = 1;

  function matching(){
    return cards.filter(c =>
      filter === 'all' || (c.getAttribute('data-cat') || '').split(' ').includes(filter)
    );
  }

  function render(){
    const list = matching();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if(page > pages) page = pages;
    cards.forEach(c => { c.style.display = 'none'; });
    const start = (page - 1) * PER_PAGE;
    list.slice(start, start + PER_PAGE).forEach(c => { c.style.display = ''; });
    if(countEl){ countEl.innerHTML = '全 <b>' + list.length + '</b> 件'; }
    if(empty){ empty.style.display = list.length === 0 ? '' : 'none'; }
    renderPager(pages);
  }

  function renderPager(pages){
    if(!pager) return;
    pager.innerHTML = '';
    if(pages <= 1) return;
    const mk = (label, target, opts) => {
      opts = opts || {};
      const b = document.createElement('button');
      b.className = 'page-btn' + (opts.active ? ' active' : '') + (opts.nav ? ' nav' : '');
      b.textContent = label;
      if(opts.disabled){ b.disabled = true; }
      else {
        b.addEventListener('click', () => {
          page = target; render();
          grid.scrollIntoView({behavior:'smooth', block:'start'});
        });
      }
      pager.appendChild(b);
    };
    mk('←', page - 1, {nav:true, disabled: page === 1});
    for(let i = 1; i <= pages; i++){ mk(String(i), i, {active: i === page}); }
    mk('→', page + 1, {nav:true, disabled: page === pages});
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filter = chip.getAttribute('data-filter');
      page = 1;
      render();
    });
  });

  render();
})();

/* ==========================================================================
   フォーム送信先（Google スプレッドシート連携）

   ▼ 設定方法（一度だけ）：
   1. apps-script/Code.gs の内容を script.google.com の新規プロジェクトに貼り付け
   2. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」
      ・実行ユーザー：自分
      ・アクセスできるユーザー：全員
   3. 発行された「ウェブアプリ URL」を下の SHEET_WEBAPP_URL に貼り付け

   ※ URL が空のままでも、フォームはデモ送信として動作します（転記はされません）。
   ========================================================================== */
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbx5qK33ZO20s3VapLKWbf0QFf9m00OTxdPRHRceAatwD6EKxM5S8Om1VA4LVY8OVajY/exec';

/* クロスオリジン（file:// 含む）でも確実に送信する。
   sendBeacon → fetch(no-cors) → 隠しフォーム+iframe の順にフォールバック。 */
function postToSheet(payload){
  return new Promise((resolve)=>{
    if(!SHEET_WEBAPP_URL){ resolve(false); return; }

    // URLエンコード本文（Apps Script の e.parameter で受け取れる）
    const usp = new URLSearchParams();
    Object.keys(payload).forEach(k=> usp.append(k, payload[k]==null ? '' : String(payload[k])));
    const bodyStr = usp.toString();
    const ct = 'application/x-www-form-urlencoded;charset=UTF-8';

    // 1) sendBeacon — 最も確実な fire-and-forget
    try{
      if(navigator.sendBeacon){
        const blob = new Blob([bodyStr], {type:ct});
        if(navigator.sendBeacon(SHEET_WEBAPP_URL, blob)){ resolve(true); return; }
      }
    }catch(_){}

    // 2) fetch (no-cors)
    try{
      fetch(SHEET_WEBAPP_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':ct}, body:bodyStr})
        .then(()=>resolve(true))
        .catch(()=>iframeFallback());
      return;
    }catch(_){}

    iframeFallback();

    // 3) 隠しフォーム + iframe
    function iframeFallback(){
      const frameName = 'sheet_post_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = frameName; iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const f = document.createElement('form');
      f.method = 'POST'; f.action = SHEET_WEBAPP_URL; f.target = frameName;
      Object.keys(payload).forEach(k=>{
        const i = document.createElement('input');
        i.type = 'hidden'; i.name = k; i.value = payload[k]==null ? '' : String(payload[k]);
        f.appendChild(i);
      });
      document.body.appendChild(f);
      f.submit();
      setTimeout(()=>{ try{f.remove();iframe.remove();}catch(_){} resolve(true); }, 2500);
    }
  });
}

function serializeForm(form){
  const data = {};
  form.querySelectorAll('input,select,textarea').forEach(f=>{
    if(!f.name) return;
    if(f.type==='checkbox' || f.type==='radio'){
      if(f.checked){
        let val;
        if(f.name==='consent'){
          val = '同意';
        } else {
          const lbl = form.querySelector('label[for="'+f.id+'"]');
          val = lbl ? lbl.textContent.trim() : f.value;
        }
        data[f.name] = data[f.name] ? data[f.name] + ' / ' + val : val;
      }
    } else {
      data[f.name] = f.value;
    }
  });
  return data;
}

/* ---------- Google Ads コンバージョン計測（申し込み） ---------- */
function gtag_report_conversion(url){
  var callback = function(){ if(typeof(url) !== 'undefined'){ window.location = url; } };
  if(typeof gtag === 'function'){
    gtag('event', 'conversion', {
      'send_to': 'AW-18240298925/oPFUCLu6osAcEK2_0_lD',
      'event_callback': callback
    });
  } else {
    callback();
  }
  return false;
}

/* ---------- forms: validation + submit ---------- */
(function(){
  document.querySelectorAll('form[data-form]').forEach(form=>{
    const feedback = form.querySelector('.form-feedback');
    const submitBtn = form.querySelector('[type="submit"]');
    const sheetType = form.getAttribute('data-sheet'); // 'talent' / 'company' / null

    function clearErr(field){
      field.classList.remove('field-error');
      const msg = field.parentElement.querySelector('.err-msg');
      if(msg) msg.classList.remove('show');
    }
    function showErr(field,text){
      field.classList.add('field-error');
      const msg = field.parentElement.querySelector('.err-msg');
      if(msg){ if(text) msg.textContent = text; msg.classList.add('show'); }
    }

    form.querySelectorAll('.input,.textarea,.select').forEach(f=>{
      f.addEventListener('input',()=>clearErr(f));
      f.addEventListener('change',()=>clearErr(f));
    });

    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      let ok = true;
      // required fields
      form.querySelectorAll('[required]').forEach(field=>{
        if(field.type==='checkbox'){
          if(!field.checked){ ok=false; field.classList.add('field-error'); }
          else field.classList.remove('field-error');
          return;
        }
        if(!String(field.value||'').trim()){ ok=false; showErr(field,'必須項目です'); }
      });
      // email format
      const email = form.querySelector('input[type="email"]');
      if(email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())){
        ok=false; showErr(email,'メールアドレスの形式が正しくありません');
      }
      if(!ok){
        if(feedback){
          feedback.className = 'form-feedback show';
          feedback.style.background='rgba(229,96,77,.1)';
          feedback.style.borderColor='rgba(229,96,77,.35)';
          feedback.style.color='#E5604D';
          feedback.textContent='⚠ 入力内容をご確認ください。';
        }
        return;
      }

      // build payload
      const payload = serializeForm(form);
      if(sheetType) payload.type = sheetType;
      payload.submittedAt = new Date().toLocaleString('ja-JP');
      payload.source = location.href;

      if(submitBtn){ submitBtn.disabled=true; submitBtn.dataset.label=submitBtn.textContent; submitBtn.textContent='送信中…'; }

      const finalize = (sent)=>{
        gtag_report_conversion(); // 申し込みコンバージョン（送信成功時に1回発火）
        if(feedback){
          feedback.className='form-feedback show';
          feedback.style.background='';feedback.style.borderColor='';feedback.style.color='';
          feedback.innerHTML = (sheetType && SHEET_WEBAPP_URL)
            ? '✓ 送信を受け付けました。担当より<b>2営業日以内</b>にご連絡します。'
            : '✓ 送信を受け付けました。担当より<b>2営業日以内</b>にご連絡します。（デモ送信：転記先未設定）';
        }
        form.querySelectorAll('.input,.textarea,.select').forEach(f=>f.value='');
        form.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(c=>c.checked=false);
        if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=submitBtn.dataset.label||'送信する'; }
        if(feedback) feedback.scrollIntoView({behavior:'smooth',block:'center'});
      };

      if(sheetType && SHEET_WEBAPP_URL){
        postToSheet(payload).then(finalize);
      } else {
        setTimeout(()=>finalize(false), 700); // デモ送信
      }
    });
  });
})();
