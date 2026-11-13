'use strict';
/* Teclado de stickers do StickTag. A parte nativa está em window.KB. */
const K = window.KB;
const M = window.Match;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EM = new Map();
let DATA = { packs: [] }, IDX = [], text = '', tab = 'sug', direct = true;
let shufKey = null, shufOrder = [];

const info = e => EM.get(M.stripVS(e));
const img = (p, f) => `f/${encodeURIComponent(p.id)}/${encodeURIComponent(f)}?v=${p.version || 0}`;
function getRecent() { try { return JSON.parse(localStorage.getItem('kbRecent') || '[]'); } catch (e) { return []; } }
function pushRecent(p, f) {
  try {
    const r = getRecent().filter(x => !(x.p === p && x.f === f));
    r.unshift({ p, f });
    localStorage.setItem('kbRecent', JSON.stringify(r.slice(0, 40)));
  } catch (e) {}
}

async function loadEmoji() {
  try {
    const j = await (await fetch('emoji.json')).json();
    j.emojis.forEach(a => EM.set(M.stripVS(a[0]), { e: a[0], n: a[2], pt: a[3] ? a[3].split('|') : [] }));
  } catch (e) {}
}

function refresh() {
  try { DATA = JSON.parse(K.getData()); } catch (e) { DATA = { packs: [] }; }
  IDX = M.buildIndex(DATA, info);
  if (!['sug', 'rec', 'fav'].includes(tab) && !DATA.packs.some(p => p.id === tab)) tab = 'sug';
  $('#shuf').classList.toggle('on', !!DATA.kbShuffle);
  renderTabs(); renderTop(); renderGrid();
}

function lastWords(t) {
  const line = String(t || '').split('\n').pop().trim();
  return line.length > 38 ? '…' + line.slice(-36) : line;
}

function renderTop() {
  const lw = lastWords(text);
  $('#q').innerHTML = lw ? `Para <b>«${esc(lw)}»</b>` : 'Escreve no teu teclado e volta aqui';
  $('#mode').classList.toggle('hidden', direct);
}

function renderTabs() {
  const t = $('#tabs');
  const items = [['sug', '✨'], ['fav', '⭐'], ['rec', '🕘']].map(([id, ic]) => `<button class="tab ${tab === id ? 'on' : ''}" data-t="${id}">${ic}</button>`);
  for (const p of DATA.packs) if (p.stickers && p.stickers.length)
    items.push(`<button class="tab ${tab === p.id ? 'on' : ''}" data-t="${esc(p.id)}"><img src="f/${encodeURIComponent(p.id)}/tray.png?v=${p.version || 0}" onerror="this.replaceWith(document.createTextNode('📦'))"></button>`);
  items.push(`<button class="tab" data-t="app">⚙️</button>`);
  t.innerHTML = items.join('');
  t.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    if (b.dataset.t === 'app') { K.openApp(); return; }
    tab = b.dataset.t; renderTabs(); renderGrid(); $('#grid').scrollTop = 0;
  });
}

function sendIt(p, s) {
  pushRecent(p.id, s.f);
  const words = M.queryTokens(text);
  if (words.length) { try { K.learn(p.id, s.f, JSON.stringify(words)); } catch (e) {} }
  K.send(p.id, s.f);
}

function tile(p, s) {
  const d = document.createElement('button');
  d.className = 's';
  d.innerHTML = `<img loading="lazy" src="${img(p, s.f)}">${s.fav ? '<span class="fv">⭐</span>' : ''}`;
  let timer = null, long = false, sx = 0, sy = 0;
  d.addEventListener('pointerdown', e => {
    long = false; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { long = true; preview(p.id, s.f); }, 450);
  });
  d.addEventListener('pointermove', e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clearTimeout(timer); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => d.addEventListener(ev, () => clearTimeout(timer)));
  d.addEventListener('contextmenu', e => e.preventDefault());
  d.onclick = () => { if (long) { long = false; return; } sendIt(p, s); };
  return d;
}

function preview(pid, f) {
  const x = findSticker(pid, f);
  if (!x) return;
  const { p, s } = x;
  const own = (s.words || []);
  const emo = [];
  for (const e of (s.emojis || [])) for (const w of M.effectiveWords(e, DATA, info)) if (!emo.includes(w)) emo.push(w);
  const learned = Object.keys(s.learn || {}).sort((a, b) => s.learn[b] - s.learn[a]).slice(0, 8);
  const qt = M.queryTokens(text).filter(w => !own.some(o => M.norm(o) === w));
  const pv = $('#pv');
  pv.innerHTML = `<div class="big"><img src="${img(p, s.f)}"></div>
    <div class="side">
      <div style="font-size:15px">${(s.emojis || []).map(esc).join(' ') || '<span style="color:#6B7482;font-size:12px">sem emoji</span>'}</div>
      <div class="ws">${own.map(w => `<span class="own">${esc(w)}</span>`).join('')}${learned.map(w => `<span class="lr">${esc(w)}</span>`).join('')}${emo.slice(0, 10).map(w => `<span>${esc(w)}</span>`).join('')}</div>
      <div class="acts">
        <button class="pri" id="pv-send">Enviar</button>
        <button id="pv-fav">${s.fav ? '★ Favorito' : '☆ Favorito'}</button>
        <button id="pv-gal">💾 Galeria</button>
        <button id="pv-close">Fechar</button>
        ${qt.length ? `<button class="wide" id="pv-add">＋ Ligar a «${esc(qt.slice(-3).join(' '))}»</button>` : ''}
      </div>
    </div>`;
  pv.classList.remove('hidden');
  $('#pv-send').onclick = () => { closePv(); sendIt(p, s); };
  $('#pv-close').onclick = closePv;
  $('#pv-fav').onclick = () => {
    try { DATA = JSON.parse(K.setFav(p.id, s.f, !s.fav)); } catch (e) {}
    IDX = M.buildIndex(DATA, info);
    flash(!s.fav ? 'Adicionado aos favoritos ⭐' : 'Tirado dos favoritos');
    preview(pid, f); renderGrid();
  };
  $('#pv-gal').onclick = () => { K.saveToGallery(p.id, s.f); flash('A guardar…'); };
  const add = $('#pv-add');
  if (add) add.onclick = () => {
    try { DATA = JSON.parse(K.addWords(p.id, s.f, JSON.stringify(qt.slice(-3)))); } catch (e) {}
    IDX = M.buildIndex(DATA, info);
    flash('Palavras ligadas ✓');
    preview(pid, f);
  };
}
function closePv() { $('#pv').classList.add('hidden'); }

function findSticker(pid, f) {
  const p = DATA.packs.find(x => x.id === pid);
  const s = p && p.stickers.find(x => x.f === f);
  return s ? { p, s } : null;
}

function addMsg(g, html, cls = 'msg') { const m = document.createElement('div'); m.className = cls; m.innerHTML = html; g.appendChild(m); }

function renderRecent(g, label) {
  const r = getRecent().map(x => findSticker(x.p, x.f)).filter(Boolean);
  if (label && r.length) addMsg(g, 'Recentes', 'lbl');
  r.forEach(x => g.appendChild(tile(x.p, x.s)));
  return r.length;
}

function renderGrid() {
  const g = $('#grid');
  g.innerHTML = '';
  const total = DATA.packs.reduce((n, p) => n + (p.stickers ? p.stickers.length : 0), 0);
  if (!total) { addMsg(g, 'Ainda não tens stickers. Toca em ⚙️ para abrir o StickTag e criar um pack.'); return; }
  if (tab === 'sug') {
    let res = M.search(IDX, text, 60);
    if (DATA.kbShuffle && res.length > 1) {
      // ordem aleatória (fica igual enquanto a frase não muda)
      const key = text + '|' + res.length;
      if (key !== shufKey) {
        shufKey = key;
        shufOrder = res.map(r => r.p.id + '/' + r.s.f);
        for (let i = shufOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shufOrder[i], shufOrder[j]] = [shufOrder[j], shufOrder[i]]; }
      }
      const pos = new Map(shufOrder.map((k, i) => [k, i]));
      res = res.slice().sort((a, b) => (pos.get(a.p.id + '/' + a.s.f) ?? 999) - (pos.get(b.p.id + '/' + b.s.f) ?? 999));
    }
    if (res.length) res.forEach(r => g.appendChild(tile(r.p, r.s)));
    else {
      addMsg(g, text.trim() ? `Nenhum sticker para <b>«${esc(lastWords(text))}»</b>. Dá palavras ou emojis aos teus stickers no StickTag.` : 'Escreve uma frase no teu teclado normal e depois abre este teclado: aparecem aqui os stickers que combinam.');
      renderRecent(g, true);
    }
  } else if (tab === 'fav') {
    let n = 0;
    for (const p of DATA.packs) for (const s of p.stickers) if (s.fav) { g.appendChild(tile(p, s)); n++; }
    if (!n) addMsg(g, 'Carrega sem largar num sticker e toca em ☆ Favorito para o pôr aqui.');
  } else if (tab === 'rec') {
    if (!renderRecent(g, false)) addMsg(g, 'Os stickers que enviares aparecem aqui.');
  } else {
    const p = DATA.packs.find(x => x.id === tab);
    if (p) p.stickers.forEach(s => g.appendChild(tile(p, s)));
  }
}

let flashT = null;
function flash(t) {
  const f = $('#flash'); f.textContent = t; f.classList.remove('hidden');
  clearTimeout(flashT); flashT = setTimeout(() => f.classList.add('hidden'), 1500);
}

$('#back').onclick = () => K.back();
$('#shuf').onclick = () => {
  DATA.kbShuffle = !DATA.kbShuffle;
  K.setOption('kbShuffle', !!DATA.kbShuffle);
  shufKey = null;
  $('#shuf').classList.toggle('on', !!DATA.kbShuffle);
  flash(DATA.kbShuffle ? 'Ordem aleatória ligada 🔀' : 'Ordem por relevância');
  if (tab === 'sug') renderGrid();
};
$('#del').onclick = () => K.backspace();
$('#del').oncontextmenu = e => { e.preventDefault(); K.clearText(); };

window.KBApp = {
  onOpen(o) { text = o.text || ''; direct = !!o.direct; tab = 'sug'; shufKey = null; closePv(); refresh(); $('#grid').scrollTop = 0; },
  onSaved(r) { flash(r && r.ok ? 'Guardado na galeria (Imagens/StickTag) ✓' : 'Não guardei: ' + ((r && r.error) || 'erro')); },
  onText(t) { text = t || ''; renderTop(); if (tab === 'sug') renderGrid(); },
  onSent(r) {
    if (!r || !r.ok) flash('Não consegui enviar');
    else if (r.mode === 'share') flash('A abrir a partilha…');
    else flash('Enviado ✓');
  }
};

(async function () {
  await loadEmoji();
  try { text = K.getText(); } catch (e) {}
  refresh();
})();
