'use strict';
/* Procura de stickers a partir de uma frase. Partilhado pela app e pelo teclado. */
(function () {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const stripVS = e => String(e).replace(/️/g, '');

  // palavras pequenas que não dizem nada sobre o assunto
  const STOP = new Set(('eu tu ele ela nos vos eles elas voce vc vcs me te se lhe lhes o a os as um uma uns umas ' +
    'de do da dos das no na nos nas em ao aos por pelo pela para pra pro com sem que e ou mas muito muita muitos muitas ' +
    'mto mt mta mais menos tao ja so ate isso isto esse essa este esta aquele aquela aquilo meu minha meus minhas teu tua ' +
    'seu sua seus suas nosso nossa ai aqui la ca entao tipo tbm tb tambem q k pq porque quando onde como qual quem ' +
    'estou esta estas estamos sou es ser foi era vai vou vamos ta to tou the i you a an to of and is it my me your so ' +
    'je tu il elle le la les un une de des et est ich du er sie das der die und ist').split(' '));

  const SUFFIX = ['zinhos', 'zinhas', 'zinho', 'zinha', 'inhos', 'inhas', 'inho', 'inha', 'issimo', 'issima', 'mente',
    'ando', 'endo', 'indo', 'aram', 'eram', 'iram', 'avam', 'amos', 'emos', 'imos', 'ados', 'adas', 'idos', 'idas',
    'ado', 'ada', 'ido', 'ida', 'ar', 'er', 'ir', 'ei', 'ou', 'am', 'em', 'as', 'es', 'os', 's', 'o', 'a', 'e'];

  function stem(w) {
    for (const s of SUFFIX) if (w.length - s.length >= 2 && w.endsWith(s)) return w.slice(0, w.length - s.length);
    return w;
  }

  const LAUGH = /^(?:(?:ha|ah|he|eh|hi|hu|ja|je|ji|rs|k)+h?|lol+|lmao+|kk+)$/;
  function tokens(text) {
    return norm(text).replace(/[^a-z0-9ç\s'-]/g, ' ').split(/[\s'-]+/).filter(Boolean)
      .map(t => LAUGH.test(t) && t.length >= 3 ? 'haha' : t.replace(/(.)\1{2,}/g, '$1$1'));
  }

  // formas de escrever a mesma coisa em conversa (tou = estou, q = que…)
  const CANON = { tou: 'estou', to: 'estou', ta: 'esta', tas: 'estas', tamos: 'estamos', tava: 'estava', pra: 'para',
    q: 'que', k: 'que', n: 'nao', nd: 'nada', tb: 'tambem', tbm: 'tambem', tmb: 'tambem', mt: 'muito', mto: 'muito', mta: 'muita', pq: 'porque',
    vc: 'voce', ce: 'voce', msm: 'mesmo', td: 'tudo', tds: 'todos', blz: 'beleza', vlw: 'valeu', obg: 'obrigado', pfv: 'por favor', pf: 'por favor',
    dps: 'depois', hj: 'hoje', agr: 'agora', qnd: 'quando', cmg: 'comigo', ctg: 'contigo', bjs: 'beijos', bj: 'beijo', sla: 'sei la',
    oq: 'o que', qq: 'qualquer', ngm: 'ninguem', vdd: 'verdade',
    crl: 'caralho', krl: 'caralho', crlh: 'caralho', krlh: 'caralho', caraio: 'caralho', carai: 'caralho', fodasse: 'foda se', fodase: 'foda se',
    fdp: 'filho da puta', pqp: 'puta que pariu', vsf: 'vai se foder', vtf: 'vai te foder', vtnc: 'vai tomar no cu', tnc: 'tomar no cu',
    fuder: 'foder', fudido: 'fodido', fudida: 'fodida', po: 'para o', pro: 'para o' };
  const canonToks = text => tokens(text).flatMap(t => (CANON[t] || t).split(' '));
  const pst = t => t.length >= 4 ? stem(t) : t;
  /** Uma expressão ("isso dizes tu", "a sério") guarda todas as palavras, também as pequenas, pela ordem. */
  function phraseKey(w) {
    const all = canonToks(w);
    return all.length >= 3 || (all.length === 2 && all.some(x => STOP.has(x))) ? all.map(pst) : null;
  }
  const same = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
  /** Quantas palavras da expressão aparecem na frase, pela mesma ordem. */
  function inOrder(ph, q) {
    const L = new Array(q.length + 1).fill(0);
    for (let i = 1; i <= ph.length; i++) {
      let prev = 0;
      for (let j = 1; j <= q.length; j++) {
        const tmp = L[j];
        L[j] = same(ph[i - 1], q[j - 1]) ? prev + 1 : Math.max(L[j], L[j - 1]);
        prev = tmp;
      }
    }
    return L[q.length];
  }

  function emojisIn(str) {
    const out = [];
    let parts;
    try { parts = Array.from(new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(str), s => s.segment); }
    catch (e) { parts = Array.from(str); }
    for (const p of parts) if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(p)) out.push(p);
    return out;
  }

  const GENERIC = new Set(['cara', 'rosto', 'face', 'animal', 'simbolo', 'objeto', 'pessoa', 'sinal', 'emocao', 'gesto', 'corpo', 'mao', 'maos', 'comida', 'natureza', 'atividade', 'viagem', 'lugar']);

  /* Palavras do dia a dia para os emojis mais usados (o resto vem da lista Unicode). */
  const CURATED = {
    '😂': 'haha, rir, engraçado, piada, morri', '🤣': 'haha, rir, morri de rir, hilariante, engraçado',
    '😅': 'ups, nervoso, desculpa, eita, constrangido', '😊': 'feliz, contente, obrigado, querido, fofo',
    '🙂': 'ok, tranquilo, sorriso, fixe, de boa', '😁': 'feliz, sorriso, contente, boa, alegre',
    '😍': 'lindo, linda, apaixonado, adoro, maravilhoso', '🥰': 'amor, fofo, carinho, adoro, querido',
    '😘': 'beijo, beijinho, beijos, xoxo, amor', '❤': 'amor, amo, coração, te amo, paixão',
    '💕': 'amor, carinho, amo, querida, coração', '💔': 'coração partido, triste, desgosto, saudade, magoado',
    '😢': 'triste, chorar, pena, saudade, choro', '😭': 'chorar, choro, triste, buá, sofrer',
    '😡': 'raiva, zangado, irritado, chateado, furioso', '😠': 'zangado, chateado, raiva, irritado, bravo',
    '🤬': 'raiva, palavrão, furioso, merda, irritado', '😤': 'irritado, bufar, chateado, orgulho, teimoso',
    '😱': 'medo, susto, chocado, socorro, assustado', '😨': 'medo, assustado, susto, nervoso, pânico',
    '😮': 'uau, surpresa, nossa, chocado, sério', '😲': 'uau, surpreso, chocado, nossa, incrível',
    '🤯': 'mente explodiu, chocado, inacreditável, uau, incrível', '😳': 'vergonha, envergonhado, ups, chocado, corado',
    '🙄': 'aff, pff, revirar os olhos, sério, tédio', '😒': 'aff, chateado, tédio, desconfiado, meh',
    '😴': 'sono, dormir, boa noite, cansado, zzz', '🥱': 'sono, cansado, tédio, bocejo, aborrecido',
    '🤔': 'pensar, hmm, dúvida, será, pensativo', '🤨': 'desconfiado, hmm, sério, suspeito, estranho',
    '😎': 'fixe, top, estilo, cool, de boa', '🤩': 'incrível, uau, fantástico, estrelas, adoro',
    '🥺': 'por favor, pfv, fofo, triste, pedir', '😇': 'anjo, inocente, santo, bonzinho, bem comportado',
    '😏': 'safado, malandro, sei, hehe, maroto', '😉': 'piscar, sabes, brincadeira, cúmplice, ok',
    '🤗': 'abraço, abraços, carinho, acolher, obrigado', '🤭': 'ups, segredo, risinho, vergonha, hihi',
    '🤫': 'silêncio, segredo, shh, calado, cala', '😬': 'ups, nervoso, eita, constrangido, oops',
    '🤢': 'nojo, enjoado, mal, vomitar, eca', '🤮': 'nojo, vomitar, eca, horrível, nojento',
    '🤒': 'doente, febre, mal, gripe, constipado', '🥳': 'festa, parabéns, aniversário, celebrar, bora',
    '😈': 'diabinho, maldade, safado, malvado, travesso', '💀': 'morri, morto, haha, caveira, morri de rir',
    '👋': 'olá, oi, adeus, tchau, xau', '👍': 'ok, sim, fixe, boa, certo',
    '👎': 'não, mau, péssimo, não gosto, negativo', '👏': 'parabéns, palmas, bravo, muito bem, boa',
    '🙏': 'obrigado, por favor, rezar, amém, gratidão', '💪': 'força, forte, ginásio, bora, consegues',
    '👀': 'ver, olhar, espreitar, curioso, de olho', '🤝': 'combinado, acordo, negócio, fechado, parceria',
    '✌': 'paz, vitória, fixe, adeus, tranquilo', '👌': 'ok, perfeito, certo, fixe, ótimo',
    '🙌': 'boa, aleluia, viva, finalmente, celebrar', '🤦': 'facepalm, não acredito, que vergonha, burro, aff',
    '🤷': 'sei lá, não sei, tanto faz, whatever, nem sei', '🔥': 'fogo, top, quente, brutal, incrível',
    '💯': 'cem por cento, perfeito, verdade, exato, top', '✨': 'brilho, magia, especial, lindo, uau',
    '🎉': 'festa, parabéns, celebrar, viva, aniversário', '🎂': 'aniversário, parabéns, bolo, anos, festa',
    '🎁': 'presente, prenda, surpresa, oferta, aniversário', '☀': 'bom dia, sol, calor, verão, dia',
    '🌙': 'boa noite, lua, noite, dormir, sonhos', '☕': 'café, manhã, bom dia, pausa, bica',
    '🍕': 'pizza, fome, comer, jantar, comida', '🍔': 'hambúrguer, fome, comer, lanche, comida',
    '🍺': 'cerveja, beber, saúde, bar, imperial', '🍻': 'saúde, cerveja, brindar, beber, copos',
    '🥂': 'brinde, saúde, celebrar, champanhe, festa', '💤': 'sono, dormir, zzz, cansado, boa noite',
    '🏃': 'correr, fugir, pressa, atrasado, já vou', '🚗': 'carro, conduzir, viagem, a caminho, boleia',
    '✅': 'feito, certo, sim, ok, confirmado', '❌': 'não, errado, cancelado, nada, negativo',
    '❓': 'pergunta, o quê, dúvida, porquê, como', '❗': 'atenção, importante, urgente, aviso, olha',
    '💩': 'merda, porcaria, cocó, mau, droga', '🤡': 'palhaço, ridículo, idiota, piada, otário',
    '👑': 'rei, rainha, chefe, o maior, realeza', '😋': 'delicioso, fome, gostoso, comer, nham',
    '🥶': 'frio, gelado, congelar, inverno, brrr', '🥵': 'calor, quente, abafado, sufoco, derreter',
    '😷': 'doente, máscara, gripe, vírus, mal', '🤞': 'sorte, espero, tomara, figas, oxalá',
    '🫶': 'amor, carinho, coração, gratidão, obrigado', '🫡': 'sim senhor, entendido, ok chefe, respeito, às ordens'
  };
  const CUR = {};
  Object.keys(CURATED).forEach(k => CUR[stripVS(k)] = CURATED[k].split(',').map(x => x.trim()));

  /** As 5 palavras que cada emoji traz por defeito. */
  function defaultWords(o) {
    if (!o) return [];
    if (CUR[stripVS(o.e)]) return CUR[stripVS(o.e)].slice();
    const out = [], seen = new Set();
    for (const w of [o.n].concat(o.pt || [])) {
      const n = norm(w);
      const nw = n.split(/\s+/).length;
      if (/^(cara|rosto|gato|mao|maos|pessoa|homem|mulher) /.test(n) && nw > 1) continue;
      if (!n || n.length < 3 || nw > 3 || GENERIC.has(n) || seen.has(n)) continue;
      seen.add(n); out.push(w);
      if (out.length >= 5) break;
    }
    return out;
  }

  function effectiveWords(e, data, emoInfo) {
    const ew = (data && data.emojiWords) || {};
    const k = Object.keys(ew).find(x => stripVS(x) === stripVS(e));
    if (k) return ew[k];
    if (CUR[stripVS(e)]) return CUR[stripVS(e)].slice();
    return defaultWords(emoInfo(e));
  }

  function prep(w) {
    const t = tokens(w).filter(x => !STOP.has(x) || tokens(w).length === 1);
    return t.map(x => ({ w: x, s: stem(x) }));
  }

  /**
   * O que um emoji aprendeu contigo (palavras que escreves antes de mandar stickers com ele).
   * Só conta quando já aconteceu com 2+ stickers diferentes, para não ser sorte de um só.
   */
  function emojiLearned(data, e, all) {
    const m = data && data.emojiLrn && data.emojiLrn[stripVS(e)];
    if (!m) return [];
    const today = Math.floor(Date.now() / DAY), out = [];
    for (const w in m) {
      const x = m[w] || [];
      const eff = (x[0] || 0) * Math.pow(0.5, Math.max(0, today - (x[1] || today)) / HALF);
      const d = x[3] || 1;
      if (all ? eff >= 0.25 : eff >= 1.5 && d >= 2) out.push({ w, eff, n: x[2] || 0, d });
    }
    return out.sort((a, b) => b.eff - a.eff);
  }

  /** Prepara a lista de stickers com as palavras de cada um. */
  function buildIndex(data, emoInfo) {
    const items = [];
    const cache = new Map(), ecache = new Map();
    for (const p of (data.packs || [])) for (const st of (p.stickers || [])) {
      const kws = [];
      for (const w of (st.words || [])) { const t = prep(w), ph = phraseKey(w); if (t.length || ph) kws.push({ t, ph, w: 3, src: w }); }
      for (const e of (st.emojis || [])) {
        const k = stripVS(e);
        if (!cache.has(k)) cache.set(k, effectiveWords(e, data, emoInfo));
        for (const w of cache.get(k)) { const t = prep(w), ph = phraseKey(w); if (t.length || ph) kws.push({ t, ph, w: 1.5, src: w }); }
      }
      // o que os emojis deste sticker aprenderam (também vale para stickers novos com o mesmo emoji)
      const seenW = new Set(kws.map(k => norm(k.src)));
      for (const e of (st.emojis || [])) {
        const k = stripVS(e);
        if (!ecache.has(k)) ecache.set(k, emojiLearned(data, k).slice(0, 25));
        for (const l of ecache.get(k)) {
          const n = norm(l.w);
          if (seenW.has(n)) continue; seenW.add(n);
          const t = l.w.includes(' ') ? prep(l.w) : [{ w: n, s: stem(n) }];
          const ph = l.w.includes(' ') ? phraseKey(l.w) : null;
          if (t.length || ph) kws.push({ t, ph, w: 0.5 + Math.min(l.eff, 6) * 0.15, src: l.w, learned: true });
        }
      }
      // palavras que o teclado aprendeu contigo (perdem força se deixares de as usar)
      for (const l of learned(st)) {
        const t = l.w.includes(' ') ? prep(l.w) : [{ w: l.w, s: stem(l.w) }];
        const ph = l.w.includes(' ') ? phraseKey(l.w) : null;
        if (t.length || ph) kws.push({ t, ph, w: 1 + Math.min(l.eff, 6) * 0.55, src: l.w, learned: true });
      }
      items.push({ p, s: st, kws, emo: (st.emojis || []).map(stripVS), boost: habitBoost(st) });
    }
    return items;
  }

  function sim(a, b) {
    if (a.w === b.w) return 1;
    if (a.s.length >= 2 && a.s === b.s) return 0.9;
    const short = a.w.length <= b.w.length ? a.w : b.w, long = short === a.w ? b.w : a.w;
    if (short.length >= 3 && long.startsWith(short)) return 0.75;
    let i = 0; while (i < short.length && short[i] === long[i]) i++;
    if (i >= 4 && i >= 0.7 * short.length) return 0.5;
    return 0;
  }

  /** Devolve os stickers que combinam com o texto, do melhor para o pior. */
  function search(index, text, limit) {
    text = String(text || '');
    const line = text.split('\n').pop();
    const q = canonToks(line).slice(-14);
    const qt = q.filter(x => !STOP.has(x)).map(x => ({ w: x, s: stem(x) }));
    const qstop = q.filter(x => STOP.has(x));
    const qe = emojisIn(line).map(stripVS);
    const qall = canonToks(line).slice(-16).map(pst);
    if (!qt.length && !qe.length && !qstop.length) return [];
    const res = [];
    for (const it of index) {
      let score = 0;
      const why = new Set();
      for (const kw of it.kws) {
        let best = 0;
        if (kw.ph) {
          // expressão: vale muito quando a escreves toda (pela ordem); uma palavra solta dela vale pouco
          const r = inOrder(kw.ph, qall) / kw.ph.length;
          if (r === 1) best = 1.7;
          else if (r >= 0.66) best = r * 1.1;
          else if (kw.t.length) {
            let hit = 0;
            for (const part of kw.t) if (qt.some(x => sim(part, x) >= 0.75)) hit++;
            best = hit ? 0.35 * hit / kw.t.length : 0;
          }
        } else if (kw.t.length === 1) {
          qt.forEach((x, i) => { const v = sim(kw.t[0], x) * (1 + 0.3 * i / Math.max(1, qt.length)); if (v > best) best = v; });
          // palavras pequenas só contam se forem palavras tuas e exatamente iguais
          if (!best && kw.w === 3 && qstop.includes(kw.t[0].w)) best = 1;
        } else {
          // palavra com várias partes ("bom dia"): conta mais se aparecerem todas
          let hit = 0;
          for (const part of kw.t) if (qt.some(x => sim(part, x) >= 0.75)) hit++;
          best = hit === kw.t.length ? 1.3 : hit * 0.35;
        }
        if (best > 0) { score += best * kw.w; why.add(kw.src); }
      }
      for (const e of qe) if (it.emo.includes(e)) { score += 4; why.add(e); }
      // os que usas muito (e a esta hora) ficam um pouco à frente dos outros que também combinam
      if (score >= 0.9) res.push({ p: it.p, s: it.s, score: score + (it.boost || 0), why: Array.from(why) });
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, limit || 30);
  }

  /** As palavras com significado da frase (para o teclado aprender) + pares de palavras seguidas ("boa noite"). */
  function queryTokens(text) {
    const line = String(text || '').split('\n').pop();
    const all = tokens(line).slice(-10);
    const words = Array.from(new Set(all.filter(x => !STOP.has(x) && x.length >= 2))).slice(-8);
    const pairs = [];
    for (let i = 0; i + 1 < all.length; i++) {
      const a = all[i], b = all[i + 1];
      if (a.length >= 2 && b.length >= 3 && !STOP.has(b)) pairs.push(a + ' ' + b);
    }
    // mensagem curta inteira ("isso dizes tu"): é uma expressão que o sticker substitui
    const whole = all.length >= 3 && all.length <= 6 && all.some(x => !STOP.has(x)) ? [all.join(' ')] : [];
    return words.concat(Array.from(new Set(pairs)).slice(-4), whole);
  }

  const DAY = 86400000, HALF = 45;
  /** O que o teclado aprendeu de um sticker: [{w, eff (força atual), n (vezes), last (dia)}]. */
  function learned(st) {
    const out = [];
    const today = Math.floor(Date.now() / DAY);
    if (st.lrn) for (const w in st.lrn) {
      const e = st.lrn[w] || [];
      const eff = (e[0] || 0) * Math.pow(0.5, Math.max(0, today - (e[1] || today)) / HALF);
      if (eff >= 0.25) out.push({ w, eff, n: e[2] || 0, last: e[1] || today });
    } else if (st.learn) for (const w in st.learn) out.push({ w, eff: Math.min(12, st.learn[w] || 1) * 0.8, n: st.learn[w] || 1, last: today - 7 });
    return out.sort((a, b) => b.eff - a.eff);
  }

  const bucket = () => Math.floor(new Date().getHours() / 4);
  /** Pequeno empurrão para os stickers que usas muito, ultimamente e a esta hora. */
  function habitBoost(st) {
    const u = st.uses || 0;
    if (!u) return 0;
    const today = Math.floor(Date.now() / DAY);
    const fresh = Math.pow(0.5, Math.max(0, today - (st.last || today)) / 30);
    let b = Math.min(Math.log2(1 + u), 3) * 0.12 * fresh;
    const h = st.hrs || [];
    const tot = h.reduce((a, x) => a + (x || 0), 0);
    if (tot >= 3 && (h[bucket()] || 0) / tot >= 0.34) b += 0.3;
    return b;
  }

  /** Os stickers que costumas mandar a esta hora (para quando ainda não escreveste nada). */
  function habitual(index, limit) {
    const b = bucket();
    return index
      .map(it => ({ it, n: ((it.s.hrs || [])[b] || 0) }))
      .filter(x => x.n >= 2)
      .sort((a, c) => c.n - a.n || (c.it.s.uses || 0) - (a.it.s.uses || 0))
      .slice(0, limit || 12)
      .map(x => ({ p: x.it.p, s: x.it.s }));
  }

  /** Sticker +18: o pack todo ou só o sticker marcado. */
  function isAdult(p, st) { return !!((p && p.adult) || (st && st.adult)); }

  /**
   * Só os stickers do modo atual: normal (sem +18) ou +18 (só os +18). Nunca mistura.
   * Os packs ficam com _partial = true se perderem stickers (para não mostrar a capa errada).
   */
  function modeData(data) {
    if (!data) return { packs: [] };
    const on = !!data.adultMode;
    const packs = [];
    for (const p of (data.packs || [])) {
      const all = p.stickers || [];
      const st = all.filter(x => !x.hidden && isAdult(p, x) === on);
      if (!st.length) continue;
      packs.push(Object.assign({}, p, { stickers: st, _partial: st.length !== all.length }));
    }
    return Object.assign({}, data, { packs });
  }

  window.Match = { emojiLearned, CUR, CANON, canonToks, phraseKey, learned, habitual, habitBoost, queryTokens, isAdult, modeData, norm, stripVS, tokens, stem, defaultWords, effectiveWords, buildIndex, search, emojisIn, STOP };
})();
