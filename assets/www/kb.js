'use strict';
/* Teclado de stickers do StickTag. A parte nativa está em window.KB. */
const K = window.KB;
const M = window.Match;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EM = new Map();
let DATA = { packs: [] }, IDX = [], text = '', tab = 'sug', direct = true;

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
  if (tab !== 'sug' && tab !== 'rec' && !DATA.packs.some(p => p.id === tab)) tab = 'sug';
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
  const items = [['sug', '✨'], ['rec', '🕘']].map(([id, ic]) => `<button class="tab ${tab === id ? 'on' : ''}" data-t="${id}">${ic}</button>`);
  for (const p of DATA.packs) if (p.stickers && p.stickers.length)
    items.push(`<button class="tab ${tab === p.id ? 'on' : ''}" data-t="${esc(p.id)}"><img src="f/${encodeURIComponent(p.id)}/tray.png?v=${p.version || 0}" onerror="this.replaceWith(document.createTextNode('📦'))"></button>`);
  items.push(`<button class="tab" data-t="app">⚙️</button>`);
  t.innerHTML = items.join('');
  t.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    if (b.dataset.t === 'app') { K.openApp(); return; }
    tab = b.dataset.t; renderTabs(); renderGrid(); $('#grid').scrollTop = 0;
  });
}

function tile(p, s) {
  const d = document.createElement('button');
  d.className = 's';
  d.innerHTML = `<img loading="lazy" src="${img(p, s.f)}">`;
  d.onclick = () => { pushRecent(p.id, s.f); K.send(p.id, s.f); };
  return d;
}

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
    const res = M.search(IDX, text, 40);
    if (res.length) res.forEach(r => g.appendChild(tile(r.p, r.s)));
    else {
      addMsg(g, text.trim() ? `Nenhum sticker para <b>«${esc(lastWords(text))}»</b>. Dá palavras ou emojis aos teus stickers no StickTag.` : 'Escreve uma frase no teu teclado normal e depois abre este teclado: aparecem aqui os stickers que combinam.');
      renderRecent(g, true);
    }
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
$('#del').onclick = () => K.backspace();
$('#del').oncontextmenu = e => { e.preventDefault(); K.clearText(); };

window.KBApp = {
  onOpen(o) { text = o.text || ''; direct = !!o.direct; tab = 'sug'; refresh(); $('#grid').scrollTop = 0; },
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
