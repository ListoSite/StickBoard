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
    ns: 'nao sei', nsei: 'nao sei', obgd: 'obrigado', obgda: 'obrigada', sff: 'se faz favor', pfvr: 'por favor', pls: 'por favor', plz: 'por favor',
    dsc: 'desculpa', dsclp: 'desculpa', tlm: 'telemovel', msg: 'mensagem', ctz: 'certeza', smp: 'sempre', nc: 'nunca', qlq: 'qualquer', ent: 'entao',
    amn: 'amanha', pk: 'porque', bjo: 'beijo', bjx: 'beijos', bjss: 'beijos', fdx: 'foda se', fodex: 'foda se', fosgase: 'foda se', tranqs: 'tranquilo',
    dlc: 'delicia', dlç: 'delicia', fuder: 'foder', fudido: 'fodido', fudida: 'fodida', po: 'para o', pro: 'para o' };
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
    const cache = new Map(), ecache = new Map(), phr = new Map();
    for (const p of (data.packs || [])) for (const st of (p.stickers || [])) {
      const kws = [];
      for (const w of (st.words || [])) { const t = prep(w), ph = phraseKey(w); if (t.length || ph) kws.push({ t, ph, w: 3, src: w }); }
      for (const e of (st.emojis || [])) {
        const k = stripVS(e);
        if (!cache.has(k)) cache.set(k, effectiveWords(e, data, emoInfo));
        for (const w of cache.get(k)) { const t = prep(w), ph = phraseKey(w); if (t.length || ph) kws.push({ t, ph, w: 1.5, src: w, e: k }); }
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
          if (t.length || ph) kws.push({ t, ph, w: 0.5 + Math.min(l.eff, 6) * 0.15, src: l.w, learned: true, e: k });
        }
      }
      // palavras que o teclado aprendeu contigo (perdem força se deixares de as usar)
      for (const l of learned(st)) {
        const t = l.w.includes(' ') ? prep(l.w) : [{ w: l.w, s: stem(l.w) }];
        const ph = l.w.includes(' ') ? phraseKey(l.w) : null;
        if (t.length || ph) kws.push({ t, ph, w: 1 + Math.min(l.eff, 6) * 0.55, src: l.w, learned: true });
      }
      items.push({ p, s: st, kws, emo: (st.emojis || []).map(stripVS), boost: habitBoost(st), cx: ctxProfile(st) });
      for (const k of kws) {
        const c = canonToks(k.src);
        if (c.length < 2 || c.length > 6) continue;
        const key = c.join(' ');
        let set = phr.get(key); if (!set) phr.set(key, set = new Set());
        for (const e of (k.e ? [k.e] : (st.emojis || []).map(stripVS))) set.add(e);
      }
    }
    items.ctx = ctxLexicon(data, emoInfo, cache);
    items.phr = phr;
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


  /* ================= perceber o contexto da frase =================
     Cada palavra/expressão da frase vota num "tema" (família de emojis: amor, riso, sim, não, tristeza…).
     O tema que domina a frase puxa os stickers desse tema para a frente; uma palavra solta que vai contra
     o resto da frase (um «não» no meio de uma mensagem carinhosa) perde força. */
  const FAMS = {
    love: '❤ 😍 🥰 😘 💕 💖 💗 💓 💞 💘 💝 😻 🫶 💋 ☺ 😊 🥹 😚 😙 ♥ 💑 💏 🌹 🤍 💙 💚 💛 💜 🧡 🖤',
    laugh: '😂 🤣 😆 😹 😁 😄 😅 💀 😝 😛 😜 🤪 🙃 🤭',
    yes: '👍 ✅ 👌 🙌 🆗 💯 🤝 👏 🫡 ✔ ☑ 🙏 😎 💪 🤙 ✌',
    no: '👎 ❌ 🙅 🚫 ⛔ 🙄 😒 😑 🤨 ✋ 🤚 🛑',
    sad: '😢 😭 😞 😔 💔 🥺 😿 😩 😫 😟 🙁 ☹ 😥',
    angry: '😠 😡 🤬 💢 👿 😤 🖕 👊',
    surprise: '😱 😮 😲 🤯 🫢 😯 🙀 😧 🤩',
    fear: '😨 😰 😬 😓',
    sleep: '😴 🥱 💤 🌙 🛌 😪',
    hi: '👋 🙋',
    party: '🥳 🎉 🎊 🎂 🍾 🥂 🎈 🎁',
    think: '🤔 🧐 🤷 😶 😐',
    flirt: '😏 😉 😈 🍆 🍑 🥵 💦 👅 🤤',
    disgust: '🤢 🤮 💩',
    shy: '🙈 🫣 😳',
    food: '🍕 🍔 🍟 🌭 🍿 🍩 🍪 🍰 🍫 ☕ 🍺 🍻 🍷 🍽 😋'
  };
  const FAM = new Map();
  for (const f in FAMS) for (const e of FAMS[f].split(' ')) if (e) FAM.set(stripVS(e), f);
  const FAMC = new Map();
  const famOf = e => {
    let r = FAMC.get(e);
    if (r !== undefined) return r;
    const k = stripVS(e);
    r = FAM.get(k) || FAM.get(k.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/‍.*$/u, '')) || null;
    FAMC.set(e, r);
    return r;
  };
  // palavras que dizem logo o tema, mesmo sem nenhum sticker com elas
  const MOODW = {
    love: 'amo, amor, adoro, adorei, querida, querido, lindo, linda, saudade, saudades, beijo, beijinho, beijinhos, beijos, carinho, fofo, fofa, coracao, paixao, apaixonado, apaixonada, mor, princesa, te amo, amo te, abraco, abracinho, mimo, gosto muito de ti, gosto de ti, meu amor, minha vida, bebe',
    laugh: 'haha, rir, riso, piada, engracado, engracada, hilariante, morri, palhaco, comedia, gozar, a gozar, morri a rir, chorei a rir',
    yes: 'sim, claro, ok, okay, certo, combinado, bora, fixe, boa, perfeito, exato, exatamente, concordo, top, ya, siga, beleza, obrigado, obrigada, valeu, agradeco, otimo, pode ser, tudo bem, esta bem, feito, isso mesmo, com certeza',
    no: 'nao, nunca, nem pensar, jamais, recuso, nope, negativo, nem a pau, nada disso, esquece, nem morto, nem morta, de maneira nenhuma',
    sad: 'triste, tristeza, chorar, choro, chorei, pena, coitado, coitada, magoado, magoada, sinto muito, deprimido, sozinho, sozinha, dor, perdi, desculpa, lamento, coracao partido',
    angry: 'raiva, odio, odeio, irritado, irritada, chateado, chateada, furioso, fulo, piurso, merda, caralho, foda, porra, chato, cala te, cala a boca, vai te foder, passei me',
    surprise: 'uau, wow, ena, nossa, a serio, serio, incrivel, chocado, chocada, caramba, meu deus, nao acredito, inacreditavel',
    fear: 'medo, susto, nervoso, nervosa, assustado, assustada, panico, cagufa',
    sleep: 'dormir, sono, cama, cansado, cansada, boa noite, deitar, sonhos, bons sonhos, estafado',
    hi: 'ola, oi, bom dia, boa tarde, adeus, tchau, xau, hey, bem vindo, ate logo, ate amanha',
    party: 'festa, parabens, aniversario, comemorar, celebrar, ganhamos, viva, feliz aniversario',
    think: 'pensar, acho, talvez, sei la, duvida, hmm, sera, nao sei, se calhar',
    flirt: 'safado, safada, gostosa, gostoso, tesao, sexy, provocar, malicia, maroto, marota',
    disgust: 'nojo, eca, nojento, nojenta, vomitar',
    shy: 'vergonha, timido, timida, envergonhado, envergonhada',
    food: 'fome, comer, jantar, almoco, pizza, comida, cafe, larica, petiscar'
  };
  const NEG = new Set(['nao', 'nem', 'nunca', 'jamais', 'sem']);
  // «claro que não», «acho que não», «pois não»: o «não» é a resposta
  const NEG_OK = new Set(['claro', 'acho', 'pois', 'ainda', 'obvio', 'obviamente', 'nada', 'disso', 'isso', 'que', 'mesmo', 'mas', 'entao', 'ja', 'sim', 'ok', 'ah', 'oh', 'eh', 'epa', 'pa', 'nao']);

  let LEXCTX = null; // vem do lex.js/frases.js/… quando estão carregados (mesmo para todos)
  function addTerm(L, term, val) {
    const toks = canonToks(term);
    if (!toks.length) return;
    if (toks.length === 1) {
      const t = toks[0];
      if (STOP.has(t) && !NEG.has(t) || t.length < 2) return;
      const k = pst(t);
      let set = L.word.get(k); if (!set) L.word.set(k, set = new Set());
      set.add(val);
    } else {
      const k = ' ' + toks.join(' ') + ' ';
      let set = L.phrase.get(k); if (!set) L.phrase.set(k, set = new Set());
      set.add(val);
    }
  }
  function lexBase() {
    if (LEXCTX) return LEXCTX;
    const L = { word: new Map(), phrase: new Map() };
    for (const f in MOODW) for (const w of MOODW[f].split(',')) addTerm(L, w.trim(), 'f:' + f);
    for (const e in CUR) for (const w of CUR[e]) addTerm(L, w, e);
    const lists = [].concat(window.LEX || []);
    for (const line of lists) {
      const i = line.indexOf('|'); if (i < 0) continue;
      const em = emojisIn(line.slice(0, i)).map(stripVS).slice(0, 3);
      if (!em.length) continue;
      for (const t of line.slice(i + 1).split(',')) { const w = t.trim(); if (w) for (const e of em) addTerm(L, w, e); }
    }
    return (LEXCTX = L);
  }
  /** O "dicionário de temas": base + as palavras dos teus emojis. */
  function ctxLexicon(data, emoInfo, cache) {
    const base = lexBase();
    const L = { word: new Map(), phrase: new Map(), base };
    const seen = new Set();
    const addE = (e, words) => { for (const w of words || []) addTerm(L, w, e); };
    const ew = (data && data.emojiWords) || {};
    for (const e in ew) { seen.add(stripVS(e)); addE(stripVS(e), ew[e]); }
    if (cache) for (const [e, words] of cache) if (!seen.has(e)) addE(e, words);
    return L;
  }
  function lookWord(L, k) {
    const a = L.word.get(k), b = L.base.word.get(k);
    if (!a) return b; if (!b) return a;
    return new Set([...a, ...b]);
  }

  /** Divide a mensagem em partes (frases/vírgulas) e dá peso a cada palavra. */
  function parseLine(line) {
    const parts = String(line || '').split(/[.!?;,\n]+|\s[-–—]\s/).map(x => x.trim()).filter(Boolean);
    const clauses = parts.map(x => canonToks(x)).filter(x => x.length);
    const out = [];
    const n = clauses.length;
    clauses.forEach((c, ci) => {
      const cw = ci === n - 1 ? 1 : ci === n - 2 ? 0.7 : 0.5; // o fim da mensagem é o que pesa mais
      c.forEach((t, i) => {
        let w = cw * (1 + 0.15 * i / Math.max(1, c.length - 1));
        const neg = !NEG.has(t) && ((i >= 1 && NEG.has(c[i - 1])) || (i >= 2 && NEG.has(c[i - 2]) && STOP.has(c[i - 1])));
        let role = '';
        if (NEG.has(t)) {
          const others = c.filter((x, j) => j !== i);
          const alone = i === c.length - 1 || others.every(x => NEG_OK.has(x) || STOP.has(x) || NEG.has(x));
          role = alone ? 'answer' : 'modifier';
          if (!alone) w *= 0.3; // «não» a mudar um verbo («não te preocupes») não é dizer que não
        }
        out.push({ t, w, neg, role, ci, i });
      });
    });
    return { clauses, toks: out };
  }

  /** O tema da frase: quanto pesa cada família de emojis e cada emoji. */
  function moodOf(L, P) {
    const fam = {}, emo = {};
    let total = 0;
    // as tuas palavras e as palavras de tema claras valem 1; as listas gerais (expressões soltas) valem menos
    const vote = (set, w, gen) => {
      if (!set || !set.size || w <= 0) return false;
      const vals = Array.from(set);
      const share = w / vals.length;
      let used = 0;
      for (const v of vals) {
        if (v.startsWith('f:')) { const f = v.slice(2); fam[f] = (fam[f] || 0) + share; used += share; }
        else { const k = gen ? 0.55 : 1; emo[v] = (emo[v] || 0) + share * k; const f = famOf(v); if (f) fam[f] = (fam[f] || 0) + share * k; used += share * k; }
      }
      total += used;
      return true;
    };
    P.clauses.forEach((c, ci) => {
      const cw = ci === P.clauses.length - 1 ? 1 : ci === P.clauses.length - 2 ? 0.7 : 0.5;
      const used = new Array(c.length).fill(false);
      // expressões primeiro (as mais compridas ganham)
      for (let len = Math.min(6, c.length); len >= 2; len--) for (let i = 0; i + len <= c.length; i++) {
        if (used.slice(i, i + len).some(Boolean)) continue;
        const k = ' ' + c.slice(i, i + len).join(' ') + ' ';
        const mine = L.phrase.get(k), set = mine || L.base.phrase.get(k);
        if (set && vote(set, cw * (1 + 0.25 * (len - 1)), !mine)) for (let j = i; j < i + len; j++) used[j] = true;
      }
      c.forEach((t, i) => {
        if (used[i]) return;
        const tk = P.toks.find(x => x.ci === ci && x.t === t && !x._done);
        if (tk) tk._done = true;
        if (STOP.has(t) && !NEG.has(t)) return;
        if (tk && tk.neg) return; // «não gosto»: o «gosto» não conta como amor
        const k = pst(t), mine = L.word.get(k);
        if (mine) vote(mine, tk ? tk.w : cw, false);
        const b = L.base.word.get(k);
        if (b) vote(b, (tk ? tk.w : cw) * (mine ? 0.5 : 1), true);
      });
    });
    return { fam, emo, total };
  }

  /** Quanto um sticker combina com o tema da frase (0 a 1). */
  function agreeOf(it, mood) {
    if (!mood || mood.total < 0.8 || !it.emo.length) return 1;
    let best = 0, maxS = 0;
    for (const f in mood.fam) maxS = Math.max(maxS, mood.fam[f]);
    for (const e in mood.emo) maxS = Math.max(maxS, mood.emo[e]);
    if (maxS <= 0) return 1;
    for (const e of it.emo) {
      const f = famOf(e);
      best = Math.max(best, mood.emo[e] || 0, f ? (mood.fam[f] || 0) : 0);
    }
    // sem tema conhecido (⚽, 🍕…) e a frase não fala disso: fica a meio
    const hasFam = it.emo.some(e => famOf(e));
    if (!hasFam && !best) return 0.75;
    return 0.42 + 0.58 * Math.min(1, best / maxS);
  }

  /* ---------- o que o teclado aprendeu do CONTEXTO em que usas cada sticker ---------- */
  /** Perfil guardado no sticker (st.cx): temas, emojis e forma das frases com que o mandas, a perder força com o tempo. */
  function ctxProfile(st) {
    const c = st.cx;
    if (!c || !c.n) return null;
    const today = Math.floor(Date.now() / DAY);
    const k = Math.pow(0.5, Math.max(0, today - (c.d || today)) / HALF);
    const n = c.n * k;
    if (n < 0.4) return null;
    return { f: c.f || {}, e: c.e || {}, s: c.s || {}, n, conf: 1 - Math.exp(-n / 2.5) };
  }
  /** A forma da frase: pergunta, exclamação, curta, longa, risos. */
  function shapeOf(line, P) {
    const t = String(line || '').trim(), n = P.toks.length, s = {};
    if (/\?\s*$/.test(t)) s.q = 1;
    if (/!\s*$/.test(t)) s.x = 1;
    if (n <= 2) s.s1 = 1; else if (n <= 5) s.s2 = 1; else if (n <= 12) s.s3 = 1; else s.s4 = 1;
    if (P.toks.some(x => x.t === 'haha')) s.h = 1;
    if (P.toks.some(x => NEG.has(x.t) && x.role === 'answer')) s.n = 1;
    return s;
  }
  const norm1 = o => { let t = 0; for (const k in o) t += o[k]; const r = {}; if (t > 0) for (const k in o) r[k] = o[k] / t; return r; };
  function cosine(a, b) {
    let d = 0, na = 0, nb = 0;
    for (const k in a) { na += a[k] * a[k]; if (b[k]) d += a[k] * b[k]; }
    for (const k in b) nb += b[k] * b[k];
    return na && nb ? d / Math.sqrt(na * nb) : -1;
  }
  /** O contexto da mensagem, no formato que se guarda no sticker quando o mandas. */
  function contextOf(index, text) {
    const line = String(text || '').split('\n').pop();
    const P = parseLine(line);
    const mood = index && index.ctx ? moodOf(index.ctx, P) : { fam: {}, emo: {}, total: 0 };
    for (const e of emojisIn(line).map(stripVS)) { mood.emo[e] = (mood.emo[e] || 0) + 1.5; const f = famOf(e); if (f) mood.fam[f] = (mood.fam[f] || 0) + 1.5; }
    const top = (o, n) => { const r = {}; Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, n).forEach(k => r[k] = Math.round(o[k] * 100) / 100); return r; };
    return { f: top(norm1(mood.fam), 6), e: top(norm1(mood.emo), 6), s: shapeOf(line, P) };
  }
  /** Quanto a mensagem de agora se parece com as mensagens com que costumas mandar este sticker (0 a 1). */
  function ctxSim(cx, cur) {
    if (!cx) return 0;
    let tot = 0, wsum = 0;
    const part = (a, b, w) => { const v = cosine(a, b); if (v >= 0) { tot += v * w; wsum += w; } };
    part(cx.f, cur.f, 0.65); part(cx.e, cur.e, 0.25); part(cx.s, cur.s, 0.1);
    // só a forma da frase não chega: tem de haver tema em comum
    if (wsum <= 0.1) return 0;
    return tot / wsum;
  }
  /** As palavras para o teclado aprender, cada uma com a sua força (o fim da mensagem e as expressões contam mais). */
  function learnTokens(text) {
    const line = String(text || '').split('\n').pop();
    const P = parseLine(line);
    const W = new Map();
    const put = (w, v) => { if (w.length >= 2 && w.length <= 40) W.set(w, Math.max(W.get(w) || 0, Math.round(v * 100) / 100)); };
    for (const x of P.toks) {
      if (STOP.has(x.t) || x.t.length < 2) continue;
      if (NEG.has(x.t) && x.role !== 'answer') continue;
      put(x.t, x.neg ? x.w * 0.4 : x.w);
    }
    P.clauses.forEach((c, ci) => {
      const cw = ci === P.clauses.length - 1 ? 1 : ci === P.clauses.length - 2 ? 0.7 : 0.5;
      for (let i = 0; i + 1 < c.length; i++) {
        const a = c[i], b = c[i + 1];
        if (a.length >= 2 && b.length >= 3 && !STOP.has(b)) put(a + ' ' + b, cw * (NEG.has(a) ? 1.2 : 0.9));
      }
    });
    const all = canonToks(line);
    if (all.length >= 2 && all.length <= 6 && all.some(x => !STOP.has(x))) put(all.join(' '), 1.3);
    return Array.from(W.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, v]) => [w, Math.max(0.2, Math.min(1.5, v))]);
  }
  /** Apagar o que escreveste ao mandar? Só se for 1 palavra ou exatamente uma palavra/expressão deste sticker. */
  function shouldDelete(text, st, data, emoInfo) {
    const all = canonToks(String(text || ''));
    if (all.length <= 1) return true;
    const msg = all.join(' ');
    const words = [].concat(st.words || []);
    for (const e of st.emojis || []) words.push(...effectiveWords(e, data, emoInfo || (() => null)), ...emojiLearned(data, e).map(x => x.w));
    for (const l of learned(st)) words.push(l.w);
    return words.some(w => canonToks(w).join(' ') === msg);
  }

  /** Devolve os stickers que combinam com o texto, do melhor para o pior (com .groups: as abas por emoji). */
  function search(index, text, limit) {
    text = String(text || '');
    const line = text.split('\n').pop();
    const P = parseLine(line);
    // palavras que fazem parte de uma expressão escrita inteira («não gosto», «não te preocupes»): a palavra solta perde força
    // (só para os stickers que não têm a ver com essa expressão: «claro que não» continua a valer para os stickers de «não»)
    const cov = new Map();
    const PH = index.phr || new Map(), LP = index.ctx ? index.ctx : null;
    P.clauses.forEach((c, ci) => {
      for (let len = Math.min(6, c.length); len >= 2; len--) for (let i = 0; i + len <= c.length; i++) {
        const k = c.slice(i, i + len).join(' ');
        const sets = [PH.get(k), LP && LP.phrase.get(' ' + k + ' '), LP && LP.base.phrase.get(' ' + k + ' ')].filter(Boolean);
        if (!sets.length) continue;
        for (let j = i; j < i + len; j++) {
          let m = cov.get(ci + ':' + j); if (!m) cov.set(ci + ':' + j, m = new Set());
          for (const st of sets) for (const v of st) { m.add(v); if (!v.startsWith('f:')) { const f = famOf(v); if (f) m.add('f:' + f); } }
        }
      }
    });
    const relates = (it, m) => it.emo.some(e => m.has(e) || (famOf(e) && m.has('f:' + famOf(e))));
    const q = P.toks.slice(-14);
    const qt = q.filter(x => !STOP.has(x.t) || NEG.has(x.t)).map(x => ({ w: x.t, s: stem(x.t), wt: x.neg ? x.w * 0.35 : x.w, cov: cov.get(x.ci + ':' + x.i) || null }));
    const qstop = q.filter(x => STOP.has(x.t)).map(x => x.t);
    const qe = emojisIn(line).map(stripVS);
    const qcl = P.clauses.slice(-4).map(c => c.slice(-16).map(pst));
    if (!qt.length && !qe.length && !qstop.length) { const r = []; r.groups = []; return r; }
    const mood = index.ctx ? moodOf(index.ctx, P) : null;
    if (mood) for (const e of qe) { mood.emo[e] = (mood.emo[e] || 0) + 1.5; const f = famOf(e); if (f) mood.fam[f] = (mood.fam[f] || 0) + 1.5; mood.total += 1.5; }
    const cur = mood ? { f: norm1(mood.fam), e: norm1(mood.emo), s: shapeOf(line, P) } : null;
    const res = [];
    const anyCov = qt.some(x => x.cov);
    for (const it of index) {
      let score = 0, lrnHit = 0;
      let covK = null; // calculado só quando preciso
      const ck = i => { if (!anyCov || !qt[i].cov) return 1; if (!covK) covK = qt.map(x => x.cov && !relates(it, x.cov) ? 0.3 : 1); return covK[i]; };
      const why = new Set();
      const anch = new Map(); // de onde veio a pontuação: palavra/expressão da frase → {c, e}
      const add = (key, label, v, e) => {
        let a = anch.get(key); if (!a) anch.set(key, a = { label, c: 0, e: new Map() });
        a.c += v;
        const em = e || it.emo[0] || '✨';
        a.e.set(em, (a.e.get(em) || 0) + v);
      };
      for (const kw of it.kws) {
        let best = 0, key = null, label = null;
        if (kw.ph) {
          // expressão: vale muito quando a escreves toda (pela ordem); uma palavra solta dela vale pouco
          // a expressão tem de estar dentro da mesma parte da frase (não vale juntar o «não» de uma parte com o «te» de outra)
          let r = 0; for (const c of qcl) { const v = inOrder(kw.ph, c) / kw.ph.length; if (v > r) r = v; }
          if (r === 1) best = 1.7;
          else if (r >= 0.66) best = r * 1.1;
          else if (kw.t.length) {
            let hit = 0, hx = null;
            for (const part of kw.t) { const x = qt.find(y => sim(part, y) >= 0.75); if (x) { hit++; hx = hx || x; } }
            best = hit ? 0.35 * hit / kw.t.length * (hx ? Math.min(1, hx.wt) : 1) : 0;
            if (hx) { key = 'w:' + hx.s; label = hx.w; } // só uma palavra da expressão: a aba é dessa palavra
          }
          if (!key) { key = 'ph:' + norm(kw.src); label = kw.src; }
        } else if (kw.t.length === 1) {
          let bi = -1;
          for (let i = 0; i < qt.length; i++) { const x = qt[i]; const sv = sim(kw.t[0], x); if (!sv) continue; const v = sv * x.wt * ck(i); if (v > best) { best = v; bi = i; } }
          if (bi >= 0) { key = 'w:' + qt[bi].s; label = qt[bi].w; }
          // palavras pequenas só contam se forem palavras tuas e exatamente iguais
          if (!best && kw.w === 3 && qstop.includes(kw.t[0].w)) { best = 1; key = 'w:' + kw.t[0].w; label = kw.t[0].w; }
        } else {
          // palavra com várias partes ("bom dia"): conta mais se aparecerem todas
          let hit = 0, hx = null;
          for (const part of kw.t) { const x = qt.find(y => sim(part, y) >= 0.75); if (x) { hit++; hx = hx || x; } }
          best = hit === kw.t.length ? 1.3 : hit * 0.35;
          if (hit === kw.t.length || !hx) { key = 'ph:' + norm(kw.src); label = kw.src; } else { key = 'w:' + hx.s; label = hx.w; }
        }
        if (best > 0) { const v = best * kw.w; score += v; why.add(kw.src); if (key) add(key, label, v, kw.e); if (kw.learned && !kw.e) lrnHit += v; }
      }
      for (const e of qe) if (it.emo.includes(e)) { score += 4; why.add(e); add('e:' + e, e, 4, e); }
      const raw = score;
      const ag = agreeOf(it, mood);
      score *= ag;
      // contexto aprendido: mandas este sticker com mensagens parecidas com esta?
      const cs = cur && it.cx && mood.total >= 0.8 ? ctxSim(it.cx, cur) : 0;
      const habit = cs > 0.3 ? cs * it.cx.conf : 0;
      if (habit > 0) score += 2.2 * habit;
      const usual = habit + Math.min(1, lrnHit / 4);
      if (raw === 0 && habit >= 0.5) {
        // nenhuma palavra bate, mas costumas mandá-lo neste tipo de mensagem
        add('ctx', 'contexto', habit, it.emo[0]);
        res.push({ p: it.p, s: it.s, score: 1 + habit, raw: 0, agree: ag, why: ['🧠 contexto'], anch, usual, ctxOnly: true });
        continue;
      }
      // os que usas muito (e a esta hora) ficam um pouco à frente dos outros que também combinam
      if (score >= 0.9 || (raw >= 1.6 && score >= 0.6)) res.push({ p: it.p, s: it.s, score: score + (it.boost || 0), raw, agree: ag, why: Array.from(why), anch, usual });
    }
    res.sort((a, b) => b.score - a.score);
    // «costumas usar»: até 3 dos que mandas neste tipo de mensagem vêm à frente (os outros continuam a aparecer)
    const us = res.filter(r => r.usual >= 0.45 && (!r.ctxOnly || r.usual >= 0.55)).sort((a, b) => b.usual - a.usual || b.score - a.score).slice(0, 3);
    us.forEach(r => { r.usualTag = true; });
    const ordered = us.concat(res.filter(r => !r.usualTag));
    const out = ordered.slice(0, limit || 30);
    out.groups = groupsOf(out.filter(r => !r.ctxOnly || r.usualTag));
    out.mood = mood;
    return out;
  }

  /** As abas: os resultados juntos pela palavra da frase que os trouxe, com o emoji dessa palavra. */
  function groupsOf(res) {
    if (res.length < 2) return [];
    // emoji de cada "âncora" (palavra/expressão da frase), somando todos os stickers
    const A = new Map();
    for (const r of res) for (const [k, a] of r.anch) {
      let x = A.get(k); if (!x) A.set(k, x = { label: a.label, c: 0, e: new Map() });
      x.c += a.c * (r.agree || 1);
      for (const [e, v] of a.e) x.e.set(e, (x.e.get(e) || 0) + v * (r.agree || 1));
    }
    const emoOf = k => { let be = '✨', bv = -1; for (const [e, v] of A.get(k).e) if (v > bv) { bv = v; be = e; } return be; };
    const G = new Map();
    for (const r of res) {
      let bk = null, bv = 0;
      for (const [k, a] of r.anch) if (a.c > bv) { bv = a.c; bk = k; }
      if (!bk) continue;
      const e = emoOf(bk);
      let g = G.get(e); if (!g) G.set(e, g = { e, words: [], items: [], w: 0 });
      const lb = A.get(bk).label;
      if (!g.words.some(w => norm(w) === norm(lb))) g.words.push(lb);
      g.items.push(r); g.w += r.score;
    }
    // o mesmo tema (amor: ❤ 🥰 😘…) fica numa só aba, com o emoji mais forte
    const F = new Map();
    for (const g of Array.from(G.values()).sort((a, b) => b.w - a.w)) {
      const k = famOf(g.e) || 'e:' + g.e;
      const h = F.get(k);
      if (!h) { F.set(k, g); continue; }
      for (const w of g.words) if (!h.words.some(x => norm(x) === norm(w))) h.words.push(w);
      h.items = h.items.concat(g.items); h.w += g.w;
    }
    const out = Array.from(F.values()).sort((a, b) => b.w - a.w).slice(0, 6);
    out.forEach(g => { g.items.sort((a, b) => b.score - a.score); g.show = /^[\u2000-\u33ff]$/.test(g.e) ? g.e + '\uFE0F' : g.e; });
    return out.length >= 2 ? out : [];
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

  window.Match = { contextOf, learnTokens, shouldDelete, ctxProfile, famOf, parseLine, groupsOf, emojiLearned, CUR, CANON, canonToks, phraseKey, learned, habitual, habitBoost, queryTokens, isAdult, modeData, norm, stripVS, tokens, stem, defaultWords, effectiveWords, buildIndex, search, emojisIn, STOP };
})();
