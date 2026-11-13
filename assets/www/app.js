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
function go(tab) { S.tab = tab; S.packId = null; S.sel = null; render(); $('#main').scrollTop = 0; }
$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.tab));

function render() {
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab || (S.tab === 'shortcuts' && b.dataset.tab === 'help')));
  const m = $('#main');
  if (S.tab === 'packs') m.innerHTML = '', m.appendChild(S.packId ? viewPack() : viewPacks());
  else if (S.tab === 'words') m.innerHTML = '', m.appendChild(viewWords());
  else if (S.tab === 'shortcuts') m.innerHTML = '', m.appendChild(viewShortcuts());
  else if (S.tab === 'kb') m.innerHTML = '', m.appendChild(viewKeyboard());
  else m.innerHTML = '', m.appendChild(viewHelp());
}

/* ---------- lista de packs ---------- */
function viewPacks() {
  const v = el('<section class="view"></section>');
  v.appendChild(el(`<div class="top"><div style="flex:1;min-width:0"><h1>StickTag</h1><div class="sub">Os teus stickers com tags para o WhatsApp</div></div></div>`));
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
  return v;
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

  const acts = el(`<div class="actions"><button class="btn" id="ia">${ICON.wa}Do WhatsApp</button><button class="btn" id="ig">${ICON.img}Galeria / ficheiros</button>${p.animated && !isKb(p) ? '' : `<button class="btn" id="ic" style="grid-column:1/-1">✂️ Criar sticker a partir de uma foto</button>`}</div>`);
  const ic = acts.querySelector('#ic');
  if (ic) ic.onclick = () => { if (n >= maxOf(p)) return toast('Este pack já está cheio.'); S.createFor = p.id; A.pickForCreate(); };
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

/* ---------- Criar sticker a partir de uma foto ---------- */
function openCreator(packId, url) {
  const p = packOf(packId);
  if (!p) return;
  const st = { zoom: 1, ox: 0, oy: 0, shape: 'sq', outline: true, top: '', bottom: '', size: 64, color: '#ffffff' };
  const sheet = el(`<div class="sheet"><div class="hd"><h3>Criar sticker</h3><button class="iconbtn" id="x">${ICON.close}</button></div><div class="bd">
    <div style="display:grid;place-items:center"><canvas id="cv" width="512" height="512" style="width:min(300px,78vw);height:min(300px,78vw);border-radius:16px;touch-action:none;background-color:#1c2028;background-image:linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%),linear-gradient(45deg,#232832 25%,transparent 25%,transparent 75%,#232832 75%);background-size:20px 20px;background-position:0 0,10px 10px"></canvas></div>
    <div class="hint" style="text-align:center;margin:6px 0 10px">Arrasta a foto para a posicionar</div>
    <label class="field"><span>Zoom</span><input type="range" id="zm" min="1" max="4" step="0.01" value="1" style="width:100%"></label>
    <div class="field"><span>Forma</span><div class="seg" id="sh" style="grid-template-columns:repeat(4,1fr)"><button data-s="sq" class="on">Quadrado</button><button data-s="rd">Redondo</button><button data-s="rr">Cantos</button><button data-s="full">Livre</button></div></div>
    <div class="opt" style="padding:4px 2px 12px"><div class="t"><b>Contorno branco</b></div><button class="sw on" id="ol"></button></div>
    <label class="field"><span>Texto em cima</span><input class="input" id="tt" maxlength="40" placeholder="opcional"></label>
    <label class="field"><span>Texto em baixo</span><input class="input" id="tb" maxlength="40" placeholder="opcional"></label>
    <div class="field"><span>Tamanho e cor do texto</span><div class="row"><input type="range" id="ts" min="30" max="110" value="64" style="flex:1"><div class="seg" id="tc" style="grid-template-columns:repeat(3,44px)"><button data-c="#ffffff" class="on" style="color:#fff">A</button><button data-c="#FFE14D" style="color:#FFE14D">A</button><button data-c="#111111" style="color:#999">A</button></div></div></div>
    <label class="field"><span>Palavras para este sticker</span><input class="input" id="wd" placeholder="ex.: bom dia, bora"></label>
    <button class="btn primary block" id="sv">Guardar no pack “${esc(p.name)}”</button>
  </div></div>`);
  const ov = openOverlay(sheet, { modal: true, onClose: () => render() });
  $('#x', sheet).onclick = () => closeOverlay(ov);
  const cv = $('#cv', sheet), ctx = cv.getContext('2d');
  const im = new Image();
  im.onload = () => draw();
  im.src = url;
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
    while (c.measureText(t).width > 470 && size > 18) { size -= 2; c.font = `900 ${size}px Roboto, "Arial Black", sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = base; c.lineJoin = 'round';
    c.lineWidth = Math.max(6, size / 6);
    c.strokeStyle = st.color === '#111111' ? '#ffffff' : '#000000';
    c.strokeText(t, 256, y); c.fillStyle = st.color; c.fillText(t, 256, y);
    c.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, 512, 512);
    if (!im.width) return;
    const inset = st.outline && st.shape !== 'full' ? 14 : 0;
    const cover = Math.max(512 / im.width, 512 / im.height);
    const sc = cover * st.zoom, w = im.width * sc, h = im.height * sc;
    const maxX = Math.max(0, (w - 512) / 2), maxY = Math.max(0, (h - 512) / 2);
    st.ox = Math.max(-maxX, Math.min(maxX, st.ox)); st.oy = Math.max(-maxY, Math.min(maxY, st.oy));
    ctx.save();
    if (st.shape !== 'full') { shapePath(ctx, inset); ctx.clip(); }
    ctx.drawImage(im, 256 - w / 2 + st.ox, 256 - h / 2 + st.oy, w, h);
    ctx.restore();
    if (inset) { ctx.save(); shapePath(ctx, inset / 2); ctx.lineWidth = inset; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
    text(ctx, st.top, 40, 'top');
    text(ctx, st.bottom, 472, 'bottom');
  }
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = 512 / cv.getBoundingClientRect().width;
    st.ox = drag.ox + (e.clientX - drag.x) * k; st.oy = drag.oy + (e.clientY - drag.y) * k; draw();
  });
  cv.addEventListener('pointerup', () => drag = null);
  $('#zm', sheet).oninput = e => { st.zoom = +e.target.value; draw(); };
  $$('#sh button', sheet).forEach(b => b.onclick = () => { st.shape = b.dataset.s; $$('#sh button', sheet).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#ol', sheet).onclick = e => { st.outline = !st.outline; e.currentTarget.classList.toggle('on', st.outline); draw(); };
  $('#tt', sheet).oninput = e => { st.top = e.target.value; draw(); };
  $('#tb', sheet).oninput = e => { st.bottom = e.target.value; draw(); };
  $('#ts', sheet).oninput = e => { st.size = +e.target.value; draw(); };
  $$('#tc button', sheet).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$('#tc button', sheet).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#sv', sheet).onclick = () => {
    draw();
    const words = $('#wd', sheet).value.split(',').map(x => x.trim()).filter(Boolean);
    let r;
    try { r = JSON.parse(A.saveCreated(packId, cv.toDataURL('image/png'), JSON.stringify(words))); } catch (e) { r = { error: 'erro' }; }
    if (r.error) { toast(r.error); return; }
    S.data = r.data;
    closeOverlay(ov);
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

/* ---------- respostas do lado nativo ---------- */
window.App = {
  onImportProgress(done, total) { busy(`A importar ${done} de ${total}…`); },
  onImported(r) {
    busy(null);
    if (!r || r.cancelled) return;
    reload();
    S.tab = 'packs'; S.packId = r.packId; S.sel = null;
    render();
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
  onBackup(r) {
    busy(null);
    if (!r || r.cancelled) return;
    if (!r.ok) { dialog({ title: 'Não deu', text: r.error || 'Erro', buttons: [{ label: 'OK', cls: 'primary' }] }); return; }
    if (r.restore) { reload(); render(); toast(`${r.packs} pack${r.packs === 1 ? '' : 's'} restaurado${r.packs === 1 ? '' : 's'} ✓`, 3000); }
    else toast('Cópia guardada ✓', 3000);
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
