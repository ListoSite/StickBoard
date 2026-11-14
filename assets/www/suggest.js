'use strict';
/*
 * Sugestões inteligentes do StickTag.
 *  - words(): palavras novas para um emoji ou um sticker, a partir das que já lá estão.
 *  - complete(): completa a palavra que estás a escrever.
 *  - emojis(): emojis em falta para um sticker, cada um com o motivo.
 * Fontes: a base de palavras (lex.js), sinónimos (syn.json), as palavras Unicode de cada emoji,
 * e o teu próprio uso (outros stickers, palavras dos emojis, o que o teclado aprendeu, imagens parecidas).
 */
(function () {
  const M = window.Match;
  const norm = M.norm, stripVS = M.stripVS, stem = M.stem, STOP = M.STOP;
  const GENERIC = new Set(['cara', 'rosto', 'face', 'animal', 'simbolo', 'objeto', 'pessoa', 'sinal', 'emocao', 'gesto', 'corpo',
    'mao', 'maos', 'comida', 'natureza', 'atividade', 'viagem', 'lugar', 'emoji', 'smiley', 'olho', 'olhos', 'boca', 'aberta', 'aberto',
    'fechado', 'fechada', 'com', 'cor', 'tom', 'pele', 'homem', 'mulher', 'pessoa', 'grande', 'pequeno', 'desenho', 'contorno']);
  const toks = s => norm(s).replace(/[^a-z0-9ç\s'-]/g, ' ').split(/[\s'-]+/).filter(Boolean);
  // formas de escrever a mesma coisa em conversa
  const CANON = (M.CANON && Object.assign({ tô: 'estou', cê: 'voce', amn: 'amanha' }, M.CANON)) || { tou: 'estou', to: 'estou', tô: 'estou', ta: 'esta', tas: 'estas', tamos: 'estamos', tava: 'estava', pra: 'para', pro: 'para',
    q: 'que', k: 'que', n: 'nao', nd: 'nada', tb: 'tambem', tbm: 'tambem', mt: 'muito', mto: 'muito', mta: 'muita', pq: 'porque', vc: 'voce',
    ce: 'voce', cê: 'voce', msm: 'mesmo', td: 'tudo', tds: 'todos', blz: 'beleza', vlw: 'valeu', obg: 'obrigado', pfv: 'por favor', pf: 'por favor',
    dps: 'depois', hj: 'hoje', amn: 'amanha', agr: 'agora', qnd: 'quando', cmg: 'comigo', ctg: 'contigo', bjs: 'beijos', bj: 'beijo', sla: 'sei la',
    tmb: 'tambem', oq: 'o que', qq: 'qualquer', ngm: 'ninguem', vdd: 'verdade' };
  const ptoks = str => toks(str).flatMap(t => (CANON[t] || t).split(' '));
  const pstem = t => t.length >= 4 ? stem(t) : t;
  function tri(str) {
    const x = '  ' + str.replace(/\s+/g, ' ') + ' ', out = new Set();
    for (let i = 0; i + 3 <= x.length; i++) out.add(x.slice(i, i + 3));
    return out;
  }
  const dice = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return 2 * n / (a.size + b.size); };
  /** Quão parecidas são duas frases (0 a 1): palavras em comum (as pequenas contam menos), a ordem e a escrita. */
  function phraseSim(A, B) {
    const wt = t => STOP.has(t) ? 0.45 : 1;
    const as = A.st, bs = B.st;
    const used = new Array(bs.length).fill(false);
    let m = 0;
    as.forEach((x, i) => { const j = bs.findIndex((y, k) => !used[k] && y === x); if (j >= 0) { used[j] = true; m += wt(A.tk[i]); } });
    const wa = A.tk.reduce((a, t) => a + wt(t), 0), wb = B.tk.reduce((a, t) => a + wt(t), 0);
    const d = 2 * m / (wa + wb || 1);
    // a ordem das palavras (maior subsequência comum)
    const L = Array.from({ length: as.length + 1 }, () => new Array(bs.length + 1).fill(0));
    for (let i = 1; i <= as.length; i++) for (let j = 1; j <= bs.length; j++) L[i][j] = as[i - 1] === bs[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    const ord = L[as.length][bs.length] / Math.max(as.length, bs.length);
    const t = dice(A.tri, B.tri);
    return Math.max(d * 0.75 + ord * 0.25, t * 0.92);
  }
  function phraseOf(str) { const tk = ptoks(str); return { tk, st: tk.map(pstem), tri: tri(tk.join(' ')) }; }
  /** Frase = 3+ palavras, ou 2 com uma palavra pequena ("a sério", "isso mesmo"). */
  const isPhrase = n => { const t = toks(n); return t.length >= 3 || (t.length === 2 && (t.some(x => STOP.has(x)) || (L && L.phr.has(n)))); };

  /* ---------- índices (feitos uma vez) ---------- */
  let L = null;          // base de palavras
  let SYN = null, SYND = null; // sinónimos (carregados à parte)
  let EM = [], EIDX = null; // emojis Unicode
  let synLoading = null;

  function segEmojis(str) { try { return M.emojisIn(str); } catch (e) { return []; } }

  function buildLex() {
    if (L) return L;
    L = { cl: [], term: new Map(), tok: new Map(), emo: new Map(), disp: new Map(), ph: [], phBy: new Map(), byStart: new Map(), phr: new Set(), stemIdx: new Map() };
    const nAll = (window.LEX || []).length;
    for (const line of (window.LEX || []).concat(window.LEX_ADULT || [])) {
      const bar = line.indexOf('|');
      const emos = segEmojis(line.slice(0, bar)).map(stripVS);
      const terms = line.slice(bar + 1).split(',').map(x => x.trim()).filter(Boolean);
      const ci = L.cl.length;
      L.cl.push({ emos, terms, n: terms.map(norm), adult: L.cl.length >= nAll });
      const isFr = window.LEX_FR != null && ci >= window.LEX_FR && ci < (window.LEX_CA != null ? window.LEX_CA : 1e9);
      terms.forEach((t, pos) => {
        const n = norm(t);
        if (isFr && n.includes(' ')) L.phr.add(n);
        if (!L.disp.has(n) || /[^\x00-\x7f]/.test(t)) L.disp.set(n, t);
        if (!L.term.has(n)) L.term.set(n, []);
        L.term.get(n).push([ci, pos]);
        const tk = toks(t);
        if (tk.length > 1) for (const x of tk) if (x.length >= 3 && !STOP.has(x)) {
          if (!L.tok.has(x)) L.tok.set(x, new Set());
          L.tok.get(x).add(ci);
        }
      });
      emos.forEach(e => { if (!L.emo.has(e)) L.emo.set(e, []); L.emo.get(e).push(ci); });
    }
    // índices para encontrar frases parecidas e palavras mal escritas
    for (const n of L.term.keys()) {
      if (n.includes(' ')) {
        const f = phraseOf(n); f.n = n;
        const id = L.ph.length; L.ph.push(f);
        new Set(f.st).forEach(x => { if (!L.phBy.has(x)) L.phBy.set(x, []); L.phBy.get(x).push(id); });
      } else if (n.length >= 4) {
        const k = n.slice(0, 2);
        if (!L.byStart.has(k)) L.byStart.set(k, []);
        L.byStart.get(k).push(n);
      }
      if (!n.includes(' ') && n.length >= 3) {
        const k = pstem(n);
        if (k.length >= 3) { if (!L.stemIdx.has(k)) L.stemIdx.set(k, []); L.stemIdx.get(k).push(n); }
      }
    }
    return L;
  }

  // verbos irregulares mais usados em conversa → infinitivo
  const IRR = { fez: 'fazer', fiz: 'fazer', faz: 'fazer', fazes: 'fazer', fizeste: 'fazer', vi: 'ver', viu: 'ver', viste: 'ver', ves: 'ver', ve: 'ver',
    vejo: 'ver', foi: 'ir', fui: 'ir', foste: 'ir', vou: 'ir', vais: 'ir', vai: 'ir', vamos: 'ir', disse: 'dizer', disseste: 'dizer', diz: 'dizer',
    dizes: 'dizer', digo: 'dizer', pode: 'poder', posso: 'poder', podes: 'poder', quis: 'querer', quer: 'querer', queres: 'querer', quero: 'querer',
    tive: 'ter', teve: 'ter', tens: 'ter', tenho: 'ter', vim: 'vir', veio: 'vir', vens: 'vir', venho: 'vir', pus: 'por', pos: 'por', sei: 'saber',
    sabes: 'saber', soube: 'saber', da: 'dar', deu: 'dar', dei: 'dar', dou: 'dar', traz: 'trazer', trouxe: 'trazer', durmo: 'dormir', dorme: 'dormir',
    sinto: 'sentir', sente: 'sentir', minto: 'mentir', mente: 'mentir', peco: 'pedir', pede: 'pedir', ouco: 'ouvir', ouve: 'ouvir', perco: 'perder',
    perdeste: 'perder', perdi: 'perder', caiu: 'cair', cai: 'cair', sai: 'sair', saiu: 'sair', morreu: 'morrer', morri: 'morrer', morro: 'morrer' };
  const VERB_END = ['ariamos', 'eriamos', 'iriamos', 'assemos', 'essemos', 'issemos', 'avamos', 'aramos', 'eramos', 'iramos', 'astes', 'estes', 'istes',
    'ando', 'endo', 'indo', 'aste', 'este', 'iste', 'aram', 'eram', 'iram', 'avam', 'ava', 'avas', 'ia', 'ias', 'iam', 'amos', 'emos', 'imos', 'arei',
    'erei', 'irei', 'ara', 'era', 'ira', 'aria', 'eria', 'iria', 'asse', 'esse', 'isse', 'ado', 'ada', 'ados', 'adas', 'ido', 'ida', 'idos', 'idas',
    'ei', 'ou', 'eu', 'iu', 'am', 'em', 'as', 'es', 'a', 'e', 'o', 'i'];
  /** Outras formas da mesma palavra que existem na base ou nos sinónimos (chupa → chupar, comeu → comer, miúdas → miúda). */
  function sisters(n) {
    const lex = buildLex();
    const out = new Set();
    const known = x => lex.term.has(x) || (SYN && SYN.has(x));
    if (IRR[n]) out.add(IRR[n]);
    for (const e of VERB_END) if (n.endsWith(e) && n.length - e.length >= 2) {
      const r = n.slice(0, n.length - e.length);
      for (const v of [r + 'ar', r + 'er', r + 'ir']) if (v !== n && known(v)) out.add(v);
    }
    if (n.endsWith('oes')) out.add(n.slice(0, -3) + 'ao');
    if (n.endsWith('s') && known(n.slice(0, -1))) out.add(n.slice(0, -1));
    for (const [a, b] of [['inho', 'o'], ['inha', 'a'], ['zinho', ''], ['zinha', ''], ['a', 'o'], ['o', 'a'], ['as', 'o'], ['os', 'o']])
      if (n.endsWith(a) && n.length - a.length >= 2) { const v = n.slice(0, n.length - a.length) + b; if (v !== n && known(v)) out.add(v); }
    // palavras da base com a mesma raiz
    const k = pstem(n);
    if (k.length >= 3) for (const t of (lex.stemIdx.get(k) || [])) if (t !== n) out.add(t);
    out.delete(n);
    return [...out].slice(0, 8);
  }
  /** Expressões da base que têm esta palavra (ou outra forma dela). */
  function phrasesWith(n, extra) {
    const lex = buildLex();
    const keys = new Set([pstem(n)].concat((extra || []).map(pstem)).filter(x => x.length >= 3));
    const out = new Map();
    for (const k of keys) for (const id of (lex.phBy.get(k) || [])) { const f = lex.ph[id]; if (!out.has(f.n)) out.set(f.n, f.tk.length); }
    return [...out].sort((a, b) => a[1] - b[1]).slice(0, 30).map(x => x[0]);
  }

  /**
   * Termos da base parecidos com o que escreveste: o próprio, frases com o mesmo sentido
   * ("isso dizes-te tu" ≈ "isso dizes tu") ou a palavra bem escrita. Devolve [[termo, semelhança]].
   */
  const mtCache = new Map();
  function matchTerms(seed) {
    const lex = buildLex();
    const n = norm(seed);
    if (mtCache.has(n)) return mtCache.get(n);
    let out = [];
    if (lex.term.has(n)) out.push([n, 1]);
    const A = phraseOf(n);
    const cn = A.tk.join(' ');
    if (cn !== n && lex.term.has(cn)) out.push([cn, 0.98]);
    if (A.tk.length >= 2) {
      const cand = new Map();
      // só procura pelas palavras com significado (as pequenas aparecem em todo o lado)
      const keys = new Set(A.st.filter((x, i) => !STOP.has(A.tk[i])));
      // frase só com palavras pequenas ("e eu com isso"): tem de ser muito parecida
      const minSim = keys.size ? 0.55 : 0.74;
      if (!keys.size) A.st.forEach(x => keys.add(x));
      for (const x of keys) for (const id of (lex.phBy.get(x) || [])) cand.set(id, 1);
      for (const id of cand.keys()) {
        const B = lex.ph[id];
        if (B.n === n || B.n === cn) continue;
        const v = phraseSim(A, B);
        if (v >= minSim) out.push([B.n, v]);
      }
    } else if (!out.length && n.length >= 4) {
      const tr = tri(n);
      for (const w of (lex.byStart.get(n.slice(0, 2)) || [])) { const v = dice(tr, tri(w)); if (v >= 0.62) out.push([w, v * 0.9]); }
    }
    out.sort((a, b) => b[1] - a[1]);
    out = out.slice(0, 5);
    if (mtCache.size > 500) mtCache.clear();
    mtCache.set(n, out);
    return out;
  }

  /** Lista de emojis da app ({e, n, pt, npt}). */
  function setEmojis(list) { EM = list || []; EIDX = null; }
  function emoIndex() {
    if (EIDX) return EIDX;
    EIDX = { kw: new Map(), by: new Map() };
    EM.forEach((o, i) => {
      EIDX.by.set(stripVS(o.e), o);
      const seen = new Set();
      (o.npt || []).forEach((w, k) => {
        if (!w || seen.has(w)) return; seen.add(w);
        if (!EIDX.kw.has(w)) EIDX.kw.set(w, []);
        EIDX.kw.get(w).push([i, k === 0 ? 1 : 0.7]);
        const parts = toks(w);
        if (parts.length > 1) for (const t of parts) if (t.length >= 4 && !STOP.has(t) && !GENERIC.has(t)) {
          const key = '~' + t;
          if (!EIDX.kw.has(key)) EIDX.kw.set(key, []);
          EIDX.kw.get(key).push([i, 0.4]);
        }
      });
    });
    return EIDX;
  }
  function emoKeywords(e) {
    const o = emoIndex().by.get(stripVS(e));
    if (!o) return [];
    const out = [];
    for (const w of [o.n].concat(o.pt || [])) {
      const n = norm(w), nw = n.split(/\s+/).length;
      if (!n || n.length < 3 || nw > 3 || GENERIC.has(n) || /^(cara|rosto|mao|maos|pessoa|homem|mulher|gato) /.test(n)) continue;
      out.push(w);
    }
    return out;
  }

  function loadSyn() {
    if (SYN || synLoading) return synLoading || Promise.resolve();
    synLoading = fetch('syn.json').then(r => r.json()).then(j => {
      SYN = new Map(); SYND = new Map();
      for (const k of Object.keys(j)) { const n = norm(k); SYN.set(n, j[k].split('|')); SYND.set(n, k); }
    }).catch(() => { SYN = new Map(); });
    return synLoading;
  }

  /* ---------- o teu uso ---------- */
  function personal(data) {
    const P = { byWord: new Map(), byEmo: new Map(), emoWords: [], all: new Map() };
    for (const p of (data && data.packs) || []) for (const s of p.stickers || []) {
      for (const w of s.words || []) {
        const n = norm(w); if (!n) continue;
        if (!P.byWord.has(n)) P.byWord.set(n, []);
        P.byWord.get(n).push(s);
        if (!P.all.has(n)) P.all.set(n, w);
      }
      for (const e of s.emojis || []) {
        const k = stripVS(e);
        if (!P.byEmo.has(k)) P.byEmo.set(k, []);
        P.byEmo.get(k).push(s);
      }
    }
    const ew = (data && data.emojiWords) || {};
    for (const k of Object.keys(ew)) {
      const list = ew[k] || [];
      P.emoWords.push({ e: k, list, n: list.map(norm) });
      list.forEach(w => { const n = norm(w); if (n && !P.all.has(n)) P.all.set(n, w); });
    }
    return P;
  }

  /* ---------- palavras ---------- */
  function okWord(n) {
    if (!n || n.length < 2) return false;
    if (STOP.has(n) && n.length < 4) return false;
    if (GENERIC.has(n)) return false;
    if (n.split(/\s+/).length > 8) return false;
    return true;
  }

  /**
   * ctx: { words:[…já escolhidas], emojis:[…], data, avoid:[…palavras a não repetir], limit }
   * Devolve [{ w, score, src:'teu'|'grupo'|'sin'|'unicode' }]
   */
  function words(ctx) {
    const lex = buildLex();
    const data = ctx.data || {};
    const P = personal(data);
    const have = (ctx.words || []).map(norm).filter(Boolean);
    const haveSet = new Set(have);
    const haveStems = new Set(have.filter(x => !x.includes(' ') && x.length >= 4).map(stem));
    const haveSt = new Set(have.filter(x => x.includes(' ')).map(x => 'f:' + ptoks(x).map(pstem).join(' ')));
    // quase iguais às que já tens ("isso dizes tu" quando já tens "isso dizes-te tu")
    const near = new Set();
    for (const h of have) if (h.includes(' ')) for (const [t, v] of matchTerms(h)) if (v >= 0.84) near.add(t);
    const soft = new Set((ctx.avoid || []).map(norm));
    const C = new Map();
    const add = (w, sc, src, seed) => {
      const n = norm(w);
      if (!okWord(n) || haveSet.has(n)) return;
      if (!n.includes(' ') && n.length >= 4 && haveStems.has(stem(n))) return;
      if (n.includes(' ') && (haveSt.has('f:' + ptoks(n).map(pstem).join(' ')) || near.has(n))) return;
      let c = C.get(n);
      if (!c) { c = { w, s: 0, src: {}, sup: new Set() }; C.set(n, c); }
      c.s += sc; c.src[src] = (c.src[src] || 0) + sc; c.sup.add(seed);
    };
    const adultOk = !!ctx.adult;
    const addCluster = (ci, wt, seed) => {
      const cl = lex.cl[ci], size = cl.terms.length;
      if (cl.adult && !adultOk) return;
      const k = wt / (0.75 + size / 70);
      cl.terms.forEach((t, pos) => add(t, k * (1 - 0.35 * pos / size), 'grupo', seed));
    };

    // 1) a partir das palavras que já lá estão
    for (const seed of have) {
      const mt = matchTerms(seed);
      for (const [t, v] of mt) for (const [ci, pos] of lex.term.get(t)) addCluster(ci, Math.pow(v, 1.6) * (1 - 0.5 * pos / lex.cl[ci].terms.length), 'w:' + seed);
      if (!mt.length || mt[0][1] < 0.6) {
        const tk = toks(seed).filter(x => x.length >= 3 && !STOP.has(x));
        for (const x of tk) {
          for (const [ci, pos] of (lex.term.get(x) || [])) addCluster(ci, 0.5 * (1 - 0.5 * pos / lex.cl[ci].terms.length), 'w:' + seed);
          for (const ci of (lex.tok.get(x) || [])) addCluster(ci, 0.3, 'w:' + seed);
        }
      }
      const single = !seed.includes(' ');
      const sis = single ? sisters(seed) : [];
      // outras formas da palavra (chupa → chupar): os grupos delas contam quase como a própria
      if (!lex.term.has(seed)) for (const t of sis) for (const [ci, pos] of (lex.term.get(t) || [])) addCluster(ci, 0.8 * (1 - 0.5 * pos / lex.cl[ci].terms.length), 'w:' + seed);
      // sinónimos (da palavra e das outras formas dela)
      if (SYN) {
        const ss = (SYN.get(seed) || []).concat(...sis.map(t => SYN.get(t) || []));
        ss.slice(0, 16).forEach((w, i) => add(w, 0.55 * (1 - Math.min(i, 10) * 0.05), 'sin', 'w:' + seed));
      }
      // expressões que têm esta palavra ("chupa" → "chupa esta", "toma que é para aprenderes")
      if (single) phrasesWith(seed, sis).forEach((t, i) => add(lex.disp.get(t) || t, 0.42 * (1 - i * 0.015), 'grupo', 'w:' + seed));
      // emojis Unicode que têm esta palavra → as outras palavras deles
      const hits = (emoIndex().kw.get(seed) || emoIndex().kw.get('~' + seed) || []).slice(0, 6);
      for (const [i, wt] of hits) {
        const o = EM[i];
        emoKeywords(o.e).slice(0, 8).forEach(w => add(w, 0.22 * wt, 'unicode', 'w:' + seed));
        for (const ci of (lex.emo.get(stripVS(o.e)) || [])) addCluster(ci, 0.25 * wt, 'w:' + seed);
      }
      // o teu uso: outros stickers e emojis com esta palavra
      for (const s of (P.byWord.get(seed) || []).slice(0, 40)) for (const w of s.words || []) add(w, 0.9, 'teu', 'w:' + seed);
      for (const x of P.emoWords) if (x.n.includes(seed)) x.list.forEach(w => add(w, 0.75, 'teu', 'w:' + seed));
    }

    // 2) a partir dos emojis
    for (const e of (ctx.emojis || [])) {
      const k = stripVS(e);
      for (const ci of (lex.emo.get(k) || [])) addCluster(ci, 0.85, 'e:' + k);
      emoKeywords(e).slice(0, 14).forEach((w, i) => add(w, 0.45 * (1 - i * 0.03), 'unicode', 'e:' + k));
      for (const s of (P.byEmo.get(k) || []).slice(0, 60)) {
        for (const w of s.words || []) add(w, 0.6, 'teu', 'e:' + k);
        for (const l of M.learned(s)) add(l.w, 0.45 + 0.1 * Math.min(l.eff, 5), 'teu', 'e:' + k);
      }
      // o que este emoji aprendeu contigo
      for (const l of M.emojiLearned(data, k, true).slice(0, 20)) add(l.w, 0.5 + 0.12 * Math.min(l.eff, 6) + (l.d >= 2 ? 0.3 : 0), 'teu', 'e:' + k);
    }

    const out = [];
    for (const [n, c] of C) {
      let sc = c.s * (1 + 0.45 * (c.sup.size - 1));
      const nw = n.split(/\s+/).length;
      if (nw > 6) sc *= 0.85;
      if (soft.has(n)) sc *= 0.3;
      const src = (c.src.teu || 0) >= 0.6 ? 'teu' : Object.keys(c.src).sort((a, b) => c.src[b] - c.src[a])[0];
      out.push({ w: c.w, n, score: sc, src, phrase: isPhrase(n) });
    }
    out.sort((a, b) => b.score - a.score);
    // o teclado já junta masculino/feminino/plural (sonolento = sonolenta): fica só um
    const seenStem = new Set(), res = [];
    for (const x of out) {
      const k = x.n.includes(' ') ? 'f:' + ptoks(x.n).map(pstem).join(' ') : x.n.length >= 4 ? stem(x.n) : null;
      if (k && seenStem.has(k)) continue;
      if (k) seenStem.add(k);
      res.push(x);
      if (res.length >= (ctx.limit || 30)) break;
    }
    return res;
  }

  /** Completa o que estás a escrever (ex.: "sau" → saudade, saudades). */
  function complete(typed, ctx) {
    const t = norm(typed);
    if (t.length < 2) return [];
    const lex = buildLex();
    const have = new Set((ctx.words || []).map(norm));
    const rel = new Map(words(Object.assign({}, ctx, { limit: 300 })).map(x => [x.n, x.score]));
    const P = personal(ctx.data || {});
    const C = new Map();
    const starts = n => n.startsWith(t) || n.split(/\s+/).some(x => x.startsWith(t));
    const add = (w, sc) => { const n = norm(w); if (n === t || have.has(n) || !okWord(n)) return; const c = C.get(n); if (!c || c.s < sc) C.set(n, { w: lex.disp.get(n) || w, s: sc }); };
    const okT = list => ctx.adult || list.some(([ci]) => !lex.cl[ci].adult);
    for (const [n, list] of lex.term) if (starts(n) && okT(list)) add(lex.disp.get(n), 0.6 + 0.15 * list.length + (n.startsWith(t) ? 0.3 : 0) - n.length * 0.01 + (rel.get(n) || 0) * 2);
    for (const [n, w] of P.all) if (starts(n)) add(w, 1.2 + (rel.get(n) || 0) * 2);
    if (t.includes(' ')) for (const [n, v] of matchTerms(t)) if (v >= 0.55 && okT(lex.term.get(n))) add(lex.disp.get(n) || n, 1 + v * 2 + (rel.get(n) || 0));
    if (SYN && t.length >= 3) for (const [n] of SYN) if (n.startsWith(t)) add(SYND.get(n) || n, 0.3 + (rel.get(n) || 0) * 2 - n.length * 0.01);
    return [...C.values()].sort((a, b) => b.s - a.s).slice(0, 10).map(x => x.w);
  }

  /* ---------- emojis ---------- */
  const HEART = { vermelho: '❤️', rosa: '🩷', laranja: '🧡', amarelo: '💛', verde: '💚', azul: '💙', roxo: '💜', preto: '🖤', branco: '🤍', castanho: '🤎' };

  /** A cor que mais se vê (ignora o fundo cinzento da impressão). col = 48 números (4×4 RGB). */
  function mainColour(col) {
    if (!col || col.length < 48) return null;
    const cnt = {};
    let n = 0;
    for (let i = 0; i < 48; i += 3) {
      const r = col[i], g = col[i + 1], b = col[i + 2];
      if (Math.abs(r - 128) < 14 && Math.abs(g - 128) < 14 && Math.abs(b - 128) < 14) continue;
      n++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx - mn;
      let name;
      if (sat < 30) name = l < 60 ? 'preto' : l > 200 ? 'branco' : null;
      else {
        let h; const d = sat;
        if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
        if (h < 15 || h >= 340) name = (l > 170 ? 'rosa' : 'vermelho');
        else if (h < 40) name = l < 110 ? 'castanho' : 'laranja';
        else if (h < 70) name = 'amarelo';
        else if (h < 165) name = 'verde';
        else if (h < 255) name = 'azul';
        else if (h < 300) name = 'roxo';
        else name = 'rosa';
      }
      if (name) cnt[name] = (cnt[name] || 0) + 1;
    }
    if (n < 4) return null;
    const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    return best && cnt[best] >= n * 0.5 ? best : null;
  }

  /**
   * ctx: { emojis:[…já tem], words:[…], learned:[{w,eff}], ocr:[frases], packName, data, self:{p,f},
   *        similar:[{p,f,w,same}], col:[48 números], limit }
   * Devolve [{ e, score, why:[texto…] }]
   */
  function emojis(ctx) {
    const lex = buildLex();
    const data = ctx.data || {};
    const P = personal(data);
    const EI = emoIndex();
    const have = new Set((ctx.emojis || []).map(stripVS));
    const C = new Map();
    const add = (e, sc, key, txt) => {
      const k = stripVS(e);
      if (!k || have.has(k)) return;
      let c = C.get(k);
      if (!c) { c = { e: (EI.by.get(k) || { e }).e, s: 0, why: new Map() }; C.set(k, c); }
      c.s += sc;
      const r = c.why.get(txt);
      if (r) r.s += sc; else c.why.set(txt, { s: sc, txt });
    };
    const curated = {};
    // emojis ligados a uma palavra: base de palavras, as tuas palavras dos emojis e a lista Unicode
    function byWord(word, wt, txt) {
      const n = norm(word);
      if (!okWord(n)) return;
      let cls = [];
      let mt = matchTerms(n);
      if (!mt.length && !n.includes(' ')) mt = sisters(n).filter(t => lex.term.has(t)).map(t => [t, 0.8]);
      for (const [t, v] of mt) for (const [ci, pos] of lex.term.get(t)) if (ctx.adult || !lex.cl[ci].adult) cls.push([ci, pos, v]);
      for (const [ci, pos, v] of cls) {
        const cl = lex.cl[ci];
        const k = wt * Math.pow(v, 1.6) * (1 - 0.5 * pos / cl.terms.length) / Math.pow(cls.length, 0.25);
        cl.emos.forEach((e, i) => add(e, k * (i === 0 ? 1 : 0.7), 'w:' + n, txt));
      }
      for (const x of P.emoWords) if (x.n.includes(n)) add(x.e, wt * 1.3, 'w:' + n, txt);
      const hits = n.length >= 4 || n.length >= 3 && cls.length ? EI.kw.get(n) || EI.kw.get('~' + n) || [] : [];
      const k = hits.length > 10 ? 10 / hits.length : 1;
      hits.slice(0, 30).forEach(([i, w]) => add(EM[i].e, wt * 0.75 * w * k, 'w:' + n, txt));
    }
    for (const w of ctx.words || []) {
      byWord(w, 1, `escreveste «${w}» nas palavras`);
      const tk = toks(w).filter(x => x.length >= 3 && !STOP.has(x));
      if (tk.length > 1) tk.forEach(x => byWord(x, 0.45, `escreveste «${w}» nas palavras`));
    }
    for (const l of ctx.learned || []) byWord(l.w, 0.35 + 0.12 * Math.min(l.eff, 5), `escreves «${l.w}» antes de o mandar`);
    for (const ph of ctx.ocr || []) {
      byWord(ph, 0.95, `a imagem diz «${ph}»`);
      const tk = toks(ph).filter(x => x.length >= 3 && !STOP.has(x));
      if (tk.length > 1) tk.forEach(x => byWord(x, 0.5, `a imagem diz «${ph}»`));
    }
    if (ctx.packName) for (const x of toks(ctx.packName).filter(x => x.length >= 3 && !STOP.has(x))) byWord(x, 0.3, `o pack chama-se «${ctx.packName}»`);

    // emojis que já tem → os que costumam andar com eles
    for (const e of ctx.emojis || []) {
      const k = stripVS(e);
      const others = (P.byEmo.get(k) || []).filter(s => !(ctx.self && s.f === ctx.self.f && s === ctx.self.s));
      if (others.length >= 2) {
        const cnt = new Map();
        for (const s of others) for (const y of s.emojis || []) { const ky = stripVS(y); if (ky !== k) cnt.set(ky, (cnt.get(ky) || 0) + 1); }
        for (const [ky, n] of cnt) if (n >= 1) add(ky, 1.3 * n / others.length + 0.1 * Math.min(n, 5), 'co:' + k + ky,
          n > 1 ? `noutros ${n} stickers teus, o ${e} aparece com este` : `noutro sticker teu, o ${e} aparece com este`);
      }
      const seen = new Set();
      for (const ci of (lex.emo.get(k) || [])) if (ctx.adult || !lex.cl[ci].adult) for (const y of lex.cl[ci].emos) {
        if (y === k || seen.has(y)) continue; seen.add(y);
        add(y, 0.4, 'lx:' + k + y, `o ${e} e este costumam andar juntos`);
      }
    }

    // imagens parecidas com esta
    const simCount = new Map();
    for (const x of ctx.similar || []) {
      const s = ((data.packs || []).find(p => p.id === x.p) || { stickers: [] }).stickers.find(t => t.f === x.f);
      if (!s) continue;
      for (const e of s.emojis || []) {
        const k = stripVS(e);
        const c = simCount.get(k) || { n: 0, same: false, s: 0 };
        c.n++; c.same = c.same || x.same; c.s += (x.same ? 2.2 : 1.15) * x.w;
        simCount.set(k, c);
      }
    }
    for (const [k, c] of simCount) add(k, c.s, 'img', c.same ? 'é a mesma imagem de outro sticker teu, que tem este'
      : c.n > 1 ? `a imagem parece-se com ${c.n} stickers teus que têm este` : 'a imagem parece-se com outro sticker teu que tem este');

    // cor principal (só pesa um pouco)
    const cor = mainColour(ctx.col);
    if (cor) add(HEART[cor], 0.3, 'cor', `a cor principal da imagem é ${cor}`);

    const out = [];
    for (const [, c] of C) {
      const why = [...c.why.values()].sort((a, b) => b.s - a.s);
      // várias pistas diferentes a apontar para o mesmo emoji valem mais
      const sc = c.s * (1 + 0.3 * (why.length - 1));
      out.push({ e: c.e, score: sc, why: why.slice(0, 2).map(x => x.txt) });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, ctx.limit || 10);
  }


  /* ---------- ensinar palavras aos emojis ---------- */
  /** As palavras de um emoji para comparar: as do teclado, as da base de palavras e as Unicode. */
  function vocabOf(e, wordsOf, adult) {
    const lex = buildLex(), k = stripVS(e);
    const out = [], seen = new Set();
    const push = (w, wt) => { const n = norm(w); if (!n || seen.has(n)) return; seen.add(n); out.push({ w, wt, f: phraseOf(n) }); };
    (wordsOf(e) || []).forEach(w => push(w, 1));
    for (const ci of (lex.emo.get(k) || [])) { const cl = lex.cl[ci]; if (cl.adult && !adult) continue; cl.terms.slice(0, 30).forEach(w => push(w, 0.8)); }
    emoKeywords(e).slice(0, 15).forEach(w => push(w, 0.55));
    return out;
  }
  /** Quanto uma frase encaixa num emoji (0 = nada; ~1 = muito bem) e com que palavra dele se parece mais. */
  function fit(phrase, e, wordsOf, adult) {
    const A = phraseOf(norm(phrase));
    const content = new Set(A.st.filter((x, i) => !STOP.has(A.tk[i])));
    const voc = vocabOf(e, wordsOf, adult);
    const sims = [];
    const shared = new Set();
    let like = '';
    for (const v of voc) {
      sims.push([phraseSim(A, v.f) * v.wt, v.w]);
      v.f.st.forEach((x, i) => { if (content.has(x) && !STOP.has(v.f.tk[i])) shared.add(x); });
    }
    sims.sort((a, b) => b[0] - a[0]);
    if (sims.length) like = sims[0][1];
    let f = (sims[0] ? sims[0][0] : 0) + 0.35 * (sims[1] ? sims[1][0] : 0) + 0.2 * (sims[2] ? sims[2][0] : 0);
    f += 0.25 * Math.min(2, shared.size);
    // se só uma parte da frase bate certo ("bom" de "bom dia"), conta menos
    if (content.size) f *= 0.45 + 0.55 * Math.min(1, shared.size / content.size);
    // a base de palavras diz que esta frase é da família deste emoji
    const lex = buildLex(), k = stripVS(e);
    for (const [t, v] of matchTerms(phrase)) for (const [ci] of lex.term.get(t)) if (lex.cl[ci].emos.includes(k) && (adult || !lex.cl[ci].adult)) { f += 0.6 * v; break; }
    return { f, like };
  }
  /**
   * ctx: { emojis:[…do sticker], phrases:[{w, src}], wordsOf(e), data, adult, focus }
   * Devolve { per:[{ e, items:[{w, src, fit, like}], more:[palavras] }], elsewhere:[{ e, w }] }
   */
  function teach(ctx) {
    const wordsOf = ctx.wordsOf;
    const ems = ctx.emojis || [];
    const per = ems.map(e => ({ e, items: [], more: [] }));
    const elsewhere = [];
    const seenP = new Set();
    for (const ph of ctx.phrases || []) {
      const n = norm(ph.w);
      if (!n || seenP.has(n) || n.length < 2) continue;
      seenP.add(n);
      let best = -1, bf = 0, like = '';
      ems.forEach((e, i) => { const r = fit(ph.w, e, wordsOf, ctx.adult); if (r.f > bf) { bf = r.f; best = i; like = r.like; } });
      // já está nas palavras desse emoji (ou é quase igual)?
      const has = i => (wordsOf(ems[i]) || []).some(w => { const m = norm(w); return m === n || phraseSim(phraseOf(m), phraseOf(n)) >= 0.86; });
      // o melhor emoji de todos para esta frase (pode não estar no sticker)
      let gb = null;
      for (const g of emojis({ data: ctx.data, words: [ph.w], emojis: ems, adult: ctx.adult, limit: 3 })) {
        const r = fit(ph.w, g.e, wordsOf, ctx.adult);
        if (!gb || r.f > gb.f) gb = { e: g.e, f: r.f };
      }
      const better = gb && gb.f >= 0.8 && gb.f > bf * 1.3;
      if (better) elsewhere.push({ e: gb.e, w: ph.w });
      if (best >= 0 && bf >= 0.35 && (!better || bf >= 0.9)) { if (!has(best)) per[best].items.push({ w: ph.w, src: ph.src, fit: bf, like }); }
      else if (!better && ctx.focus != null) { const i = ems.findIndex(x => stripVS(x) === stripVS(ctx.focus)); if (i >= 0 && !has(i)) per[i].items.push({ w: ph.w, src: ph.src, fit: bf, like }); }
    }
    // o que cada emoji aprendeu contigo e ainda não está nas palavras dele
    per.forEach(x => {
      const have = new Set((wordsOf(x.e) || []).map(norm).concat(x.items.map(i => norm(i.w))));
      for (const l of M.emojiLearned(ctx.data, x.e).slice(0, 5)) if (!have.has(norm(l.w))) x.items.push({ w: l.w, src: 'aprendi', fit: 3 + l.eff, like: '' });
    });
    per.forEach(x => {
      x.items.sort((a, b) => b.fit - a.fit);
      const seeds = (wordsOf(x.e) || []).concat(x.items.map(i => i.w));
      x.more = words({ data: ctx.data, words: seeds, emojis: [x.e], adult: ctx.adult, limit: 14 })
        .filter(y => !x.items.some(i => norm(i.w) === y.n)).map(y => y.w);
    });
    return { per, elsewhere };
  }

  window.Suggest = { sisters, phrasesWith, teach, fit, words, complete, emojis, setEmojis, loadSyn, mainColour, matchTerms, phraseSim, isPhrase, _lex: buildLex };
})();
