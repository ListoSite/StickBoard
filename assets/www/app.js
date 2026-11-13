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
const maxOf = p => isKb(p) ? 300 : 30;
const countLabel = p => isKb(p) ? `${p.stickers.length} stickers` : `${p.stickers.length}/30 stickers`;
const kindLabel = p => isKb(p) ? 'só teclado' : (p.animated ? 'animado' : 'estático');
function emoWords(e) { return Match.effectiveWords(e, S.data, emoInfo); }

function issues(p) {
  const out = [];
  if (isKb(p)) {
    const none = p.stickers.filter(s => !(s.emojis && s.emojis.length) && !(s.words && s.words.length)).length;
    if (none) out.push(`${none} sticker${none > 1 ? 's' : ''} sem emoji nem palavras (não aparece${none > 1 ? 'm' : ''} nas sugestões)`);
    return out;
  }
  const n = p.stickers.length;
  if (n < 3) out.push(`${3 - n > 1 ? 'Faltam' : 'Falta'} ${3 - n} sticker${3 - n > 1 ? 's' : ''} (o WhatsApp pede no mínimo 3)`);
  const no = p.stickers.filter(s => !s.emojis || !s.emojis.length).length;
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

let busyEl = null;
function busy(text) {
  if (!text) { if (busyEl) busyEl.remove(); busyEl = null; return; }
  if (!busyEl) { busyEl = el('<div class="busy"><div class="b"><div class="spin"></div><div class="t"></div></div></div>'); document.body.appendChild(busyEl); }
  busyEl.querySelector('.t').textContent = text;
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
  const tp = el(`<div class="top"><div style="flex:1;min-width:0"><h1>StickTag</h1><div class="sub">Os teus stickers com tags</div></div><button class="btn sm" id="dp" title="Procurar repetidos">👯</button><button class="btn sm" id="fd">📁 Pastas</button></div>`);
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
      const found = Match.search(Match.buildIndex(S.data, emoInfo), q, 80);
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
    const thumbs = p.stickers.slice(0, 6).map(s => `<img loading="lazy" src="${imgUrl(p, s.f)}">`).join('');
    const c = el(`<div class="pack"><div class="tray">${p.stickers.length ? `<img src="${trayUrl(p)}">` : ICON.img}</div><div class="info"><div class="name">${esc(p.name)}</div><div class="meta">${countLabel(p)} · ${kindLabel(p)}</div>${chip}</div></div>`);
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
        $('#np-khint').textContent = kind === 'kb' ? 'Fica só no teclado de stickers: até 300 stickers, e podes misturar animados com estáticos.' : 'Vai para o WhatsApp (3 a 30 stickers) e também aparece no teclado de stickers.';
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
    let r;
    try { r = JSON.parse(A.listFolder(f.uri)); } catch (e) { r = { ok: false, error: 'erro' }; }
    if (!r.ok) { setTimeout(() => toast(r.error, 3500), 0); S.folder = null; return viewFolders(); }
    S.ffiles = r.files.sort((a, b) => (b.time || 0) - (a.time || 0));
  }
  const have = new Set();
  S.data.packs.forEach(p => p.stickers.forEach(s => { if (s.src) have.add(s.src); }));
  const isIn = x => have.has(x.name + '|' + x.size);
  const files = S.fonlyNew ? S.ffiles.filter(x => !isIn(x)) : S.ffiles;
  const nNew = S.ffiles.filter(x => !isIn(x)).length;
  const tp = el(`<div class="top"><button class="iconbtn" id="bk">${ICON.back}</button><div style="flex:1;min-width:0"><h1>${esc(f.name)}</h1><div class="sub">${S.ffiles.length} imagens · ${nNew} ainda não estão na app</div></div><button class="iconbtn" id="rf" title="Atualizar">⟳</button></div>`);
  tp.querySelector('#bk').onclick = () => { S.folder = null; S.fsel = null; render(); };
  tp.querySelector('#rf').onclick = () => { S.ffiles = null; render(); };
  v.appendChild(tp);
  const acts = el(`<div class="row" style="margin-bottom:12px;flex-wrap:wrap"><button class="btn primary" id="ia" ${nNew ? '' : 'disabled'}>Importar tudo${nNew ? ` (${nNew})` : ''}</button><button class="btn" id="fl">${S.fonlyNew ? 'Ver todos' : 'Só os novos'}</button>${files.length ? '<button class="btn" id="vw">▶ Rever um a um</button>' : ''}${S.ffiles.length > 1 ? '<button class="btn" id="dpf">👯 Repetidos</button>' : ''}</div>`);
  const dpf = acts.querySelector('#dpf'); if (dpf) dpf.onclick = () => findDupes(S.ffiles);
  const vw = acts.querySelector('#vw'); if (vw) vw.onclick = () => openFolderViewer(files, 0);
  acts.querySelector('#fl').onclick = () => { S.fonlyNew = !S.fonlyNew; render(); };
  acts.querySelector('#ia').onclick = () => autoImportDialog(f, S.ffiles.filter(x => !isIn(x)));
  v.appendChild(acts);
  v.appendChild(el(`<div class="hint" style="margin-bottom:10px">Toca num sticker para o veres em grande. Carrega sem largar para escolher vários. Os que têm ✓ já estão num pack.</div>`));
  const grid = el('<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:0"></div>');
  files.forEach(x => {
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
    grid.appendChild(c);
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
    const del = A.deleteDocs(JSON.stringify(Array.from(S.fsel)));
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
        <button class="fv-b del" id="dl"><span>🗑️</span>Apagar</button>
        <button class="fv-b" id="ed"><span>✏️</span>Editar</button>
        <button class="fv-b add" id="ad"><span>➕</span>Pôr no pack</button>
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
    if (p.stickers.length >= maxOf(p)) { toast('Este pack já está cheio: escolhe outro'); return pickTarget(); }
    S.vImp = (S.vImp || 0) + 1;
    A.importDocs(pid, JSON.stringify([x.uri]));
    done(S.fonlyNew);
  };
  $('#ed', v).onclick = async () => {
    const x = list[i];
    const pid = target() ? S.vPack : await pickTarget();
    if (!pid) return;
    const p = packOf(pid);
    if (p.stickers.length >= maxOf(p)) { toast('Este pack já está cheio: escolhe outro'); return pickTarget(); }
    const url = 'd/' + encodeURIComponent(x.uri);
    const onSaved = () => { toast(`Guardado em «${p.name}» ✓`, 1600); done(S.fonlyNew); };
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
    <div class="hint" id="ai-h" style="margin:-4px 0 12px">Cria packs do teclado com até 300 stickers cada (animados e estáticos juntos).</div>
    <label class="field"><span>Nome dos packs</span><input class="input" id="ai-n" maxlength="60" value="${esc(f.name)}"></label>`;
  const pr = dialog({ title: `Importar ${list.length} sticker${list.length > 1 ? 's' : ''}`, html, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Importar', cls: 'primary', value: d => $('#ai-n', d).value }] });
  setTimeout(() => $$('#ai-k button').forEach(b => b.onclick = () => {
    kind = b.dataset.k; $$('#ai-k button').forEach(x => x.classList.toggle('on', x === b));
    $('#ai-h').textContent = kind === 'kb' ? 'Cria packs do teclado com até 300 stickers cada (animados e estáticos juntos).' : 'Cria packs de 30 para o WhatsApp, com animados e estáticos em packs separados (máximo 10 packs no total).';
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
  const n = p.stickers.length;
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

  const grid = el('<div class="grid"></div>');
  p.stickers.forEach((s, i) => {
    const em = s.emojis && s.emojis.length ? `<div class="em emo">${s.emojis.map(esc).join('')}</div>` : '<div class="em none">sem emoji</div>';
    const c = el(`<div class="st"><div class="im"><img loading="lazy" src="${imgUrl(p, s.f)}"></div>${em}${s.words && s.words.length ? `<span class="wd">${s.words.length} pal.</span>` : ''}${s.anim && isKb(p) ? '<span class="wd" style="left:auto;right:10px;top:auto;bottom:34px;color:var(--amber)">GIF</span>' : ''}${S.sel ? '<span class="ck"></span>' : (p.cover === s.f ? '<span class="cv">★</span>' : '')}</div>`);
    if (S.sel && S.sel.has(s.f)) c.classList.add('sel');
    c.onclick = () => {
      if (S.sel) { S.sel.has(s.f) ? S.sel.delete(s.f) : S.sel.add(s.f); c.classList.toggle('sel'); updSelBar(); return; }
      openEditor(p.id, i);
    };
    grid.appendChild(c);
  });
  v.appendChild(grid);
  if (S.sel) {
    const bar = el(`<div class="selbar"><span class="n" id="sn"></span><button class="btn sm" id="sa">Tudo</button><button class="btn sm primary" id="se">+ Emoji</button><button class="btn sm" id="sm">Mover</button><button class="btn sm danger" id="sd">Apagar</button></div>`);
    bar.querySelector('#sa').onclick = () => { if (S.sel.size === p.stickers.length) S.sel.clear(); else p.stickers.forEach(s => S.sel.add(s.f)); render(); };
    bar.querySelector('#se').onclick = () => { if (!S.sel.size) return toast('Escolhe primeiro os stickers'); bulkEmoji(p); };
    bar.querySelector('#sm').onclick = () => { if (!S.sel.size) return toast('Escolhe primeiro os stickers'); moveStickers(p, Array.from(S.sel)); };
    bar.querySelector('#sd').onclick = async () => {
      if (!S.sel.size) return toast('Escolhe primeiro os stickers');
      if (!await confirmBox(`Apagar ${S.sel.size} sticker${S.sel.size > 1 ? 's' : ''}?`, 'Saem deste pack (e do WhatsApp, se o pack lá estiver).')) return;
      for (const f of S.sel) A.deleteSticker(p.id, f);
      S.sel = new Set(); reload(); render();
    };
    v.appendChild(bar);
    v.style.paddingBottom = '76px';
    setTimeout(updSelBar, 0);
  }
  return v;
}
function updSelBar() { const n = $('#sn'); if (n && S.sel) n.textContent = `${S.sel.size} selec.`; }

async function packMenu(p) {
  const r = await dialog({ title: p.name, html: '<div style="height:4px"></div>', buttons: [{ label: 'Editar nome', value: 'edit' }, { label: 'Apagar pack', cls: 'danger', value: 'del' }] });
  if (r === 'edit') {
    const r2 = await dialog({ title: 'Editar pack', html: `<label class="field"><span>Nome</span><input class="input" id="ep-n" maxlength="128" value="${esc(p.name)}"></label><label class="field"><span>Autor</span><input class="input" id="ep-p" maxlength="128" value="${esc(p.publisher)}"></label>`, buttons: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', value: d => ({ n: $('#ep-n', d).value, p: $('#ep-p', d).value }) }] });
    if (r2) { p.name = r2.n.trim() || p.name; p.publisher = r2.p.trim() || p.publisher; savePack(p); render(); }
  } else if (r === 'del') {
    if (!await confirmBox('Apagar este pack?', `“${p.name}” e os ${p.stickers.length} stickers saem da app e do WhatsApp.`)) return;
    try { S.data = JSON.parse(A.deletePack(p.id)); } catch (e) { reload(); }
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
  for (const f of files) {
    const r = JSON.parse(A.moveSticker(p.id, f, chosen));
    if (r.error) { err = r.error; break; }
    moved++;
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
  let picker = null;

  function cur() { return p.stickers[idx]; }
  function commit() { p = savePack(p); }

  function drawTop() {
    const s = cur();
    const used = usage();
    const top = $('.ed-top-wrap', sheet);
    const slots = [0, 1, 2].map(i => s.emojis[i] ? `<div class="slot f emo" data-i="${i}">${esc(s.emojis[i])}<span class="x">×</span></div>` : `<div class="slot"></div>`).join('');
    top.innerHTML = `<div class="ed-top"><div class="st ed-prev" style="padding:6px"><div class="im"><img src="${imgUrl(p, s.f)}"></div></div>
      <div class="ed-side"><div class="navs"><button class="btn sm" id="pv" ${idx === 0 ? 'disabled' : ''}>‹</button><span style="flex:1;text-align:center">${idx + 1} de ${p.stickers.length}</span><button class="btn sm" id="nx" ${idx >= p.stickers.length - 1 ? 'disabled' : ''}>›</button></div>
      <div class="hint">Emojis (tags) — 1 a 3</div><div class="slots">${slots}</div></div></div>
      <div class="emoinfo">${s.emojis.map(e => {
        const o = emoInfo(e); const others = (used.get(stripVS(e)) || []).filter(x => x.s.f !== s.f).length;
        const cats = WA_CAT_OF.get(stripVS(e));
        return `<div class="r"><span class="e emo">${esc(e)}</span><div><b>${esc(o ? o.n : 'emoji')}</b> · <span style="color:var(--blue)">${esc(emoWords(e).join(', ') || '—')}</span><div class="dim">${others ? `Também em ${others} sticker${others > 1 ? 's' : ''} teu${others > 1 ? 's' : ''}` : 'Só este sticker tem este emoji ✓'}${cats ? ' · categoria do WhatsApp: ' + cats.map(c => c.pt).join(', ') : ''}</div></div></div>`;
      }).join('')}</div>`;
    $$('.slot.f', top).forEach(sl => sl.onclick = () => { cur().emojis.splice(+sl.dataset.i, 1); commit(); drawTop(); redrawPicker(); });
    const pv = $('#pv', top), nx = $('#nx', top);
    pv.onclick = () => { if (idx > 0) { idx--; drawAll(); } };
    nx.onclick = () => { if (idx < p.stickers.length - 1) { idx++; drawAll(); } };
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
    inp.addEventListener('input', () => { if (inp.value.includes(',')) add(); });
    inp.addEventListener('blur', add);
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
    bd.innerHTML = `<div class="ed-top-wrap"></div><div class="pk-holder"></div>
      <div class="sec" style="margin-top:18px">Palavras para este sticker</div>
      <div class="words"></div>
      <div class="hint" style="margin-top:6px">Quando escreveres uma destas palavras, o teclado de stickers sugere este sticker. As palavras dos emojis também contam.</div>
      ${Object.keys(s.learn || {}).length ? `<div class="sec" style="margin-top:16px">Aprendidas pelo teclado</div><div class="words" id="lw"></div><div class="hint" style="margin-top:6px">Palavras que escreveste antes de escolher este sticker. Toca no × para esquecer.</div>` : ''}
      <div class="row" style="margin-top:16px;flex-wrap:wrap"><button class="btn sm" id="fv">${s.fav ? '⭐ Favorito' : '☆ Favorito'}</button><button class="btn sm" id="gl">💾 Galeria</button><button class="btn sm" id="cv">${p.cover === s.f ? '★ É a capa' : '☆ Capa'}</button><button class="btn sm" id="mv">Mover</button><button class="btn sm danger" id="dl">Apagar</button></div>`;
    const lw = $('#lw', bd);
    if (lw) {
      const L = s.learn || {};
      lw.innerHTML = Object.keys(L).sort((a, b) => L[b] - L[a]).map(w => `<span class="wchip" style="background:var(--greenSoft);color:var(--green)">${esc(w)} <small style="opacity:.6">×${L[w]}</small><button data-w="${esc(w)}" style="background:rgba(37,211,102,.25);color:var(--green)">×</button></span>`).join('');
      $$('button', lw).forEach(b => b.onclick = () => { const c = cur(); delete c.learn[b.dataset.w]; commit(); drawAll(); });
    }
    $('#fv', bd).onclick = () => { const c = cur(); c.fav = !c.fav; commit(); drawAll(); toast(c.fav ? 'Nos favoritos do teclado ⭐' : 'Tirado dos favoritos'); };
    $('#gl', bd).onclick = () => { const r = JSON.parse(A.saveToGallery(p.id, s.f)); toast(r.error ? 'Não guardei: ' + r.error : 'Guardado em Imagens/StickTag ✓'); };
    drawTop(); drawWords(); redrawPicker();
    $('#cv', bd).onclick = () => { p.cover = s.f; commit(); drawAll(); toast('Capa do pack atualizada'); };
    $('#mv', bd).onclick = async () => { const ok = await moveStickers(p, [s.f]); if (ok) closeOverlay(ov); };
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
    <div class="field"><span>Fluidez</span><div class="seg" id="fp" style="grid-template-columns:repeat(3,1fr)"><button data-f="8">Leve (8 fps)</button><button data-f="12" class="on">Normal (12)</button><button data-f="15">Suave (15)</button></div></div>
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
      $('#sl', sheet).max = Math.max(0.5, Math.min(8, st.dur));
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
  $$('#fp button', sheet).forEach(b => b.onclick = () => { st.fps = +b.dataset.f; $$('#fp button', sheet).forEach(x => x.classList.toggle('on', x === b)); upd(); });
  $('#zm', sheet).oninput = e => { st.zoom = +e.target.value; redraw(); };
  $$('#sh button', sheet).forEach(b => b.onclick = () => { st.shape = b.dataset.s; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x === b)); redraw(); });
  $('#ol', sheet).onclick = e => { st.outline = !st.outline; e.currentTarget.classList.toggle('on', st.outline); redraw(); };
  if (opts.edit) { st.shape = 'full'; st.outline = false; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x.dataset.s === 'full')); $('#ol', sheet).classList.remove('on'); }
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
      const tries = [[70, 1], [55, 1], [40, 1], [40, 2], [28, 2], [20, 3]];
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
  $('#tt', sheet).oninput = e => { st.top = e.target.value; draw(); };
  $('#tb', sheet).oninput = e => { st.bottom = e.target.value; draw(); };
  $('#ts', sheet).oninput = e => { st.size = +e.target.value; draw(); };
  $$('#tc button', sheet).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$('#tc button', sheet).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#sv', sheet).onclick = () => {
    draw();
    if (textMode && !st.mid.trim() && !st.top && !st.bottom) return toast('Escreve um texto primeiro');
    const words = $('#wd', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
    if (textMode && !words.length) Match.tokens(st.mid).filter(w => !Match.STOP.has(w)).slice(0, 4).forEach(w => words.push(w));
    let r;
    try { r = JSON.parse(A.saveCreated(packId, cv.toDataURL('image/png'), JSON.stringify(words))); } catch (e) { r = { error: 'erro' }; }
    if (r.error) { toast(r.error); return; }
    S.data = r.data;
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
    inp.addEventListener('input', () => { if (inp.value.includes(',')) add(); });
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
    const idx = Match.buildIndex(S.data, emoInfo);
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
        for (const g of groups.filter(g => g.level === 'same')) if (await act(g)) { ok++; g.done = true; }
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

async function newSpecial() {
  const html = `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${Object.entries(SP_TYPES).map(([k, t]) => `<button class="pack" data-k="${k}" style="margin:0;text-align:left;align-items:flex-start"><div style="font-size:26px;line-height:1.2">${t.icon}</div><div class="info"><div class="name">${t.name}</div><div class="meta" style="margin:2px 0 0;white-space:normal">${t.desc}</div></div></button>`).join('')}</div>`;
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
  editSpecial(base, true);
}

/* escolher um sticker de qualquer pack */
function pickSticker(title) {
  return new Promise(res => {
    const packs = S.data.packs.filter(p => p.stickers.length);
    if (!packs.length) { toast('Ainda não tens stickers'); return res(null); }
    let cur = S.pickPack && packOf(S.pickPack) ? S.pickPack : packs[0].id, done = false;
    const sheet = el(`<div class="sheet"><div class="hd"><h3>${esc(title)}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="pk-packs"></div><div class="bd"><div class="pk-grid2"></div></div></div>`);
    const ov = openOverlay(sheet, { onClose: () => { if (!done) res(null); } });
    $('#x', sheet).onclick = () => closeOverlay(ov);
    function draw() {
      $('.pk-packs', sheet).innerHTML = packs.map(p => `<button data-id="${esc(p.id)}" class="${p.id === cur ? 'on' : ''}"><img src="${trayUrl(p)}"><span>${esc(p.name)}</span></button>`).join('');
      $$('.pk-packs button', sheet).forEach(b => b.onclick = () => { cur = b.dataset.id; S.pickPack = cur; draw(); });
      const p = packOf(cur);
      $('.pk-grid2', sheet).innerHTML = p.stickers.map(s => `<button data-f="${esc(s.f)}"><img loading="lazy" src="${imgUrl(p, s.f)}"></button>`).join('');
      $$('.pk-grid2 button', sheet).forEach(b => b.onclick = () => { done = true; closeOverlay(ov); res({ p: cur, f: b.dataset.f }); });
    }
    draw();
  });
}

function editSpecial(sp, isNew) {
  const t = SP_TYPES[sp.type];
  const sheet = el(`<div class="sheet"><div class="hd"><h3>${t.icon} ${t.name}</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd" id="spb"></div>
    <div class="ft row" style="padding:10px 16px 14px">${isNew ? '' : '<button class="btn danger" id="dl" style="flex:none;width:52px;padding:0">🗑️</button>'}<button class="btn primary" id="sv">Guardar</button></div></div>`);
  const ov = openOverlay(sheet, { modal: true });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const bd = $('#spb', sheet);
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
      add.onclick = async () => { const x = await pickSticker('Escolhe um sticker'); if (x) { if (withDelay) x.d = arr.length ? (arr[arr.length - 1].d || 2) : 2; arr.push(x); draw(); } };
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
    w.onclick = async () => { const x = await pickSticker('Primeiro sticker'); if (x) { sp.first = x; if (!$('#nm', bd).value) $('#nm', bd).placeholder = 'Ex.: ' + t.name; draw(); } };
    draw();
    return w;
  }
  const field = (label, node, hint) => { const f = el(`<div class="field"><span>${label}</span></div>`); f.appendChild(node); if (hint) f.appendChild(el(`<div class="hint" style="margin-top:6px">${hint}</div>`)); return f; };
  bd.appendChild(el(`<label class="field"><span>Nome (aparece no teclado)</span><input class="input" id="nm" maxlength="40" placeholder="Ex.: ${t.name} da pizza" value="${esc(sp.name)}"></label>`));
  bd.appendChild(field('1.º sticker', firstPicker()));
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
  const dl = $('#dl', sheet);
  if (dl) dl.onclick = async () => {
    if (!await confirmBox('Apagar este especial?', 'Os stickers continuam nos teus packs.')) return;
    saveSpecials(specials().filter(x => x.id !== sp.id)); closeOverlay(ov); render();
  };
  $('#sv', sheet).onclick = () => {
    sp.name = $('#nm', bd).value.trim() || t.name;
    const rd = $('.rd', bd); if (rd) sp.replyDelay = +rd.value;
    const big = $('.dsel.big:not(.rd):not(#mw)', bd); if (big && sp.type === 'random') sp.delay = +big.value;
    const mw = $('#mw', bd); if (mw) sp.maxWait = +mw.value;
    if (!stRef(sp.first)) return toast('Escolhe o 1.º sticker');
    if (sp.type === 'seq' && !sp.steps.length) return toast('Junta pelo menos mais um sticker à sequência');
    if (sp.type === 'random' && !sp.pool.length) return toast('Junta os stickers que podem sair');
    if (sp.type === 'reply' && !sp.then.length && !(sp.noReply.secs && sp.noReply.stickers.length)) return toast('Escolhe o que mandar quando responderem');
    if (sp.type === 'choice') {
      sp.options = sp.options.filter(o => o.answers.trim() || o.stickers.length);
      if (!sp.options.length || sp.options.some(o => !o.answers.trim() || !o.stickers.length)) { if (!sp.options.length) sp.options.push({ answers: '1', stickers: [] }); return toast('Cada opção precisa de uma resposta e de um sticker'); }
    }
    if (sp.noReply && sp.noReply.secs && !sp.noReply.stickers.length) sp.noReply.secs = 0;
    const list = specials().slice();
    const i = list.findIndex(x => x.id === sp.id);
    if (i >= 0) list[i] = sp; else list.push(sp);
    saveSpecials(list);
    closeOverlay(ov);
    toast('Especial guardado ⚡');
    render();
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
  onDupes(r) { showDupes(r || { groups: [] }); },
  onImported(r) {
    if (S.vImp && r && !r.cancelled) {
      S.vImp--;
      reload();
      const e = (r.errors || [])[0], p = packOf(r.packId);
      if (e) toast('Não entrou no pack: ' + e.error, 3200);
      else if (r.added && r.added.length) toast(`Adicionado a «${p ? p.name : 'pack'}» ✓`, 1300);
      return;
    }
    busy(null);
    if (!r || r.cancelled) return;
    reload();
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
  onAutoImported(r) {
    busy(null);
    reload();
    S.ffiles = null; render();
    dialog({ title: `${r.added} sticker${r.added === 1 ? '' : 's'} importado${r.added === 1 ? '' : 's'}`,
      html: `<ul class="list-err">${r.created ? `<li>${r.created} pack${r.created > 1 ? 's' : ''} novo${r.created > 1 ? 's' : ''}</li>` : ''}${r.dup ? `<li>${r.dup} já estavam na app (ignorados)</li>` : ''}${r.fail ? `<li>${r.fail} não deram para converter</li>` : ''}${r.stop ? `<li>${esc(r.stop)}</li>` : ''}</ul>`,
      buttons: [{ label: 'OK', cls: 'primary' }] });
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
  if (A.sharedCount && A.sharedCount() > 0) askSharedPack();
})();
