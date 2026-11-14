'use strict';
/* StickTag — interface. A parte nativa (Java) está em window.Android. */
const A = window.Android;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const stripVS = e => e.replace(/️/g, '');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  sel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12l3 3 5-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
};

/* Categorias que o WhatsApp usa na pesquisa de stickers (lista oficial de emojis para tags). */
const WA_CATS = [
  { id: 'love', pt: 'Amor', en: 'Love', e: '❤ 😍 😘 💕 😻 💑 💏 🧡 💛 💚 💙 💜 🖤 💔 ❣ 💞 💓 💗 💖 💘 💝 💟 ♥ 💌 💋 👬 👭 👫 🥰 😚 😙 👄 🌹 😽 ❣️ ❤️' },
  { id: 'happy', pt: 'Feliz', en: 'Happy', e: '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 😛 😝 😜 🤪 🤗 😺 😸 😹 ☺ 😌 😉 😊' },
  { id: 'sad', pt: 'Triste', en: 'Sad', e: '☹ 😣 😖 😫 😩 😢 😭 😞 😔 😟 😕 😤 😠 😥 😰 😨 😿 😾 😓 🙍‍♂ 🙍‍♀ 💔 🙁 🥺 🤕 ☔️ ⛈ 🌩 🌧' },
  { id: 'angry', pt: 'Zangado / chocado', en: 'Angry', e: '😯 😦 😧 😮 😲 🙀 😱 🤯 😳 ❗ ❕ 🤬 😡 😠 🙄 👿 😾 😤 💢 👺 🗯️ 😒 🥵' },
  { id: 'greet', pt: 'Cumprimentar', en: 'Greet', e: '👋' },
  { id: 'celebrate', pt: 'Festa', en: 'Celebrate', e: '🎊 🎉 🎁 🎈 👯‍♂️ 👯 👯‍♀️ 💃 🕺 🔥 ⭐️ ✨ 💫 🎇 🎆 🍻 🥂 🍾 🎂 🍰' }
];
WA_CATS.forEach(c => c.list = c.e.split(' '));
const WA_CAT_OF = new Map();
WA_CATS.forEach(c => c.list.forEach(e => { const k = stripVS(e); if (!WA_CAT_OF.has(k)) WA_CAT_OF.set(k, []); if (!WA_CAT_OF.get(k).includes(c)) WA_CAT_OF.get(k).push(c); }));
const COMMON = new Set(['😂', '❤', '😍', '😭', '🙏', '😊', '👍', '🔥', '🥰', '😘', '😁', '🤣', '😅', '😎', '🥺', '😡', '👏', '💯', '🤔', '😉', '👌', '💕', '🎉', '😢', '😆', '🙄', '😏', '😜', '😴', '🤡', '💀', '👀', '✨', '🤩', '🤗', '😱'].map(stripVS));
WA_CATS.forEach(c => c.list.forEach(e => COMMON.add(stripVS(e))));
/* Emojis pouco usados: bons para uma "tag" só de um sticker. */
const RARE = ['🦩', '🧿', '🦚', '🦜', '🧩', '🪀', '🪁', '🛸', '🦑', '🦞', '🧭', '🧱', '🧲', '🧪', '🧬', '🧮', '🧸', '🪔', '🦥', '🦦', '🦨', '🦡', '🧉', '🧊', '🦪', '🪓', '🪕', '🧷', '🧻', '🧼', '🧽', '🧯', '🛹', '🪂', '🛕', '🦢', '🦙', '🦛', '🦘', '🦗', '🦂', '🦀', '🐙', '🦕', '🦖', '🧃', '🥥', '🥨', '🥯', '🥮', '🥟', '🥠', '🥡', '🦴', '🧵', '🧶', '🎐', '🏮', '🎴', '🀄', '🗿', '🏺', '🔮', '📿', '🧳', '🛎️', '⏳', '🔭', '🔬', '🕯️', '🪐', '🎋', '🎍', '🪃', '🪅', '🪆', '🧋', '🫖', '🪴', '🪵', '🪨', '🛼', '🪘', '🪗', '🪙', '🪤', '🪣', '🪥', '🧌', '🪸', '🫧', '🪬', '🪩', '🫎', '🪼', '🪿', '🫏', '🪯', '🪭'];
const GROUP_ICON = { 0: '😀', 1: '👋', 3: '🐻', 4: '🍔', 5: '🚗', 6: '⚽', 7: '💡', 8: '❤️', 9: '🏳️' };

let EMO = [], EMAP = new Map(), GROUPS = {};
async function loadEmoji() {
  try {
    const r = await fetch('emoji.json');
    const j = await r.json();
    GROUPS = j.groups;
    EMO = j.emojis.map(a => ({ e: a[0], g: a[1], n: a[2], pt: a[3] ? a[3].split('|') : [], en: a[4] ? a[4].split('|') : [] }));
    EMO.forEach(o => { o.npt = [o.n].concat(o.pt).map(norm); o.nen = o.en.map(norm); EMAP.set(stripVS(o.e), o); });
  } catch (e) { console.error(e); }
}
const emoInfo = e => EMAP.get(stripVS(e));

function splitEmojis(str) {
  const out = [];
  let parts;
  try { parts = Array.from(new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(str), s => s.segment); }
  catch (e) { parts = Array.from(str); }
  for (const p of parts) if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(p)) out.push(p);
  return out;
}

/* ---------- estado ---------- */
const S = { data: { packs: [] }, tab: 'packs', packId: null, sel: null, wa: {}, q: '', ov: [] };
function reload() { try { S.data = JSON.parse(A.getData()); } catch (e) { toast('Erro a ler os dados'); } }
const packOf = id => S.data.packs.find(p => p.id === id);
const imgUrl = (p, f) => `f/${encodeURIComponent(p.id)}/${encodeURIComponent(f)}?v=${p.version || 0}`;
const trayUrl = p => `f/${encodeURIComponent(p.id)}/tray.png?v=${p.version || 0}`;

function usage() {
  const m = new Map();
  for (const p of S.data.packs) for (const s of p.stickers) for (const e of (s.emojis || [])) {
    const k = stripVS(e);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ p, s });
  }
  return m;
}

function savePack(p) {
  const payload = { id: p.id, name: p.name, publisher: p.publisher, cover: p.cover || '',
    stickers: p.stickers.map(s => ({ f: s.f, emojis: s.emojis || [], words: s.words || [], fav: !!s.fav, learn: s.learn || {} })) };
  let r;
  try { r = JSON.parse(A.updatePack(JSON.stringify(payload))); } catch (e) { toast('Erro a guardar'); return p; }
  if (r.error) { toast(r.error); return p; }
  // atualiza os objetos existentes (assim as referências abertas no editor continuam válidas)
  const target = S.data.packs.find(x => x.id === p.id) || p;
  const byF = new Map(target.stickers.concat(p.stickers).map(s => [s.f, s]));
  r.stickers = r.stickers.map(rs => byF.has(rs.f) ? Object.assign(byF.get(rs.f), rs) : rs);
  Object.assign(target, r);
  if (target !== p) Object.assign(p, r);
  return target;
}

function waStatus(id, force) {
  if (!force && S.wa[id]) return S.wa[id];
  try { S.wa[id] = JSON.parse(A.waStatus(id)); } catch (e) { S.wa[id] = {}; }
  return S.wa[id];
}
const isAdded = st => st && (st.addedWa === 1 || st.addedW4b === 1);

const isKb = p => p.kind === 'kb';
const adultOn = () => !!S.data.adultMode;
/* no modo normal, as imagens +18 aparecem desfocadas na app (toca em «Mostrar» para ver) */
const hideAdult = (p, s) => !adultOn() && Match.isAdult(p, s) && !(S.reveal && S.reveal[p.id]);
const visible = p => p.stickers.filter(s => !s.hidden);
const maxOf = p => isKb(p) ? Infinity : 30;
const countLabel = p => { const v = visible(p).length, h = p.stickers.length - v; return (isKb(p) ? `${v} stickers` : `${v}/30 stickers`) + (h ? ` · +${h} em especiais` : ''); };
const kindLabel = p => isKb(p) ? 'só teclado' : (p.animated ? 'animado' : 'estático');
function emoWords(e) { return Match.effectiveWords(e, S.data, emoInfo); }

function issues(p) {
  const out = [];
  if (isKb(p)) {
    const none = visible(p).filter(s => !(s.emojis && s.emojis.length) && !(s.words && s.words.length)).length;
    if (none) out.push(`${none} sticker${none > 1 ? 's' : ''} sem emoji nem palavras (não aparece${none > 1 ? 'm' : ''} nas sugestões)`);
    return out;
  }
  const n = visible(p).length;
  if (n < 3) out.push(`${3 - n > 1 ? 'Faltam' : 'Falta'} ${3 - n} sticker${3 - n > 1 ? 's' : ''} (o WhatsApp pede no mínimo 3)`);
  const no = visible(p).filter(s => !s.emojis || !s.emojis.length).length;
  if (no) out.push(`${no} sticker${no > 1 ? 's' : ''} sem emoji${S.wa[p.id] && isAdded(S.wa[p.id]) ? ' (só aparece' + (no > 1 ? 'm' : '') + ' no WhatsApp depois de ter' + (no > 1 ? 'em' : '') + ' um)' : ''}`);
  return out;
}

/* ---------- utilidades de interface ---------- */
function toast(msg, ms = 2400) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

function openOverlay(node, opts = {}) {
  const ov = el(`<div class="ov ${opts.center ? 'center' : ''}"></div>`);
  ov.appendChild(node);
  ov.addEventListener('click', e => { if (e.target === ov && !opts.modal) closeOverlay(ov); });
  document.body.appendChild(ov);
  ov._onClose = opts.onClose;
  S.ov.push(ov);
  return ov;
}
function closeOverlay(ov) {
  ov = ov || S.ov[S.ov.length - 1];
  if (!ov) return;
  S.ov = S.ov.filter(x => x !== ov);
  ov.remove();
  if (ov._onClose) ov._onClose();
}
function dialog({ title, text = '', html = '', buttons = [] }) {
  return new Promise(res => {
    const d = el(`<div class="dialog"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${html}<div class="row" style="margin-top:6px"></div></div>`);
    const row = d.lastElementChild;
    let done = false;
    const ov = openOverlay(d, { center: true, onClose: () => { if (!done) res(null); } });
    buttons.forEach(b => {
      const btn = el(`<button class="btn ${b.cls || ''}">${esc(b.label)}</button>`);
      btn.onclick = () => { done = true; const v = b.value !== undefined ? b.value : b.label; closeOverlay(ov); res(typeof v === 'function' ? v(d) : v); };
      row.appendChild(btn);
    });
    const first = d.querySelector('input'); if (first) setTimeout(() => first.focus(), 60);
  });
}
const confirmBox = (title, text, ok = 'Apagar') => dialog({ title, text, buttons: [{ label: 'Cancelar', cls: 'ghost', value: false }, { label: ok, cls: 'danger', value: true }] });

let busyEl = null, busyT0 = 0;
/*
 * Ecrã de "a trabalhar". Com done/total mostra uma barra, a percentagem e o tempo que falta,
 * para nunca parecer que a app congelou.
 */
function busy(text, done, total, onCancel) {
  if (!text) { if (busyEl) busyEl.remove(); busyEl = null; return; }
  if (!busyEl) {
    busyEl = el('<div class="busy"><div class="b"><div class="spin"></div><div class="t"></div><div class="pb hidden"><div class="pf"></div></div><div class="pn"></div><div class="ph">Não feches a app.</div></div></div>');
    document.body.appendChild(busyEl);
    busyT0 = Date.now();
  }
  // "A importar 12 de 340…" → percentagem a partir do texto, se não vier em separado
  if (done == null) { const m = /(\d+) de (\d+)/.exec(text); if (m) { done = +m[1]; total = +m[2]; } }
  busyEl.querySelector('.t').textContent = text;
  if (onCancel && !busyEl.querySelector('.bc')) {
    const b = el('<button class="btn sm ghost bc" style="margin-top:12px">Parar</button>');
    b.onclick = () => { b.textContent = 'A parar…'; b.disabled = true; onCancel(); };
    busyEl.querySelector('.b').appendChild(b);
  }
  const pb = busyEl.querySelector('.pb'), pn = busyEl.querySelector('.pn');
  if (total > 0) {
    const pct = Math.min(100, Math.round(done / total * 100));
    pb.classList.remove('hidden');
    busyEl.querySelector('.pf').style.width = pct + '%';
    const el2 = (Date.now() - busyT0) / 1000;
    const left = done > 2 && el2 > 3 ? Math.round(el2 / done * (total - done)) : null;
    pn.textContent = `${pct}%` + (left != null && left > 2 ? ` · faltam ${left > 90 ? Math.round(left / 60) + ' min' : left + ' s'}` : '');
  } else { pb.classList.add('hidden'); pn.textContent = done > 0 ? `${done} feitos` : ''; }
}
/* espera um instante para o ecrã de "a trabalhar" aparecer antes de uma tarefa pesada */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
async function withBusy(text, fn) { busy(text); await nextFrame(); try { return fn(); } finally { busy(null); } }
/* operações grandes feitas no lado nativo: progresso em App.onBulkProgress e fim em App.onBulkDone */
function runBulk(text, start) {
  return new Promise(res => { S.bulkCb = r => { S.bulkCb = null; busy(null); res(r || {}); }; busy(text); start(); });
}


/*
 * Grelhas grandes (milhares de stickers): desenha aos bocados à medida que fazes scroll,
 * para abrir logo e não pesar.
 */
function progressive(container, items, make, first = 120, step = 120) {
  let i = 0;
  const sentinel = document.createElement('div');
  sentinel.className = 'more';
  function more(n) {
    const end = Math.min(items.length, i + n);
    const frag = document.createDocumentFragment();
    for (; i < end; i++) { const node = make(items[i], i); if (node) frag.appendChild(node); }
    container.appendChild(frag);
    if (i < items.length) { container.appendChild(sentinel); sentinel.textContent = `+${items.length - i}`; }
    else sentinel.remove();
  }
  more(first);
  if (i < items.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { sentinel.remove(); more(step); if (i >= items.length) io.disconnect(); } }, { rootMargin: '600px' });
    io.observe(sentinel);
  } else if (i < items.length) more(items.length);
}

/* ---------- navegação ---------- */
function go(tab) { S.tab = tab; S.packId = null; S.sel = null; S.folder = null; S.folders = false; render(); $('#main').scrollTop = 0; }
$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.tab));

function render() {
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab || (S.tab === 'shortcuts' && b.dataset.tab === 'help')));
  const m = $('#main');
  if (S.tab === 'packs') m.innerHTML = '', m.appendChild(S.folder ? viewFolder() : S.folders ? viewFolders() : S.packId ? viewPack() : viewPacks());
  else if (S.tab === 'words') m.innerHTML = '', m.appendChild(viewWords());
  else if (S.tab === 'shortcuts') m.innerHTML = '', m.appendChild(viewShortcuts());
  else if (S.tab === 'kb') m.innerHTML = '', m.appendChild(viewKeyboard());
  else if (S.tab === 'spc') m.innerHTML = '', m.appendChild(viewSpecials());
  else m.innerHTML = '', m.appendChild(viewHelp());
}

/* ---------- lista de packs ---------- */
function viewPacks() {
  const v = el('<section class="view"></section>');
  const tp = el(`<div class="top"><div class="brand"><div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.6" fill="currentColor"/></svg></div><div style="min-width:0"><h1>StickTag</h1><div class="sub">Os teus stickers com tags</div></div></div><button class="hbtn" id="dp" title="Procurar repetidos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2"/></svg></button><button class="hbtn" id="fd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Pastas</button></div>`);
  tp.querySelector('#fd').onclick = () => { S.folders = true; render(); $('#main').scrollTop = 0; };
  tp.querySelector('#dp').onclick = () => findDupes(null);
  v.appendChild(tp);
  // procurar em todos os packs
  const total = S.data.packs.reduce((a, p) => a + p.stickers.length, 0);
  const res = el('<div></div>');
  const listBox = el('<div></div>');
  if (total) {
    const sb = el(`<div class="search" style="height:46px;margin-bottom:12px">${ICON.search}<input placeholder="Procurar stickers por palavra ou emoji" value="${esc(S.pq || '')}"></div>`);
    const inp = $('input', sb);
    const drawRes = () => {
      S.pq = inp.value;
      const q = inp.value.trim();
      listBox.classList.toggle('hidden', !!q);
      res.innerHTML = '';
      if (!q) return;
      const found = Match.search(Match.buildIndex(Match.modeData(S.data), emoInfo), q, 80);
      if (!found.length) { res.appendChild(el(`<div class="empty" style="padding-top:10px"><div>Nenhum sticker para “${esc(q)}”.</div></div>`)); return; }
      res.appendChild(el(`<div class="sec" style="margin-top:0">${found.length} sticker${found.length > 1 ? 's' : ''}</div>`));
      const g = el('<div class="mygrid"></div>');
      found.forEach(r => { const im = el(`<img src="${imgUrl(r.p, r.s.f)}">`); im.onclick = () => closeAllAndEdit(r.p, r.s); g.appendChild(im); });
      res.appendChild(g);
    };
    inp.addEventListener('input', drawRes);
    v.appendChild(sb); v.appendChild(res);
    setTimeout(drawRes, 0);
  }
  v.appendChild(listBox);
  const vv = v;
  return (function () {
  const v = listBox;
  const n = A.sharedCount ? A.sharedCount() : 0;
  if (n > 0) {
    const b = el(`<div class="banner"><div style="font-size:26px">📥</div><div style="flex:1">Recebeste <b>${n} imagem${n > 1 ? 'ens' : ''}</b>. Escolhe para que pack vão.</div><button class="btn sm primary">Escolher</button></div>`);
    b.querySelector('button').onclick = askSharedPack;
    v.appendChild(b);
  }
  if (!S.data.packs.length) {
    v.appendChild(el(`<div class="empty"><div class="big">🏷️</div><h2>Ainda não tens packs</h2><div>Cria um pack, junta os teus stickers e dá a cada um emojis (as tags). Depois envia-o para o WhatsApp.</div></div>`));
  }
  for (const p of S.data.packs) {
    const st = isKb(p) ? {} : waStatus(p.id);
    const iss = issues(p);
    let chip = iss.length ? `<span class="chip warn">${esc(iss[0].split(' (')[0])}</span>` : (isKb(p) ? '<span class="chip ok">⌨ No teclado</span>' : (isAdded(st) ? '<span class="chip ok">✓ No WhatsApp</span>' : '<span class="chip">Pronto para enviar</span>'));
    const nA = p.stickers.filter(s => Match.isAdult(p, s)).length;
    const blurTray = !adultOn() && (p.adult || (p.cover && Match.isAdult(p, p.stickers.find(s => s.f === p.cover))));
    const thumbs = visible(p).slice(0, 6).map(s => `<img loading="lazy" class="${hideAdult(p, s) ? 'nsfw' : ''}" src="${imgUrl(p, s.f)}">`).join('');
    const c = el(`<div class="pack"><div class="tray">${p.stickers.length ? `<img class="${blurTray ? 'nsfw' : ''}" src="${trayUrl(p)}">` : ICON.img}</div><div class="info"><div class="name">${p.adult ? '<span class="a18t">🔞</span> ' : ''}${esc(p.name)}</div><div class="meta">${countLabel(p)} · ${kindLabel(p)}${!p.adult && nA ? ` · ${nA} 🔞` : ''}</div>${chip}</div></div>`);
    if (thumbs) c.querySelector('.info').insertAdjacentHTML('beforeend', `<div class="thumbs" style="margin-top:8px">${thumbs}</div>`);
    c.onclick = () => { S.packId = p.id; S.sel = null; render(); $('#main').scrollTop = 0; };
    v.appendChild(c);
  }
  const fab = el(`<button class="fab">${ICON.plus}Novo pack</button>`);
  fab.onclick = () => newPack();
  v.appendChild(fab);
  return vv;
  })();
}

async function newPack(thenShared) {
  let animated = false, kind = 'wa';
  const html = `<label class="field"><span>Nome do pack</span><input class="input" id="np-name" maxlength="128" placeholder="Ex.: Reações da malta"></label>
  <label class="field"><span>Autor</span><input class="input" id="np-pub" maxlength="128" value="${esc(store.get('pub', ''))}" placeholder="O teu nome"></label>
  <div class="field"><span>Para onde</span><div class="seg" id="np-kind"><button class="on" data-k="wa">WhatsApp + teclado</button><button data-k="kb">Só teclado</button></div></div>
  <div class="hint" id="np-khint" style="margin:-4px 0 12px">Vai para o WhatsApp (3 a 30 stickers) e também aparece no teclado de stickers.</div>
  <div class="field" id="np-typef"><span>Tipo de stickers</span><div class="seg" id="np-type"><button class="on" data-a="0">Estáticos</button><button data-a="1">Animados</button></div></div>
  <div class="hint" id="np-hint">Aceita imagens (PNG, JPG, WebP…). São convertidas para 512×512.</div><div style="height:12px"></div>`;
  const res = await new Promise(resolve => {
    dialog({ title: 'Novo pack', html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Criar', cls: 'primary', value: d => ({ name: $('#np-name', d).value, pub: $('#np-pub', d).value }) }] }).then(resolve);
    setTimeout(() => {
      $$('#np-kind button').forEach(b => b.onclick = () => {
        kind = b.dataset.k;
        $$('#np-kind button').forEach(x => x.classList.toggle('on', x === b));
        $('#np-khint').textContent = kind === 'kb' ? 'Fica só no teclado de stickers: sem limite de stickers, e podes misturar animados com estáticos.' : 'Vai para o WhatsApp (3 a 30 stickers) e também aparece no teclado de stickers.';
        $('#np-typef').classList.toggle('hidden', kind === 'kb');
        $('#np-hint').classList.toggle('hidden', kind === 'kb');
      });
      $$('#np-type button').forEach(b => b.onclick = () => {
        animated = b.dataset.a === '1';
        $$('#np-type button').forEach(x => x.classList.toggle('on', x === b));
        $('#np-hint').textContent = animated ? 'Só aceita stickers animados já no formato do WhatsApp (WebP animado 512×512, até 500 KB) — por exemplo, os que guardaste do WhatsApp.' : 'Aceita imagens (PNG, JPG, WebP…). São convertidas para 512×512.';
      });
    }, 0);
  });
  if (!res) return null;
  store.set('pub', res.pub.trim());
  try { A.setText('lastPublisher', res.pub.trim() || 'Eu'); } catch (e) {}
  let p;
  try { p = JSON.parse(A.createPack(res.name, res.pub, kind === 'kb' ? false : animated, kind)); } catch (e) { toast('Erro a criar'); return null; }
  if (p.error) { toast(p.error); return null; }
  reload();
  if (thenShared) return p;
  S.packId = p.id; render();
  return p;
}

async function askSharedPack() {
  const n = A.sharedCount();
  if (!n) return;
  const packs = S.data.packs;
  const html = `<div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto;margin-bottom:12px">${packs.map(p => `<button class="pack" data-id="${esc(p.id)}" style="margin:0;text-align:left"><div class="tray" style="width:44px;height:44px">${p.stickers.length ? `<img src="${trayUrl(p)}">` : ''}</div><div class="info"><div class="name">${esc(p.name)}</div><div class="meta" style="margin:0">${countLabel(p)} · ${kindLabel(p)}</div></div></button>`).join('')}</div>`;
  let chosen = null;
  const pr = dialog({ title: `Para que pack vão as ${n} imagens?`, html, buttons: [{ label: 'Descartar', cls: 'ghost', value: 'drop' }, { label: 'Novo pack', cls: 'primary', value: 'new' }] });
  setTimeout(() => $$('.dialog .pack[data-id]').forEach(b => b.onclick = () => { chosen = b.dataset.id; closeOverlay(); }), 0);
  const r = await pr;
  if (chosen) { busy('A importar…'); A.importShared(chosen); S.packId = chosen; S.tab = 'packs'; return; }
  if (r === 'drop') { A.clearShared(); render(); return; }
  if (r === 'new') { const p = await newPack(true); if (p) { busy('A importar…'); A.importShared(p.id); S.packId = p.id; S.tab = 'packs'; render(); } }
}

/* ---------- pastas do telemóvel ---------- */
function viewFolders() {
  const v = el('<section class="view"></section>');
  const tp = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1;min-width:0"><h1>Pastas</h1><div class="sub">Vê e organiza stickers que tens no telemóvel</div></div></div>`);
  tp.querySelector('#bk').onclick = () => { S.folders = false; render(); };
  v.appendChild(tp);
  const fs = S.data.folders || [];
  if (!fs.length) v.appendChild(el(`<div class="empty"><div class="big">📁</div><h2>Nenhuma pasta</h2><div>Escolhe uma pasta do telemóvel (por exemplo a dos stickers do WhatsApp) para veres todos os stickers dela aqui, importá-los ou apagar os que não queres.</div></div>`));
  fs.forEach(f => {
    const c = el(`<div class="pack"><div class="tray" style="font-size:28px">📁</div><div class="info"><div class="name">${esc(f.name)}</div><div class="meta" style="margin:0;word-break:break-all">${esc(decodeURIComponent(f.uri.split('/tree/')[1] || '').replace('primary:', 'Memória › ').replace(/\//g, ' › '))}</div></div><button class="iconbtn" data-x="1">${ICON.close}</button></div>`);
    c.onclick = async e => {
      if (e.target.closest('[data-x]')) {
        if (!await confirmBox('Tirar esta pasta da app?', 'Os ficheiros continuam no telemóvel; só deixas de os ver aqui.', 'Tirar')) return;
        try { S.data = JSON.parse(A.removeFolder(f.uri)); } catch (er) {}
        render(); return;
      }
      S.folder = f; S.fsel = new Set(); S.ffiles = null; S.fonlyNew = false; render(); $('#main').scrollTop = 0;
    };
    v.appendChild(c);
  });
  const fab = el(`<button class="fab">${ICON.plus}Escolher pasta</button>`);
  fab.onclick = () => A.pickFolder();
  v.appendChild(fab);
  return v;
}

function viewFolder() {
  const f = S.folder;
  const v = el('<section class="view"></section>');
  if (!S.ffiles) {
    // ler a pasta em segundo plano (com milhares de ficheiros pode demorar uns segundos)
    if (S.flistFor !== f.uri) {
      S.flistFor = f.uri;
      S.flistCb = r => {
        S.flistFor = null;
        if (!S.folder || S.folder.uri !== f.uri) return;
        if (!r || !r.ok) { toast((r && r.error) || 'erro', 3500); S.folder = null; render(); return; }
        S.ffiles = r.files.sort((a, b) => (b.time || 0) - (a.time || 0));
        render();
      };
      A.listFolderAsync(f.uri);
    }
    const tp0 = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1;min-width:0"><h1>${esc(f.name)}</h1><div class="sub">A ler a pasta…</div></div></div>`);
    tp0.querySelector('#bk').onclick = () => { S.folder = null; S.flistFor = null; render(); };
    v.appendChild(tp0);
    v.appendChild(el(`<div class="loading"><div class="spin"></div><b>A ler a pasta…</b><div class="hint">Com milhares de stickers pode demorar uns segundos.</div></div>`));
    return v;
  }
  const have = new Set();
  S.data.packs.forEach(p => p.stickers.forEach(s => { if (s.src) have.add(s.src); }));
  const isIn = x => have.has(x.name + '|' + x.size);
  const files = S.fonlyNew ? S.ffiles.filter(x => !isIn(x)) : S.ffiles;
  const nNew = S.ffiles.filter(x => !isIn(x)).length;
  const nHave = S.ffiles.length - nNew;
  const tp = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1;min-width:0"><h1>${esc(f.name)}</h1><div class="sub">${S.ffiles.length} imagens · ${nNew} ainda não estão na app</div></div><button class="iconbtn" id="rf" title="Atualizar">⟳</button></div>`);
  tp.querySelector('#bk').onclick = () => { S.folder = null; S.fsel = null; render(); };
  tp.querySelector('#rf').onclick = () => { S.ffiles = null; render(); };
  v.appendChild(tp);
  const acts = el(`<div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="btn primary" id="ia" ${nNew ? '' : 'disabled'}>Importar tudo${nNew ? ` (${nNew})` : ''}</button><button class="btn" id="fl">${S.fonlyNew ? 'Ver todos' : 'Só os novos'}</button>${files.length ? '<button class="btn" id="vw">▶ Rever um a um</button>' : ''}${S.ffiles.length > 1 ? '<button class="btn" id="dpf">👯 Repetidos</button>' : ''}${nHave ? `<button class="btn danger" id="cln">🧹 Apagar os que já tens (${nHave})</button>` : ''}</div>`);
  const cln = acts.querySelector('#cln');
  if (cln) cln.onclick = async () => {
    if (!await confirmBox(`Apagar ${nHave} ficheiro${nHave === 1 ? '' : 's'} da pasta?`, 'São os que já estão nos teus packs (com ✓). A app guarda a sua própria cópia, por isso continuam no StickTag.', 'Apagar')) return;
    await cleanupFolder(S.ffiles.filter(isIn).map(x => x.uri));
    render();
  };
  const opt = el(`<div class="opt" style="padding:4px 2px 12px;border:0"><div class="t"><b>Apagar da pasta depois de importar</b><div class="small muted">O que entra na app sai desta pasta (a app fica com a sua cópia).</div></div><button class="sw ${folderDeleteOn() ? 'on' : ''}"></button></div>`);
  $('.sw', opt).onclick = e => { try { S.data = JSON.parse(A.setOption('folderDelete', !folderDeleteOn())); } catch (er) {} e.currentTarget.classList.toggle('on', folderDeleteOn()); toast(folderDeleteOn() ? 'Os importados vão sair da pasta' : 'Os importados ficam na pasta'); };
  const dpf = acts.querySelector('#dpf'); if (dpf) dpf.onclick = () => findDupes(S.ffiles);
  const vw = acts.querySelector('#vw'); if (vw) vw.onclick = () => openFolderViewer(files, 0);
  acts.querySelector('#fl').onclick = () => { S.fonlyNew = !S.fonlyNew; render(); };
  acts.querySelector('#ia').onclick = () => autoImportDialog(f, S.ffiles.filter(x => !isIn(x)));
  v.appendChild(acts);
  v.appendChild(opt);
  v.appendChild(el(`<div class="hint" style="margin-bottom:10px">Toca num sticker para o veres em grande. Carrega sem largar para escolher vários. Os que têm ✓ já estão num pack.</div>`));
  const grid = el('<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:0"></div>');
  progressive(grid, files, x => {
    const c = el(`<div class="st" style="padding:4px"><div class="im"><img loading="lazy" src="d/${encodeURIComponent(x.uri)}"></div>${isIn(x) ? '<span class="cv" style="color:var(--green);left:10px;right:auto">✓</span>' : ''}<span class="ck" style="${S.fsel.size ? '' : 'display:none'}"></span></div>`);
    if (S.fsel.has(x.uri)) c.classList.add('sel');
    const toggle = () => {
      S.fsel.has(x.uri) ? S.fsel.delete(x.uri) : S.fsel.add(x.uri);
      c.classList.toggle('sel');
      $$('.ck', grid).forEach(k => k.style.display = S.fsel.size ? '' : 'none');
      drawBar();
    };
    let lp = null, longDone = false;
    c.addEventListener('pointerdown', () => { longDone = false; clearTimeout(lp); lp = setTimeout(() => { longDone = true; toggle(); try { navigator.vibrate && navigator.vibrate(20); } catch (e) {} }, 450); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => c.addEventListener(t, () => clearTimeout(lp)));
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.onclick = () => {
      if (longDone) { longDone = false; return; }
      if (S.fsel.size) toggle();
      else openFolderViewer(files, files.indexOf(x));
    };
    return c;
  });
  v.appendChild(grid);
  const bar = el(`<div class="selbar hidden"><span class="n"></span><button class="btn sm" id="sa">Tudo</button><button class="btn sm primary" id="sp">Pôr num pack</button><button class="btn sm danger" id="sd">Apagar</button></div>`);
  function drawBar() {
    bar.classList.toggle('hidden', !S.fsel.size);
    $('.n', bar).textContent = `${S.fsel.size} selec.`;
    v.style.paddingBottom = S.fsel.size ? '76px' : '';
  }
  bar.querySelector('#sa').onclick = () => { if (S.fsel.size === files.length) S.fsel.clear(); else files.forEach(x => S.fsel.add(x.uri)); render(); };
  bar.querySelector('#sp').onclick = () => folderToPack(Array.from(S.fsel));
  bar.querySelector('#sd').onclick = async () => {
    const n = S.fsel.size;
    if (!await confirmBox(`Apagar ${n} ficheiro${n > 1 ? 's' : ''} do telemóvel?`, 'São apagados de vez desta pasta. Os que já estão nos teus packs continuam na app.')) return;
    const r = await runBulk(`A apagar ${n} ficheiros…`, () => A.deleteDocsAsync(JSON.stringify(Array.from(S.fsel))));
    const del = r.n || 0;
    toast(`${del} apagado${del === 1 ? '' : 's'}${del < n ? ` (${n - del} não deu)` : ''}`);
    S.fsel = new Set(); S.ffiles = null; render();
  };
  v.appendChild(bar);
  setTimeout(drawBar, 0);
  return v;
}

async function choosePack(title) {
  let chosen = null;
  const packs = S.data.packs;
  const html = `<div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto;margin-bottom:12px">${packs.map(p => `<button class="pack" data-id="${esc(p.id)}" style="margin:0;text-align:left"><div class="tray" style="width:44px;height:44px">${p.stickers.length ? `<img src="${trayUrl(p)}">` : ''}</div><div class="info"><div class="name">${esc(p.name)}</div><div class="meta" style="margin:0">${countLabel(p)} · ${kindLabel(p)}</div></div></button>`).join('')}</div>`;
  const pr = dialog({ title, html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Novo pack', cls: 'primary', value: 'new' }] });
  setTimeout(() => $$('.dialog .pack[data-id]').forEach(b => b.onclick = () => { chosen = b.dataset.id; closeOverlay(); }), 0);
  const r = await pr;
  if (r === 'new') { const p = await newPack(true); if (p) chosen = p.id; }
  return chosen;
}

async function folderToPack(uris) {
  const chosen = await choosePack(`Pôr ${uris.length} sticker${uris.length > 1 ? 's' : ''} em…`);
  if (!chosen) return;
  busy('A importar…');
  S.fromFolder = true;
  A.importDocs(chosen, JSON.stringify(uris));
}

/* ---------- ver os stickers da pasta um a um ---------- */
// "Não perguntar outra vez" só dura enquanto a app estiver aberta (não é guardado).
let skipDeleteAsk = false;

async function isAnimDoc(x) {
  if (x.anim !== undefined) return x.anim;
  const n = (x.name || '').toLowerCase(), m = (x.mime || '').toLowerCase();
  if (m.includes('gif') || n.endsWith('.gif')) return (x.anim = true);
  if (!(m.includes('webp') || n.endsWith('.webp'))) return (x.anim = false);
  try {
    const b = new Uint8Array(await (await fetch('d/' + encodeURIComponent(x.uri))).arrayBuffer());
    const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
    x.anim = tag === 'VP8X' && (b[20] & 2) === 2;
  } catch (e) { x.anim = false; }
  return x.anim;
}

function openFolderViewer(list, start) {
  list = list.slice();
  let i = Math.max(0, start), changed = false;
  const inPack = x => S.data.packs.some(p => p.stickers.some(s => s.src === x.name + '|' + x.size));
  const v = el(`<div class="fv">
    <div class="fv-top"><button class="iconbtn" id="x">${ICON.close}</button><div class="fv-t"><b id="ct"></b><span id="nm"></span></div><span class="fv-tag hidden" id="an">🎞️ Animado</span><span class="fv-tag ok hidden" id="ok">✓ Num pack</span></div>
    <div class="fv-stage" id="stage"><button class="fv-nav l" id="pv">‹</button><img id="im" alt=""><button class="fv-nav r" id="nx">›</button></div>
    <div class="fv-bottom">
      <button class="fv-pack" id="pk"><span class="muted">Pack:</span> <b id="pkn"></b> <span class="muted">▾</span></button>
      <div class="fv-acts">
        <button class="fv-b del" id="dl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>Apagar</button>
        <button class="fv-b" id="ed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Editar</button>
        <button class="fv-b add" id="ad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Pôr no pack</button>
      </div>
    </div></div>`);
  const ov = openOverlay(v, { modal: true, onClose: () => { if (changed && S.folder) { S.ffiles = null; render(); } } });
  ov.classList.add('fv-ov');
  const im = $('#im', v);
  const target = () => S.vPack && packOf(S.vPack) ? packOf(S.vPack) : null;
  function drawPack() {
    const p = target();
    $('#pkn', v).textContent = p ? p.name : 'escolher…';
    $('#ad', v).lastChild.textContent = p ? 'Pôr no pack' : 'Pôr num pack';
  }
  async function show(dir) {
    if (!list.length) { closeOverlay(ov); toast('Já não há mais stickers aqui 👍'); return; }
    if (i >= list.length) i = list.length - 1;
    const x = list[i];
    $('#ct', v).textContent = `${i + 1} de ${list.length}`;
    $('#nm', v).textContent = x.name;
    $('#ok', v).classList.toggle('hidden', !inPack(x));
    $('#pv', v).style.visibility = i > 0 ? '' : 'hidden';
    $('#nx', v).style.visibility = i < list.length - 1 ? '' : 'hidden';
    im.classList.remove('in', 'fl', 'fr'); void im.offsetWidth;
    im.classList.add(dir < 0 ? 'fl' : dir > 0 ? 'fr' : 'in');
    im.src = 'd/' + encodeURIComponent(x.uri);
    if (list[i + 1]) new Image().src = 'd/' + encodeURIComponent(list[i + 1].uri);
    $('#an', v).classList.add('hidden');
    const a = await isAnimDoc(x);
    if (list[i] === x) $('#an', v).classList.toggle('hidden', !a);
  }
  function next() { if (i < list.length - 1) { i++; show(1); } }
  function prev() { if (i > 0) { i--; show(-1); } }
  // depois de apagar ou pôr num pack, passa logo para o seguinte
  function done(remove) {
    changed = true;
    if (remove) { list.splice(i, 1); if (i >= list.length && list.length) { closeOverlay(ov); toast('Era o último 👍'); return; } show(1); }
    else if (i < list.length - 1) { i++; show(1); }
    else { closeOverlay(ov); toast('Era o último 👍'); }
  }
  async function pickTarget() {
    const id = await choosePack('Para que pack vão?');
    if (id) { S.vPack = id; drawPack(); }
    return id;
  }
  $('#x', v).onclick = () => closeOverlay(ov);
  $('#pv', v).onclick = prev;
  $('#nx', v).onclick = next;
  $('#pk', v).onclick = pickTarget;
  // deslizar para o lado
  let sx = null, sy = 0;
  const stage = $('#stage', v);
  stage.addEventListener('pointerdown', e => { if (e.target.closest('.fv-nav')) return; sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
  });
  $('#dl', v).onclick = async () => {
    const x = list[i];
    if (!skipDeleteAsk) {
      const r = await dialog({ title: 'Apagar este sticker?', text: 'É apagado de vez desta pasta do telemóvel. Se já estiver num pack, continua na app.',
        html: `<label class="chk"><input type="checkbox" id="dn"><span>Não perguntar outra vez até fechar a app</span></label>`,
        buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Apagar', cls: 'danger', value: d => ({ skip: $('#dn', d).checked }) }] });
      if (!r) return;
      if (r.skip) skipDeleteAsk = true;
    }
    const n = A.deleteDocs(JSON.stringify([x.uri]));
    if (!n) return toast('Não consegui apagar este ficheiro');
    S.ffiles = S.ffiles && S.ffiles.filter(f => f.uri !== x.uri);
    toast('Apagado 🗑️', 1100);
    done(true);
  };
  $('#ad', v).onclick = async () => {
    const x = list[i];
    const pid = target() ? S.vPack : await pickTarget();
    if (!pid) return;
    const p = packOf(pid);
    if (visible(p).length >= maxOf(p)) { toast('Este pack já está cheio: escolhe outro'); return pickTarget(); }
    S.vImp = (S.vImp || 0) + 1;
    A.importDocs(pid, JSON.stringify([x.uri]));
    done(S.fonlyNew || folderDeleteOn());
  };
  $('#ed', v).onclick = async () => {
    const x = list[i];
    const pid = target() ? S.vPack : await pickTarget();
    if (!pid) return;
    const p = packOf(pid);
    if (visible(p).length >= maxOf(p)) { toast('Este pack já está cheio: escolhe outro'); return pickTarget(); }
    const url = 'd/' + encodeURIComponent(x.uri);
    const onSaved = () => {
      toast(`Guardado em «${p.name}» ✓`, 1600);
      if (folderDeleteOn()) { A.deleteDocs(JSON.stringify([x.uri])); changed = true; if (S.ffiles) S.ffiles = S.ffiles.filter(f => f.uri !== x.uri); done(true); }
      else done(S.fonlyNew);
    };
    if (await isAnimDoc(x)) {
      const mime = x.mime || ((x.name || '').toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/webp');
      openAnimCreator(pid, { url, mime }, { onSaved, edit: true });
    } else openCreator(pid, url, { onSaved, edit: true });
  };
  drawPack();
  show(0);
}

async function autoImportDialog(f, list) {
  if (!list.length) return toast('Já está tudo na app');
  let kind = 'kb';
  const html = `<div class="field"><span>Para onde</span><div class="seg" id="ai-k"><button class="on" data-k="kb">Só teclado</button><button data-k="wa">WhatsApp</button></div></div>
    <div class="hint" id="ai-h" style="margin:-4px 0 12px">Junta tudo num pack do teclado, sem limite (animados e estáticos juntos).</div>
    <label class="field"><span>Nome dos packs</span><input class="input" id="ai-n" maxlength="60" value="${esc(f.name)}"></label>`;
  const pr = dialog({ title: `Importar ${list.length} sticker${list.length > 1 ? 's' : ''}`, html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Importar', cls: 'primary', value: d => $('#ai-n', d).value }] });
  setTimeout(() => $$('#ai-k button').forEach(b => b.onclick = () => {
    kind = b.dataset.k; $$('#ai-k button').forEach(x => x.classList.toggle('on', x === b));
    $('#ai-h').textContent = kind === 'kb' ? 'Junta tudo num pack do teclado, sem limite (animados e estáticos juntos).' : 'Cria packs de 30 para o WhatsApp, com animados e estáticos em packs separados (máximo 10 packs no total).';
  }), 0);
  const name = await pr;
  if (name == null) return;
  busy('A importar…');
  A.importAuto(JSON.stringify(list.map(x => x.uri)), kind, name.trim() || f.name);
}

/* ---------- um pack ---------- */
function viewPack() {
  const p = packOf(S.packId);
  if (!p) { S.packId = null; return viewPacks(); }
  const v = el('<section class="view"></section>');
  const top = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1;min-width:0"><h1>${esc(p.name)}</h1><div class="sub">${esc(p.publisher)} · ${kindLabel(p)}</div></div><button class="iconbtn" id="sl" title="Selecionar">${ICON.sel}</button><button class="iconbtn" id="mn">${ICON.more}</button></div>`);
  top.querySelector('#bk').onclick = () => { S.packId = null; S.sel = null; render(); };
  top.querySelector('#mn').onclick = () => packMenu(p);
  top.querySelector('#sl').onclick = () => { S.sel = S.sel ? null : new Set(); render(); };
  v.appendChild(top);

  const st = isKb(p) ? {} : waStatus(p.id);
  const iss = issues(p);
  const n = visible(p).length;
  const card = isKb(p) ? el(`<div class="card status">
    <div class="row" style="justify-content:space-between"><b>${n} stickers</b><span class="chip ok">⌨ Só teclado</span></div>
    <ul class="issues">${iss.map(t => `<li><span class="d"></span>${esc(t)}</li>`).join('') || '<li class="ok"><span class="d"></span>Estes stickers aparecem no teclado de stickers quando escreves as palavras deles.</li>'}</ul>
  </div>`) : el(`<div class="card status">
    <div class="row" style="justify-content:space-between"><b>${n}/30 stickers</b>${iss.length ? '<span class="chip warn">Falta pouco</span>' : (isAdded(st) ? '<span class="chip ok">✓ No WhatsApp</span>' : '<span class="chip ok">Pronto</span>')}</div>
    <div class="prog"><i style="width:${Math.min(100, n / 30 * 100)}%"></i></div>
    <ul class="issues">${iss.map(t => `<li><span class="d"></span>${esc(t)}</li>`).join('') || (isAdded(st) ? '<li class="ok"><span class="d"></span>Está no WhatsApp. As mudanças que fizeres aqui passam para lá sozinhas (pode demorar um pouco ou pedir reabrir o WhatsApp).</li>' : '<li class="ok"><span class="d"></span>Tudo certo — já podes enviar para o WhatsApp.</li>')}</ul>
    <button class="btn block ${isAdded(st) ? 'ghost' : 'primary'}" id="wa" ${iss.length ? 'disabled' : ''}>${ICON.wa}${isAdded(st) ? 'Abrir o WhatsApp' : 'Adicionar ao WhatsApp'}</button>
  </div>`);
  if (!isKb(p)) card.querySelector('#wa').onclick = () => {
    if (isAdded(st)) { A.openWhatsApp(); return; }
    const r = JSON.parse(A.addToWhatsApp(p.id));
    if (r.error) dialog({ title: 'Ainda não dá', text: r.error, buttons: [{ label: 'OK', cls: 'primary' }] });
  };
  v.appendChild(card);

  const acts = el(`<div class="actions"><button class="btn" id="ia">${ICON.wa}Do WhatsApp</button><button class="btn" id="ig">${ICON.img}Galeria / ficheiros</button>${p.animated && !isKb(p) ? '' : `<button class="btn" id="ic">✂️ Da foto</button><button class="btn" id="it">🔤 De texto</button>`}${isKb(p) || p.animated ? `<button class="btn" id="ian" style="grid-column:1/-1">🎞️ Animado a partir de vídeo ou GIF</button>` : ''}</div>`);
  const ian = acts.querySelector('#ian');
  if (ian) ian.onclick = () => { if (n >= maxOf(p)) return toast('Este pack já está cheio.'); S.createFor = p.id; A.pickMediaForAnim(); };
  const ic = acts.querySelector('#ic'), itx = acts.querySelector('#it');
  if (ic) ic.onclick = () => { if (n >= maxOf(p)) return toast('Este pack já está cheio.'); S.createFor = p.id; A.pickForCreate(); };
  if (itx) itx.onclick = () => { if (n >= maxOf(p)) return toast('Este pack já está cheio.'); openCreator(p.id, null); };
  const pick = wa => {
    if (n >= maxOf(p)) { toast(`Este pack já tem ${maxOf(p)} stickers (o máximo).`); return; }
    A.pickImages(p.id, wa);
  };
  acts.querySelector('#ia').onclick = () => pick(true);
  acts.querySelector('#ig').onclick = () => pick(false);
  v.appendChild(acts);
  if (!n) v.appendChild(el(`<div class="hint" style="margin-top:12px">“Do WhatsApp” abre a pasta onde o WhatsApp guarda os stickers que recebeste (Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Stickers). Também podes partilhar imagens de outra app diretamente para o StickTag.</div>`));

  if (!adultOn() && p.stickers.some(s => Match.isAdult(p, s))) {
    const rv = S.reveal && S.reveal[p.id];
    const b = el(`<div class="banner a18ban"><div style="font-size:22px">🔞</div><div style="flex:1">${p.adult ? 'Pack +18' : 'Tem stickers +18'}: ${rv ? 'estão à vista.' : 'estão desfocados.'} No teclado e na bolha só aparecem no modo +18.</div><button class="btn sm">${rv ? 'Esconder' : 'Mostrar'}</button></div>`);
    b.querySelector('button').onclick = () => { S.reveal = S.reveal || {}; S.reveal[p.id] = !rv; render(); };
    v.appendChild(b);
  }
  const secs = sectionsOf(p);
  S.secOf = S.secOf || {};
  const curSec = secs.includes(S.secOf[p.id]) ? S.secOf[p.id] : '';
  if (secs.length || isKb(p)) {
    const cnt = n => visible(p).filter(s => s.section === n).length;
    const bar2 = el(`<div class="secbar">${secs.length ? `<button class="mchip ${curSec === '' ? 'on' : ''}" data-s="">Todos <small>${visible(p).length}</small></button>` : ''}${secs.map(n => `<button class="mchip ${curSec === n ? 'on' : ''}" data-s="${esc(n)}">${esc(n)} <small>${cnt(n)}</small></button>`).join('')}<button class="mchip add" data-new="1">＋ Secção</button></div>`);
    $$('[data-s]', bar2).forEach(b => b.onclick = () => { const n = b.dataset.s; if (n && n === curSec) return sectionMenu(p, n); S.secOf[p.id] = n; render(); });
    bar2.querySelector('[data-new]').onclick = async () => { const n = await newSectionDialog(p); if (n) { S.secOf[p.id] = n; render(); toast('Secção criada: escolhe stickers (☑) e toca em «Secção»', 3200); } };
    v.appendChild(bar2);
    if (curSec) v.appendChild(el(`<div class="hint" style="margin:-2px 2px 6px">Toca outra vez em «${esc(curSec)}» para mudar o nome, mover ou apagar.</div>`));
  }
  const grid = el('<div class="grid"></div>');
  const shown = [];
  p.stickers.forEach((s, i) => { if (!s.hidden && (!curSec || s.section === curSec)) shown.push([s, i]); }); // os escondidos só existem dentro de um especial
  progressive(grid, shown, ([s, i]) => {
    const spN = specialsOf(p.id, s.f);
    const subN = spN.reduce((a, x) => a + subRefs(x).length, 0);
    const em = s.emojis && s.emojis.length ? `<div class="em emo">${s.emojis.map(esc).join('')}</div>` : '<div class="em none">sem emoji</div>';
    const c = el(`<div class="st"><div class="im"><img loading="lazy" class="${hideAdult(p, s) ? 'nsfw' : ''}" src="${imgUrl(p, s.f)}"></div>${s.adult && !p.adult ? '<span class="a18s">🔞</span>' : ''}${spN.length ? `<span class="spb">${(SP_TYPES[spN[0].type] || {}).icon || '⚡'}${subN ? ' +' + subN : ''}</span>` : ''}${em}${s.words && s.words.length ? `<span class="wd">${s.words.length} pal.</span>` : ''}${s.anim && isKb(p) ? '<span class="wd" style="left:auto;right:10px;top:auto;bottom:34px;color:var(--amber)">GIF</span>' : ''}${S.sel ? '<span class="ck"></span>' : (p.cover === s.f ? '<span class="cv">★</span>' : '')}</div>`);
    if (S.sel && S.sel.has(s.f)) c.classList.add('sel');
    c.onclick = () => {
      if (S.sel) { S.sel.has(s.f) ? S.sel.delete(s.f) : S.sel.add(s.f); c.classList.toggle('sel'); updSelBar(); return; }
      openEditor(p.id, i);
    };
    return c;
  });
  v.appendChild(grid);
  if (S.sel) {
    const bar = el(`<div class="selbar"><span class="n" id="sn"></span><button class="btn sm" id="sa">Tudo</button><button class="btn sm primary" id="se">+ Emoji</button><button class="btn sm" id="sm">Mover</button><button class="btn sm" id="ss">Secção</button><button class="btn sm danger" id="sd">Apagar</button></div>`);
    bar.querySelector('#sa').onclick = () => { if (S.sel.size === p.stickers.length) S.sel.clear(); else p.stickers.forEach(s => S.sel.add(s.f)); render(); };
    bar.querySelector('#se').onclick = () => { if (!S.sel.size) return toast('Escolhe primeiro os stickers'); bulkEmoji(p); };
    bar.querySelector('#sm').onclick = () => { if (!S.sel.size) return toast('Escolhe primeiro os stickers'); moveStickers(p, Array.from(S.sel)); };
    bar.querySelector('#ss').onclick = async () => { if (!S.sel.size) return toast('Escolhe primeiro os stickers'); await chooseSection(p, Array.from(S.sel)); S.sel = null; render(); };
    bar.querySelector('#sd').onclick = async () => {
      if (!S.sel.size) return toast('Escolhe primeiro os stickers');
      if (!await confirmBox(`Apagar ${S.sel.size} sticker${S.sel.size > 1 ? 's' : ''}?`, 'Saem deste pack (e do WhatsApp, se o pack lá estiver).')) return;
      const files = Array.from(S.sel);
      const r = await runBulk(`A apagar ${files.length} stickers…`, () => A.deleteStickersAsync(p.id, JSON.stringify(files)));
      S.sel = null; reload(); render();
      toast(`${r.n || 0} sticker${r.n === 1 ? '' : 's'} apagado${r.n === 1 ? '' : 's'}`);
    };
    v.appendChild(bar);
    v.style.paddingBottom = '76px';
    setTimeout(updSelBar, 0);
  }
  return v;
}
function updSelBar() { const n = $('#sn'); if (n && S.sel) n.textContent = `${S.sel.size} selec.`; }

async function packMenu(p) {
  const r = await dialog({ title: p.name, html: '<div style="height:4px"></div>', buttons: [{ label: '✨ Tags automáticas (ler o texto)', value: 'ocr' }, { label: '＋ Nova secção', value: 'sec' }, { label: 'Editar nome', value: 'edit' }, { label: p.adult ? 'Tirar o 🔞' : 'Marcar como 🔞 +18', value: 'adult' }, { label: 'Apagar pack', cls: 'danger', value: 'del' }] });
  if (r === 'ocr') { bulkOcr(p); return; }
  if (r === 'sec') { const n = await newSectionDialog(p); if (n) { S.secOf = Object.assign(S.secOf || {}, { [p.id]: n }); render(); } return; }
  if (r === 'adult') {
    try { S.data = JSON.parse(A.setPackFlag(p.id, 'adult', !p.adult)); } catch (e) {}
    toast(!p.adult ? 'Pack +18 🔞: só aparece no teclado no modo +18' : 'Já não é +18');
    render();
  } else if (r === 'edit') {
    const r2 = await dialog({ title: 'Editar pack', html: `<label class="field"><span>Nome</span><input class="input" id="ep-n" maxlength="128" value="${esc(p.name)}"></label><label class="field"><span>Autor</span><input class="input" id="ep-p" maxlength="128" value="${esc(p.publisher)}"></label>`, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', value: d => ({ n: $('#ep-n', d).value, p: $('#ep-p', d).value }) }] });
    if (r2) { p.name = r2.n.trim() || p.name; p.publisher = r2.p.trim() || p.publisher; savePack(p); render(); }
  } else if (r === 'del') {
    if (!await confirmBox('Apagar este pack?', `“${p.name}” e os ${p.stickers.length} stickers saem da app e do WhatsApp.`)) return;
    if (p.stickers.length > 60) { await runBulk('A apagar o pack…', () => A.deletePackAsync(p.id)); reload(); }
    else { try { S.data = JSON.parse(A.deletePack(p.id)); } catch (e) { reload(); } }
    S.packId = null; render();
  }
}

async function moveStickers(p, files) {
  const others = S.data.packs.filter(x => x.id !== p.id && (isKb(x) || isKb(p) || !!x.animated === !!p.animated));
  if (!others.length) { toast('Não há outro pack para onde mover.'); return; }
  let chosen = null;
  const html = `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${others.map(o => `<button class="pack" data-id="${esc(o.id)}" style="margin:0;text-align:left"><div class="tray" style="width:44px;height:44px">${o.stickers.length ? `<img src="${trayUrl(o)}">` : ''}</div><div class="info"><div class="name">${esc(o.name)}</div><div class="meta" style="margin:0">${countLabel(o)} · ${kindLabel(o)}</div></div></button>`).join('')}</div>`;
  const pr = dialog({ title: 'Mover para…', html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }] });
  setTimeout(() => $$('.dialog .pack[data-id]').forEach(b => b.onclick = () => { chosen = b.dataset.id; closeOverlay(); }), 0);
  await pr;
  if (!chosen) return false;
  let moved = 0, err = null;
  if (files.length === 1) {
    const r = JSON.parse(A.moveSticker(p.id, files[0], chosen));
    if (r.error) err = r.error; else moved = 1;
  } else {
    const r = await runBulk(`A mover ${files.length} stickers…`, () => A.moveStickersAsync(p.id, JSON.stringify(files), chosen));
    moved = r.n || 0; err = r.error || null;
  }
  reload();
  if (S.sel) S.sel = new Set();
  toast(err ? `${moved} movido${moved === 1 ? '' : 's'}. ${err}` : `${moved} sticker${moved > 1 ? 's' : ''} movido${moved > 1 ? 's' : ''}`);
  render();
  return moved > 0;
}

/* ---------- seletor de emojis ---------- */
const recent = () => store.get('recent', []);
function pushRecent(e) { const r = recent().filter(x => x !== e); r.unshift(e); store.set('recent', r.slice(0, 32)); }

function searchEmojis(q, limit = 80) {
  const nq = norm(q);
  if (!nq) return [];
  const out = [];
  for (const o of EMO) {
    let sc = 0;
    const lab = o.npt[0];
    if (lab === nq) sc = 130;
    else if (lab.split(/[\s-]+/).some(t => t === nq)) sc = 90;
    for (const w of o.npt) {
      if (w === nq) { sc = Math.max(sc, 100); break; }
      if (w.startsWith(nq) || w.split(/[\s-]+/).some(t => t.startsWith(nq))) sc = Math.max(sc, 60);
      else if (nq.length > 2 && w.includes(nq)) sc = Math.max(sc, 30);
    }
    if (sc < 60) for (const w of o.nen) {
      if (w === nq) { sc = Math.max(sc, 70); break; }
      if (w.split(/[\s-]+/).some(t => t.startsWith(nq))) sc = Math.max(sc, 45);
    }
    if (sc) out.push([sc, o]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, limit).map(x => x[1]);
}

/* Cria um seletor; onPick(e) é chamado ao tocar; isOn(e) marca os já escolhidos. */
function makePicker(onPick, isOn) {
  const box = el(`<div class="picker"><div class="pk-search">${ICON.search}<input placeholder="Procura: gato, amor, rir, love…"></div><div class="pk-tabs"></div><div class="pk-grid"></div></div>`);
  const input = $('input', box), tabs = $('.pk-tabs', box), grid = $('.pk-grid', box);
  let tab = recent().length ? 'recent' : 'free';
  const used = usage();
  const tabList = [['recent', '🕘'], ['free', '✨']].concat(Object.keys(GROUPS).map(g => [g, GROUP_ICON[g] || '•']));
  tabList.forEach(([id, ic]) => {
    const b = el(`<button class="emo">${ic}</button>`);
    b.onclick = () => { tab = id; input.value = ''; draw(); };
    b.dataset.id = id;
    tabs.appendChild(b);
  });
  function btn(e) {
    const b = el(`<button class="emo"></button>`);
    b.textContent = e;
    if (used.has(stripVS(e))) b.insertAdjacentHTML('beforeend', '<span class="u"></span>');
    if (isOn && isOn(e)) b.classList.add('on');
    b.onclick = () => { onPick(e); pushRecent(e); if (isOn) b.classList.toggle('on', isOn(e)); };
    return b;
  }
  function draw() {
    $$('button', tabs).forEach(b => b.classList.toggle('on', !input.value && b.dataset.id === tab));
    grid.innerHTML = '';
    const q = input.value.trim();
    if (q) {
      const typed = splitEmojis(q);
      const list = typed.length ? typed : searchEmojis(q).map(o => o.e);
      if (!list.length) grid.appendChild(el('<div class="pk-free">Nada encontrado. Experimenta outra palavra (em português ou inglês) ou cola um emoji.</div>'));
      list.forEach(e => grid.appendChild(btn(e)));
      return;
    }
    if (tab === 'recent') {
      const r = recent();
      if (!r.length) grid.appendChild(el('<div class="pk-free">Os emojis que usares aparecem aqui.</div>'));
      r.forEach(e => grid.appendChild(btn(e)));
    } else if (tab === 'free') {
      const free = RARE.filter(e => !used.has(stripVS(e)) && emoInfo(e));
      grid.appendChild(el('<div class="pk-lbl">Tags únicas</div>'));
      grid.appendChild(el('<div class="pk-free">Emojis pouco usados que ainda não puseste em nenhum sticker. Dá um destes a um sticker para ele aparecer sozinho quando escreves esse emoji.</div>'));
      free.forEach(e => grid.appendChild(btn(e)));
    } else {
      EMO.filter(o => String(o.g) === String(tab)).forEach(o => grid.appendChild(btn(o.e)));
    }
    grid.scrollTop = 0;
  }
  input.addEventListener('input', draw);
  draw();
  return box;
}

/* ---------- editor de um sticker ---------- */
function openEditor(packId, idx) {
  const sheet = el(`<div class="sheet"><div class="hd"><h3>Sticker</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd"></div></div>`);
  const ov = openOverlay(sheet, { onClose: () => render() });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  let p = packOf(packId);
  let picker = null, wsg = null, why = null;

  function cur() { return p.stickers[idx]; }
  function drawWhyEd() {
    drawWhy($('.emowhy', sheet), why, {
      words: () => cur().words,
      close: () => { why = null; drawWhyEd(); },
      add: x => {
        const c = cur();
        if (c.emojis.some(y => stripVS(y) === stripVS(x.e))) return;
        if (c.emojis.length >= 3) return toast('Já tem 3 emojis: toca num para o tirar primeiro');
        c.emojis.push(x.e); commit();
        why.added.push(x); why.alts = why.alts.filter(y => y !== x);
        drawTop(); redrawPicker(); drawWhyEd();
      },
      undo: () => {
        const c = cur();
        const rm = new Set(why.added.map(x => stripVS(x.e)));
        c.emojis = c.emojis.filter(e => !rm.has(stripVS(e)));
        commit(); why = null; drawTop(); redrawPicker(); drawWhyEd(); toast('Emojis tirados');
      },
      addWords: ws => {
        const c = cur();
        ws.forEach(w => { if (!c.words.some(y => norm(y) === norm(w))) c.words.push(w); });
        commit(); drawWords(); drawWhyEd(); toast('Juntei: ' + ws.join(', '));
      }
    });
  }
  async function autoEmojis(btn) {
    const s = cur();
    btn.disabled = true;
    const label = btn.innerHTML;
    try {
      const r = await analyseEmojis({ p, s, img: imgUrl(p, s.f), words: s.words, emojis: s.emojis, learned: Match.learned(s), step: t => { btn.textContent = t; } });
      if (cur() !== s) return;
      const need = 3 - s.emojis.length;
      const picks = need > 0 ? pickEmojis(r.list, need) : [];
      if (need > 0 && !picks.length) {
        why = r.list.length ? { f: s.f, added: [], alts: r.list.slice(0, 6), ocr: r.ocr } : null;
        drawWhyEd();
        if (!r.list.length) toast('Não encontrei pistas: escreve uma palavra para este sticker e tenta outra vez');
        return;
      }
      picks.forEach(x => s.emojis.push(x.e));
      if (picks.length) commit();
      why = { f: s.f, added: picks, alts: r.list.filter(x => !picks.includes(x)).slice(0, 6), ocr: r.ocr };
      drawTop(); redrawPicker(); drawWhyEd();
    } finally { btn.disabled = false; btn.innerHTML = label; }
  }
  function commit() { p = savePack(p); }
  // anda só pelos stickers visíveis (os escondidos dos especiais ficam de fora)
  function step(d) { for (let j = idx + d; j >= 0 && j < p.stickers.length; j += d) if (!p.stickers[j].hidden) return j; return -1; }
  function visIdx() { return visible(p).indexOf(cur()); }

  function drawTop() {
    const s = cur();
    const used = usage();
    const top = $('.ed-top-wrap', sheet);
    const slots = [0, 1, 2].map(i => s.emojis[i] ? `<div class="slot f emo" data-i="${i}">${esc(s.emojis[i])}<span class="x">×</span></div>` : `<div class="slot"></div>`).join('');
    top.innerHTML = `<div class="ed-top"><div class="st ed-prev" style="padding:6px"><div class="im"><img src="${imgUrl(p, s.f)}"></div></div>
      <div class="ed-side"><div class="navs"><button class="btn sm" id="pv" ${step(-1) < 0 ? 'disabled' : ''}>‹</button><span style="flex:1;text-align:center">${s.hidden ? 'escondido ⚡' : `${visIdx() + 1} de ${visible(p).length}`}</span><button class="btn sm" id="nx" ${step(1) < 0 ? 'disabled' : ''}>›</button></div>
      <div class="hint">Emojis (tags) — 1 a 3</div><div class="slots">${slots}</div><button class="btn sm block aibtn" id="ai">${s.emojis.length < 3 ? '✨ Completar emojis' : '✨ Outras ideias'}</button></div></div>
      <div class="emoinfo">${s.emojis.map(e => {
        const o = emoInfo(e); const others = (used.get(stripVS(e)) || []).filter(x => x.s.f !== s.f).length;
        const cats = WA_CAT_OF.get(stripVS(e));
        return `<div class="r"><span class="e emo">${esc(e)}</span><div><b>${esc(o ? o.n : 'emoji')}</b> · <span style="color:var(--blue)">${esc(emoWords(e).join(', ') || '—')}</span><div class="dim">${others ? `Também em ${others} sticker${others > 1 ? 's' : ''} teu${others > 1 ? 's' : ''}` : 'Só este sticker tem este emoji ✓'}${cats ? ' · categoria do WhatsApp: ' + cats.map(c => c.pt).join(', ') : ''}</div></div></div>`;
      }).join('')}</div>`;
    $$('.slot.f', top).forEach(sl => sl.onclick = () => { const e = cur().emojis.splice(+sl.dataset.i, 1)[0]; commit(); if (why) { const x = why.added.find(y => stripVS(y.e) === stripVS(e)); if (x) { why.added = why.added.filter(y => y !== x); why.alts.unshift(x); } drawWhyEd(); } drawTop(); redrawPicker(); });
    $('#ai', top).onclick = e => autoEmojis(e.currentTarget);
    const pv = $('#pv', top), nx = $('#nx', top);
    pv.onclick = () => { const j = step(-1); if (j >= 0) { idx = j; drawAll(); } };
    nx.onclick = () => { const j = step(1); if (j >= 0) { idx = j; drawAll(); } };
  }
  function drawWords() {
    const s = cur();
    const w = $('.words', sheet);
    w.innerHTML = s.words.map((x, i) => `<span class="wchip">${esc(x)}<button data-i="${i}">×</button></span>`).join('') + '<input placeholder="escreve e toca em Enter">';
    $$('.wchip button', w).forEach(b => b.onclick = () => { cur().words.splice(+b.dataset.i, 1); commit(); drawWords(); });
    const inp = $('input', w);
    const add = () => {
      const parts = inp.value.split(',').map(x => x.trim()).filter(Boolean);
      if (!parts.length) return;
      const c = cur();
      for (const x of parts) if (!c.words.some(y => norm(y) === norm(x))) c.words.push(x);
      inp.value = ''; commit(); drawWords();
      $('.words input', sheet).focus();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    let tq = null;
    inp.addEventListener('input', () => { if (inp.value.includes(',')) return add(); clearTimeout(tq); tq = setTimeout(() => wsg && wsg.draw(inp.value), 120); });
    inp.addEventListener('blur', add);
    if (wsg) wsg.draw('');
  }
  function redrawPicker() {
    const holder = $('.pk-holder', sheet);
    const keepQ = picker ? $('input', picker).value : '';
    picker = makePicker(e => {
      const s = cur();
      const i = s.emojis.findIndex(x => stripVS(x) === stripVS(e));
      if (i >= 0) s.emojis.splice(i, 1);
      else if (s.emojis.length >= 3) { toast('Máximo 3 emojis por sticker'); return; }
      else s.emojis.push(e);
      commit(); drawTop();
    }, e => cur().emojis.some(x => stripVS(x) === stripVS(e)));
    holder.innerHTML = ''; holder.appendChild(picker);
    if (keepQ) { const i = $('input', picker); i.value = keepQ; i.dispatchEvent(new Event('input')); }
  }
  function drawAll() {
    const s = cur();
    if (!s) { closeOverlay(ov); return; }
    s.emojis = s.emojis || []; s.words = s.words || [];
    const bd = $('.bd', sheet);
    bd.innerHTML = `<div class="ed-top-wrap"></div><div class="emowhy"></div><div class="pk-holder"></div>
      <div class="row" style="margin-top:18px;justify-content:space-between"><div class="sec" style="margin:0">Palavras para este sticker</div><button class="btn sm" id="ocr">✨ Ler o texto</button></div>
      <div class="words"></div>
      <div class="sugbox" id="wsug"></div>
      <div class="hint" style="margin-top:6px">Quando escreveres uma destas palavras, o teclado de stickers sugere este sticker. As palavras dos emojis também contam.</div>
      ${learnBlock(s)}
      <div class="row" style="margin-top:16px;flex-wrap:wrap"><button class="btn sm" id="fv">${s.fav ? '⭐ Favorito' : '☆ Favorito'}</button><button class="btn sm" id="gl">💾 Galeria</button><button class="btn sm" id="cv">${p.cover === s.f ? '★ É a capa' : '☆ Capa'}</button><button class="btn sm" id="mv">Mover</button>${p.adult ? '' : `<button class="btn sm ${s.adult ? 'a18on' : ''}" id="a18">${s.adult ? '🔞 É +18' : '🔞 +18'}</button>`}${s.anim || p.animated ? '<button class="btn sm" id="smo">✨ Suavizar</button>' : ''}<button class="btn sm danger" id="dl">Apagar</button></div>`;
    $$('#lw .lchip', bd).forEach(b => b.onclick = async () => {
      const w = b.dataset.w;
      const r = await dialog({ title: `«${w}»`, html: '<div class="hint">O teclado aprendeu esta palavra contigo para este sticker.</div>', buttons: [{ label: 'Tornar palavra fixa', value: 'fix' }, { label: 'Esquecer', cls: 'danger', value: 'forget' }, { label: 'Fechar', cls: 'ghost', value: null }] });
      if (!r) return;
      if (r === 'fix') { const c = cur(); if (!c.words.some(y => norm(y) === norm(w))) c.words.push(w); commit(); }
      try { const d = JSON.parse(A.forgetLearned(p.id, cur().f, w)); if (!d.error) { S.data = d; p = packOf(packId); } } catch (e) {}
      toast(r === 'fix' ? `«${w}» ficou como palavra fixa` : `Esqueci «${w}»`);
      drawAll();
    });
    const lf = $('#lforget', bd);
    if (lf) lf.onclick = async () => {
      if (!await confirmBox('Esquecer tudo deste sticker?', 'As palavras aprendidas saem. As tuas palavras fixas e os emojis ficam.', 'Esquecer')) return;
      try { const d = JSON.parse(A.forgetLearned(p.id, cur().f, '')); if (!d.error) { S.data = d; p = packOf(packId); } } catch (e) {}
      drawAll();
    };
    $('#fv', bd).onclick = () => { const c = cur(); c.fav = !c.fav; commit(); drawAll(); toast(c.fav ? 'Nos favoritos do teclado ⭐' : 'Tirado dos favoritos'); };
    $('#gl', bd).onclick = () => { const r = JSON.parse(A.saveToGallery(p.id, s.f)); toast(r.error ? 'Não guardei: ' + r.error : 'Guardado em Imagens/StickTag ✓'); };
    wsg = wordSuggest($('#wsug', bd), () => {
      const c = cur();
      return { words: c.words, emojis: c.emojis, avoid: c.emojis.flatMap(e => emoWords(e)).concat(Match.learned(c).map(l => l.w)) };
    }, (w, many) => {
      const c = cur();
      if (c.words.some(y => norm(y) === norm(w))) return;
      c.words.push(w); commit(); drawWords();
      if (!many) toast(`«${w}» adicionada`);
    });
    if (!why || why.f !== s.f) why = null;
    drawTop(); drawWords(); redrawPicker(); drawWhyEd();
    $('#ocr', bd).onclick = async () => {
      const b = $('#ocr', bd); b.disabled = true; b.textContent = 'A ler…';
      const w = await ocrWords(imgUrl(p, cur().f));
      b.disabled = false; b.textContent = '✨ Ler o texto';
      if (!w) return;
      const c = cur(); const add = w.filter(x => !c.words.some(y => norm(y) === norm(x)));
      if (!add.length) return toast(w.length ? 'Essas palavras já cá estão' : 'Não encontrei texto neste sticker');
      c.words.push(...add); commit(); drawWords(); toast('Juntei: ' + add.join(', '));
    };
    if (sectionsOf(p).length || isKb(p)) {
      const sw = el(`<div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><span class="small muted">Secção:</span><button class="mchip ${s.section ? 'on' : ''}" id="sec">${esc(s.section || 'nenhuma')} ▾</button></div>`);
      $('#sec', sw).onclick = async () => { await chooseSection(p, [cur().f]); p = packOf(packId); drawAll(); };
      bd.appendChild(sw);
    }
    const spw = el('<div></div>'); bd.appendChild(spw);
    if (!s.hidden) specialSection(() => ({ p: p.id, f: cur().f }), () => p.id, spw);
    $('#cv', bd).onclick = () => { p.cover = s.f; commit(); drawAll(); toast('Capa do pack atualizada'); };
    $('#mv', bd).onclick = async () => { const ok = await moveStickers(p, [s.f]); if (ok) closeOverlay(ov); };
    const smo = $('#smo', bd); if (smo) smo.onclick = () => { closeOverlay(ov); openSmooth(p, s); };
    const a18 = $('#a18', bd); if (a18) a18.onclick = () => {
      const c = cur(), on = !c.adult;
      try { const d = JSON.parse(A.setStickerFlag(p.id, c.f, 'adult', on)); if (!d.error) { S.data = d; p = packOf(packId); } } catch (e) {}
      toast(on ? 'Sticker +18 🔞: só aparece no modo +18' : 'Já não é +18');
      drawAll();
    };
    $('#dl', bd).onclick = async () => {
      if (!await confirmBox('Apagar este sticker?', 'Sai deste pack (e do WhatsApp, se o pack lá estiver).')) return;
      const r = JSON.parse(A.deleteSticker(p.id, s.f));
      if (r.error) return toast(r.error);
      reload(); p = packOf(packId);
      if (!p.stickers.length) { closeOverlay(ov); return; }
      idx = Math.min(idx, p.stickers.length - 1); drawAll();
    };
  }
  drawAll();
}

function bulkEmoji(p) {
  const sheet = el(`<div class="sheet"><div class="hd"><h3>Dar emoji a ${S.sel.size} sticker${S.sel.size > 1 ? 's' : ''}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd"><div class="hint">Toca num emoji para o juntar a todos os stickers escolhidos (os que já têm 3 ficam como estão).</div></div></div>`);
  const ov = openOverlay(sheet, { onClose: () => render() });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  $('.bd', sheet).appendChild(makePicker(e => {
    let n = 0;
    for (const s of p.stickers) if (S.sel.has(s.f)) {
      s.emojis = s.emojis || [];
      if (!s.emojis.some(x => stripVS(x) === stripVS(e)) && s.emojis.length < 3) { s.emojis.push(e); n++; }
    }
    p = savePack(p);
    toast(n ? `${e} adicionado a ${n} sticker${n > 1 ? 's' : ''}` : 'Nenhum sticker mudou');
  }));
}

/* ---------- remover fundo (pessoas) e stickers animados ---------- */
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.dataset.src = src;
    s.onload = () => res(); s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}

/** Devolve um canvas com a imagem só com a(s) pessoa(s), fundo transparente. */
async function cutPerson(img) {
  await loadScript('mp/selfie_segmentation.js');
  const sc = Math.min(1, 1024 / Math.max(img.width, img.height));
  const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
  const src = document.createElement('canvas'); src.width = w; src.height = h;
  src.getContext('2d').drawImage(img, 0, 0, w, h);
  const seg = new SelfieSegmentation({ locateFile: f => 'mp/' + f });
  seg.setOptions({ modelSelection: 0 });
  const res = await new Promise((ok, bad) => {
    const t = setTimeout(() => bad(new Error('tempo')), 30000);
    seg.onResults(r => { clearTimeout(t); ok(r); });
    seg.send({ image: src }).catch(bad);
  });
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d');
  o.drawImage(res.segmentationMask, 0, 0, w, h);
  o.globalCompositeOperation = 'source-in';
  o.drawImage(src, 0, 0);
  try { seg.close(); } catch (e) {}
  return out;
}

function openAnimCreator(packId, media, opts = {}) {
  const p = packOf(packId);
  if (!p) return;
  const isVideo = media.mime.startsWith('video');
  const st = { zoom: 1, ox: 0, oy: 0, shape: 'rr', outline: true, top: '', bottom: '', size: 64, color: '#ffffff', start: 0, len: 3, fps: 12, dur: 0 };
  const sheet = el(`<div class="sheet"><div class="hd"><h3>Sticker animado</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div style="display:grid;place-items:center"><canvas id="cv" width="512" height="512" style="width:min(280px,72vw);height:min(280px,72vw);border-radius:16px;touch-action:none;background-color:#1c2028;background-image:linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%),linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%);background-size:20px 20px;background-position:0 0,10px 10px"></canvas></div>
    <div class="row" style="justify-content:center;margin:8px 0"><button class="btn sm" id="pl">▶ Pré-visualizar</button><span class="hint" id="info">A carregar…</span></div>
    <label class="field"><span id="lst">Começa em 0,0 s</span><input type="range" id="ss" min="0" max="1" step="0.05" value="0" style="width:100%"></label>
    <label class="field"><span id="lln">Duração 3,0 s</span><input type="range" id="sl" min="0.5" max="8" step="0.1" value="3" style="width:100%"></label>
    <div class="field"><span>Fluidez (imagens por segundo)</span><div class="seg" id="fp" style="grid-template-columns:repeat(5,1fr)"><button data-f="8">8</button><button data-f="12" class="on">12</button><button data-f="15">15</button><button data-f="24">24 ✨</button><button data-f="30">30 ✨</button></div><div class="hint" id="fph" style="margin-top:6px">12 = normal. 24 e 30 ficam muito lisos, mas só até 5 e 4 segundos para caber no WhatsApp.</div></div>
    <label class="field"><span>Zoom (arrasta para posicionar)</span><input type="range" id="zm" min="1" max="4" step="0.01" value="1" style="width:100%"></label>
    <div class="field"><span>Forma</span><div class="seg" id="sh" style="grid-template-columns:repeat(4,1fr)"><button data-s="sq">Quadrado</button><button data-s="rd">Redondo</button><button data-s="rr" class="on">Cantos</button><button data-s="full">Inteiro</button></div></div>
    <div class="opt" style="padding:4px 2px 12px"><div class="t"><b>Contorno branco</b></div><button class="sw on" id="ol"></button></div>
    <label class="field"><span>Texto em cima</span><input class="input" id="tt" maxlength="40" placeholder="opcional"></label>
    <label class="field"><span>Texto em baixo</span><input class="input" id="tb" maxlength="40" placeholder="opcional"></label>
    <div class="field"><span>Tamanho e cor do texto</span><div class="row"><input type="range" id="ts" min="30" max="110" value="64" style="flex:1"><div class="seg" id="tc" style="grid-template-columns:repeat(3,40px)"><button data-c="#ffffff" class="on" style="color:#fff">A</button><button data-c="#FFE14D" style="color:#FFE14D">A</button><button data-c="#111111" style="color:#999">A</button></div></div></div>
    <label class="field"><span>Palavras para este sticker</span><input class="input" id="wd" placeholder="ex.: hahaha, bora"></label>
    <button class="btn primary block" id="sv">Criar e guardar no pack “${esc(p.name)}”</button>
    <div class="note">Os stickers animados têm de ficar abaixo de 500 KB: se for preciso, a app baixa a qualidade sozinha.</div>
  </div></div>`);
  let playing = false, stop = false;
  const ov = openOverlay(sheet, { modal: true, onClose: () => { stop = true; render(); } });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const cv = $('#cv', sheet), ctx = cv.getContext('2d', { willReadFrequently: true });
  const fmt = n => n.toFixed(1).replace('.', ',');
  // fonte das imagens: vídeo ou frames de GIF/WebP
  let video = null, frames = null, srcW = 0, srcH = 0;
  async function init() {
    try {
      const blob = await (await fetch(media.url)).blob();
      if (isVideo) {
        video = document.createElement('video');
        video.muted = true; video.playsInline = true; video.preload = 'auto';
        video.src = URL.createObjectURL(blob);
        await new Promise((ok, bad) => { video.onloadeddata = ok; video.onerror = () => bad(new Error('vídeo')); });
        st.dur = video.duration || 3; srcW = video.videoWidth; srcH = video.videoHeight;
      } else {
        if (!window.ImageDecoder) throw new Error('Este telemóvel não consegue ler GIFs aqui. Experimenta um vídeo.');
        const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type: media.mime });
        await dec.tracks.ready;
        const n = Math.min(dec.tracks.selectedTrack.frameCount, 200);
        frames = []; let t = 0;
        for (let i = 0; i < n; i++) {
          const r = await dec.decode({ frameIndex: i });
          const vf = r.image;
          const c = document.createElement('canvas'); c.width = vf.displayWidth; c.height = vf.displayHeight;
          c.getContext('2d').drawImage(vf, 0, 0);
          const d = (vf.duration || 100000) / 1e6;
          frames.push({ c, t, d }); t += d; vf.close();
          if (t > 12) break;
        }
        st.dur = t; srcW = frames[0].c.width; srcH = frames[0].c.height;
      }
      st.len = Math.min(3, st.dur); 
      $('#ss', sheet).max = Math.max(0, st.dur - 0.3);
      $('#sl', sheet).max = Math.max(0.5, Math.min(8, st.dur, 120 / st.fps));
      $('#sl', sheet).value = st.len;
      $('#info', sheet).textContent = `${isVideo ? 'Vídeo' : media.mime.includes('webp') ? 'Animação' : 'GIF'} de ${fmt(st.dur)} s`;
      upd(); await showAt(st.start);
    } catch (e) {
      $('#info', sheet).textContent = 'Não consegui abrir: ' + (e.message || e);
    }
  }
  async function frameAt(t) {
    if (video) {
      await new Promise(ok => { const f = () => { video.removeEventListener('seeked', f); ok(); }; video.addEventListener('seeked', f); video.currentTime = Math.min(t, Math.max(0, st.dur - 0.05)); });
      return video;
    }
    let f = frames[0];
    for (const x of frames) { if (x.t <= t) f = x; else break; }
    return f.c;
  }
  function shapePath(c, inset) {
    const a = inset, b = 512 - inset;
    c.beginPath();
    if (st.shape === 'rd') c.arc(256, 256, 256 - inset, 0, Math.PI * 2);
    else if (st.shape === 'rr') { const r = 90; c.moveTo(a + r, a); c.arcTo(b, a, b, b, r); c.arcTo(b, b, a, b, r); c.arcTo(a, b, a, a, r); c.arcTo(a, a, b, a, r); c.closePath(); }
    else c.rect(a, a, b - a, b - a);
  }
  function text(c, t, y, base) {
    if (!t) return;
    c.save();
    let size = st.size;
    c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`;
    while (c.measureText(t).width > 460 && size > 18) { size -= 2; c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = base; c.lineJoin = 'round'; c.lineWidth = Math.max(6, size / 6);
    c.strokeStyle = st.color === '#111111' ? '#ffffff' : '#000000';
    c.strokeText(t, 256, y); c.fillStyle = st.color; c.fillText(t, 256, y);
    c.restore();
  }
  function compose(src) {
    ctx.clearRect(0, 0, 512, 512);
    if (!srcW) return;
    const full = st.shape === 'full';
    const inset = st.outline && !full ? 14 : 0;
    const cover = full ? Math.min(512 / srcW, 512 / srcH) : Math.max(512 / srcW, 512 / srcH);
    const sc = cover * st.zoom, w = srcW * sc, h = srcH * sc;
    const maxX = Math.max(0, (w - 512) / 2), maxY = Math.max(0, (h - 512) / 2);
    st.ox = Math.max(-maxX, Math.min(maxX, st.ox)); st.oy = Math.max(-maxY, Math.min(maxY, st.oy));
    ctx.save();
    if (!full) { shapePath(ctx, inset); ctx.clip(); }
    ctx.drawImage(src, 256 - w / 2 + st.ox, 256 - h / 2 + st.oy, w, h);
    ctx.restore();
    if (inset) { ctx.save(); shapePath(ctx, inset / 2); ctx.lineWidth = inset; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
    text(ctx, st.top, 40, 'top'); text(ctx, st.bottom, 472, 'bottom');
  }
  let lastSrc = null;
  async function showAt(t) { lastSrc = await frameAt(t); compose(lastSrc); }
  const redraw = () => { if (lastSrc) compose(lastSrc); };
  function upd() {
    st.len = Math.min(st.len, Math.max(0.3, st.dur - st.start));
    $('#lst', sheet).textContent = `Começa em ${fmt(st.start)} s`;
    $('#lln', sheet).textContent = `Duração ${fmt(st.len)} s · ${Math.round(st.len * st.fps)} imagens`;
  }
  $('#ss', sheet).oninput = e => { st.start = +e.target.value; upd(); showAt(st.start); };
  $('#sl', sheet).oninput = e => { st.len = +e.target.value; upd(); };
  $$('#fp button', sheet).forEach(b => b.onclick = () => {
    st.fps = +b.dataset.f; $$('#fp button', sheet).forEach(x => x.classList.toggle('on', x === b));
    // no máximo 120 imagens: a mais fluidez, menos segundos
    const maxLen = Math.max(0.5, Math.min(8, st.dur || 8, 120 / st.fps));
    $('#sl', sheet).max = maxLen;
    if (st.len > maxLen) { st.len = Math.floor(maxLen * 10) / 10; $('#sl', sheet).value = st.len; }
    upd();
  });
  $('#zm', sheet).oninput = e => { st.zoom = +e.target.value; redraw(); };
  $$('#sh button', sheet).forEach(b => b.onclick = () => { st.shape = b.dataset.s; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  $('#ol', sheet).onclick = e => { st.outline = !st.outline; e.currentTarget.classList.toggle('on', st.outline); redraw(); };
  if (opts.edit) { st.shape = 'full'; st.outline = false; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x.dataset.s === 'full')); $('#ol', sheet).classList.remove('on'); }
  const ex = opts.edit ? creatorExtras(sheet, packId) : null;
  $('#tt', sheet).oninput = e => { st.top = e.target.value; redraw(); };
  $('#tb', sheet).oninput = e => { st.bottom = e.target.value; redraw(); };
  $('#ts', sheet).oninput = e => { st.size = +e.target.value; redraw(); };
  $$('#tc button', sheet).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$('#tc button', sheet).forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; const k = 512 / cv.getBoundingClientRect().width; st.ox = drag.ox + (e.clientX - drag.x) * k; st.oy = drag.oy + (e.clientY - drag.y) * k; redraw(); });
  cv.addEventListener('pointerup', () => drag = null);
  $('#pl', sheet).onclick = async () => {
    if (playing) { playing = false; return; }
    playing = true; $('#pl', sheet).textContent = '■ Parar';
    const n = Math.max(2, Math.round(st.len * st.fps));
    while (playing && !stop) {
      for (let i = 0; i < n && playing && !stop; i++) {
        const t0 = performance.now();
        await showAt(st.start + i / st.fps);
        await new Promise(r => setTimeout(r, Math.max(0, 1000 / st.fps - (performance.now() - t0))));
      }
    }
    playing = false; $('#pl', sheet).textContent = '▶ Pré-visualizar';
  };
  $('#sv', sheet).onclick = async () => {
    if (ex && !ex.validate()) return;
    playing = false;
    if (!srcW) return toast('Ainda a carregar…');
    try {
      const mod = await import('./webp/index.js');
      let fps = st.fps, n = Math.max(2, Math.min(120, Math.round(st.len * fps)));
      busy('A preparar as imagens…');
      const raw = [];
      for (let i = 0; i < n; i++) {
        busy(`A preparar ${i + 1} de ${n}…`);
        await showAt(st.start + i / fps);
        raw.push(new Uint8Array(ctx.getImageData(0, 0, 512, 512).data.buffer.slice(0)));
      }
      // codifica e baixa a qualidade até caber em 500 KB
      const tries = [[70, 1], [58, 1], [48, 1], [38, 1], [30, 1], [24, 1], [30, 2], [22, 2], [18, 3]];
      let out = null;
      for (const [q, step] of tries) {
        busy(`A criar o sticker (qualidade ${q})…`);
        const fr = [];
        for (let i = 0; i < raw.length; i += step) fr.push({ data: raw[i], duration: Math.round(1000 / fps * step), config: { lossless: 0, quality: q } });
        out = await mod.encodeAnimation(512, 512, true, fr);
        if (out && out.length <= 490 * 1024) break;
      }
      if (!out || out.length > 500 * 1024) { busy(null); return toast('Ficou grande demais: escolhe menos segundos.'); }
      let bin = '';
      for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
      const words = $('#wd', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
      const r = JSON.parse(A.saveCreated(packId, 'data:image/webp;base64,' + btoa(bin), JSON.stringify(words)));
      busy(null);
      if (r.error) return toast(r.error);
      S.data = r.data;
      if (ex) ex.apply(r.file, words);
      closeOverlay(ov);
      if (opts.onSaved) return opts.onSaved(r);
      toast(`Sticker animado criado ✓ (${Math.round(out.length / 1024)} KB)`);
      const pk = packOf(packId);
      if (pk) openEditor(packId, pk.stickers.findIndex(x => x.f === r.file));
    } catch (e) {
      busy(null);
      toast('Não consegui criar: ' + (e.message || e));
    }
  };
  init();
}


/*
 * Extras do criador quando vens das pastas (botão Editar): emojis e especial no mesmo ecrã,
 * para fazer tudo de uma vez sem abrir mais menus.
 */
function creatorExtras(sheet, packId) {
  const emojis = [];
  const box = el(`<div class="cx"><button class="btn sm block" id="cx-ocr" style="margin:-4px 0 14px">✨ Ler o texto do sticker para as palavras</button><div class="sugbox" id="cx-sug"></div><div class="field"><span>Emojis (tags) — 1 a 3</span><div class="emq"></div></div><div class="cx-why"></div><div class="cx-pk hidden"></div><div class="cx-sp"></div></div>`);
  const anchor = $('#wd', sheet).closest('.field');
  anchor.after(box);
  $('#cx-ocr', box).onclick = async () => {
    const b = $('#cx-ocr', box); b.disabled = true; b.textContent = 'A ler o texto…';
    const w = await ocrWords($('#cv', sheet).toDataURL('image/png'));
    b.disabled = false; b.textContent = '✨ Ler o texto do sticker para as palavras';
    if (!w) return;
    const inp = $('#wd', sheet);
    const cur = inp.value.split(',').map(x => x.trim()).filter(Boolean);
    const add = w.filter(x => !cur.some(y => norm(y) === norm(x)));
    if (!add.length) return toast(w.length ? 'Essas palavras já lá estão' : 'Não encontrei texto');
    inp.value = cur.concat(add).join(', ');
    csg.draw('');
    toast('Juntei: ' + add.join(', '));
  };
  const emq = $('.emq', box), pkh = $('.cx-pk', box);
  let picker = null, why = null;
  const wdIn = $('#wd', sheet);
  const curWords = () => wdIn.value.split(',').map(x => x.trim()).filter(Boolean);
  const csg = wordSuggest($('#cx-sug', box), () => ({ words: curWords(), emojis }), (w, many) => {
    const l = curWords();
    if (l.some(y => norm(y) === norm(w))) return;
    l.push(w); wdIn.value = l.join(', '); csg.draw('');
  });
  let tq = null;
  wdIn.addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => { const v = wdIn.value; const last = v.slice(v.lastIndexOf(',') + 1); csg.draw(v.trim().endsWith(',') ? '' : last); }, 150); });
  const whyBox = $('.cx-why', box);
  function drawWhyCx() {
    drawWhy(whyBox, why, {
      words: curWords,
      close: () => { why = null; drawWhyCx(); },
      add: x => { if (emojis.some(y => stripVS(y) === stripVS(x.e))) return; if (emojis.length >= 3) return toast('Já tem 3 emojis'); emojis.push(x.e); why.added.push(x); why.alts = why.alts.filter(y => y !== x); drawEm(); drawWhyCx(); },
      undo: () => { const rm = new Set(why.added.map(x => stripVS(x.e))); for (let i = emojis.length - 1; i >= 0; i--) if (rm.has(stripVS(emojis[i]))) emojis.splice(i, 1); why = null; drawEm(); drawWhyCx(); },
      addWords: ws => { const l = curWords(); ws.forEach(w => { if (!l.some(y => norm(y) === norm(w))) l.push(w); }); wdIn.value = l.join(', '); drawWhyCx(); csg.draw(''); }
    });
  }
  async function autoCx(btn) {
    btn.disabled = true; const label = btn.innerHTML;
    try {
      const url = $('#cv', sheet).toDataURL('image/png');
      const r = await analyseEmojis({ p: packOf(packId), dataUrl: url, img: url, words: curWords(), emojis: emojis.slice(), step: t => { btn.textContent = t; } });
      const need = 3 - emojis.length;
      const picks = need > 0 ? pickEmojis(r.list, need) : [];
      picks.forEach(x => emojis.push(x.e));
      why = r.list.length ? { added: picks, alts: r.list.filter(x => !picks.includes(x)).slice(0, 6), ocr: r.ocr } : null;
      if (!r.list.length) toast('Não encontrei pistas: escreve uma palavra e tenta outra vez');
      drawEm(); drawWhyCx();
    } finally { btn.disabled = false; btn.innerHTML = label; }
  }
  function drawEm() {
    emq.innerHTML = emojis.map((e, i) => `<div class="slot emo" data-i="${i}">${esc(e)}<span class="x">×</span></div>`).join('') + (emojis.length < 3 ? `<button class="btn sm" id="cx-add">${picker ? 'Fechar' : '＋ Emoji'}</button>` : '') + `<button class="btn sm aibtn" id="cx-ai">${emojis.length < 3 ? '✨ Completar' : '✨ Ideias'}</button>`;
    $('#cx-ai', emq).onclick = e => autoCx(e.currentTarget);
    $$('.slot', emq).forEach(sl => sl.onclick = () => { emojis.splice(+sl.dataset.i, 1); drawEm(); if (picker) showPicker(); });
    const add = $('#cx-add', emq);
    if (add) add.onclick = () => { if (picker) { picker = null; pkh.classList.add('hidden'); pkh.innerHTML = ''; drawEm(); } else showPicker(); };
  }
  function showPicker() {
    picker = makePicker(e => {
      const i = emojis.findIndex(x => stripVS(x) === stripVS(e));
      if (i >= 0) emojis.splice(i, 1); else if (emojis.length < 3) emojis.push(e);
      drawEm();
      if (emojis.length >= 3) { picker = null; pkh.classList.add('hidden'); pkh.innerHTML = ''; drawEm(); }
    }, e => emojis.some(x => stripVS(x) === stripVS(e)));
    pkh.innerHTML = ''; pkh.appendChild(picker); pkh.classList.remove('hidden');
    drawEm();
  }
  drawEm(); csg.draw('');
  const sps = specialSection(() => null, () => packId, $('.cx-sp', box));
  return {
    validate: () => sps.validate(),
    // depois de o sticker ser criado: emojis + especial
    apply(file, words) {
      if (emojis.length) { try { const d = JSON.parse(A.setStickerTags(packId, file, JSON.stringify(emojis), JSON.stringify(words || []))); if (!d.error) S.data = d; } catch (e) {} }
      sps.commit({ p: packId, f: file });
    }
  };
}

/* ---------- Criar sticker a partir de uma foto ---------- */
function openCreator(packId, url, opts = {}) {
  const p = packOf(packId);
  if (!p) return;
  const textMode = !url;
  const st = { zoom: 1, ox: 0, oy: 0, shape: textMode ? 'rr' : 'sq', outline: true, top: '', bottom: '', mid: '', size: 64, color: '#ffffff',
    bg: textMode ? '#7C3AED' : 'none', tool: 'move', brush: 40 };
  const BGS = [['none', 'Nenhum'], ['#ffffff', ''], ['#111111', ''], ['#25D366', ''], ['#FFE14D', ''], ['#FF5C8A', ''], ['#7C3AED', ''], ['grad', '']];
  const sheet = el(`<div class="sheet"><div class="hd"><h3>${textMode ? 'Sticker de texto' : 'Criar sticker'}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div style="display:grid;place-items:center"><canvas id="cv" width="512" height="512" style="width:min(300px,78vw);height:min(300px,78vw);border-radius:16px;touch-action:none;background-color:#1c2028;background-image:linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%),linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%);background-size:20px 20px;background-position:0 0,10px 10px"></canvas></div>
    ${textMode ? '' : `<div class="seg" id="tl" style="grid-template-columns:repeat(3,1fr);margin:10px 0 6px"><button data-t="move" class="on">✋ Mover</button><button data-t="erase">🧽 Borracha</button><button data-t="restore">↩ Repor</button></div>
    <button class="btn block" id="rmbg" style="margin-bottom:8px">✨ Remover o fundo automaticamente (pessoas)</button>
    <div class="row hidden" id="brow" style="margin-bottom:6px"><span class="small muted">Pincel</span><input type="range" id="bs" min="10" max="120" value="40" style="flex:1"><button class="btn sm" id="un">Desfazer</button></div>
    <div class="hint" id="thint" style="text-align:center;margin:2px 0 10px">Arrasta a foto para a posicionar. Usa a borracha para apagar o fundo.</div>
    <label class="field"><span>Zoom</span><input type="range" id="zm" min="1" max="4" step="0.01" value="1" style="width:100%"></label>`}
    ${textMode ? `<label class="field" style="margin-top:12px"><span>Texto</span><textarea class="input" id="tm" rows="2" maxlength="80" placeholder="Ex.: BORA!" style="height:auto;padding:10px 14px;resize:none"></textarea></label>` : ''}
    <div class="field"><span>Forma</span><div class="seg" id="sh" style="grid-template-columns:repeat(4,1fr)"><button data-s="sq">Quadrado</button><button data-s="rd">Redondo</button><button data-s="rr">Cantos</button><button data-s="full">${textMode ? 'Só texto' : 'Recorte'}</button></div></div>
    <div class="field"><span>Fundo</span><div class="row" id="bgs" style="flex-wrap:wrap;gap:8px">${BGS.map(([c, l]) => `<button data-b="${c}" style="width:38px;height:38px;border-radius:12px;border:2px solid var(--line);${c === 'none' ? 'font-size:11px;width:auto;padding:0 8px' : c === 'grad' ? 'background:linear-gradient(135deg,#FF8A00,#E52E71,#7C3AED)' : 'background:' + c}">${l}</button>`).join('')}</div></div>
    <div class="opt" style="padding:4px 2px 12px"><div class="t"><b>Contorno branco</b><div class="small muted">${textMode ? '' : 'Em “Recorte”, o contorno segue a forma do que ficou depois da borracha.'}</div></div><button class="sw on" id="ol"></button></div>
    <label class="field"><span>${textMode ? 'Texto pequeno em cima' : 'Texto em cima'}</span><input class="input" id="tt" maxlength="40" placeholder="opcional"></label>
    <label class="field"><span>${textMode ? 'Texto pequeno em baixo' : 'Texto em baixo'}</span><input class="input" id="tb" maxlength="40" placeholder="opcional"></label>
    <div class="field"><span>Tamanho e cor do texto</span><div class="row"><input type="range" id="ts" min="30" max="${textMode ? 160 : 110}" value="${textMode ? 110 : 64}" style="flex:1"><div class="seg" id="tc" style="grid-template-columns:repeat(4,40px)"><button data-c="#ffffff" class="on" style="color:#fff">A</button><button data-c="#FFE14D" style="color:#FFE14D">A</button><button data-c="#111111" style="color:#999">A</button><button data-c="#25D366" style="color:#25D366">A</button></div></div></div>
    <label class="field"><span>Palavras para este sticker</span><input class="input" id="wd" placeholder="ex.: bom dia, bora"></label>
    <button class="btn primary block" id="sv">Guardar no pack “${esc(p.name)}”</button>
  </div></div>`);
  if (textMode) st.size = 110;
  const ov = openOverlay(sheet, { modal: true, onClose: () => render() });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const cv = $('#cv', sheet), ctx = cv.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 512; return c; };
  const layer = mk(), lctx = layer.getContext('2d');
  const mask = mk(), mctx = mask.getContext('2d');
  const sil = mk(), sctx = sil.getContext('2d');
  mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, 512, 512);
  const undo = [];
  const im = new Image();
  if (url) { im.onload = () => draw(); im.src = url; }
  const mark = (sel, attr, val) => $$(sel + ' button', sheet).forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
  mark('#sh', 's', st.shape);
  function shapePath(c, inset) {
    const a = inset, b = 512 - inset;
    c.beginPath();
    if (st.shape === 'rd') c.arc(256, 256, 256 - inset, 0, Math.PI * 2);
    else if (st.shape === 'rr') { const r = 90; c.moveTo(a + r, a); c.arcTo(b, a, b, b, r); c.arcTo(b, b, a, b, r); c.arcTo(a, b, a, a, r); c.arcTo(a, a, b, a, r); c.closePath(); }
    else c.rect(a, a, b - a, b - a);
  }
  function fillBg(c) {
    if (st.bg === 'none') return;
    if (st.bg === 'grad') { const g = c.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, '#FF8A00'); g.addColorStop(0.5, '#E52E71'); g.addColorStop(1, '#7C3AED'); c.fillStyle = g; }
    else c.fillStyle = st.bg;
    c.fillRect(0, 0, 512, 512);
  }
  function fitFont(c, t, size, maxW) {
    c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`;
    while (c.measureText(t).width > maxW && size > 16) { size -= 2; c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`; }
    return size;
  }
  function strokeText(c, t, x, y, size) {
    c.lineJoin = 'round'; c.lineWidth = Math.max(6, size / 6);
    c.strokeStyle = st.color === '#111111' ? '#ffffff' : '#000000';
    c.strokeText(t, x, y); c.fillStyle = st.color; c.fillText(t, x, y);
  }
  function text(c, t, y, base, size) {
    if (!t) return;
    c.save();
    size = fitFont(c, t, size, 460);
    c.textAlign = 'center'; c.textBaseline = base;
    strokeText(c, t, 256, y, size);
    c.restore();
  }
  function midText(c) {
    const t = st.mid.trim();
    if (!t) return;
    // divide em linhas e ajusta o tamanho para caber
    const words = t.split(/\s+/);
    let size = st.size, lines;
    for (;;) {
      c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`;
      lines = []; let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (c.measureText(test).width > 430 && line) { lines.push(line); line = w; } else line = test;
      }
      if (line) lines.push(line);
      const tooWide = lines.some(l => c.measureText(l).width > 450);
      if ((lines.length * size * 1.08 <= 400 && !tooWide) || size <= 24) break;
      size -= 4;
    }
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const h = lines.length * size * 1.08;
    lines.forEach((l, i) => strokeText(c, l, 256, 256 - h / 2 + size * 1.08 * (i + 0.5), size));
    c.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, 512, 512);
    const full = st.shape === 'full';
    const inset = st.outline && !full ? 14 : 0;
    // camada da foto, já com a borracha aplicada
    lctx.clearRect(0, 0, 512, 512);
    if (url && im.width) {
      const cover = Math.max(512 / im.width, 512 / im.height);
      const sc = cover * st.zoom, w = im.width * sc, h = im.height * sc;
      const maxX = Math.max(0, (w - 512) / 2), maxY = Math.max(0, (h - 512) / 2);
      st.ox = Math.max(-maxX, Math.min(maxX, st.ox)); st.oy = Math.max(-maxY, Math.min(maxY, st.oy));
      lctx.globalCompositeOperation = 'source-over';
      lctx.drawImage(im, 256 - w / 2 + st.ox, 256 - h / 2 + st.oy, w, h);
      lctx.globalCompositeOperation = 'destination-in';
      lctx.drawImage(mask, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
    }
    if (full) {
      // recorte livre: fundo só se houver, contorno à volta da silhueta
      if (st.bg !== 'none') { ctx.save(); fillBg(ctx); ctx.restore(); }
      if (st.outline && url) {
        sctx.clearRect(0, 0, 512, 512);
        sctx.globalCompositeOperation = 'source-over'; sctx.drawImage(layer, 0, 0);
        sctx.globalCompositeOperation = 'source-in'; sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, 512, 512);
        sctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; ctx.drawImage(sil, Math.cos(a) * 9, Math.sin(a) * 9); }
      }
      ctx.drawImage(layer, 0, 0);
    } else {
      ctx.save(); shapePath(ctx, inset); ctx.clip();
      fillBg(ctx);
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
      if (inset) { ctx.save(); shapePath(ctx, inset / 2); ctx.lineWidth = inset; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
    }
    if (textMode) midText(ctx);
    const small = textMode ? 46 : st.size;
    text(ctx, st.top, 40, 'top', small);
    text(ctx, st.bottom, 472, 'bottom', small);
  }
  draw();
  // arrastar / apagar
  let drag = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * 512 / r.width, y: (e.clientY - r.top) * 512 / r.height }; };
  function brushAt(pt) {
    mctx.save();
    mctx.globalCompositeOperation = st.tool === 'erase' ? 'destination-out' : 'source-over';
    mctx.fillStyle = '#fff';
    mctx.beginPath(); mctx.arc(pt.x, pt.y, st.brush / 2, 0, Math.PI * 2); mctx.fill();
    mctx.restore();
  }
  cv.addEventListener('pointerdown', e => {
    if (!url) return;
    cv.setPointerCapture(e.pointerId);
    if (st.tool === 'move') drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy };
    else {
      undo.push(mctx.getImageData(0, 0, 512, 512)); if (undo.length > 15) undo.shift();
      drag = { last: pos(e) }; brushAt(drag.last); draw();
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    if (st.tool === 'move') {
      const k = 512 / cv.getBoundingClientRect().width;
      st.ox = drag.ox + (e.clientX - drag.x) * k; st.oy = drag.oy + (e.clientY - drag.y) * k;
    } else {
      const pt = pos(e), l = drag.last;
      const dist = Math.hypot(pt.x - l.x, pt.y - l.y), steps = Math.max(1, Math.ceil(dist / (st.brush / 4)));
      for (let i = 1; i <= steps; i++) brushAt({ x: l.x + (pt.x - l.x) * i / steps, y: l.y + (pt.y - l.y) * i / steps });
      drag.last = pt;
    }
    draw();
  });
  cv.addEventListener('pointerup', () => drag = null);
  cv.addEventListener('pointercancel', () => drag = null);
  if (!textMode) {
    $$('#tl button', sheet).forEach(b => b.onclick = () => {
      st.tool = b.dataset.t; mark('#tl', 't', st.tool);
      $('#brow', sheet).classList.toggle('hidden', st.tool === 'move');
      $('#thint', sheet).textContent = st.tool === 'move' ? 'Arrasta a foto para a posicionar. Usa a borracha para apagar o fundo.' : st.tool === 'erase' ? 'Passa o dedo por cima do que queres apagar. Escolhe “Recorte” em Forma para o contorno seguir o desenho.' : 'Passa o dedo para voltar a mostrar o que apagaste.';
    });
    $('#bs', sheet).oninput = e => { st.brush = +e.target.value; };
    $('#rmbg', sheet).onclick = async () => {
      if (!im.width) return;
      busy('A remover o fundo…');
      try {
        const cut = await cutPerson(im);
        const url2 = cut.toDataURL('image/png');
        await new Promise(ok => { im.onload = ok; im.src = url2; });
        mctx.globalCompositeOperation = 'source-over'; mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, 512, 512);
        st.shape = 'full'; st.outline = true; st.bg = 'none';
        mark('#sh', 's', 'full'); $('#ol', sheet).classList.add('on');
        $$('#bgs button', sheet).forEach(x => x.style.borderColor = x.dataset.b === 'none' ? 'var(--green)' : 'var(--line)');
        draw();
        busy(null);
        toast('Fundo removido ✓ Usa a borracha ou “Repor” para acertos.', 3500);
      } catch (e) { busy(null); toast('Não consegui remover o fundo neste telemóvel'); }
    };
    $('#un', sheet).onclick = () => { const d = undo.pop(); if (d) { mctx.putImageData(d, 0, 0); draw(); } };
    $('#zm', sheet).oninput = e => { st.zoom = +e.target.value; draw(); };
  } else {
    $('#tm', sheet).oninput = e => { st.mid = e.target.value; draw(); };
  }
  $$('#sh button', sheet).forEach(b => b.onclick = () => { st.shape = b.dataset.s; mark('#sh', 's', st.shape); draw(); });
  $$('#bgs button', sheet).forEach(b => b.onclick = () => { st.bg = b.dataset.b; $$('#bgs button', sheet).forEach(x => x.style.borderColor = x === b ? 'var(--green)' : 'var(--line)'); draw(); });
  $$('#bgs button', sheet).forEach(x => x.style.borderColor = x.dataset.b === st.bg ? 'var(--green)' : 'var(--line)');
  $('#ol', sheet).onclick = e => { st.outline = !st.outline; e.currentTarget.classList.toggle('on', st.outline); draw(); };
  if (opts.edit) { st.shape = 'full'; st.outline = false; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x.dataset.s === 'full')); $('#ol', sheet).classList.remove('on'); draw(); }
  const ex = opts.edit ? creatorExtras(sheet, packId) : null;
  $('#tt', sheet).oninput = e => { st.top = e.target.value; draw(); };
  $('#tb', sheet).oninput = e => { st.bottom = e.target.value; draw(); };
  $('#ts', sheet).oninput = e => { st.size = +e.target.value; draw(); };
  $$('#tc button', sheet).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$('#tc button', sheet).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#sv', sheet).onclick = () => {
    draw();
    if (textMode && !st.mid.trim() && !st.top && !st.bottom) return toast('Escreve um texto primeiro');
    if (ex && !ex.validate()) return;
    const words = $('#wd', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
    if (textMode && !words.length) Match.tokens(st.mid).filter(w => !Match.STOP.has(w)).slice(0, 4).forEach(w => words.push(w));
    let r;
    try { r = JSON.parse(A.saveCreated(packId, cv.toDataURL('image/png'), JSON.stringify(words))); } catch (e) { r = { error: 'erro' }; }
    if (r.error) { toast(r.error); return; }
    S.data = r.data;
    if (ex) ex.apply(r.file, words);
    closeOverlay(ov);
    if (opts.onSaved) return opts.onSaved(r);
    const pk = packOf(packId);
    toast('Sticker criado ✓ — agora dá-lhe um emoji');
    if (pk) openEditor(packId, pk.stickers.findIndex(x => x.f === r.file));
  };
}

/* ---------- Palavras ---------- */
function viewWords() {
  const v = el('<section class="view"></section>');
  v.appendChild(el(`<div class="top"><div style="flex:1"><h1>Palavras</h1><div class="sub">Que palavras ligam a cada emoji</div></div></div>`));
  const sb = el(`<div class="search">${ICON.search}<input placeholder="Escreve uma palavra ou um emoji" value="${esc(S.q)}"></div>`);
  v.appendChild(sb);
  const res = el('<div style="margin-top:14px"></div>');
  v.appendChild(res);
  const input = $('input', sb);
  input.addEventListener('input', () => { S.q = input.value; drawRes(); });
  function drawRes() {
    const q = S.q.trim();
    res.innerHTML = '';
    if (!q) {
      const used = usage();
      if (used.size) {
        res.appendChild(el(`<div class="sec" style="margin-top:6px">Os teus emojis e as palavras deles</div>`));
        Array.from(used.keys()).forEach(k => {
          const e = used.get(k)[0].s.emojis.find(x => stripVS(x) === k) || k;
          const o = emoInfo(e) || { e, n: 'emoji', pt: [], en: [] };
          const r = el(`<div class="res"><div class="e emo">${esc(e)}</div><div class="t"><div class="n">${esc(o.n)}</div><div class="w" style="color:var(--blue)">${esc(emoWords(e).join(', ') || '—')}</div></div><div class="mine"><span class="chip">${used.get(k).length}</span></div></div>`);
          r.onclick = () => openEmoji(e);
          res.appendChild(r);
        });
        res.appendChild(el(`<div class="hint" style="margin:0 2px 4px">Toca num emoji para mudar as palavras dele. São estas palavras que o teclado de stickers procura.</div>`));
      }
      res.appendChild(el(`<div class="sec" style="margin-top:6px">Categorias da pesquisa do WhatsApp</div>`));
      const cats = el('<div class="cats"></div>');
      WA_CATS.forEach(c => {
        const d = el(`<div class="cat"><div class="h">${esc(c.pt)}</div><div class="s">${esc(c.en)}</div><div class="es emo">${c.list.map(e => `<span>${esc(e)}</span>`).join('')}</div></div>`);
        $$('.es span', d).forEach(s => s.onclick = () => openEmoji(s.textContent));
        cats.appendChild(d);
      });
      res.appendChild(cats);
      res.appendChild(el(`<div class="note">O WhatsApp junta os stickers por estes emojis (lista oficial que publica para quem cria stickers). Escreve uma palavra em cima para veres que emojis lhe correspondem.</div>`));
      return;
    }
    const typed = splitEmojis(q);
    if (typed.length) {
      typed.slice(0, 12).forEach(e => res.appendChild(resultRow(emoInfo(e) || { e, n: 'emoji', pt: [], en: [] }, '')));
      return;
    }
    const nq = norm(q);
    // os teus stickers com esta palavra
    const mine = [];
    for (const p of S.data.packs) for (const s of p.stickers) if ((s.words || []).some(w => norm(w).startsWith(nq))) mine.push({ p, s });
    if (mine.length) {
      res.appendChild(el(`<div class="sec" style="margin-top:4px">Os teus stickers com esta palavra</div>`));
      const g = el('<div class="mygrid"></div>');
      mine.slice(0, 16).forEach(({ p, s }) => { const i = el(`<img src="${imgUrl(p, s.f)}">`); i.onclick = () => { closeAllAndEdit(p, s); }; g.appendChild(i); });
      res.appendChild(g);
    }
    const list = searchEmojis(q, 60);
    res.appendChild(el(`<div class="sec">${list.length ? `Emojis para “${esc(q)}”` : `Nenhum emoji encontrado para “${esc(q)}”`}</div>`));
    list.forEach(o => res.appendChild(resultRow(o, nq)));
    res.appendChild(el(`<div class="note">As palavras vêm da lista oficial Unicode (CLDR) em português e inglês — a mesma que os teclados usam para sugerir emojis. O WhatsApp não publica a lista exata dele, por isso usa-a como guia.</div>`));
  }
  drawRes();
  return v;
}
function closeAllAndEdit(p, s) {
  p = packOf(p.id) || p;
  S.tab = 'packs'; S.packId = p.id; render();
  openEditor(p.id, p.stickers.findIndex(x => x.f === s.f));
}
function hl(w, nq) {
  const n = norm(w);
  const i = nq ? n.indexOf(nq) : -1;
  if (i < 0) return esc(w);
  return esc(w.slice(0, i)) + '<mark>' + esc(w.slice(i, i + nq.length)) + '</mark>' + esc(w.slice(i + nq.length));
}
function resultRow(o, nq) {
  const used = usage().get(stripVS(o.e)) || [];
  const words = nq ? o.pt.filter(w => norm(w).includes(nq)).concat(o.en.filter(w => norm(w).includes(nq))).slice(0, 4) : o.pt.slice(0, 5);
  const shown = (words.length ? words : o.pt.slice(0, 4)).map(w => hl(w, nq)).join(', ');
  const r = el(`<div class="res"><div class="e emo">${esc(o.e)}</div><div class="t"><div class="n">${esc(o.n)}</div><div class="w">${shown}</div></div><div class="mine">${used.slice(0, 2).map(x => `<img src="${imgUrl(x.p, x.s.f)}">`).join('')}${used.length > 2 ? `<span class="chip">+${used.length - 2}</span>` : ''}</div></div>`);
  r.onclick = () => openEmoji(o.e);
  return r;
}
function openEmoji(e) {
  const o = emoInfo(e) || { e, n: 'emoji', pt: [], en: [] };
  const used = usage().get(stripVS(e)) || [];
  const cats = WA_CAT_OF.get(stripVS(e));
  const sheet = el(`<div class="sheet"><div class="hd"><h3>${esc(o.n)}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div class="bigemo emo">${esc(o.e)}</div>
    ${cats ? `<div style="text-align:center;margin-bottom:6px">${cats.map(c => `<span class="chip ok">Categoria do WhatsApp: ${esc(c.pt)}</span>`).join(' ')}</div>` : ''}
    ${COMMON.has(stripVS(e)) ? '<div class="hint" style="text-align:center">Emoji muito usado: quando o escreves, o WhatsApp mistura os teus stickers com muitos outros.</div>' : '<div class="hint" style="text-align:center">Emoji pouco comum: bom para uma tag só tua.</div>'}
    <div class="sec">Palavras do teclado para este emoji</div>
    <div class="words" id="ew"></div>
    <div class="row" style="margin-top:8px;justify-content:space-between"><span class="hint">Os stickers com este emoji aparecem no teclado quando escreves estas palavras. Toca numa palavra em baixo para a juntar.</span><button class="btn sm" id="ewr">Repor</button></div>
    <div class="sugbox" id="sug"></div>
    <div class="sec">Palavras Unicode em português</div><div class="kw">${(o.pt.length ? [o.n].concat(o.pt) : ['—']).map(w => `<span>${esc(w)}</span>`).join('')}</div>
    <div class="sec">Palavras em inglês</div><div class="kw en">${(o.en.length ? o.en : ['—']).map(w => `<span>${esc(w)}</span>`).join('')}</div>
    <div class="sec">Os teus stickers com este emoji (${used.length})</div>
    ${used.length ? `<div class="mygrid">${used.map((x, i) => `<img data-i="${i}" src="${imgUrl(x.p, x.s.f)}">`).join('')}</div>` : '<div class="hint">Nenhum ainda.</div>'}
    <div class="row" style="margin-top:16px"><button class="btn" id="cp">${ICON.copy}Copiar emoji</button></div>
  </div></div>`);
  const ov = openOverlay(sheet, { onClose: () => { if (S.tab === 'words' || S.tab === 'kb') render(); } });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  $('#cp', sheet).onclick = () => { A.copy(o.e); toast('Emoji copiado'); };
  const saveEW = list => {
    try { S.data = JSON.parse(A.setEmojiWords(o.e, list == null ? '' : JSON.stringify(list))); } catch (er) { toast('Erro a guardar'); }
    drawEW();
  };
  const sg = wordSuggest($('#sug', sheet), () => ({ words: emoWords(o.e), emojis: [o.e] }), (w, many) => {
    const l = emoWords(o.e).slice();
    if (l.some(y => norm(y) === norm(w))) return;
    l.push(w); saveEW(l);
    if (!many) toast(`«${w}» adicionada`);
  });
  function drawEW() {
    const box = $('#ew', sheet);
    const list = emoWords(o.e);
    box.innerHTML = list.map((x, i) => `<span class="wchip">${esc(x)}<button data-i="${i}">×</button></span>`).join('') + '<input placeholder="nova palavra + Enter">';
    $$('.wchip button', box).forEach(b => b.onclick = () => { const l = emoWords(o.e).slice(); l.splice(+b.dataset.i, 1); saveEW(l); });
    const inp = $('input', box);
    const add = () => {
      const parts = inp.value.split(',').map(x => x.trim()).filter(Boolean);
      if (!parts.length) return;
      const l = emoWords(o.e).slice();
      for (const x of parts) if (!l.some(y => norm(y) === norm(x))) l.push(x);
      saveEW(l); $('#ew input', sheet).focus();
    };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } });
    let tq = null;
    inp.addEventListener('input', () => { if (inp.value.includes(',')) return add(); clearTimeout(tq); tq = setTimeout(() => sg.draw(inp.value), 120); });
    sg.draw('');
  }
  drawEW();
  $$('.kw span', sheet).forEach(sp => sp.onclick = () => {
    const w = sp.textContent.trim(); if (!w || w === '—') return;
    const l = emoWords(o.e).slice();
    if (l.some(y => norm(y) === norm(w))) return toast('Já está na lista');
    l.push(w); saveEW(l); toast(`“${w}” adicionada`);
  });
  $('#ewr', sheet).onclick = () => { saveEW(null); toast('Palavras repostas'); };
  $$('.mygrid img', sheet).forEach(img => img.onclick = () => { const x = used[+img.dataset.i]; closeOverlay(ov); closeAllAndEdit(x.p, x.s); });
}


/* ---------- Sugestões inteligentes (palavras e emojis) ---------- */
/**
 * Caixa de sugestões de palavras. getCtx() → {words, emojis, data, avoid}; onPick(palavra).
 * Devolve { draw(typed) } para atualizar quando as palavras mudam ou enquanto escreves.
 */
function wordSuggest(box, getCtx, onPick) {
  let more = false, typed = '', hidden = new Set();
  Suggest.loadSyn().then(() => draw(typed));
  function draw(t) {
    typed = t || '';
    const ctx = Object.assign({ data: S.data }, getCtx());
    const comp = typed.trim().length >= 2 ? Suggest.complete(typed, ctx) : [];
    const cs = new Set(comp.map(norm));
    const list = Suggest.words(Object.assign({}, ctx, { limit: 60 })).filter(x => !hidden.has(x.n) && !cs.has(x.n));
    const n = more ? 40 : 14;
    if (!comp.length && !list.length) {
      box.innerHTML = (ctx.words || []).length || (ctx.emojis || []).length ? '' : '<div class="hint">Escreve uma palavra e eu sugiro outras parecidas.</div>';
      return;
    }
    box.innerHTML = `<div class="sugh"><span>✨ ${comp.length ? 'Completar' : 'Sugestões'}</span>${list.length > 5 ? '<button class="btn sm ghost" id="sg5">＋ Juntar as 5 primeiras</button>' : ''}</div>
      ${comp.length ? `<div class="sugl">${comp.map(w => `<button class="schip comp" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div><div class="sugh"><span>Relacionadas</span></div>` : ''}
      <div class="sugl">${list.slice(0, n).map(x => `<button class="schip ${x.src === 'teu' ? 'mine' : ''}" data-w="${esc(x.w)}">${x.src === 'teu' ? '<i></i>' : ''}${esc(x.w)}</button>`).join('')}
      ${list.length > 14 ? `<button class="schip more" id="sgm">${more ? 'Menos' : `Mais ${Math.min(list.length, 40) - 14}…`}</button>` : ''}</div>
      <div class="hint sugn">Toca para juntar. As com ponto verde vêm do teu próprio uso.</div>`;
    $$('.schip[data-w]', box).forEach(b => {
      b.onclick = () => { onPick(b.dataset.w); };
      let tm = null;
      b.addEventListener('touchstart', () => { tm = setTimeout(() => { tm = 'x'; hidden.add(norm(b.dataset.w)); draw(typed); toast(`Escondi «${b.dataset.w}»`); }, 550); }, { passive: true });
      b.addEventListener('touchend', ev => { if (tm === 'x') ev.preventDefault(); else clearTimeout(tm); tm = null; });
    });
    const m = $('#sgm', box); if (m) m.onclick = () => { more = !more; draw(typed); };
    const f5 = $('#sg5', box); if (f5) f5.onclick = () => { list.slice(0, 5).forEach(x => onPick(x.w, true)); };
  }
  return { draw };
}

const SIMW = {};
function similarOf(pack, file, dataUrl) {
  return new Promise(res => {
    const id = 's' + Date.now() + Math.floor(Math.random() * 1e6);
    SIMW[id] = res;
    try { A.similarStickers(id, pack || '', file || '', dataUrl || ''); } catch (e) { delete SIMW[id]; return res({ list: [] }); }
    setTimeout(() => { if (SIMW[id]) { delete SIMW[id]; res({ list: [] }); } }, 20000);
  });
}
const withTimeout = (pr, ms, v) => Promise.race([pr, new Promise(r => setTimeout(() => r(v), ms))]);
S.ocrCache = {};

/**
 * Analisa um sticker e sugere emojis. o: { p, s, img (para ler o texto), dataUrl (imagem nova),
 * words, emojis, learned, step(texto) }. Devolve { list:[{e,score,why}], ocr:[…] }.
 */
async function analyseEmojis(o) {
  const key = o.s ? o.p.id + '/' + o.s.f : null;
  o.step && o.step('A comparar com os teus stickers…');
  const simP = similarOf(o.s ? o.p.id : '', o.s ? o.s.f : '', o.dataUrl || '');
  let ocr = key && S.ocrCache[key];
  if (!ocr && o.img) {
    o.step && o.step('A ler o texto da imagem…');
    ocr = await withTimeout(OCR.read(o.img).catch(() => []), 12000, []);
    if (key) S.ocrCache[key] = ocr;
  }
  o.step && o.step('A escolher…');
  const sim = await withTimeout(simP, 15000, { list: [] });
  const list = Suggest.emojis({ emojis: o.emojis, words: o.words, learned: o.learned || [], ocr: ocr || [], packName: o.p ? o.p.name : '',
    data: S.data, self: o.s ? { s: o.s, f: o.s.f } : null, similar: sim.list || [], col: sim.col, limit: 12 });
  return { list, ocr: ocr || [] };
}

/** Escolhe os que faltam até 3 (só os que têm pistas suficientes). */
function pickEmojis(list, need) {
  const out = [];
  const top = list.length ? list[0].score : 0;
  for (const x of list) {
    if (out.length >= need) break;
    if (x.score < 0.35 || x.score < top * 0.22) break;
    out.push(x);
  }
  return out;
}

/** Quadro "porque escolhi estes emojis" + outras ideias. */
function drawWhy(box, info, h) {
  if (!info) { box.innerHTML = ''; return; }
  const ocrNew = (info.ocr || []).filter(w => !(h.words() || []).some(y => norm(y) === norm(w)));
  box.innerHTML = `<div class="why">
    <div class="wh"><b>${info.added.length ? '✨ Porque escolhi estes' : '✨ Ideias de emojis'}</b><button class="iconbtn sm" id="wyx">${ICON.close}</button></div>
    ${info.added.map(x => `<div class="wr"><span class="emo">${esc(x.e)}</span><div>${x.why.map(esc).join('<br>')}</div></div>`).join('')}
    ${info.alts.length ? `<div class="wa">${info.added.length ? 'Outras ideias' : 'Toca para juntar'}:</div><div class="wl">${info.alts.map((x, i) => `<button class="walt" data-i="${i}"><span class="emo">${esc(x.e)}</span><small>${esc(x.why[0] || '')}</small></button>`).join('')}</div>` : ''}
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${info.added.length ? '<button class="btn sm" id="wyu">↩ Desfazer</button>' : ''}${ocrNew.length ? `<button class="btn sm" id="wyo">＋ Juntar «${esc(ocrNew.join(', '))}» às palavras</button>` : ''}</div>
  </div>`;
  $('#wyx', box).onclick = () => h.close();
  $$('.walt', box).forEach(b => b.onclick = () => h.add(info.alts[+b.dataset.i]));
  const u = $('#wyu', box); if (u) u.onclick = () => h.undo();
  const ow = $('#wyo', box); if (ow) ow.onclick = () => h.addWords(ocrNew);
}

/* ---------- Atalhos ---------- */
function shortcutList() {
  const list = [];
  for (const p of S.data.packs) for (const s of p.stickers) {
    if (!s.emojis || !s.emojis.length) continue;
    for (const w of (s.words || [])) list.push({ w, e: s.emojis[0], p, s });
  }
  list.sort((a, b) => norm(a.w).localeCompare(norm(b.w)));
  return list;
}
function viewShortcuts() {
  const v = el('<section class="view"></section>');
  const tp = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1"><h1>Atalhos do Gboard</h1><div class="sub">A tua palavra → o emoji → o teu sticker</div></div></div>`);
  tp.querySelector('#bk').onclick = () => go('help');
  v.appendChild(tp);
  const list = shortcutList();
  const used = usage();
  v.appendChild(el(`<div class="card"><div class="how"><div class="n">1</div><div class="t"><b>Escreves a palavra</b>Por exemplo “bomdia”.</div></div><div class="how"><div class="n">2</div><div class="t"><b>O teclado sugere o emoji</b>Tocas na sugestão e o emoji entra na conversa.</div></div><div class="how" style="margin:0"><div class="n">3</div><div class="t"><b>O WhatsApp mostra o sticker</b>Porque o sticker tem esse emoji como tag.</div></div></div>`));
  v.appendChild(el(`<div class="sec">Os teus atalhos (${list.length})</div>`));
  if (!list.length) {
    v.appendChild(el(`<div class="empty" style="padding-top:10px"><div class="big">⌨️</div><h2>Ainda não há atalhos</h2><div>Abre um sticker e escreve palavras em “Palavras para este sticker”. Cada palavra vira um atalho para o primeiro emoji desse sticker.</div></div>`));
    return v;
  }
  for (const it of list) {
    const k = stripVS(it.e);
    const n = (used.get(k) || []).length;
    const warn = COMMON.has(k) ? '<span class="chip warn">emoji comum</span>' : (n > 1 ? `<span class="chip">${n} stickers</span>` : '<span class="chip ok">único</span>');
    const r = el(`<div class="sc"><img src="${imgUrl(it.p, it.s.f)}"><div class="w">${esc(it.w)}</div><span class="arrow">→</span><span class="e emo">${esc(it.e)}</span>${warn}</div>`);
    r.onclick = () => closeAllAndEdit(it.p, it.s);
    v.appendChild(r);
  }
  if (list.some(it => COMMON.has(stripVS(it.e)))) v.appendChild(el(`<div class="hint" style="margin:4px 2px 0">“Emoji comum” = muitos stickers usam esse emoji, então o teu pode aparecer misturado. Para aparecer só o teu, usa um emoji único (separador ✨ no seletor).</div>`));
  if (list.some(it => /\s/.test(it.w))) v.appendChild(el(`<div class="hint" style="margin:6px 2px 0">Dica: atalhos com uma só palavra (sem espaços) funcionam melhor no teclado, por exemplo “bomdia”.</div>`));

  const lang = store.get('lang', '');
  v.appendChild(el(`<div class="sec">Enviar para o teclado</div>`));
  const card = el(`<div class="card">
    <div class="field"><span>Idioma dos atalhos no Gboard</span><div class="seg" id="lg" style="grid-template-columns:repeat(4,1fr)">${[['', 'Todos'], ['pt-PT', 'PT'], ['pt-BR', 'BR'], ['en-US', 'EN']].map(([c, l]) => `<button data-c="${c}" class="${c === lang ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn primary block" id="ex">${ICON.dl}Exportar para o Gboard (.zip)</button>
    <ol class="steps"><li>Guarda o ficheiro .zip.</li><li>No Gboard: <b>Definições → Dicionário → Dicionário pessoal</b>.</li><li>Escolhe <b>Todos os idiomas</b> (ou o teu idioma), toca nos <b>⋮</b> e em <b>Importar</b>.</li><li>Escolhe o ficheiro. Se voltares a importar, apaga antes os atalhos antigos para não ficarem repetidos.</li></ol>
    <div style="height:10px"></div>
    <button class="btn block" id="cl">${ICON.copy}Copiar a lista (para o Teclado Samsung)</button>
    <div class="hint" style="margin-top:8px">No Teclado Samsung: <b>Definições do teclado → Mais definições de escrita → Atalhos de texto</b> e adiciona cada atalho à mão.</div>
  </div>`);
  $$('#lg button', card).forEach(b => b.onclick = () => { store.set('lang', b.dataset.c); $$('#lg button', card).forEach(x => x.classList.toggle('on', x === b)); });
  $('#ex', card).onclick = () => {
    const lg = store.get('lang', '');
    const seen = new Set();
    const lines = ['# Gboard Dictionary version:1'];
    for (const it of list) {
      const key = norm(it.w) + '|' + it.e;
      if (seen.has(key)) continue; seen.add(key);
      lines.push(`${it.w.replace(/\t/g, ' ')}\t${it.e}\t${lg}`);
    }
    A.exportZip(lines.join('\n') + '\n', 'StickTag-atalhos.zip');
  };
  $('#cl', card).onclick = () => { A.copy(list.map(it => `${it.w} → ${it.e}`).join('\n')); toast('Lista copiada'); };
  v.appendChild(card);
  return v;
}

/* ---------- Teclado de stickers ---------- */
function viewKeyboard() {
  const v = el('<section class="view"></section>');
  v.appendChild(el(`<div class="top"><div style="flex:1"><h1>Teclado de stickers</h1><div class="sub">Escreves no teu teclado, os stickers aparecem aqui</div></div></div>`));
  const nAdult = S.data.packs.reduce((a, p) => a + p.stickers.filter(s => Match.isAdult(p, s)).length, 0);
  const am = el(`<div class="card ${adultOn() ? 'a18card' : ''}" style="margin-bottom:12px"><div class="opt" style="padding:0;border:0"><div class="t"><b>🔞 Modo +18</b><div class="small muted">${adultOn() ? 'Ligado: o teclado, a bolha, as sugestões, a pesquisa e os recentes só mostram stickers +18.' : 'Desligado: os stickers +18 ficam escondidos em todo o lado.'} Tens ${nAdult} sticker${nAdult === 1 ? '' : 's'} +18. Também podes trocar com o botão 🔞 no teclado e na bolha.</div></div><button class="sw ${adultOn() ? 'on' : ''}" id="am"></button></div><div class="hint" style="margin-top:8px">Para marcar: no menu ⋮ de um pack («Marcar como 🔞 +18») ou num sticker (botão «🔞 +18»).</div></div>`);
  $('#am', am).onclick = () => { try { S.data = JSON.parse(A.setOption('adultMode', !adultOn())); } catch (e) {} toast(adultOn() ? '🔞 Modo +18 ligado' : 'Modo normal'); render(); };
  let st = {};
  try { st = JSON.parse(A.keyboardStatus()); } catch (e) {}
  const on = !!st.enabled;
  const c1 = el(`<div class="card">
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><b>${on ? 'Teclado ativado' : 'Teclado desativado'}</b>${on ? '<span class="chip ok">✓ Ativo</span>' : '<span class="chip warn">Falta ativar</span>'}</div>
    ${on ? '' : '<div class="hint" style="margin-bottom:12px">Ativa o “StickTag · Stickers” na lista de teclados. O Android avisa que um teclado pode ver o que escreves: este só lê a frase quando o abres, para procurar stickers, e a app não tem acesso à internet.</div>'}
    <div class="row"><button class="btn ${on ? '' : 'primary'}" id="ka">${on ? 'Definições de teclados' : 'Ativar o teclado'}</button><button class="btn" id="kp">Mudar de teclado</button></div>
  </div>`);
  c1.querySelector('#ka').onclick = () => A.openKeyboardSettings();
  c1.querySelector('#kp').onclick = () => A.showKeyboardPicker();
  v.appendChild(c1);
  v.appendChild(learnCard());
  v.appendChild(am);
  // bolha flutuante
  let bs = {};
  try { bs = JSON.parse(A.bubbleStatus()); } catch (e) {}
  const APPS = [['com.whatsapp', 'WhatsApp'], ['com.whatsapp.w4b', 'WA Business'], ['com.zhiliaoapp.musically,com.ss.android.ugc.trill', 'TikTok'], ['com.instagram.android', 'Instagram'], ['org.telegram.messenger', 'Telegram'], ['com.facebook.orca', 'Messenger'], ['com.google.android.apps.messaging,com.samsung.android.messaging', 'SMS'], ['com.discord', 'Discord'], ['com.snapchat.android', 'Snapchat']];
  let chosen;
  try { chosen = S.data.bubbleApps ? JSON.parse(S.data.bubbleApps) : null; } catch (e) { chosen = null; }
  if (!chosen) chosen = APPS.flatMap(a => a[0].split(','));
  v.appendChild(el(`<div class="sec">Bolha flutuante</div>`));
  const bc = el(`<div class="card">
    <div class="row" style="justify-content:space-between;margin-bottom:8px"><b>${bs.enabled ? 'Bolha ativada' : 'Bolha desativada'}</b>${bs.enabled ? '<span class="chip ok">✓ Ativa</span>' : '<span class="chip warn">Falta ativar</span>'}</div>
    <div class="hint" style="margin-bottom:10px">Quando o teclado abre numa das apps escolhidas, aparece uma bolha 🏷️ com o número de stickers que combinam com o que escreveste. Tocas nela, escolhes o sticker e ele é enviado. Depois voltas sozinho ao teu teclado${bs.sdk && bs.sdk < 30 ? ' (enviar pela bolha precisa de Android 11+)' : ''}.</div>
    ${bs.enabled ? '' : `<ol class="steps" style="margin:0 0 12px">
      <li>Ativa primeiro o <b>teclado de stickers</b> (em cima).</li>
      <li>Toca em <b>Ativar a bolha</b> → <b>Apps instaladas</b> → <b>StickTag · Bolha de stickers</b> → liga.</li>
      <li>Se estiver cinzento ou bloqueado: toca em <b>Informações da app</b> → <b>⋮</b> (canto de cima) → <b>Permitir definições restritas</b>, e volta ao passo 2.</li></ol>
      <div class="row" style="margin-bottom:12px"><button class="btn primary" id="ba">Ativar a bolha</button><button class="btn" id="bi">Informações da app</button></div>`}
    <div class="opt" style="padding:6px 0"><div class="t"><b>Mostrar a bolha</b><div class="small muted">Desliga para a esconder sem desativar o serviço.</div></div><button class="sw ${S.data.bubbleOn !== false ? 'on' : ''}" id="bo"></button></div>
    <div class="small muted" style="margin:8px 0 6px;font-weight:600">Apps onde a bolha aparece</div>
    <div class="kw" id="bapps">${APPS.map(([k, l]) => `<span data-k="${k}" style="cursor:pointer;${k.split(',').some(x => chosen.includes(x)) ? 'background:var(--greenSoft);color:var(--green)' : ''}">${l}</span>`).join('')}</div>
    <div class="hint" style="margin-top:10px">A bolha lê o texto só nessas apps e nunca em campos de palavra-passe. Nada sai do telemóvel.</div>
  </div>`);
  const ba = bc.querySelector('#ba'); if (ba) ba.onclick = () => A.openAccessibilitySettings();
  const bi = bc.querySelector('#bi'); if (bi) bi.onclick = () => A.openAppInfo();
  bc.querySelector('#bo').onclick = e => {
    const val = !e.currentTarget.classList.contains('on');
    try { S.data = JSON.parse(A.setOption('bubbleOn', val)); } catch (er) {}
    e.currentTarget.classList.toggle('on', val);
  };
  $$('#bapps span', bc).forEach(sp => sp.onclick = () => {
    const ks = sp.dataset.k.split(',');
    const on = ks.some(x => chosen.includes(x));
    chosen = on ? chosen.filter(x => !ks.includes(x)) : chosen.concat(ks);
    try { S.data = JSON.parse(A.setText('bubbleApps', JSON.stringify(chosen))); } catch (er) {}
    sp.style.background = on ? '' : 'var(--greenSoft)'; sp.style.color = on ? '' : 'var(--green)';
  });
  v.appendChild(bc);
  v.appendChild(el(`<div class="sec">Como se usa</div>`));
  v.appendChild(el(`<div class="card">
    <div class="how"><div class="n">1</div><div class="t"><b>Escreve no teu teclado</b>Por exemplo “eu te amo muito”, no Fleksy ou noutro.</div></div>
    <div class="how"><div class="n">2</div><div class="t"><b>Muda para o StickTag</b>Toca no ícone de teclado em baixo no ecrã (ou no globo do teu teclado).</div></div>
    <div class="how"><div class="n">3</div><div class="t"><b>Toca no sticker</b>É enviado para a conversa e a frase é apagada (podes desligar isto em baixo).</div></div>
    <div class="how" style="margin:0"><div class="n">4</div><div class="t"><b>Volta ao teu teclado</b>Com o botão ⌨ no canto do teclado de stickers.</div></div>
  </div>`));
  // testar a procura
  v.appendChild(el(`<div class="sec">Experimenta a procura</div>`));
  const tb = el(`<div class="card"><div class="search" style="height:46px">${ICON.search}<input placeholder="Escreve uma frase, ex.: bom dia amor" value="${esc(S.kbTest || '')}"></div><div class="mygrid" style="margin-top:12px"></div><div class="hint" id="kbw" style="margin-top:8px"></div></div>`);
  const ti = $('input', tb), tg = $('.mygrid', tb), tw = $('#kbw', tb);
  const drawTest = () => {
    S.kbTest = ti.value;
    const idx = Match.buildIndex(Match.modeData(S.data), emoInfo);
    const res = Match.search(idx, ti.value, 16);
    tg.innerHTML = '';
    res.forEach(r => { const im = el(`<img src="${imgUrl(r.p, r.s.f)}">`); im.onclick = () => closeAllAndEdit(r.p, r.s); tg.appendChild(im); });
    tw.textContent = !ti.value.trim() ? 'Mostra os stickers que o teclado sugeria para essa frase.' : res.length ? 'Por causa de: ' + Array.from(new Set(res.flatMap(r => r.why))).slice(0, 8).join(', ') : 'Nenhum sticker. Dá palavras aos stickers ou muda as palavras dos emojis (separador Palavras).';
  };
  ti.addEventListener('input', drawTest);
  drawTest();
  v.appendChild(tb);
  // opções
  const d = S.data;
  v.appendChild(el(`<div class="sec">Opções do teclado</div>`));
  const ho = d.kbHeight || 'm';
  const op = el(`<div class="card" style="padding:4px 14px">
    <div class="opt"><div class="t"><b>Apagar a frase ao enviar</b><div class="small muted">Depois de enviares o sticker, o texto que estava escrito é apagado.</div></div><button class="sw ${d.kbDelete !== false ? 'on' : ''}" data-k="kbDelete"></button></div>
    <div class="opt"><div class="t"><b>Ordem aleatória nas sugestões</b><div class="small muted">Os stickers que combinam aparecem por ordem diferente de cada vez (também há o botão 🔀 no teclado).</div></div><button class="sw ${d.kbShuffle ? 'on' : ''}" data-k="kbShuffle"></button></div>
    <div class="opt" style="display:block"><b>Altura do teclado</b><div class="seg" id="kh" style="grid-template-columns:repeat(3,1fr);margin-top:8px">${[['s', 'Baixo'], ['m', 'Médio'], ['l', 'Alto']].map(([k, l]) => `<button data-h="${k}" class="${k === ho ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  </div>`);
  $$('.sw', op).forEach(b => b.onclick = () => {
    const val = !b.classList.contains('on');
    try { S.data = JSON.parse(A.setOption(b.dataset.k, val)); } catch (e) {}
    b.classList.toggle('on', val);
  });
  $$('#kh button', op).forEach(b => b.onclick = () => {
    try { S.data = JSON.parse(A.setText('kbHeight', b.dataset.h)); } catch (e) {}
    $$('#kh button', op).forEach(x => x.classList.toggle('on', x === b));
  });
  v.appendChild(op);
  v.appendChild(el(`<div class="note">Se uma app não aceitar stickers vindos de teclados, o StickTag abre a partilha para os enviares na mesma (aparece ↗ no topo do teclado).</div>`));
  return v;
}

/* ---------- Ajuda ---------- */
function viewHelp() {
  const v = el('<section class="view"></section>');
  v.appendChild(el(`<div class="top"><div style="flex:1"><h1>Ajuda</h1><div class="sub">Como funcionam as tags</div></div></div>`));
  v.appendChild(el(`<div class="card">
    <div class="how"><div class="n">1</div><div class="t"><b>Junta stickers num pack</b>De 3 a 30 por pack, até 10 packs. Estáticos e animados ficam em packs separados.</div></div>
    <div class="how"><div class="n">2</div><div class="t"><b>Dá emojis a cada sticker</b>São as tags: ficam guardadas no sticker (metadados) e o WhatsApp usa-as para o encontrar.</div></div>
    <div class="how"><div class="n">3</div><div class="t"><b>Adiciona o pack ao WhatsApp</b>Toca em “Adicionar ao WhatsApp” e confirma.</div></div>
    <div class="how" style="margin:0"><div class="n">4</div><div class="t"><b>Escreve o emoji numa conversa</b>O WhatsApp mostra os stickers com essa tag ao lado do botão de enviar.</div></div>
  </div>`));
  v.appendChild(el(`<div class="sec">Se as sugestões não aparecerem</div>`));
  v.appendChild(el(`<div class="card"><ol class="steps" style="margin:0">
    <li>No WhatsApp: <b>Definições → Conversas → Sugestões de stickers</b> tem de estar ligado.</li>
    <li>Atualiza o WhatsApp — esta função está a chegar aos poucos às contas.</li>
    <li>Depois de mudares emojis, fecha e volta a abrir o WhatsApp.</li>
    <li>As sugestões vêm do emoji, não da palavra. Para usares palavras tuas, vê o separador <b>Atalhos</b>.</li></ol></div>`));
  const d = S.data;
  v.appendChild(el(`<div class="sec">Cópia de segurança</div>`));
  const bk = el(`<div class="card"><div class="hint" style="margin-bottom:10px">Guarda todos os packs, stickers, palavras e favoritos num ficheiro .zip. Para não perderes nada se mudares de telemóvel.</div><div class="row"><button class="btn primary" id="be">Exportar</button><button class="btn" id="bi">Restaurar</button></div></div>`);
  bk.querySelector('#be').onclick = () => A.exportBackup();
  bk.querySelector('#bi').onclick = async () => {
    if (!await confirmBox('Restaurar uma cópia?', 'Os packs da cópia juntam-se aos teus. Se um pack da cópia já existir aqui, é substituído pela versão da cópia.', 'Escolher ficheiro')) return;
    A.importBackup();
  };
  v.appendChild(bk);
  v.appendChild(autoBackupCard());
  v.appendChild(el(`<div class="sec">Atalhos para o Gboard</div>`));
  const ab = el(`<div class="card"><div class="hint" style="margin-bottom:10px">Se usares o Gboard ou o Teclado Samsung: transforma as palavras dos teus stickers em atalhos que sugerem o emoji certo.</div><button class="btn block">Abrir atalhos</button></div>`);
  ab.querySelector('button').onclick = () => go('shortcuts');
  v.appendChild(ab);
  v.appendChild(el(`<div class="sec">Opções</div>`));
  const opts = el(`<div class="card" style="padding:4px 14px">
    <div class="opt"><div class="t"><b>Preencher o quadrado</b><div class="small muted">Corta as imagens para ocuparem os 512×512. Desligado: a imagem inteira cabe, com transparência à volta.</div></div><button class="sw ${d.fill ? 'on' : ''}" data-k="fill"></button></div>
    <div class="opt"><div class="t"><b>Palavras como texto de acessibilidade</b><div class="small muted">Envia também as tuas palavras ao WhatsApp como descrição do sticker. Experimental: o WhatsApp pode ou não usá-las na pesquisa.</div></div><button class="sw ${d.a11y !== false ? 'on' : ''}" data-k="a11y"></button></div>
  </div>`);
  $$('.sw', opts).forEach(b => b.onclick = () => {
    const k = b.dataset.k, val = !b.classList.contains('on');
    try { S.data = JSON.parse(A.setOption(k, val)); } catch (e) {}
    b.classList.toggle('on', val);
  });
  v.appendChild(opts);
  v.appendChild(el(`<div class="note" style="text-align:center;margin:22px 0 4px">StickTag ${esc(A.appVersion ? A.appVersion() : '')} · os stickers ficam só neste telemóvel</div>`));
  return v;
}

/* ---------- suavizar um sticker animado (imagens intermédias) ---------- */
async function openSmooth(p, s) {
  if (!window.ImageDecoder) return toast('Este telemóvel não consegue abrir animados aqui (atualiza o Android System WebView).');
  let src = [];
  try {
    busy('A ler o sticker…');
    const buf = await (await fetch(imgUrl(p, s.f))).arrayBuffer();
    const dec = new ImageDecoder({ data: buf, type: 'image/webp' });
    await dec.tracks.ready;
    const n = dec.tracks.selectedTrack.frameCount;
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const c = cv.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < n && i < 150; i++) {
      busy(`A ler ${i + 1} de ${n}…`);
      const { image } = await dec.decode({ frameIndex: i });
      c.clearRect(0, 0, 512, 512);
      c.drawImage(image, 0, 0, 512, 512);
      src.push({ px: c.getImageData(0, 0, 512, 512).data, d: Math.max(20, Math.round((image.duration || 100000) / 1000)) });
      image.close();
    }
    dec.close();
  } catch (e) { busy(null); return toast('Não consegui ler este sticker: ' + (e.message || e)); }
  busy(null);
  if (src.length < 2) return toast('Este sticker não é animado');
  const total = src.reduce((a, f) => a + f.d, 0);
  const fps0 = src.length / (total / 1000);
  // quantas imagens novas entre cada par (1 = 2×, 2 = 3×), sem passar de ~30 fps nem de 150 imagens
  const maxK = k => { while (k > 0 && (src.length * (k + 1) > 150 || Math.min(...src.map(f => f.d)) / (k + 1) < 33)) k--; return k; };
  const autoK = maxK(Math.max(1, Math.min(3, Math.round(25 / fps0) - 1)));
  let k = autoK, out = null, stop = false;
  const fmtF = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const sheet = el(`<div class="sheet"><div class="hd"><h3>✨ Suavizar</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div class="sm-cmp"><div><canvas id="ca" width="512" height="512"></canvas><b>Antes</b><span>${fmtF(fps0)} fps</span></div><div><canvas id="cb" width="512" height="512"></canvas><b>Depois</b><span id="fb"></span></div></div>
    <div class="field" style="margin-top:14px"><span>Quanto mais suave</span><div class="seg" id="kk" style="grid-template-columns:repeat(3,1fr)"><button data-k="1">2×</button><button data-k="2">3×</button><button data-k="3">4×</button></div></div>
    <div class="hint" id="sh"></div>
    <div class="note" style="margin-top:8px">Cria imagens novas a misturar as vizinhas. Em movimentos lentos fica bem mais liso; em movimentos rápidos pode aparecer um ligeiro rasto.</div>
    </div><div class="row" style="padding:10px 16px 14px"><button class="btn" id="nw">Guardar como novo</button><button class="btn primary" id="rp">Substituir</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true, onClose: () => { stop = true; } });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  // mistura duas imagens (com transparência) na proporção t
  function blend(a, b, t) {
    const o = new Uint8ClampedArray(a.length);
    for (let i = 0; i < a.length; i += 4) {
      const aa = a[i + 3] * (1 - t), ba = b[i + 3] * t, al = aa + ba;
      o[i + 3] = al;
      if (al < 0.5) continue;
      o[i] = (a[i] * aa + b[i] * ba) / al; o[i + 1] = (a[i + 1] * aa + b[i + 1] * ba) / al; o[i + 2] = (a[i + 2] * aa + b[i + 2] * ba) / al;
    }
    return o;
  }
  function build() {
    const r = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      const d = a.d / (k + 1);
      r.push({ px: a.px, d });
      for (let j = 1; j <= k; j++) r.push({ px: blend(a.px, b.px, j / (k + 1)), d });
    }
    return r;
  }
  function play(canvas, frames) {
    const c = canvas.getContext('2d');
    const imgs = frames.map(f => new ImageData(new Uint8ClampedArray(f.px), 512, 512));
    let i = 0, t0 = performance.now(), my = {};
    canvas._run = my;
    (function tick(now) {
      if (stop || canvas._run !== my) return;
      if (now - t0 >= frames[i].d) { t0 = now; i = (i + 1) % frames.length; }
      c.putImageData(imgs[i], 0, 0);
      requestAnimationFrame(tick);
    })(performance.now());
  }
  function redo() {
    $$('#kk button', sheet).forEach(b => { const kb = +b.dataset.k; b.classList.toggle('on', kb === k); b.disabled = maxK(kb) < kb; b.style.opacity = b.disabled ? .35 : 1; });
    out = build();
    $('#fb', sheet).textContent = `${fmtF(out.length / (total / 1000))} fps`;
    $('#sh', sheet).textContent = fps0 >= 24 ? 'Este sticker já é bastante suave: a diferença vai ser pequena.' : `${src.length} imagens passam a ${out.length}.`;
    play($('#cb', sheet), out);
  }
  play($('#ca', sheet), src);
  if (!autoK) { $('#sh', sheet).textContent = 'Este sticker já está no máximo de fluidez que o WhatsApp aguenta.'; $$('#kk button', sheet).forEach(b => b.disabled = true); $('#nw', sheet).disabled = $('#rp', sheet).disabled = true; return; }
  $$('#kk button', sheet).forEach(b => b.onclick = () => { if (b.disabled) return; k = +b.dataset.k; redo(); });
  redo();
  async function encode() {
    const mod = await import('./webp/index.js');
    let bytes = null;
    for (const q of [75, 62, 50, 40, 32, 25]) {
      busy(`A criar o sticker (qualidade ${q})…`);
      const fr = out.map(f => ({ data: new Uint8Array(f.px.buffer.slice(0)), duration: Math.max(20, Math.round(f.d)), config: { lossless: 0, quality: q } }));
      bytes = await mod.encodeAnimation(512, 512, true, fr);
      if (bytes && bytes.length <= 490 * 1024) break;
    }
    busy(null);
    if (!bytes || bytes.length > 500 * 1024) { toast('Ficou grande demais para o WhatsApp: experimenta menos suavidade.', 3500); return null; }
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return 'data:image/webp;base64,' + btoa(bin);
  }
  $('#rp', sheet).onclick = async () => {
    const url = await encode(); if (!url) return;
    let r; try { r = JSON.parse(A.replaceSticker(p.id, s.f, url)); } catch (e) { r = { error: 'erro' }; }
    if (r.error) return toast(r.error);
    S.data = r; closeOverlay(ov); toast('Sticker suavizado ✨'); render();
  };
  $('#nw', sheet).onclick = async () => {
    if (visible(p).length >= maxOf(p)) return toast('Este pack já está cheio');
    const url = await encode(); if (!url) return;
    let r; try { r = JSON.parse(A.saveCreated(p.id, url, JSON.stringify(s.words || []))); } catch (e) { r = { error: 'erro' }; }
    if (r.error) return toast(r.error);
    S.data = r.data; closeOverlay(ov); toast('Guardado como sticker novo ✨'); render();
  };
}


/* ---------- cópia de segurança automática ---------- */
function autoBackupCard() {
  const ab = S.data.autoBackup || {};
  const has = !!ab.uri;
  const on = has && ab.on !== false;
  const when = ab.last ? new Date(ab.last).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'ainda nenhuma';
  const EV = [[1, 'Todos os dias'], [3, 'De 3 em 3 dias'], [7, 'Todas as semanas'], [30, 'Todos os meses']];
  const KP = [2, 4, 8];
  const c = el(`<div class="card" style="margin-top:10px">
    <div class="opt" style="padding:0;border:0"><div class="t"><b>🔄 Cópia automática</b><div class="small muted">${has ? `Guarda sozinha um .zip na pasta <b>${esc(ab.folder || 'escolhida')}</b>.` : 'Escolhe uma pasta e o StickTag guarda lá cópias sozinho, sem teres de te lembrar.'}</div></div>${has ? `<button class="sw ${on ? 'on' : ''}" id="abo"></button>` : ''}</div>
    ${has ? `<div class="row" style="margin-top:12px;gap:8px"><select class="dsel big" id="abe" style="flex:1">${EV.map(([d, l]) => `<option value="${d}" ${(ab.every || 7) === d ? 'selected' : ''}>${l}</option>`).join('')}</select><select class="dsel big" id="abk" style="flex:1">${KP.map(k => `<option value="${k}" ${(ab.keep || 4) === k ? 'selected' : ''}>Guardar as últimas ${k}</option>`).join('')}</select></div>
    <div class="hint" style="margin-top:10px">Última: <b>${esc(when)}</b>${ab.lastError ? ` · <span style="color:var(--red)">${esc(ab.lastError)}</span>` : ''}. Dica: escolhe uma pasta que o Google Drive ou outra app sincronize, e ficas com a cópia também na nuvem.</div>
    <div class="row" style="margin-top:12px"><button class="btn sm" id="abf">Mudar de pasta</button><button class="btn sm primary" id="abn">Fazer agora</button></div>`
    : `<button class="btn primary block" id="abf" style="margin-top:12px">Escolher pasta e ligar</button>`}
  </div>`);
  const save = () => { try { S.data = JSON.parse(A.setAutoBackup($('#abo', c).classList.contains('on'), +$('#abe', c).value, +$('#abk', c).value)); } catch (e) {} };
  $('#abf', c).onclick = () => { busy('A preparar…'); A.pickBackupFolder(); setTimeout(() => busy(null), 1500); };
  if (has) {
    $('#abo', c).onclick = e => { e.currentTarget.classList.toggle('on'); save(); toast(e.currentTarget.classList.contains('on') ? 'Cópia automática ligada' : 'Cópia automática desligada'); };
    $('#abe', c).onchange = save; $('#abk', c).onchange = save;
    $('#abn', c).onclick = () => { busy('A fazer a cópia…'); A.backupNow(); };
  }
  return c;
}

/* ---------- secções dentro de um pack ---------- */
const sectionsOf = p => (p.sections || []).filter(Boolean);
function saveSections(p, list) {
  try { const d = JSON.parse(A.setSections(p.id, JSON.stringify(list))); if (!d.error) S.data = d; } catch (e) {}
}
function setSection(p, files, name) {
  try { const d = JSON.parse(A.setStickerSection(p.id, JSON.stringify(files), name || '')); if (!d.error) S.data = d; } catch (e) {}
}
async function newSectionDialog(p) {
  const name = await dialog({ title: 'Nova secção', html: `<label class="field"><span>Nome</span><input class="input" id="sn" maxlength="30" placeholder="Ex.: Reações, Bom dia, Memes"></label>`, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Criar', cls: 'primary', value: d => $('#sn', d).value.trim() }] });
  if (!name) return null;
  const list = sectionsOf(packOf(p.id));
  if (list.some(x => x.toLowerCase() === name.toLowerCase())) return name;
  saveSections(p, list.concat([name]));
  return name;
}
/* escolher a secção de um ou mais stickers */
async function chooseSection(p, files) {
  const list = sectionsOf(p);
  const html = `<div class="chips" style="margin-bottom:14px">${list.map(n => `<button class="mchip" data-n="${esc(n)}">${esc(n)}</button>`).join('')}<button class="mchip" data-n="">Sem secção</button><button class="mchip" data-new="1">＋ Nova</button></div>`;
  let chosen;
  const pr = dialog({ title: files.length > 1 ? `Secção dos ${files.length} stickers` : 'Secção do sticker', html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }] });
  setTimeout(() => $$('.dialog [data-n], .dialog [data-new]').forEach(b => b.onclick = async () => {
    if (b.dataset.new) { closeOverlay(); const n = await newSectionDialog(p); if (n) { setSection(p, files, n); toast(`Em «${n}»`); render(); } return; }
    chosen = b.dataset.n; closeOverlay();
  }), 0);
  await pr;
  if (chosen === undefined) return;
  setSection(p, files, chosen);
  toast(chosen ? `Em «${chosen}»` : 'Sem secção');
  render();
}
async function sectionMenu(p, name) {
  const r = await dialog({ title: `Secção «${name}»`, html: '<div style="height:4px"></div>', buttons: [{ label: 'Mudar o nome', value: 'ren' }, { label: '‹ Mover para a esquerda', value: 'left' }, { label: 'Apagar a secção', cls: 'danger', value: 'del' }] });
  const list = sectionsOf(p);
  const i = list.indexOf(name);
  if (r === 'ren') {
    const n = await dialog({ title: 'Mudar o nome', html: `<label class="field"><input class="input" id="sn" maxlength="30" value="${esc(name)}"></label>`, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', value: d => $('#sn', d).value.trim() }] });
    if (!n || n === name) return;
    const files = p.stickers.filter(s => s.section === name).map(s => s.f);
    list[i] = n; saveSections(p, list); setSection(packOf(p.id), files, n);
    S.secOf = Object.assign(S.secOf || {}, { [p.id]: n });
  } else if (r === 'left' && i > 0) {
    [list[i - 1], list[i]] = [list[i], list[i - 1]]; saveSections(p, list);
  } else if (r === 'del') {
    if (!await confirmBox('Apagar a secção?', 'Os stickers não são apagados: só ficam sem secção.', 'Apagar')) return;
    saveSections(p, list.filter(x => x !== name));
    if (S.secOf) delete S.secOf[p.id];
  }
  render();
}

/* ---------- tags automáticas pelo texto do sticker ---------- */
async function ocrWords(url) {
  try { return await OCR.read(url); } catch (e) { toast('Não consegui ler o texto: ' + (e.message || e)); return null; }
}
async function bulkOcr(p) {
  const list = visible(p).filter(s => !(s.words && s.words.length));
  const all = list.length ? list : visible(p);
  if (!all.length) return toast('Este pack não tem stickers');
  if (!list.length && !await confirmBox('Todos já têm palavras', 'Queres ler o texto de todos à mesma (só junta palavras novas)?', 'Ler todos')) return;
  const found = [];
  try {
    busy('A preparar a leitura…');
    await OCR.init();
    let stop = false;
    for (let i = 0; i < all.length && !stop; i++) {
      busy(`A ler o texto ${i + 1} de ${all.length}…`, i + 1, all.length, () => { stop = true; });
      const s = all[i];
      const w = await OCR.read(imgUrl(p, s.f));
      const fresh = (w || []).filter(x => !(s.words || []).some(y => norm(y) === norm(x)));
      if (fresh.length) found.push({ s, words: fresh, on: fresh.map(() => true) });
    }
  } catch (e) { busy(null); return toast('Não consegui ler: ' + (e.message || e)); }
  busy(null);
  if (!found.length) return toast(`Não encontrei texto em ${all.length} sticker${all.length === 1 ? '' : 's'}`, 3000);
  const sheet = el(`<div class="sheet"><div class="hd"><h3>✨ Tags automáticas</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd"><div class="hint" style="margin-bottom:12px">Encontrei texto em ${found.length} sticker${found.length === 1 ? '' : 's'}. Toca numa palavra para a tirar.</div><div id="ol"></div></div><div class="row" style="padding:10px 16px 14px"><button class="btn primary" id="ap">Juntar as palavras</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const ol = $('#ol', sheet);
  found.forEach(fx => {
    const row = el(`<div class="ocr-r"><div class="dim sm"><img src="${imgUrl(p, fx.s.f)}"></div><div class="chips" style="flex:1"></div></div>`);
    const ch = $('.chips', row);
    const draw = () => { ch.innerHTML = fx.words.map((w, i) => `<button class="mchip ${fx.on[i] ? 'on' : ''}" data-i="${i}">${esc(w)}</button>`).join(''); $$('.mchip', ch).forEach(b => b.onclick = () => { fx.on[+b.dataset.i] = !fx.on[+b.dataset.i]; draw(); }); };
    draw();
    ol.appendChild(row);
  });
  $('#ap', sheet).onclick = () => {
    let n = 0;
    const pk = packOf(p.id);
    for (const fx of found) {
      const s = pk.stickers.find(x => x.f === fx.s.f); if (!s) continue;
      s.words = s.words || [];
      fx.words.forEach((w, i) => { if (fx.on[i] && !s.words.some(y => norm(y) === norm(w))) { s.words.push(w); n++; } });
    }
    savePack(pk);
    closeOverlay(ov); render();
    toast(`${n} palavra${n === 1 ? '' : 's'} juntada${n === 1 ? '' : 's'} ✓`);
  };
}

/* ---------- limpar a pasta: o que já está na app sai da pasta ---------- */
// a app guarda a sua própria cópia, por isso o ficheiro original pode ir embora
const folderDeleteOn = () => S.data.folderDelete !== false;
async function cleanupFolder(uris, quiet) {
  if (!uris || !uris.length) return 0;
  const r = uris.length > 15
    ? await runBulk(`A apagar da pasta ${uris.length} que já estão na app…`, () => A.deleteDocsAsync(JSON.stringify(uris)))
    : { n: A.deleteDocs(JSON.stringify(uris)) };
  const n = r.n || 0;
  if (S.ffiles) { const gone = new Set(uris); S.ffiles = S.ffiles.filter(x => !gone.has(x.uri)); }
  if (n && !quiet) toast(`🧹 ${n} apagado${n === 1 ? '' : 's'} da pasta (já ${n === 1 ? 'está' : 'estão'} na app)`, 2600);
  return n;
}

/* ---------- o que o teclado aprendeu ---------- */
const HOURS = ['de madrugada', 'de manhã cedo', 'de manhã', 'à tarde', 'ao fim da tarde', 'à noite'];
function habitText(s) {
  const u = s.uses || 0;
  if (!u) return '';
  const h = s.hrs || [];
  const tot = h.reduce((a, x) => a + (x || 0), 0);
  let best = -1, bv = 0;
  h.forEach((v, i) => { if (v > bv) { bv = v; best = i; } });
  const when = tot >= 3 && bv / tot >= 0.34 ? ` · mais ${HOURS[best]}` : '';
  return `Mandaste-o ${u}×${when}`;
}
function learnBlock(s) {
  const L = Match.learned(s);
  const hab = habitText(s);
  if (!L.length && !hab) return '';
  const dots = e => '●'.repeat(Math.max(1, Math.min(4, Math.ceil(e / 2)))) + '○'.repeat(4 - Math.max(1, Math.min(4, Math.ceil(e / 2))));
  return `<div class="row" style="margin-top:16px;justify-content:space-between"><div class="sec" style="margin:0">🧠 O teclado aprendeu</div>${L.length ? '<button class="btn sm ghost" id="lforget">Esquecer tudo</button>' : ''}</div>
    ${hab ? `<div class="hint" style="margin:4px 0 8px">${esc(hab)}</div>` : ''}
    ${L.length ? `<div class="words" id="lw">${L.slice(0, 30).map(l => `<button class="lchip" data-w="${esc(l.w)}">${esc(l.w)} <span class="ld">${dots(l.eff)}</span></button>`).join('')}</div>
    <div class="hint" style="margin-top:6px">Palavras que escreves antes de mandar este sticker. Ganham força quando as usas e vão perdendo se deixares de as usar. Toca numa para a tornar fixa ou esquecer.</div>` : ''}`;
}
function learnCard() {
  let nW = 0, nS = 0;
  S.data.packs.forEach(p => p.stickers.forEach(s => { const n = Match.learned(s).length; if (n) { nS++; nW += n; } }));
  const on = S.data.learnOn !== false;
  const c = el(`<div class="card" style="margin-bottom:12px"><div class="opt" style="padding:0;border:0"><div class="t"><b>🧠 Aprender com o que escreves</b><div class="small muted">${on ? `Já aprendi ${nW} palavra${nW === 1 ? '' : 's'} em ${nS} sticker${nS === 1 ? '' : 's'}.` : 'Desligado: o teclado não aprende nada novo.'}</div></div><button class="sw ${on ? 'on' : ''}" id="lon"></button></div>
    <div class="hint" style="margin-top:8px">Cada vez que mandas um sticker, o teclado guarda as palavras que escreveste antes (e pares como «boa noite»). Dá prioridade aos que usas mais e à hora a que os costumas usar. Se deixares de usar uma palavra para um sticker, ela vai perdendo força até desaparecer. Se escolheres outro em vez dos primeiros sugeridos, esses descem para essa palavra.</div>
    ${nW ? '<button class="btn sm ghost" id="lall" style="margin-top:10px">Esquecer tudo o que aprendi</button>' : ''}</div>`);
  $('#lon', c).onclick = () => { try { S.data = JSON.parse(A.setOption('learnOn', !on)); } catch (e) {} render(); };
  const la = $('#lall', c);
  if (la) la.onclick = async () => {
    if (!await confirmBox('Esquecer tudo?', 'Todas as palavras aprendidas e os hábitos (quantas vezes e a que horas) são apagados. As tuas palavras fixas e os emojis ficam.', 'Esquecer tudo')) return;
    try { const d = JSON.parse(A.forgetLearned('', '', '')); if (!d.error) S.data = d; } catch (e) {}
    toast('Esqueci tudo'); render();
  };
  return c;
}
/* ---------- stickers repetidos ---------- */
function ignoredDupes() { try { return new Set(JSON.parse(localStorage.getItem('dupIgnore') || '[]')); } catch (e) { return new Set(); } }
function ignoreDupe(sig) { try { const s = ignoredDupes(); s.add(sig); localStorage.setItem('dupIgnore', JSON.stringify([...s].slice(-500))); } catch (e) {} }
const dupKey = x => x.uri ? 'u:' + x.uri : x.p + '/' + x.f;
const dupSig = g => g.items.map(dupKey).sort().join('|');

function findDupes(folderFiles) {
  busy('A comparar os stickers…');
  if (folderFiles) A.findFolderDupes(JSON.stringify(folderFiles.map(x => ({ uri: x.uri, size: x.size || 0, time: x.time || 0 }))));
  else A.findDupes();
}

function showDupes(r) {
  busy(null);
  reload();
  const folder = !!r.folder;
  const ign = ignoredDupes();
  let groups = (r.groups || []).filter(g => !ign.has(dupSig(g)));
  // os iguais primeiro
  groups.sort((a, b) => (a.level === 'same' ? 0 : 1) - (b.level === 'same' ? 0 : 1));
  const tags = x => { const s = stRef(x); return s ? (s.s.emojis || []).length + (s.s.words || []).length : -1; };
  groups.forEach(g => {
    if (folder) {
      const docs = g.items.filter(x => x.uri);
      g.keep = g.items.some(x => !x.uri) ? null : dupKey(docs[0]);
    } else {
      const best = g.items.slice().sort((a, b) => tags(b) - tags(a) || ((packOf(b.p) && !isKb(packOf(b.p))) ? 1 : 0) - ((packOf(a.p) && !isKb(packOf(a.p))) ? 1 : 0))[0];
      g.keep = dupKey(best);
    }
  });
  let changed = false;
  const sheet = el(`<div class="sheet"><div class="hd"><h3>👯 Repetidos${folder ? ' na pasta' : ''}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd" id="db"></div></div>`);
  const ov = openOverlay(sheet, { onClose: () => { if (changed) { if (S.folder) S.ffiles = null; render(); } } });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const bd = $('#db', sheet);
  const thumb = x => {
    if (x.uri) return `<img loading="lazy" src="d/${encodeURIComponent(x.uri)}">`;
    const s = stRef(x); return s ? `<img loading="lazy" src="${imgUrl(s.p, s.s.f)}">` : '❔';
  };
  const label = x => {
    if (x.uri) return 'na pasta';
    const s = stRef(x); if (!s) return '';
    const t = tags(x);
    return `${esc(s.p.name)}${t > 0 ? ` · ${t} tag${t > 1 ? 's' : ''}` : ''}`;
  };
  // aplica a ação de um grupo; devolve true se correu bem
  async function act(g) {
    if (folder) {
      const del = g.items.filter(x => x.uri && dupKey(x) !== g.keep).map(x => x.uri);
      if (!del.length) return true;
      const n = A.deleteDocs(JSON.stringify(del));
      if (n) changed = true;
      return n > 0;
    }
    const keep = g.items.find(x => dupKey(x) === g.keep);
    const others = g.items.filter(x => x !== keep && !x.uri);
    let d;
    try { d = JSON.parse(A.mergeStickers(keep.p, keep.f, JSON.stringify(others))); } catch (e) { d = { error: 'erro' }; }
    if (d.error) { toast(d.error); return false; }
    S.data = d; changed = true;
    return true;
  }
  function draw() {
    bd.innerHTML = '';
    if (!groups.length) {
      bd.appendChild(el(`<div class="empty" style="padding:30px 10px"><div class="big">🎉</div><h2>Nada repetido</h2><div>Comparei ${r.total || 0} sticker${r.total === 1 ? '' : 's'} pela imagem e não encontrei repetidos.</div></div>`));
      return;
    }
    const nSame = groups.filter(g => g.level === 'same').length;
    bd.appendChild(el(`<div class="hint" style="margin-bottom:10px">${folder
      ? 'Comparei as imagens desta pasta entre si e com os stickers da app. O ★ fica; os outros ficheiros da pasta são apagados. Os stickers da app nunca são apagados aqui.'
      : 'Comparei as imagens de todos os packs. Toca no sticker que queres manter (★). Os outros são apagados e as tags deles passam para o que fica.'}</div>`));
    if (nSame > 1) {
      const all = el(`<button class="btn primary block" style="margin-bottom:12px">${folder ? `Apagar os repetidos iguais (${nSame} grupos)` : `Juntar todos os iguais (${nSame} grupos)`}</button>`);
      all.onclick = async () => {
        if (!await confirmBox(folder ? 'Apagar os repetidos iguais?' : 'Juntar todos os iguais?', folder ? 'Em cada grupo fica o ★ e os outros ficheiros são apagados da pasta.' : 'Em cada grupo fica o ★ e os outros são apagados (as tags passam para o que fica).', folder ? 'Apagar' : 'Juntar')) return;
        let ok = 0;
        const todo = groups.filter(g => g.level === 'same');
        for (let k = 0; k < todo.length; k++) {
          busy(`A resolver ${k + 1} de ${todo.length}…`); await nextFrame();
          if (await act(todo[k])) { ok++; todo[k].done = true; }
        }
        busy(null);
        groups = groups.filter(g => !g.done);
        toast(`${ok} grupo${ok === 1 ? '' : 's'} resolvido${ok === 1 ? '' : 's'} ✓`);
        draw();
      };
      bd.appendChild(all);
    }
    groups.forEach(g => {
      const inApp = folder && g.items.some(x => !x.uri);
      const c = el(`<div class="card dg"><div class="row" style="margin-bottom:8px"><span class="dtag ${g.level}">${g.level === 'same' ? 'Iguais' : 'Parecidos · talvez'}</span><span class="small muted" style="flex:1">${inApp ? 'já tens na app' : g.items.length + ' stickers'}</span></div><div class="ditems"></div><div class="row" style="margin-top:10px"><button class="btn sm ghost" data-a="ign">${g.level === 'same' ? 'Não são iguais' : 'Não são'}</button><button class="btn sm ${g.level === 'same' ? 'primary' : ''}" data-a="go">${folder ? (inApp ? 'Apagar da pasta' : 'Apagar os outros') : 'Juntar'}</button></div></div>`);
      const it = $('.ditems', c);
      g.items.forEach(x => {
        const k = dupKey(x);
        const canKeep = !(folder && !x.uri);
        const b = el(`<button class="di ${k === g.keep ? 'keep' : ''} ${folder && !x.uri ? 'app' : ''}"><div class="dim">${thumb(x)}${k === g.keep ? '<span class="ks">★</span>' : ''}${x.anim ? '<span class="an">🎞️</span>' : ''}</div><div class="dl">${folder && !x.uri ? '📦 na app' : label(x)}</div></button>`);
        b.onclick = () => { if (!canKeep) return; g.keep = k; draw(); };
        it.appendChild(b);
      });
      c.querySelector('[data-a=ign]').onclick = () => { ignoreDupe(dupSig(g)); groups = groups.filter(x => x !== g); draw(); };
      c.querySelector('[data-a=go]').onclick = async () => {
        if (g.level !== 'same' && !await confirmBox('Tens a certeza?', 'Estes só são parecidos. Confirma que são mesmo o mesmo sticker.', folder ? 'Apagar' : 'Juntar')) return;
        if (await act(g)) { groups = groups.filter(x => x !== g); toast(folder ? 'Apagado da pasta ✓' : 'Juntado ✓'); draw(); }
      };
      bd.appendChild(c);
    });
  }
  draw();
}

/* ---------- stickers especiais ---------- */
const SP_TYPES = {
  seq: { icon: '⏱️', name: 'Sequência', desc: 'Mandas um e os seguintes vão sozinhos, com o tempo que escolheres entre eles.' },
  reply: { icon: '💬', name: 'Resposta', desc: 'Mandas uma pergunta e, quando a pessoa responder qualquer coisa, vai o sticker seguinte.' },
  choice: { icon: '🔢', name: 'Escolha', desc: 'Pergunta com opções (1, 2, 3…): o StickTag lê a resposta e manda o sticker certo.' },
  random: { icon: '🎲', name: 'Ao calhas', desc: 'Mandas um e, passado um bocado, vai um ao calhas de uma lista (dado, bola mágica…).' },
  quiz: { icon: '🧠', name: 'Quiz', desc: 'Várias perguntas seguidas. No fim vai um sticker conforme a pessoa acertou muito ou pouco.' },
  game: { icon: '🎮', name: 'Jogo', desc: 'Pedra, papel, tesoura ou um jogo teu: a pessoa escolhe, o StickTag joga ao calhas e diz quem ganhou.' },
  nudge: { icon: '🔔', name: 'Insistente', desc: 'Se a pessoa não responder, manda outro sticker de minuto a minuto (até acabar a lista).' },
  typing: { icon: '💭', name: 'A escrever…', desc: 'Um sticker que parece que estás a escrever… e depois vem a piada.' },
  secret: { icon: '🤫', name: 'Não cliques', desc: 'Quem tocar no sticker vê uma mensagem tua escondida no nome do pack.' }
};
const specials = () => S.data.specials || [];
const stRef = x => { const p = x && packOf(x.p); const s = p && p.stickers.find(q => q.f === x.f); return s ? { p, s } : null; };
const refImg = x => { const r = stRef(x); return r ? imgUrl(r.p, r.s.f) : ''; };
function saveSpecials(list) {
  try { const d = JSON.parse(A.setSpecials(JSON.stringify(list))); if (d.error) return toast(d.error); S.data = d; } catch (e) { toast('Erro a guardar'); }
}
function spSummary(sp) {
  const n = a => (a || []).filter(stRef).length;
  if (sp.type === 'seq') return `${n(sp.steps) + 1} stickers seguidos`;
  if (sp.type === 'reply') return `Responde com ${n(sp.then)} sticker${n(sp.then) === 1 ? '' : 's'}${sp.noReply && sp.noReply.secs ? ` · sem resposta em ${sp.noReply.secs} s: ${n(sp.noReply.stickers)}` : ''}`;
  if (sp.type === 'choice') return `${(sp.options || []).length} opções${n(sp.other) ? ' + outra resposta' : ''}${sp.noReply && sp.noReply.secs ? ` · sem resposta em ${sp.noReply.secs} s` : ''}`;
  if (sp.type === 'random') return `Um ao calhas de ${n(sp.pool)}`;
  if (sp.type === 'quiz') return `${(sp.questions || []).length} pergunta${(sp.questions || []).length === 1 ? '' : 's'}`;
  if (sp.type === 'game') return `${(sp.moves || []).length} jogadas`;
  if (sp.type === 'nudge') return `Insiste até ${n(sp.nudges)} vez${n(sp.nudges) === 1 ? '' : 'es'}, de ${sp.every || 60} em ${sp.every || 60} s`;
  if (sp.type === 'typing') return `Piada ao fim de ${String((sp.steps[0] || {}).d || 3).replace('.', ',')} s`;
  return '';
}

function viewSpecials() {
  const v = el('<section class="view"></section>');
  v.appendChild(el(`<div class="top"><div style="flex:1;min-width:0"><h1>Especiais</h1><div class="sub">Stickers que fazem coisas sozinhos</div></div></div>`));
  let bs = {};
  try { bs = JSON.parse(A.bubbleStatus()); } catch (e) {}
  if (!bs.enabled) {
    const w = el(`<div class="card warn" style="margin-bottom:12px"><b>Liga a bolha primeiro</b><div class="hint" style="margin:4px 0 10px">É ela que lê a conversa (para as respostas) e que envia os stickers seguintes mesmo quando voltas ao teu teclado.</div><button class="btn sm primary">Ir ao separador Teclado</button></div>`);
    w.querySelector('button').onclick = () => go('kb');
    v.appendChild(w);
  }
  v.appendChild(ecoCard());
  const list = specials();
  const secrets = [];
  S.data.packs.forEach(p => p.stickers.forEach(s => { if (s.secretName || s.secretPub) secrets.push({ p, s }); }));
  if (!list.length && !secrets.length) {
    v.appendChild(el(`<div class="empty"><div class="big">⚡</div><h2>Ainda não tens especiais</h2><div>Cria sequências, perguntas que respondem sozinhas ou stickers com mensagens escondidas.</div></div>`));
  }
  if (list.length) v.appendChild(el('<div class="sect">Os teus especiais</div>'));
  list.forEach(sp => {
    const t = SP_TYPES[sp.type] || SP_TYPES.seq;
    const ok = stRef(sp.first);
    const c = el(`<div class="pack"><div class="tray">${ok ? `<img src="${refImg(sp.first)}">` : '❔'}<span class="sp-ic">${t.icon}</span></div><div class="info"><div class="name">${esc(sp.name)}</div><div class="meta" style="margin:0">${t.name} · ${esc(spSummary(sp))}</div>${ok ? '' : '<div class="meta" style="color:var(--red);margin:2px 0 0">O primeiro sticker foi apagado</div>'}</div></div>`);
    c.onclick = () => editSpecial(JSON.parse(JSON.stringify(sp)));
    v.appendChild(c);
  });
  if (secrets.length) v.appendChild(el('<div class="sect">🤫 Mensagens escondidas</div>'));
  secrets.forEach(({ p, s }) => {
    const c = el(`<div class="pack"><div class="tray"><img src="${imgUrl(p, s.f)}"><span class="sp-ic">🤫</span></div><div class="info"><div class="name">${esc(s.secretName || '')}</div><div class="meta" style="margin:0">${esc(s.secretPub || '')}${s.secretPub ? ' · ' : ''}pack ${esc(p.name)}</div></div></div>`);
    c.onclick = () => editSecret({ p: p.id, f: s.f });
    v.appendChild(c);
  });
  if (list.length) {
    const lg = el(`<button class="btn sm ghost block" style="margin-top:14px">🔍 Ver o registo (o que o StickTag leu da conversa)</button>`);
    lg.onclick = showSpecialLog;
    v.appendChild(lg);
  }
  v.appendChild(el(`<div class="note">Como funciona: no teclado de stickers e na bolha aparece o separador ⚡. Tocas num especial e ele manda o 1.º sticker. Se escreveres, enviares outro sticker ou mudares de conversa, o especial é cancelado. Só funciona com o WhatsApp (e apps que aceitam stickers do teclado) aberto na conversa.</div>`));
  v.appendChild(el('<div style="height:84px"></div>'));
  const fab = el(`<button class="fab">${ICON.plus}Novo especial</button>`);
  fab.onclick = newSpecial;
  v.appendChild(fab);
  return v;
}

/* ---------- Eco: responde sozinho a palavras ---------- */
const ecoData = () => S.data.eco || { on: false, rules: [] };
function saveEco(e) {
  try { const d = JSON.parse(A.setEco(JSON.stringify(e))); if (d.error) return toast(d.error); S.data = d; } catch (er) { toast('Erro a guardar'); }
}
function ecoCard() {
  const e = ecoData();
  const c = el(`<div class="card eco"><div class="opt" style="padding:0;border:0"><div class="t"><b>🔁 Eco</b><div class="small muted">Quando alguém te escreve certas palavras, o StickTag responde sozinho com um sticker ao calhas.</div></div><button class="sw ${e.on ? 'on' : ''}" id="eco-on"></button></div><div class="eco-rules"></div><button class="btn sm ghost block" id="eco-add" style="margin-top:10px">＋ Nova palavra</button></div>`);
  const rl = $('.eco-rules', c);
  (e.rules || []).forEach(r => {
    const imgs = (r.stickers || []).filter(stRef).slice(0, 4).map(x => `<img src="${refImg(x)}">`).join('');
    const it = el(`<button class="eco-r ${r.off ? 'off' : ''}"><div class="w">«${esc(r.words)}»</div><div class="ims">${imgs}${(r.stickers || []).length > 4 ? `<span>+${r.stickers.length - 4}</span>` : ''}</div>${r.chats ? `<div class="small muted">só: ${esc(r.chats)}</div>` : ''}</button>`);
    it.onclick = () => editEcoRule(JSON.parse(JSON.stringify(r)));
    rl.appendChild(it);
  });
  $('#eco-on', c).onclick = ev => {
    const d = ecoData();
    if (!d.on && !(d.rules || []).length) { editEcoRule(null); return; }
    d.on = !d.on; saveEco(d); ev.currentTarget.classList.toggle('on', d.on);
    toast(d.on ? 'Eco ligado 🔁' : 'Eco desligado');
  };
  $('#eco-add', c).onclick = () => editEcoRule(null);
  return c;
}
function editEcoRule(r) {
  const isNew = !r;
  r = r || { id: 'e' + Date.now().toString(36), words: '', stickers: [], chats: '' };
  const sheet = el(`<div class="sheet"><div class="hd"><h3>🔁 Eco</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <label class="field"><span>Quando a pessoa escrever (separa com vírgulas)</span><input class="input" id="ew" value="${esc(r.words)}" placeholder="Ex.: te amo, amo-te"></label>
    <div class="field"><span>Responde com um destes ao calhas</span><div id="esl"></div><button class="btn sm block" id="eauto" style="margin-top:10px">✨ Juntar os meus stickers com estas palavras</button></div>
    <label class="field"><span>Só nestas conversas (opcional, separa com vírgulas)</span><input class="input" id="ec" value="${esc(r.chats || '')}" placeholder="Ex.: Ana, Grupo da malta (vazio = todas)"></label>
    <div class="opt" style="padding:4px 2px 12px"><div class="t"><b>Ligada</b><div class="small muted">Desliga só esta palavra sem a apagar</div></div><button class="sw ${r.off ? '' : 'on'}" id="eon"></button></div>
    <div class="note" style="margin-top:0">Só funciona com a conversa aberta no ecrã e a bolha ligada. Não responde mais do que uma vez a cada 20 segundos à mesma palavra na mesma conversa.</div>
    </div><div class="row" style="padding:10px 16px 14px">${isNew ? '' : '<button class="btn danger" id="edl" style="flex:none;width:52px;padding:0">🗑️</button>'}<button class="btn primary" id="esv">Guardar</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const list = r.stickers;
  const holder = $('#esl', sheet);
  const drawList = () => {
    holder.innerHTML = '';
    const w = el('<div class="splist"></div>');
    list.forEach((x, i) => {
      const it = el(`<div class="spi"><div class="spim">${stRef(x) ? `<img src="${refImg(x)}">` : '❔'}<button class="spx">×</button></div></div>`);
      $('.spx', it).onclick = () => { list.splice(i, 1); drawList(); };
      w.appendChild(it);
    });
    const add = el(`<button class="spadd"><span>＋</span>Sticker</button>`);
    add.onclick = async () => { const x = await pickSticker('Escolhe um sticker'); if (x) { list.push(x); drawList(); } };
    w.appendChild(add);
    holder.appendChild(w);
  };
  drawList();
  $('#eauto', sheet).onclick = () => {
    const words = $('#ew', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
    if (!words.length) return toast('Escreve primeiro as palavras');
    const idx = Match.buildIndex(Match.modeData(S.data), emoInfo);
    let n = 0;
    for (const w of words) for (const res of Match.search(idx, w, 40)) {
      if (list.some(x => x.p === res.p.id && x.f === res.s.f) || list.length >= 40) continue;
      list.push({ p: res.p.id, f: res.s.f }); n++;
    }
    drawList();
    toast(n ? `${n} sticker${n > 1 ? 's' : ''} juntado${n > 1 ? 's' : ''}` : 'Nenhum sticker tem estas palavras (dá-lhes tags primeiro)');
  };
  let off = !!r.off;
  $('#eon', sheet).onclick = ev => { off = !off; ev.currentTarget.classList.toggle('on', !off); };
  const dl = $('#edl', sheet);
  if (dl) dl.onclick = async () => {
    if (!await confirmBox('Apagar esta palavra?', '', 'Apagar')) return;
    const e = ecoData(); e.rules = (e.rules || []).filter(x => x.id !== r.id); if (!e.rules.length) e.on = false;
    saveEco(e); closeOverlay(ov); render();
  };
  $('#esv', sheet).onclick = () => {
    r.words = $('#ew', sheet).value.trim();
    r.chats = $('#ec', sheet).value.trim();
    if (off) r.off = true; else delete r.off;
    if (!r.words) return toast('Escreve as palavras');
    if (!list.length) return toast('Escolhe pelo menos um sticker');
    const e = ecoData(); e.rules = (e.rules || []).slice();
    const i = e.rules.findIndex(x => x.id === r.id);
    if (i >= 0) e.rules[i] = r; else { e.rules.push(r); e.on = true; }
    saveEco(e); closeOverlay(ov); toast(isNew ? 'Eco ligado para «' + r.words + '» 🔁' : 'Guardado'); render();
  };
}

async function newSpecial() {
  const html = `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:62vh;overflow-y:auto">${Object.entries(SP_TYPES).map(([k, t]) => `<button class="pack" data-k="${k}" style="margin:0;text-align:left;align-items:flex-start"><div style="font-size:26px;line-height:1.2">${t.icon}</div><div class="info"><div class="name">${t.name}</div><div class="meta" style="margin:2px 0 0;white-space:normal">${t.desc}</div></div></button>`).join('')}</div>`;
  let chosen = null;
  const pr = dialog({ title: 'Que tipo de especial?', html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }] });
  setTimeout(() => $$('.dialog .pack[data-k]').forEach(b => b.onclick = () => { chosen = b.dataset.k; closeOverlay(); }), 0);
  await pr;
  if (!chosen) return;
  if (chosen === 'secret') {
    const x = await pickSticker('Escolhe o sticker «não cliques»');
    if (x) editSecret(x);
    return;
  }
  const base = { id: 'sp' + Date.now().toString(36), type: chosen, name: '', first: null };
  if (chosen === 'seq') base.steps = [];
  if (chosen === 'reply') Object.assign(base, { then: [], replyDelay: 1, maxWait: 300, noReply: { secs: 0, stickers: [] } });
  if (chosen === 'choice') Object.assign(base, { options: [{ answers: '1', stickers: [] }, { answers: '2', stickers: [] }], other: [], replyDelay: 1, maxWait: 300, noReply: { secs: 0, stickers: [] } });
  if (chosen === 'random') Object.assign(base, { pool: [], delay: 2 });
  if (chosen === 'quiz') Object.assign(base, { questions: [{ sticker: null, answers: '' }, { sticker: null, answers: '' }], right: [], wrong: [], resAll: [], resHalf: [], resLow: [], qDelay: 2, replyDelay: 1, maxWait: 300 });
  if (chosen === 'game') Object.assign(base, { moves: [], iwin: [], youwin: [], draw: [], replyDelay: 1, maxWait: 300 });
  if (chosen === 'nudge') Object.assign(base, { nudges: [], every: 60, then: [], replyDelay: 1 });
  if (chosen === 'typing') Object.assign(base, { steps: [] });
  editSpecial(base, true);
}

/* cria um sticker animado «a escrever…» (balão com três pontos a saltar) */
async function makeTypingSticker(packId) {
  try {
    busy('A desenhar o sticker…');
    const mod = await import('./webp/index.js');
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const c = cv.getContext('2d');
    const N = 18, frames = [];
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    for (let i = 0; i < N; i++) {
      c.clearRect(0, 0, 512, 512);
      c.save();
      c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      c.fillStyle = '#ECEDEF';
      rr(76, 166, 360, 170, 85); c.fill();
      c.beginPath(); c.arc(98, 330, 30, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(64, 372, 15, 0, Math.PI * 2); c.fill();
      c.restore();
      for (let k = 0; k < 3; k++) {
        const ph = ((i / N) - k * 0.16 + 1) % 1;
        const up = ph < 0.35 ? Math.sin(ph / 0.35 * Math.PI) : 0;
        c.fillStyle = `rgba(110,114,122,${0.45 + 0.55 * up})`;
        c.beginPath(); c.arc(176 + k * 80, 251 - up * 26, 26, 0, Math.PI * 2); c.fill();
      }
      frames.push({ data: new Uint8Array(c.getImageData(0, 0, 512, 512).data.buffer.slice(0)), duration: 70, config: { lossless: 0, quality: 75 } });
    }
    busy('A criar o sticker…');
    const out = await mod.encodeAnimation(512, 512, true, frames);
    let bin = '';
    for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
    const r = JSON.parse(A.saveCreated(packId, 'data:image/webp;base64,' + btoa(bin), JSON.stringify(['a escrever'])));
    busy(null);
    if (r.error) { toast(r.error, 3500); return null; }
    S.data = r.data;
    return { p: packId, f: r.file };
  } catch (e) {
    busy(null);
    toast('Não consegui criar: ' + (e.message || e));
    return null;
  }
}

/* escolher um sticker de qualquer pack */
const refList = x => !x ? [] : Array.isArray(x) ? x : [x];

/*
 * Escolher sticker(s). Dos packs (um) ou, com opts.multi, também novos da galeria ou das pastas:
 * esses ficam ESCONDIDOS no pack opts.hostPack (só existem dentro do especial).
 */
function pickSticker(title, opts = {}) {
  return new Promise(res => {
    const packs = S.data.packs.filter(p => visible(p).length);
    if (!packs.length && !opts.multi) { toast('Ainda não tens stickers'); return res(null); }
    let cur = S.pickPack && packOf(S.pickPack) && visible(packOf(S.pickPack)).length ? S.pickPack : (packs[0] && packs[0].id), done = false;
    const sheet = el(`<div class="sheet"><div class="hd"><h3>${esc(title)}</h3><button class="iconbtn" id="x">${ICON.close}</button></div>
      ${opts.multi ? `<div class="pk-new"><button class="btn sm" id="pg">📥 Da galeria</button><button class="btn sm" id="pf">📁 Das pastas</button></div><div class="hint" style="padding:0 16px 8px">Os novos ficam escondidos: só existem dentro deste especial.</div>` : ''}
      <div class="pk-packs"></div><div class="bd"><div class="pk-grid2"></div></div></div>`);
    const ov = openOverlay(sheet, { onClose: () => { if (!done) res(null); } });
    $('#x', sheet).onclick = () => closeOverlay(ov);
    const finish = v => { done = true; closeOverlay(ov); res(v); };
    function draw() {
      if (!cur) { $('.pk-grid2', sheet).innerHTML = '<div class="hint">Ainda não tens stickers nos packs.</div>'; return; }
      $('.pk-packs', sheet).innerHTML = packs.map(p => `<button data-id="${esc(p.id)}" class="${p.id === cur ? 'on' : ''}"><img src="${trayUrl(p)}"><span>${esc(p.name)}</span></button>`).join('');
      $$('.pk-packs button', sheet).forEach(b => b.onclick = () => { cur = b.dataset.id; S.pickPack = cur; draw(); });
      const p = packOf(cur);
      const g = $('.pk-grid2', sheet); g.innerHTML = '';
      progressive(g, visible(p), st => { const b = el(`<button data-f="${esc(st.f)}"><img loading="lazy" class="${hideAdult(p, st) ? 'nsfw' : ''}" src="${imgUrl(p, st.f)}"></button>`); b.onclick = () => finish({ p: cur, f: st.f }); return b; });
    }
    draw();
    if (!opts.multi) return;
    const target = async () => opts.hostPack || await choosePack('Onde guardar os stickers escondidos?');
    $('#pg', sheet).onclick = async () => {
      const pid = await target(); if (!pid) return;
      const r = await hiddenImport(() => A.pickImagesHidden(pid));
      if (r && r.length) finish(r.map(f => ({ p: pid, f })));
    };
    $('#pf', sheet).onclick = async () => {
      const pid = await target(); if (!pid) return;
      const uris = await pickFromFolders();
      if (!uris || !uris.length) return;
      const r = await hiddenImport(() => A.importDocsHidden(pid, JSON.stringify(uris)));
      if (r && r.length) finish(r.map(f => ({ p: pid, f })));
    };
  });
}

/* importa para escondido e espera pela resposta do lado nativo; devolve os ficheiros criados */
function hiddenImport(start) {
  return new Promise(res => {
    S.hiddenCb = r => {
      S.hiddenCb = null; busy(null); reload();
      if (!r || r.cancelled) return res(null);
      if (r.errors && r.errors.length) toast(`${r.errors.length} não entrou: ${r.errors[0].error}`, 3200);
      res(r.added || []);
    };
    busy('A juntar…');
    start();
  });
}

/* escolher vários ficheiros de uma pasta do telemóvel */
function pickFromFolders() {
  return new Promise(res => {
    const fs = S.data.folders || [];
    if (!fs.length) { toast('Ainda não juntaste pastas (Packs › 📁 Pastas)'); return res(null); }
    let folder = null, files = [], sel = new Set(), done = false;
    const sheet = el(`<div class="sheet"><div class="hd"><button class="iconbtn" id="bk" style="display:none">${ICON.back}</button><h3 id="tt">Escolhe a pasta</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd" id="fb"></div><div class="row hidden" id="ft" style="padding:10px 16px 14px"><button class="btn primary" id="ok">Juntar</button></div></div>`);
    const ov = openOverlay(sheet, { onClose: () => { if (!done) res(null); } });
    $('#x', sheet).onclick = () => closeOverlay(ov);
    const bd = $('#fb', sheet);
    function drawFolders() {
      folder = null; sel.clear();
      $('#tt', sheet).textContent = 'Escolhe a pasta'; $('#bk', sheet).style.display = 'none'; $('#ft', sheet).classList.add('hidden');
      bd.innerHTML = '';
      fs.forEach(f => {
        const c = el(`<button class="pack" style="width:100%;text-align:left"><div class="tray" style="font-size:26px">📁</div><div class="info"><div class="name">${esc(f.name)}</div></div></button>`);
        c.onclick = () => openFolder(f);
        bd.appendChild(c);
      });
    }
    function openFolder(f) {
      bd.innerHTML = '<div class="loading"><div class="spin"></div><b>A ler a pasta…</b></div>';
      S.flistCb = r => {
        if (!r || !r.ok) { toast((r && r.error) || 'erro'); drawFolders(); return; }
        folder = f; files = r.files.sort((a, b) => (b.time || 0) - (a.time || 0));
        $('#tt', sheet).textContent = f.name; $('#bk', sheet).style.display = ''; $('#ft', sheet).classList.remove('hidden');
        drawFiles();
      };
      A.listFolderAsync(f.uri);
    }
    // os números de ordem atualizam-se sem redesenhar a grelha toda
    function markSel(g) {
      const order = [...sel];
      $$('button[data-u]', g).forEach(b => {
        const i = order.indexOf(b.dataset.u);
        b.classList.toggle('psel', i >= 0);
        let pn = b.querySelector('.pn');
        if (i >= 0) { if (!pn) { pn = document.createElement('span'); pn.className = 'pn'; b.appendChild(pn); } pn.textContent = i + 1; } else if (pn) pn.remove();
      });
      $('#ok', sheet).textContent = sel.size ? `Juntar ${sel.size}` : 'Toca para escolher (pela ordem)';
    }
    function drawFiles() {
      bd.innerHTML = '';
      const g = el('<div class="pk-grid2"></div>');
      progressive(g, files, x => {
        const b = el(`<button data-u="${esc(x.uri)}"><img loading="lazy" src="d/${encodeURIComponent(x.uri)}"></button>`);
        b.onclick = () => { sel.has(x.uri) ? sel.delete(x.uri) : sel.add(x.uri); markSel(g); };
        return b;
      });
      bd.appendChild(g);
      markSel(g);
    }
    $('#bk', sheet).onclick = drawFolders;
    $('#ok', sheet).onclick = () => { if (!sel.size) return; done = true; closeOverlay(ov); res([...sel]); };
    drawFolders();
  });
}

/* todos os stickers que um especial usa, menos o 1.º */
function subRefs(sp) {
  const out = [], seen = new Set();
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (typeof o.p === 'string' && typeof o.f === 'string') {
      const k = o.p + '/' + o.f;
      if (!(sp.first && sp.first.p === o.p && sp.first.f === o.f) && !seen.has(k)) { seen.add(k); out.push({ p: o.p, f: o.f }); }
      return;
    }
    for (const k in o) if (k !== 'first') walk(o[k]);
  };
  walk(sp);
  return out;
}
const specialsOf = (pid, f) => specials().filter(sp => sp.first && sp.first.p === pid && sp.first.f === f);

/* apaga um especial; pergunta o que fazer aos stickers que só existiam dentro dele */
async function deleteSpecial(sp) {
  const others = specials().filter(x => x.id !== sp.id);
  const usedElsewhere = new Set(others.flatMap(x => subRefs(x).concat(x.first ? [x.first] : [])).map(dupKey));
  const orphans = subRefs(sp).filter(x => { const r = stRef(x); return r && r.s.hidden && !usedElsewhere.has(dupKey(x)); });
  let what = 'keep';
  if (orphans.length) {
    what = await dialog({ title: 'Apagar este especial?', text: `Tem ${orphans.length} sticker${orphans.length > 1 ? 's' : ''} escondido${orphans.length > 1 ? 's' : ''} que só existe${orphans.length > 1 ? 'm' : ''} aqui.`, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Pôr no pack', value: 'show' }, { label: 'Apagar tudo', cls: 'danger', value: 'del' }] });
    if (!what) return false;
  } else if (!await confirmBox('Apagar este especial?', 'Os stickers continuam nos teus packs.')) return false;
  saveSpecials(others);
  for (const x of orphans) {
    try {
      const d = JSON.parse(what === 'del' ? (A.deleteSticker(x.p, x.f), A.getData()) : A.setStickerFlag(x.p, x.f, 'hidden', false));
      if (!d.error) S.data = d;
    } catch (e) {}
  }
  reload();
  toast('Especial apagado');
  return true;
}

/*
 * Secção "⚡ Especial" para pôr dentro do editor de um sticker ou do criador.
 * getMain() = {p,f} do sticker (null se ainda não existe: o criador só o guarda no fim).
 * Devolve { pending(): especial novo por guardar (ou null), validate() }.
 */
function specialSection(getMain, hostPack, wrap) {
  let form = null, sp = null;
  function draw() {
    wrap.innerHTML = '';
    const m = getMain();
    const mine = m ? specialsOf(m.p, m.f) : [];
    wrap.appendChild(el(`<div class="sec" style="margin-top:18px">⚡ Especial</div>`));
    mine.forEach(x => {
      const t = SP_TYPES[x.type] || SP_TYPES.seq;
      const subs = subRefs(x).filter(stRef);
      const c = el(`<div class="card spcard"><div class="row"><b style="flex:1">${t.icon} ${esc(x.name)}</b><button class="btn sm" data-e="1">Editar</button></div><div class="ditems" style="margin-top:8px">${subs.map(y => `<div class="dim sm"><img src="${refImg(y)}"></div>`).join('') || '<span class="small muted">sem outros stickers</span>'}</div></div>`);
      c.querySelector('[data-e]').onclick = () => editSpecial(JSON.parse(JSON.stringify(x)), false, draw);
      wrap.appendChild(c);
    });
    const types = Object.entries(SP_TYPES).filter(([k]) => k !== 'secret');
    const chips = el(`<div class="chips sp-types">${sp ? '' : `<span class="small muted" style="width:100%;margin-bottom:2px">${mine.length ? 'Juntar outro:' : 'Torna este sticker especial:'}</span>`}${types.map(([k, t]) => `<button class="mchip ${sp && sp.type === k ? 'on' : ''}" data-k="${k}">${t.icon} ${t.name}</button>`).join('')}${sp ? '<button class="mchip" data-k="">✕ Nenhum</button>' : ''}</div>`);
    $$('[data-k]', chips).forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      sp = k ? newSpecialData(k) : null;
      if (sp && m) sp.first = m;
      draw();
      if (sp) setTimeout(() => wrap.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    });
    wrap.appendChild(chips);
    form = null;
    if (sp) {
      wrap.appendChild(el(`<div class="hint" style="margin:8px 0 10px">${SP_TYPES[sp.type].desc}</div>`));
      const fb = el('<div class="sp-inline"></div>');
      wrap.appendChild(fb);
      form = specialForm(sp, fb, { fixedFirst: true, hostPack: m ? m.p : hostPack() });
      if (m) {
        const sv = el(`<button class="btn primary block" style="margin-top:6px">Guardar especial ⚡</button>`);
        sv.onclick = () => { const r = form.collect({}); if (!r) return; persistSpecial(r); sp = null; toast('Especial guardado ⚡'); draw(); };
        wrap.appendChild(sv);
      }
    }
  }
  draw();
  return {
    // para o criador: valida antes de guardar a imagem
    validate() { return !form || !!form.collect({ noFirst: true }); },
    // depois de o sticker existir: liga o especial a ele e guarda
    commit(main) { if (!form || !sp) return; sp.first = main; const r = form.collect({}); if (r) persistSpecial(r); },
    redraw: draw
  };
}

/* dados iniciais de um especial novo */
function newSpecialData(k) {
  const base = { id: 'sp' + Date.now().toString(36), type: k, name: '', first: null };
  if (k === 'seq' || k === 'typing') base.steps = [];
  if (k === 'reply') Object.assign(base, { then: [], replyDelay: 1, maxWait: 300, noReply: { secs: 0, stickers: [] } });
  if (k === 'choice') Object.assign(base, { options: [{ answers: '1', stickers: [] }, { answers: '2', stickers: [] }], other: [], replyDelay: 1, maxWait: 300, noReply: { secs: 0, stickers: [] } });
  if (k === 'random') Object.assign(base, { pool: [], delay: 2 });
  if (k === 'quiz') Object.assign(base, { questions: [{ sticker: null, answers: '' }, { sticker: null, answers: '' }], right: [], wrong: [], resAll: [], resHalf: [], resLow: [], qDelay: 2, replyDelay: 1, maxWait: 300 });
  if (k === 'game') Object.assign(base, { moves: [], iwin: [], youwin: [], draw: [], replyDelay: 1, maxWait: 300 });
  if (k === 'nudge') Object.assign(base, { nudges: [], every: 60, then: [], replyDelay: 1 });
  return base;
}

/*
 * Formulário de um especial dentro de um contentor (folha própria, editor do sticker ou criador).
 * opts.fixedFirst = o 1.º sticker é o que estás a editar (não aparece para escolher).
 * opts.hostPack = pack onde ficam os stickers novos escondidos (senão usa o do 1.º sticker).
 */
function specialForm(sp, bd, opts = {}) {
  const t = SP_TYPES[sp.type];
  const host = () => opts.hostPack || (sp.first && sp.first.p) || null;
  const pickOpts = () => ({ hostPack: host(), multi: true });
  const DELAYS = [0.5, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20, 30, 60];
  const delaySel = (val, cls) => `<select class="dsel ${cls || ''}">${DELAYS.map(d => `<option value="${d}" ${+val === d ? 'selected' : ''}>${String(d).replace('.', ',')} s</option>`).join('')}</select>`;
  // lista de stickers editável. withDelay = cada um tem o seu tempo
  function stickerList(arr, withDelay, addLabel) {
    const w = el('<div class="splist"></div>');
    function draw() {
      w.innerHTML = '';
      arr.forEach((x, i) => {
        const r = stRef(x);
        const it = el(`<div class="spi">${withDelay ? `<div class="spd">⏱ ${delaySel(x.d == null ? 2 : x.d)}</div>` : ''}<div class="spim">${r ? `<img src="${imgUrl(r.p, r.s.f)}">` : '❔'}<button class="spx">×</button></div></div>`);
        $('.spx', it).onclick = () => { arr.splice(i, 1); draw(); };
        const sel = $('select', it); if (sel) sel.onchange = () => { x.d = +sel.value; };
        w.appendChild(it);
      });
      const add = el(`<button class="spadd"><span>＋</span>${esc(addLabel || 'Sticker')}</button>`);
      add.onclick = async () => {
        const got = refList(await pickSticker('Escolhe um sticker', pickOpts()));
        for (const x of got) { if (withDelay) x.d = arr.length ? (arr[arr.length - 1].d || 2) : 2; arr.push(x); }
        if (got.length) draw();
      };
      w.appendChild(add);
    }
    draw();
    return w;
  }
  function firstPicker() {
    const w = el(`<div class="spfirst"></div>`);
    function draw() {
      const r = stRef(sp.first);
      w.innerHTML = `<div class="spim big">${r ? `<img src="${imgUrl(r.p, r.s.f)}">` : '<span style="font-size:30px">＋</span>'}</div><div class="hint">${r ? 'Toca para trocar' : 'Escolhe o sticker que mandas primeiro'}${sp.type === 'reply' || sp.type === 'choice' ? '<br>(normalmente a pergunta)' : ''}</div>`;
    }
    w.onclick = async () => { const x = refList(await pickSticker('Primeiro sticker'))[0]; if (x) { sp.first = x; if (!$('#nm', bd).value) $('#nm', bd).placeholder = 'Ex.: ' + t.name; draw(); } };
    draw();
    return w;
  }
  const field = (label, node, hint) => { const f = el(`<div class="field"><span>${label}</span></div>`); f.appendChild(node); if (hint) f.appendChild(el(`<div class="hint" style="margin-top:6px">${hint}</div>`)); return f; };
  bd.appendChild(el(`<label class="field"><span>Nome (aparece no teclado)</span><input class="input" id="nm" maxlength="40" placeholder="Ex.: ${t.name} da pizza" value="${esc(sp.name)}"></label>`));
  if (opts.fixedFirst) {
    if (sp.type === 'typing') bd.appendChild(field('Depois vem a piada', stickerList(sp.steps, true, 'Piada'), '⏱ = quanto tempo «está a escrever» antes de mandar.'));
  } else if (sp.type === 'typing') {
    const w = el('<div></div>');
    w.appendChild(firstPicker());
    const mk = el(`<button class="btn sm block" style="margin-top:10px">✨ Criar um sticker «a escrever…» animado</button>`);
    mk.onclick = async () => {
      const pid = await choosePack('Guardar o sticker «a escrever…» em');
      if (!pid) return;
      const r = await makeTypingSticker(pid);
      if (r) { sp.first = r; w.replaceChild(firstPicker(), w.firstChild); toast('Sticker «a escrever…» criado ✓'); }
    };
    w.appendChild(mk);
    bd.appendChild(field('Sticker «a escrever…» (o 1.º)', w, 'Os packs do WhatsApp não misturam animados com estáticos: guarda-o num pack «Só teclado» ou num pack animado.'));
    bd.appendChild(field('Depois vem a piada', stickerList(sp.steps, true, 'Piada'), '⏱ = quanto tempo «está a escrever» antes de mandar.'));
  } else if (sp.type !== 'quiz') bd.appendChild(field(sp.type === 'game' ? '1.º sticker (a pergunta, ex.: «pedra, papel ou tesoura?»)' : '1.º sticker', firstPicker()));
  if (sp.type === 'seq') {
    bd.appendChild(field('Depois vão estes, por ordem', stickerList(sp.steps, true, 'Próximo'), '⏱ = quanto tempo espera antes de mandar esse sticker.'));
  }
  if (sp.type === 'random') {
    bd.appendChild(field('Espera antes de mandar', el(`<div>${delaySel(sp.delay, 'big')}</div>`)));
    bd.appendChild(field('Vai um destes ao calhas', stickerList(sp.pool, false, 'Opção')));
  }
  if (sp.type === 'reply') {
    bd.appendChild(field('Quando a pessoa responder, manda', stickerList(sp.then, false, 'Sticker')));
  }
  if (sp.type === 'choice') {
    const ow = el('<div></div>');
    function drawOps() {
      ow.innerHTML = '';
      sp.options.forEach((o, i) => {
        const c = el(`<div class="card spop"><div class="row" style="margin-bottom:8px"><b style="flex:1">Opção ${i + 1}</b>${sp.options.length > 1 ? '<button class="iconbtn sm" data-r="1">' + ICON.close + '</button>' : ''}</div>
          <label class="field" style="margin-bottom:8px"><span>Se a pessoa responder (separa com vírgulas)</span><input class="input" value="${esc(o.answers)}" placeholder="Ex.: 1, um, pizza"></label><div class="field" style="margin:0"><span>Manda</span></div></div>`);
        $('input', c).oninput = e => { o.answers = e.target.value; };
        const r = c.querySelector('[data-r]'); if (r) r.onclick = () => { sp.options.splice(i, 1); drawOps(); };
        c.appendChild(stickerList(o.stickers, false, 'Sticker'));
        ow.appendChild(c);
      });
      if (sp.options.length < 6) {
        const a = el(`<button class="btn sm ghost block" style="margin-top:8px">＋ Mais uma opção</button>`);
        a.onclick = () => { sp.options.push({ answers: String(sp.options.length + 1), stickers: [] }); drawOps(); };
        ow.appendChild(a);
      }
    }
    drawOps();
    bd.appendChild(field('Opções', ow, 'As respostas comparam palavras inteiras, sem ligar a maiúsculas nem acentos: «1» não apanha «10».'));
    bd.appendChild(field('Se responder outra coisa (opcional)', stickerList(sp.other, false, 'Sticker'), 'Se deixares vazio, o StickTag ignora e continua à espera de uma resposta certa.'));
  }
  if (sp.type === 'quiz') {
    const qw = el('<div></div>');
    function drawQs() {
      qw.innerHTML = '';
      sp.questions.forEach((q, i) => {
        const c = el(`<div class="card spop"><div class="row" style="margin-bottom:8px"><b style="flex:1">Pergunta ${i + 1}</b>${sp.questions.length > 1 ? '<button class="iconbtn sm" data-r="1">' + ICON.close + '</button>' : ''}</div>
          <div class="row" style="align-items:flex-start;gap:12px"><div class="qpick"></div><label class="field" style="flex:1;margin:0"><span>Resposta certa (separa com vírgulas)</span><input class="input" value="${esc(q.answers)}" placeholder="Ex.: lisboa, lx"></label></div></div>`);
        $('input', c).oninput = e => { q.answers = e.target.value; };
        const r = c.querySelector('[data-r]'); if (r) r.onclick = () => { sp.questions.splice(i, 1); drawQs(); };
        const pk = $('.qpick', c);
        const fixed = opts.fixedFirst && i === 0;
        const drawPk = () => { const rr = stRef(q.sticker); pk.innerHTML = fixed ? `<div class="spim" style="font-size:11px;text-align:center;padding:4px">este sticker</div>` : `<div class="spim">${rr ? `<img src="${imgUrl(rr.p, rr.s.f)}">` : '<span style="font-size:24px">＋</span>'}</div>`; };
        if (!fixed) pk.onclick = async () => { const x = refList(await pickSticker(`Sticker da pergunta ${i + 1}`, pickOpts()))[0]; if (x) { q.sticker = x; drawPk(); } };
        drawPk();
        qw.appendChild(c);
      });
      if (sp.questions.length < 15) {
        const a = el(`<button class="btn sm ghost block" style="margin-top:8px">＋ Mais uma pergunta</button>`);
        a.onclick = () => { sp.questions.push({ sticker: null, answers: '' }); drawQs(); };
        qw.appendChild(a);
      }
    }
    drawQs();
    bd.appendChild(field('Perguntas (um sticker com a pergunta + a resposta certa)', qw, 'A 1.ª pergunta é o sticker que mandas para começar. Qualquer resposta conta como tentativa.'));
    bd.appendChild(field('Quando acerta, manda um destes (opcional)', stickerList(sp.right, false, 'Sticker')));
    bd.appendChild(field('Quando falha, manda um destes (opcional)', stickerList(sp.wrong, false, 'Sticker')));
    bd.appendChild(field('Espera até à próxima pergunta', el(`<div>${delaySel(sp.qDelay, 'big qd')}</div>`)));
    bd.appendChild(field('🏆 Acertou tudo', stickerList(sp.resAll, false, 'Sticker')));
    bd.appendChild(field('👍 Acertou metade ou mais', stickerList(sp.resHalf, false, 'Sticker')));
    bd.appendChild(field('😅 Acertou menos de metade', stickerList(sp.resLow, false, 'Sticker')));
  }
  if (sp.type === 'game') {
    const mw = el('<div></div>');
    function drawMoves() {
      mw.innerHTML = '';
      if (!sp.moves.length) {
        const pre = el(`<button class="btn sm block" style="margin-bottom:8px">✊✋✌️ Começar com pedra, papel, tesoura</button>`);
        pre.onclick = () => {
          sp.moves = [{ name: 'Pedra', answers: 'pedra, ✊', sticker: null, beats: [2] }, { name: 'Papel', answers: 'papel, ✋', sticker: null, beats: [0] }, { name: 'Tesoura', answers: 'tesoura, ✌️', sticker: null, beats: [1] }];
          if (!$('#nm', bd).value) $('#nm', bd).value = 'Pedra, papel, tesoura';
          drawMoves();
        };
        mw.appendChild(pre);
      }
      sp.moves.forEach((m, i) => {
        const others = sp.moves.map((o, j) => j === i ? '' : `<button class="mchip ${(m.beats || []).includes(j) ? 'on' : ''}" data-j="${j}">${esc(o.name || 'Jogada ' + (j + 1))}</button>`).join('');
        const c = el(`<div class="card spop"><div class="row" style="margin-bottom:8px"><input class="input mvn" style="flex:1;height:38px;font-weight:700" value="${esc(m.name)}" placeholder="Nome da jogada"><button class="iconbtn sm" data-r="1">${ICON.close}</button></div>
          <div class="row" style="align-items:flex-start;gap:12px"><div class="qpick"></div><label class="field" style="flex:1;margin:0"><span>A pessoa escreve (separa com vírgulas)</span><input class="input mva" value="${esc(m.answers)}" placeholder="Ex.: pedra, ✊"></label></div>
          <div class="field" style="margin:10px 0 0"><span>Ganha a</span><div class="chips">${others || '<span class="small muted">junta mais jogadas</span>'}</div></div></div>`);
        $('.mvn', c).oninput = e => { m.name = e.target.value; };
        $('.mvn', c).onchange = drawMoves;
        $('.mva', c).oninput = e => { m.answers = e.target.value; };
        c.querySelector('[data-r]').onclick = () => {
          sp.moves.splice(i, 1);
          sp.moves.forEach(o => o.beats = (o.beats || []).filter(j => j !== i).map(j => j > i ? j - 1 : j));
          drawMoves();
        };
        $$('.mchip', c).forEach(b => b.onclick = () => {
          const j = +b.dataset.j; m.beats = m.beats || [];
          if (m.beats.includes(j)) m.beats = m.beats.filter(x => x !== j); else m.beats.push(j);
          b.classList.toggle('on');
        });
        const pk = $('.qpick', c);
        const drawPk = () => { const rr = stRef(m.sticker); pk.innerHTML = `<div class="spim">${rr ? `<img src="${imgUrl(rr.p, rr.s.f)}">` : '<span style="font-size:24px">＋</span>'}</div><div class="spd" style="text-align:center">o meu sticker</div>`; };
        pk.onclick = async () => { const x = refList(await pickSticker(`O teu sticker para «${m.name || 'esta jogada'}»`, pickOpts()))[0]; if (x) { m.sticker = x; drawPk(); } };
        drawPk();
        mw.appendChild(c);
      });
      if (sp.moves.length < 8) {
        const a = el(`<button class="btn sm ghost block" style="margin-top:8px">＋ Mais uma jogada</button>`);
        a.onclick = () => { sp.moves.push({ name: '', answers: '', sticker: null, beats: [] }); drawMoves(); };
        mw.appendChild(a);
      }
    }
    drawMoves();
    bd.appendChild(field('Jogadas', mw, 'O StickTag escolhe uma jogada ao calhas, manda o sticker dela e depois o resultado.'));
    bd.appendChild(field('🏆 Se eu ganhar, manda um destes', stickerList(sp.iwin, false, 'Sticker')));
    bd.appendChild(field('😭 Se a pessoa ganhar', stickerList(sp.youwin, false, 'Sticker')));
    bd.appendChild(field('🤝 Empate', stickerList(sp.draw, false, 'Sticker')));
  }
  if (sp.type === 'nudge') {
    bd.appendChild(field('Se não responder, manda (um de cada vez)', stickerList(sp.nudges, false, 'Sticker'), 'Insiste tantas vezes quantos stickers puseres aqui (3 é bom).'));
    const EV = [[30, '30 segundos'], [60, '1 minuto'], [120, '2 minutos'], [300, '5 minutos']];
    bd.appendChild(field('De quanto em quanto tempo', el(`<div><select class="dsel big" id="ev">${EV.map(([v, l]) => `<option value="${v}" ${(sp.every || 60) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`)));
    bd.appendChild(field('Quando finalmente responder (opcional)', stickerList(sp.then, false, 'Sticker'), 'Ex.: um sticker «finalmente!».'));
  }
  if (sp.type === 'reply' || sp.type === 'choice') {
    bd.appendChild(field('Espera depois da resposta', el(`<div>${delaySel(sp.replyDelay, 'big rd')}</div>`)));
    const nr = sp.noReply || (sp.noReply = { secs: 0, stickers: [] });
    const box = el(`<div class="card" style="padding:12px"><div class="opt" style="padding:0 0 10px;border:0"><div class="t"><b>💣 Se não responder a tempo</b><div class="small muted">Manda logo estes stickers todos (spam!)</div></div><button class="sw ${nr.secs ? 'on' : ''}" id="nrs"></button></div><div id="nrb" class="${nr.secs ? '' : 'hidden'}"></div></div>`);
    const nrb = $('#nrb', box);
    const SECS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
    nrb.appendChild(el(`<div class="row" style="margin-bottom:8px"><span class="small muted">Tempo para responder</span><select class="dsel" id="nrt">${SECS.map(s => `<option value="${s}" ${(nr.secs || 10) === s ? 'selected' : ''}>${s} s</option>`).join('')}</select></div>`));
    nrb.appendChild(stickerList(nr.stickers, false, 'Sticker'));
    $('#nrs', box).onclick = e => { const on = !nr.secs; nr.secs = on ? +$('#nrt', box).value : 0; e.currentTarget.classList.toggle('on', on); nrb.classList.toggle('hidden', !on); };
    $('#nrt', box).onchange = e => { if (nr.secs) nr.secs = +e.target.value; };
    bd.appendChild(field('Contagem decrescente (opcional)', box));
    const MW = [[60, '1 minuto'], [180, '3 minutos'], [300, '5 minutos'], [600, '10 minutos'], [1800, '30 minutos']];
    bd.appendChild(field('Desiste se ninguém responder em', el(`<div><select class="dsel big" id="mw">${MW.map(([s, l]) => `<option value="${s}" ${(sp.maxWait || 300) === s ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`)));
  }
  const hideW = el(`<div class="opt" style="padding:8px 2px 4px;border:0"><div class="t"><b>Esconder os outros stickers do pack</b><div class="small muted">Ficam só dentro deste especial (no pack aparece só o 1.º, com ⚡). Não aparecem nas sugestões.</div></div><button class="sw ${sp.hideSubs === false ? '' : 'on'}"></button></div>`);
  const hideSw = $('.sw', hideW);
  hideSw.onclick = () => hideSw.classList.toggle('on');
  bd.appendChild(hideW);
  function collect(o2 = {}) {
    sp.name = $('#nm', bd).value.trim() || t.name;
    const rd = $('.rd', bd); if (rd) sp.replyDelay = +rd.value;
    const big = $('.dsel.big:not(.rd):not(#mw)', bd); if (big && sp.type === 'random') sp.delay = +big.value;
    const mw = $('#mw', bd); if (mw) sp.maxWait = +mw.value;
    const qd = $('.qd', bd); if (qd) sp.qDelay = +qd.value;
    const ev = $('#ev', bd); if (ev) sp.every = +ev.value;
    if (sp.type === 'quiz') {
      sp.questions = sp.questions.filter(q => q.sticker || q.answers.trim());
      if (!sp.questions.length || sp.questions.some((q, i) => !(opts.fixedFirst && i === 0) && !stRef(q.sticker) || !q.answers.trim())) { if (!sp.questions.length) sp.questions.push({ sticker: null, answers: '' }); return void toast('Cada pergunta precisa de um sticker e da resposta certa'); }
      if (![sp.resAll, sp.resHalf, sp.resLow].some(a => a.length)) return void toast('Escolhe pelo menos um sticker para o resultado');
      if (!opts.fixedFirst) sp.first = sp.questions[0].sticker;
    }
    if (sp.type === 'game') {
      if (sp.moves.length < 2) return void toast('Precisas de pelo menos 2 jogadas');
      if (sp.moves.some(m => !m.name.trim() || !stRef(m.sticker))) return void toast('Cada jogada precisa de nome e do teu sticker');
      sp.moves.forEach(m => { if (!m.answers.trim()) m.answers = m.name; });
      if (![sp.iwin, sp.youwin, sp.draw].every(a => a.length)) return void toast('Escolhe os stickers de ganhar, perder e empate');
    }
    if (sp.type === 'nudge' && !sp.nudges.length) return void toast('Escolhe os stickers para insistir');
    if (sp.type === 'typing' && !sp.steps.length) return void toast('Escolhe o sticker da piada');
    if (!o2.noFirst && !stRef(sp.first)) return void toast('Escolhe o 1.º sticker');
    if (sp.type === 'seq' && !sp.steps.length) return void toast('Junta pelo menos mais um sticker à sequência');
    if (sp.type === 'random' && !sp.pool.length) return void toast('Junta os stickers que podem sair');
    if (sp.type === 'reply' && !sp.then.length && !(sp.noReply.secs && sp.noReply.stickers.length)) return void toast('Escolhe o que mandar quando responderem');
    if (sp.type === 'choice') {
      sp.options = sp.options.filter(o => o.answers.trim() || o.stickers.length);
      if (!sp.options.length || sp.options.some(o => !o.answers.trim() || !o.stickers.length)) { if (!sp.options.length) sp.options.push({ answers: '1', stickers: [] }); return void toast('Cada opção precisa de uma resposta e de um sticker'); }
    }
    if (sp.noReply && sp.noReply.secs && !sp.noReply.stickers.length) sp.noReply.secs = 0;
    sp.hideSubs = hideSw.classList.contains('on');
    return sp;
  }
  return { collect };
}

/* guarda um especial (novo ou editado) e esconde os stickers secundários se pedido */
function persistSpecial(sp) {
  if (sp.type === 'quiz' && sp.questions[0]) sp.questions[0].sticker = sp.first;
  const list = specials().slice();
  const i = list.findIndex(x => x.id === sp.id);
  if (i >= 0) list[i] = sp; else list.push(sp);
  saveSpecials(list);
  const firsts = new Set(specials().map(x => x.first && dupKey(x.first)));
  for (const x of subRefs(sp)) {
    const r = stRef(x);
    if (!r || firsts.has(dupKey(x))) continue;
    const want = !!sp.hideSubs;
    if (!!r.s.hidden === want) continue;
    if (!want && !r.s.hidden) continue;
    try { const d = JSON.parse(A.setStickerFlag(x.p, x.f, 'hidden', want)); if (!d.error) S.data = d; } catch (e) {}
  }
}

function editSpecial(sp, isNew, onDone) {
  const t = SP_TYPES[sp.type];
  const sheet = el(`<div class="sheet"><div class="hd"><h3>${t.icon} ${t.name}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd" id="spb"></div>
    <div class="ft row" style="padding:10px 16px 14px">${isNew ? '' : '<button class="btn danger" id="dl" style="flex:none;width:52px;padding:0">🗑️</button>'}<button class="btn primary" id="sv">Guardar</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const bd = $('#spb', sheet);
  const form = specialForm(sp, bd, {});
  const dl = $('#dl', sheet);
  if (dl) dl.onclick = async () => { if (await deleteSpecial(sp)) { closeOverlay(ov); render(); if (onDone) onDone(); } };
  $('#sv', sheet).onclick = () => {
    const r = form.collect();
    if (!r) return;
    persistSpecial(r);
    closeOverlay(ov);
    toast('Especial guardado ⚡');
    render();
    if (onDone) onDone();
  };
}

function showSpecialLog() {
  let lines = [];
  try { lines = JSON.parse(A.specialLog()); } catch (e) {}
  const html = `<div class="hint" style="margin-bottom:8px">O mais recente aparece em cima. Se um especial não funcionar, tira um print disto e manda-me.</div><pre class="splog">${lines.length ? lines.map(esc).join('\n') : 'Ainda não há nada. Usa um especial no WhatsApp e volta aqui.'}</pre>`;
  dialog({ title: 'Registo dos especiais', html, buttons: [{ label: 'Copiar', cls: 'ghost', value: () => { try { A.copy(lines.join('\n')); toast('Copiado'); } catch (e) {} } }, { label: 'Fechar', cls: 'primary' }] });
}

function editSecret(x) {
  const r = stRef(x);
  if (!r) return;
  const { p, s } = r;
  const sheet = el(`<div class="sheet"><div class="hd"><h3>🤫 Não cliques</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div class="hint" style="margin-bottom:12px">Quem receber este sticker no WhatsApp e tocar nele vê estas duas linhas em vez do nome do pack. Exemplo: um sticker a dizer «não cliques» e, por baixo, «Eu avisei 😂».</div>
    <div class="wa-prev"><img src="${imgUrl(p, s.f)}"><div><b id="pn">${esc(s.secretName || 'Eu disse para não clicares 😂')}</b><span id="pp">${esc(s.secretPub || 'Agora tens de me pagar um café ☕')}</span></div></div>
    <label class="field"><span>Linha de cima (nome do pack)</span><input class="input" id="sn" maxlength="120" value="${esc(s.secretName || '')}" placeholder="Eu disse para não clicares 😂"></label>
    <label class="field"><span>Linha de baixo (autor)</span><input class="input" id="sp" maxlength="120" value="${esc(s.secretPub || '')}" placeholder="Agora tens de me pagar um café ☕"></label>
    <div class="note" style="margin-top:4px">Para a mensagem chegar, envia este sticker pelo teclado de stickers ou pela bolha. Se o mandares pelo pack instalado no WhatsApp, pode aparecer o nome normal do pack. Nas versões mais recentes do WhatsApp esta informação pode nem aparecer.</div>
    </div><div class="ft row" style="padding:10px 16px 14px">${s.secretName || s.secretPub ? '<button class="btn danger" id="rm" style="flex:none">Tirar</button>' : ''}<button class="btn primary" id="sv">Guardar</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  $('#sn', sheet).oninput = e => { $('#pn', sheet).textContent = e.target.value || 'Eu disse para não clicares 😂'; };
  $('#sp', sheet).oninput = e => { $('#pp', sheet).textContent = e.target.value || 'Agora tens de me pagar um café ☕'; };
  const put = (n, pb) => { try { const d = JSON.parse(A.setSecret(p.id, s.f, n, pb)); if (d.error) return toast(d.error); S.data = d; } catch (e) { toast('Erro'); } };
  $('#sv', sheet).onclick = () => {
    const n = $('#sn', sheet).value.trim(), pb = $('#sp', sheet).value.trim();
    if (!n && !pb) return toast('Escreve a mensagem');
    put(n, pb); closeOverlay(ov); toast('Mensagem escondida guardada 🤫'); render();
  };
  const rm = $('#rm', sheet);
  if (rm) rm.onclick = () => { put('', ''); closeOverlay(ov); toast('Mensagem tirada'); render(); };
}

/* ---------- respostas do lado nativo ---------- */
window.App = {
  onImportProgress(done, total) { busy(`A importar ${done} de ${total}…`); },
  onDupesProgress(done, total) { busy(`A comparar ${done} de ${total}…`); },
  onBulkProgress(r) { if (!r) return; busy(r.total > 0 ? `${r.label} ${r.done} de ${r.total}…` : `${r.label}…`, r.done, r.total); },
  onBulkDone(r) { if (S.bulkCb) S.bulkCb(r); else { busy(null); reload(); render(); } },
  onFolderList(r) { if (S.flistCb) { const cb = S.flistCb; S.flistCb = null; cb(r); } },
  onDupes(r) { showDupes(r || { groups: [] }); },
  onSimilar(r) { const f = r && SIMW[r.id]; if (f) { delete SIMW[r.id]; f(r); } },
  onImported(r) {
    if (r && r.hidden && S.hiddenCb) { S.hiddenCb(r); return; }
    if (S.vImp && r && !r.cancelled) {
      S.vImp--;
      reload();
      if (folderDeleteOn() && r.uris && r.uris.length) cleanupFolder(r.uris, true);
      const e = (r.errors || [])[0], p = packOf(r.packId);
      if (e) toast('Não entrou no pack: ' + e.error, 3200);
      else if (r.added && r.added.length) toast(`Adicionado a «${p ? p.name : 'pack'}» ✓`, 1300);
      return;
    }
    busy(null);
    const fromFolder = S.fromFolder; S.fromFolder = false;
    if (!r || r.cancelled) return;
    reload();
    if (fromFolder && folderDeleteOn() && r.uris && r.uris.length) cleanupFolder(r.uris).then(() => { if (S.folder) render(); });
    if (S.folder) { S.fsel = new Set(); render(); }
    else { S.tab = 'packs'; S.packId = r.packId; S.sel = null; render(); }
    const added = r.added.length, errs = r.errors || [], notes = r.notes || [];
    if (errs.length || notes.length) {
      dialog({ title: added ? `${added} sticker${added > 1 ? 's' : ''} adicionado${added > 1 ? 's' : ''}` : 'Nada foi adicionado',
        html: `${errs.length ? `<p>${errs.length === 1 ? '1 ficou' : errs.length + ' ficaram'} de fora:</p><ul class="list-err">${errs.map(e => `<li><b>${esc(e.name)}</b>: ${esc(e.error)}</li>`).join('')}</ul>` : ''}${notes.length ? `<ul class="list-err">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`,
        buttons: [{ label: 'OK', cls: 'primary' }] });
    } else if (added) {
      const p = packOf(r.packId);
      const noEmo = p ? p.stickers.filter(s => r.added.includes(s.f) && (!s.emojis || !s.emojis.length)).length : 0;
      toast(`${added} adicionado${added > 1 ? 's' : ''}${noEmo ? ' — agora dá-lhes emojis' : ' (com os emojis que já tinham)'}`, 3200);
    }
  },
  onWa(r) {
    if (!r) return;
    if (r.packId) waStatus(r.packId, true);
    if (r.ok) toast('Pack adicionado ao WhatsApp ✓', 3000);
    else if (r.error) dialog({ title: 'O WhatsApp recusou o pack', text: r.error, buttons: [{ label: 'OK', cls: 'primary' }] });
    render();
  },
  onFolderAdded(f) {
    if (!f) return;
    reload();
    S.folders = true; S.folder = f; S.fsel = new Set(); S.ffiles = null;
    render();
  },
  async onAutoImported(r) {
    busy(null);
    reload();
    let cleaned = 0;
    if (folderDeleteOn() && r.uris && r.uris.length) cleaned = await cleanupFolder(r.uris, true);
    S.ffiles = null; render();
    dialog({ title: `${r.added} sticker${r.added === 1 ? '' : 's'} importado${r.added === 1 ? '' : 's'}`,
      html: `<ul class="list-err">${r.created ? `<li>${r.created} pack${r.created > 1 ? 's' : ''} novo${r.created > 1 ? 's' : ''}</li>` : ''}${r.dup ? `<li>${r.dup} já estavam na app (ignorados)</li>` : ''}${cleaned ? `<li>🧹 ${cleaned} apagado${cleaned === 1 ? '' : 's'} da pasta</li>` : ''}${r.fail ? `<li>${r.fail} não deram para converter</li>` : ''}${r.stop ? `<li>${esc(r.stop)}</li>` : ''}</ul>`,
      buttons: [{ label: 'OK', cls: 'primary' }] });
  },
  onAutoBackup(r) {
    busy(null); reload();
    if (!r || r.cancelled) return;
    if (r.ok) toast('Cópia automática feita ✓', 2600); else toast('A cópia falhou: ' + (r.error || 'erro'), 3600);
    if (S.tab === 'help') render();
  },
  onBackup(r) {
    busy(null);
    if (!r || r.cancelled) return;
    if (!r.ok) { dialog({ title: 'Não deu', text: r.error || 'Erro', buttons: [{ label: 'OK', cls: 'primary' }] }); return; }
    if (r.restore) { reload(); render(); toast(`${r.packs} pack${r.packs === 1 ? '' : 's'} restaurado${r.packs === 1 ? '' : 's'} ✓`, 3000); }
    else toast('Cópia guardada ✓', 3000);
  },
  onAnimPicked(m) {
    if (!m) return;
    openAnimCreator(S.createFor, m);
  },
  onCreatePicked(url) {
    if (!url) return;
    openCreator(S.createFor, url);
  },
  onExported(ok) { toast(ok ? 'Ficheiro guardado. Agora importa-o no Gboard.' : 'Não foi guardado', 3200); },
  onShared() { reload(); render(); askSharedPack(); },
  back() {
    if (busyEl) return true;
    if (S.ov.length) { closeOverlay(); return true; }
    if (S.sel) { S.sel = null; render(); return true; }
    if (S.folder) { S.folder = null; S.fsel = null; render(); return true; }
    if (S.folders) { S.folders = false; render(); return true; }
    if (S.packId) { S.packId = null; render(); return true; }
    if (S.tab !== 'packs') { go('packs'); return true; }
    return false;
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || S.ov.length) return;
  if (S.packId) { waStatus(S.packId, true); render(); }
  else if (S.tab === 'kb') render();
});

(async function start() {
  reload();
  render();
  await loadEmoji();
  try { Suggest.setEmojis(EMO); } catch (e) {}
  if (A.sharedCount && A.sharedCount() > 0) askSharedPack();
})();
