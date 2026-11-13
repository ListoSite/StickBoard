'use strict';
/*
 * Lê o texto escrito nos stickers (BOM DIA, KKK, NÃO…) para sugerir tags.
 * Usa o Tesseract (offline, dentro da app). Tudo é carregado só quando é preciso.
 * Os ficheiros vão para o "worker" como blobs, para não depender de pedidos feitos dentro dele.
 */
(function () {
  let ready = null;

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function blobUrl(u, type) {
    const b = await (await fetch(u)).blob();
    return URL.createObjectURL(new Blob([b], { type }));
  }

  function init() {
    if (ready) return ready;
    ready = (async () => {
      if (!window.Tesseract) await loadScript('ocr/tesseract.min.js');
      const workerPath = await blobUrl('ocr/worker.min.js', 'application/javascript');
      // o "#…js" faz o Tesseract usar este ficheiro tal e qual
      const corePath = (await blobUrl('ocr/tesseract-core-simd-lstm.wasm.js', 'application/javascript')) + '#core.wasm.js';
      const data = new Uint8Array(await (await fetch('ocr/por-traineddata.bin')).arrayBuffer());
      const w = await Tesseract.createWorker([{ code: 'por', data }], 1, { workerPath, corePath, cacheMethod: 'none', gzip: false });
      await w.setParameters({ tessedit_pageseg_mode: '11' });
      return w;
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }

  function loadImg(url) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  }

  // 3 versões da imagem: normal, só o que é claro (texto branco com contorno) e só o que é escuro
  function variants(img) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 512); x.drawImage(img, 0, 0, 512, 512);
    const base = x.getImageData(0, 0, 512, 512);
    const mk = fn => {
      const cc = document.createElement('canvas'); cc.width = cc.height = 512;
      const d = new ImageData(512, 512);
      for (let i = 0; i < base.data.length; i += 4) {
        const l = (base.data[i] * 299 + base.data[i + 1] * 587 + base.data[i + 2] * 114) / 1000;
        const v = fn(l); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
      cc.getContext('2d').putImageData(d, 0, 0);
      return cc;
    };
    return [c, mk(l => l > 200 ? 0 : 255), mk(l => l < 90 ? 0 : 255)];
  }

  const clean = w => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const plain = s => s.normalize('NFD').replace(/\p{M}/gu, '');

  /** Devolve as frases encontradas (ex.: ["bom dia", "que sono"]), já em minúsculas. */
  async function read(url) {
    const w = await init();
    const img = await loadImg(url);
    const found = new Map();
    for (const v of variants(img)) {
      const r = await w.recognize(v, {}, { blocks: true });
      for (const b of (r.data.blocks || [])) for (const p of b.paragraphs) for (const l of p.lines) {
        const words = l.words
          .filter(x => x.confidence >= 80)
          .map(x => clean(x.text))
          .filter(t => t.length >= 2 && /\p{L}/u.test(t));
        if (!words.length) continue;
        const phrase = words.join(' ');
        const key = plain(phrase);
        if (!found.has(key)) found.set(key, phrase);
      }
    }
    // tira as que já estão contidas numa maior ("bom" dentro de "bom dia")
    const all = [...found.values()];
    return all.filter(a => !all.some(b => b !== a && (' ' + plain(b) + ' ').includes(' ' + plain(a) + ' '))).slice(0, 4);
  }

  window.OCR = { read, init };
})();
