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

  /** Prepara a lista de stickers com as palavras de cada um. */
  function buildIndex(data, emoInfo) {
    const items = [];
    const cache = new Map();
    for (const p of (data.packs || [])) for (const st of (p.stickers || [])) {
      const kws = [];
      for (const w of (st.words || [])) { const t = prep(w); if (t.length) kws.push({ t, w: 3, src: w }); }
      for (const e of (st.emojis || [])) {
        const k = stripVS(e);
        if (!cache.has(k)) cache.set(k, effectiveWords(e, data, emoInfo));
        for (const w of cache.get(k)) { const t = prep(w); if (t.length) kws.push({ t, w: 1.5, src: w }); }
      }
      // palavras que o teclado aprendeu contigo
      const learn = st.learn || {};
      for (const w of Object.keys(learn)) {
        const c = learn[w] || 1;
        kws.push({ t: [{ w, s: stem(w) }], w: 1 + Math.min(c, 4) * 0.6, src: w, learned: true });
      }
      items.push({ p, s: st, kws, emo: (st.emojis || []).map(stripVS) });
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
    const q = tokens(line).slice(-14);
    const qt = q.filter(x => !STOP.has(x)).map(x => ({ w: x, s: stem(x) }));
    const qstop = q.filter(x => STOP.has(x));
    const qe = emojisIn(line).map(stripVS);
    if (!qt.length && !qe.length && !qstop.length) return [];
    const res = [];
    for (const it of index) {
      let score = 0;
      const why = new Set();
      for (const kw of it.kws) {
        let best = 0;
        if (kw.t.length === 1) {
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
      if (score >= 0.9) res.push({ p: it.p, s: it.s, score, why: Array.from(why) });
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, limit || 30);
  }

  /** As palavras com significado da frase (para o teclado aprender). */
  function queryTokens(text) {
    const line = String(text || '').split('\n').pop();
    return Array.from(new Set(tokens(line).slice(-8).filter(x => !STOP.has(x) && x.length >= 2)));
  }

  window.Match = { queryTokens, norm, stripVS, tokens, stem, defaultWords, effectiveWords, buildIndex, search, emojisIn, STOP };
})();
