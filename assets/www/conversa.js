'use strict';
/* Mais conversa do dia a dia: os sentidos de calão/conversa que o dicionário não tem
   (chupa = toma!, curtir = aproveitar, bué = muito…). Mesmo formato do lex.js. */
window.LEX = (window.LEX || []).concat([
// ---------- gozar com quem perdeu ----------
'😜😛😝🤪 | toma, toma lá, chupa, chupa esta, chupa nessa, chupa no dedo, embrulha, embrulha esta, embrulha e leva, toma e embrulha, bem feito, bem feita, foi bem feito, ganhei eu, perdeste, perdeste tu, toma que é para aprenderes, aprende, aprendeste, mete-te com quem é do teu tamanho, engole, engole esta, engole essa, come e cala, mama, mama esta, nhé nhé nhé, nhenhenhé, bleh, chora mais, chora baixinho, vai chorar, fica a chorar, chorão, chorona, quem manda sou eu, eu avisei, eu bem te disse, não digas que não te avisei',
'😎🏆😏 | ganhei, venci, sou o maior, sou a maior, sou o melhor, sou a melhor, ninguém me ganha, imbatível, invencível, campeão, campeã, outra vitória, mais uma, fácil, demasiado fácil, nem suei, foi canja, canja, pera doce, isto é para meninos, too easy, ez',
// ---------- doces (sentido normal de chupa) ----------
'🍭🍬🍦 | chupa-chupa, chupa chupa, chupar, rebuçado, rebuçados, gomas, guloseimas, gelado, pirulito, bala, chiclete, pastilha elástica, doce, doces, açúcar, guloso, gulosa',
// ---------- curtir / aproveitar ----------
'😎🎉🍹 | curtir, curte, curti, a curtir, curtição, só curtição, aproveitar, aproveita, aproveita bem, aproveitei, desfrutar, gozar a vida, vida boa, boa vida, relax, chill, a chillar, de boa, só vibes, boas vibes, good vibes, vibe, ambiente, que ambiente, isto é que é vida, a vida é bela',
// ---------- gostar / não gostar ----------
'😍👍❤️ | gosto, gostei, gosto muito, adoro, adorei, amei, amo isto, adoro isto, gostei imenso, curti, curti bué, é mesmo bom, está bom, está ótimo, gostaste, gostas, que bom, que fixe, top, aprovado, aprovo, recomendo',
'👎😖🤢 | não gosto, não gostei, odeio, odiei, detesto, detestei, que mau, péssimo, horrível, horroroso, um nojo, desgosto, não curto, não curti, não aprovo, reprovado, nem pensar nisso, que coisa má, mau gosto',
'🤢😬 | feio, feia, feiinho, feiinha, horrível, que horror, mau gosto, foleiro, foleira, piroso, pirosa, cringe, que vergonha, ridículo, ridícula, está horrível, que coisa feia',
'😍🔥✨ | giro, gira, que giro, que gira, estás linda, estás lindo, estás gira, estás giro, que bonito, que estilo, que pinta, boa pinta, estás top, estás um espetáculo, que elegância, arrasaste, que look, lindo de morrer, linda de morrer, uma brasa, um borracho',
// ---------- melhor / pior ----------
'😖📉 | pior, o pior, a pior, cada vez pior, de mal a pior, pior é impossível, pior ainda, ainda pior, ficou pior, piorou, o pior de tudo, o pior dia, que azar, azar, azarado, azarada',
'😁📈 | melhor, o melhor, a melhor, muito melhor, cada vez melhor, melhorou, melhoras, está melhor, já estou melhor, bem melhor, o melhor de tudo, o melhor dia de sempre',
// ---------- tempo / quando ----------
'📅⏰ | ontem, hoje, amanhã, depois de amanhã, anteontem, logo, mais logo, logo à noite, hoje à noite, amanhã de manhã, cedo, tarde, muito cedo, já é tarde, de manhã, à tarde, à noite, de madrugada, daqui a pouco, já já, num instante',
// ---------- pessoas ----------
'👦👧🧑 | miúda, miúdo, miúdos, gaja, gajo, gajas, gajos, rapaz, rapariga, rapazes, moço, moça, garoto, garota, chavalo, chavala, puto, cota, cotas, malta, pessoal, gente, tipo, tipa, aquele gajo, aquela gaja, o meu mano, a minha mana',
'💑😍 | namorado, namorada, namorados, namorar, mozão, morzinho, cara-metade, a minha cara-metade, marido, mulher, esposa, casal, casados, noivo, noiva, casamento, pedido de casamento, aliança, crush, o meu crush',
'😒💚 | ciúmes, ciumento, ciumenta, inveja, invejoso, invejosa, quem é essa, quem é esse, com quem estavas, estás a falar com quem, quem é que te mandou mensagem, não gosto dela, não gosto dele, estou de olho em ti',
// ---------- conversa de todos os dias ----------
'🤔💬 | o que fazes, que fazes, onde estás, com quem estás, já comeste, já jantaste, já almoçaste, estás bem, estás aí, o que se passa, passa-se alguma coisa, que se passa, novidades, há novidades, conta-me tudo, como correu, então, e tu',
'🙂🤷 | nada, nada de especial, nada de novo, aqui, por aqui, em casa, a trabalhar, a descansar, na mesma, tudo igual, mais ou menos, assim assim, vai-se andando, cá vamos, cá se vai andando, a sobreviver, sobrevivendo, nem bem nem mal, normal, o costume',
'🏠🚪 | cheguei, já cheguei, chegaste, chegaste bem, estou em casa, já estou em casa, cheguei a casa, saí, já saí, vou sair, estou à porta, desce, abre a porta, estou cá fora, estou lá em baixo, sobe',
'📞📱 | liga, liga-me, ligo-te, ligo-te já, estou a ligar, atende, atende o telefone, porque não atendes, chamada, videochamada, faz videochamada, manda áudio, manda mensagem, sem bateria, fiquei sem bateria, sem rede, sem net',
// ---------- muito / nada ----------
'💯🔥 | bué, bué da, imenso, montes, montanhas, muitíssimo, tanto, tantos, demais, à brava, pra caraças, pra caramba, um montão, uma data de, uma carrada de, aos montes, que exagero, exagerado, exagerada',
'🙅0️⃣ | nada, nadinha, coisa nenhuma, nunca, jamais, nenhum, nenhuma, ninguém, zero, népia, nicles, nem um, nem uma, nem pensar, nada de nada, nem vê-lo',
// ---------- exagero de conversa ----------
'💀🔪😤 | mato-te, vou-te matar, ainda te mato, mata-me, mata-me agora, quero morrer, que morte, morro, vou morrer, isto mata-me, matas-me, vais-me matar, vais pagar, vais ver',
'🥵😮‍💨 | que calor, morro de calor, estou a derreter, estou a assar, isto é um forno, ninguém aguenta este calor, que frio, morro de frio, estou gelado, estou gelada, estou a congelar',
// ---------- comer / beber (verbos) ----------
'😋🍽️ | comer, comi, comeste, comemos, almoçar, almocei, jantar, jantei, lanchar, lanchei, petiscar, petisco, tasca, tasquinha, comida caseira, bora comer, vamos comer, onde comemos, o que comemos, comi demais, estou cheio, estou cheia',
'🍻🥴 | beber, bebi, bebeste, bebemos, bebedeira, apanhar uma bebedeira, estou bêbado, estou bêbada, estou tocado, estou tocada, estou com os copos, ressaca, estou de ressaca, nunca mais bebo, mais um copo, mais uma rodada, saúde',
// ---------- ajuda / dúvida ----------
'🙋❓ | ajuda, ajuda-me, ajudas-me, preciso de ajuda, consegues ajudar, sabes, sabes se, alguém sabe, como é que se faz, como faço, o que faço, que faço agora, e agora, dá-me uma dica, tens ideia, alguma ideia',
// ---------- animais (conversa) ----------
'🐶🐱 | cão, cadela, cãozinho, cachorro, cachorrinho, gato, gata, gatinho, gatinha, bichano, patudo, peludo, au au, miau, rom rom, passeio, ir passear o cão, o meu cão, a minha gata, mascote',
// ---------- tecnologia / net ----------
'💻📱 | telemóvel, celular, computador, pc, portátil, tablet, app, aplicação, instagram, tiktok, youtube, whatsapp, net, internet, wifi, password, atualização, não funciona, deu erro, crashou, bugou, bug, travou, reiniciar',
// ---------- malícia / safadeza (sem ser explícito) ----------
'😏😈🔥 | safado, safada, safadinho, safadinha, safadeza, safadezas, malandro, malandra, malandrice, maroto, marota, atrevido, atrevida, ousado, ousada, picante, hot, sexy, provocador, provocadora, provocante, sedutor, sedutora, perigoso, perigosa, tentação, pecado, pecaminoso, ui ui, ai ai, hmm, olha olha, sabes bem, tu sabes, sei bem, sabes bem o que eu quero, sei o que estás a pensar, mente suja, que mente suja, pensamentos impuros, estás a pensar no mesmo que eu, olhar malandro, sorriso malandro, sorriso maroto, ui que calor, está quente aqui, chega aqui, quero muito, quero mais, apetece-me, apetecível, delícia, que delícia, dlc, gostoso, gostosa, que gostoso, que gostosa, uma delícia, hmm delícia',
'😘🔥😍 | irresistível, és irresistível, não resisto, não consigo resistir, és o meu fraco, que charme, charmoso, charmosa, piropo, piropos, cantada, engatatão, conquistador, conquistadora, és um perigo, estás a provocar-me, não me provoques, gosto disso, gosto assim, continua, adoro quando fazes isso, assim sim, isso mesmo, que bom, faz outra vez',
'🙈😏🤭 | insinuar, ai é, ah pois, pois pois, sabes do que estou a falar, tu percebeste, percebeste a ideia, entendedores entenderão, quem sabe sabe, fica no ar, deixo no ar, sem comentários, não digo mais nada, já percebeste, lê nas entrelinhas, piscadela, wink, hehe, hihi',
'😋👅 | lamber os beiços, de comer e chorar por mais, de babar, a babar, babado, babada, água na boca, fiquei com água na boca, que vontade, que desejo, com vontade, cheio de vontade, cheia de vontade, desejo, vontade, quero provar'
]);
