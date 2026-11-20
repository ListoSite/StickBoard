'use strict';
/* O AMBIENTE da conversa na bolha e no teclado de stickers:
   - depois de mandares um sticker, a bolha fica amarela e pergunta «em que situação usaste este sticker?»;
   - a tua resposta fica no sticker e ensina o detetor de ambiente;
   - a barra mostra o ambiente que a app percebeu (🎭) e os stickers desse ambiente. */
(function () {
  const M = window.Match;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const css = document.createElement('style');
  css.textContent = `
.vask{grid-column:1/-1;flex:none;margin:0 12px 8px;background:linear-gradient(180deg,rgba(255,200,61,.20),rgba(255,200,61,.10));border:1px solid rgba(255,200,61,.45);border-radius:14px;padding:7px 8px 8px;color:#FFF3CF;animation:vpop .25s cubic-bezier(.2,.9,.3,1)}
@keyframes vpop{from{transform:scale(.96);opacity:0}}
.vask .vh{display:flex;align-items:center;gap:8px}
.vask .vi{width:34px;height:34px;border-radius:9px;background:rgba(0,0,0,.25);object-fit:contain;flex:none}
.vask .vq{flex:1;min-width:0;font-size:12.5px;line-height:1.25}
.vask .vq b{display:block;color:#FFE08A;font-size:13px}
.vask .vq span{color:#E9D9A8;font-size:11.5px}
.vask .vx{background:rgba(0,0,0,.25);color:#E9D9A8;border:0;border-radius:9px;padding:6px 9px;font-size:11.5px;font-weight:700;flex:none}
.vask .vc{display:flex;gap:6px;margin-top:7px;overflow-x:auto;scrollbar-width:none}
.vask .vc::-webkit-scrollbar{display:none}
.vask .vc button{flex:none;height:32px;padding:0 11px;border-radius:16px;border:0;background:rgba(0,0,0,.28);color:#FFF3CF;font-size:13px;font-weight:700;white-space:nowrap}
.vask .vc button.g{background:#FFC83D;color:#2B1F00;box-shadow:0 0 0 2px rgba(255,200,61,.35)}
.vask .vc button:active{transform:scale(.94)}
.vask.done{display:flex;align-items:center;justify-content:center;min-height:44px;font-weight:700;color:#FFE08A;font-size:13.5px}
.s .vb{position:absolute;bottom:3px;left:5px;font-size:10px}
.vchip{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:0 7px;border-radius:9px;background:rgba(255,200,61,.16);color:#FFD866;font-size:10.5px;font-weight:800;letter-spacing:0;text-transform:none;vertical-align:1px}
`;
  document.head.appendChild(css);

  const vName = k => { const v = M.VIBE[k]; return v ? v.e + ' ' + v.n : ''; };

  /** Depois de mandares um sticker: pergunta a situação, ou (se já sabe) aprende sozinho, devagar. */
  function afterSend(br, p, s, rows, typed, idx, data) {
    let conv = null;
    try {
      conv = M.vibeOf(idx, rows, typed);
      const mode = (data && data.vibeAsk) || 'auto';
      if (M.shouldAsk(s, conv, mode)) {
        const guess = M.vibeGuess(s, conv);
        br.askVibe(JSON.stringify({ p: p.id, f: s.f, v: p.version || 0, guess, words: M.vibeWords(rows, typed) }));
      } else if (conv.top && conv.conf >= 0.6 && mode !== 'off') {
        br.learnVibe(p.id, s.f, conv.top, '[]', 0.25);
      }
    } catch (e) {}
    return conv;
  }

  /**
   * A caixa amarela da pergunta. onDone(dataJson) é chamado depois de responderes/saltares.
   * img(p, f) dá o endereço da imagem do sticker.
   */
  function askBox(br, ask, data, img, onDone) {
    const d = document.createElement('div');
    d.className = 'vask';
    const p = (data.packs || []).find(x => x.id === ask.p);
    const src = p ? img(p, ask.f) : '';
    const guess = ask.guess && M.VIBE[ask.guess] ? ask.guess : null;
    d.innerHTML = `<div class="vh">${src ? `<img class="vi" src="${src}">` : ''}<div class="vq"><b>Em que situação usaste este sticker?</b><span>${guess ? 'Acho que foi ' + esc(vName(guess)) + ' · toca para confirmar' : 'A tua resposta ensina a app'}</span></div><button class="vx">Saltar</button></div>
      <div class="vc">${M.VIBES.map(v => `<button data-v="${v.k}" class="${v.k === guess ? 'g' : ''}">${v.e} ${esc(v.n)}</button>`).join('')}</div>`;
    d.querySelector('.vx').onclick = ev => { ev.stopPropagation(); try { br.skipAsk(); } catch (e) {} onDone(null); };
    d.querySelectorAll('.vc button').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      let r = '';
      try { r = br.learnVibe(ask.p, ask.f, b.dataset.v, JSON.stringify(ask.words || []), 1); } catch (e) {}
      d.className = 'vask done';
      d.textContent = '✓ Guardado: ' + vName(b.dataset.v);
      setTimeout(() => onDone(r || null), 700);
    });
    // a fila de botões desliza para os lados sem abrir/fechar nada
    d.addEventListener('touchmove', ev => ev.stopPropagation(), { passive: true });
    return d;
  }

  /** O pequeno 🎭 com o ambiente que a app percebeu (vazio se não tem certeza). */
  function chip(conv) {
    return conv && conv.top && conv.conf >= 0.3 ? `<span class="vchip">🎭 ${esc(vName(conv.top))}</span>` : '';
  }

  window.VibeUI = { afterSend, askBox, chip, vName };
})();
