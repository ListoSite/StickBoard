'use strict';
/* Expressões e mini frases que se dizem em conversa e que um sticker pode substituir.
   Mesmo formato do lex.js: 'emojis | palavras-chave, frase, frase, …' (as primeiras são as mais centrais). */
window.LEX_FR = (window.LEX || []).length;
window.LEX = (window.LEX || []).concat([
// ---------- desconfiança / ironia ----------
'🙄🤨😏🧢 | desconfiado, duvido, isso dizes tu, isso dizes tu agora, isso é o que tu dizes, pois pois, pois sim, sim sim acredito, acredito, ya ya, conta-me outra, conta outra, vai contar a outro, conta essa a outro, até parece, ah tá, tá bom então, tá bem abelha, quem te ouvir até pensa, a quem é que tu enganas, não me enganas, essa não cola, essa não pega, não acredito em ti, mentiroso, tu é que sabes, se tu o dizes, se tu dizes, sei sei, sei bem, claro claro, pois claro, conta lá essa história, conversa',
'🙄😒💅 | ironia, que surpresa, quem diria, nunca vi, a sério que não sabia, que novidade, grande novidade, não me digas, ui que medo, estou a tremer, muito bem muito bem, parabéns pela descoberta, génio, que inteligente, obrigado capitão óbvio, nem tinha reparado, ah que giro, que bom para ti, fico tão feliz por ti',
'🫵😂🤭 | olha quem fala, fala quem pode, falou o santo, logo tu, logo tu a dizer isso, disse o roto ao nu, o sujo a falar do mal lavado, foste tu, a culpa é tua, tu é que começaste, foi ele, não fui eu, eu não disse nada, não olhes para mim',
'🤐🤫🙊 | segredo, não digo nada, não sei de nada, não vi nada, os meus lábios estão selados, isto fica entre nós, não contes a ninguém, bico calado, boca fechada, nem uma palavra, o que acontece aqui fica aqui, finge que não ouviste',
// ---------- concordar / discordar ----------
'👍✅💯 | concordo, isso mesmo, exatamente isso, é isso, nem mais, tens razão, tens toda a razão, assino por baixo, sem dúvida, nem mais nem menos, falaste bem, disseste tudo, é mesmo isso, nada a acrescentar, verdade verdadinha, é verdade, também acho, eu também, idem, tal e qual, na mouche, acertaste',
'👎❌🙅 | discordo, nem pensar, não concordo, estás errado, estás enganado, não é bem assim, nada disso, de maneira nenhuma, nem por sombras, nem a pau, nem que a vaca tussa, nem morto, esquece, nem sonhes, nunca na vida, só por cima do meu cadáver, nem num milhão de anos, claro que não, não não e não',
'🤷😐 | tanto faz, tanto me faz, sei lá, não sei, como queiras, como quiseres, decide tu, para mim é igual, é-me indiferente, é igual ao litro, quero lá saber, não me interessa, pouco me importa, faz como achares melhor, tu é que sabes, logo se vê, depois vê-se, vamos ver',
'🤝🫡 | combinado, está combinado, fechado, negócio fechado, feito, então fica assim, fica combinado, contigo é sempre, conta comigo, podes contar comigo, deixa comigo, eu trato disso, eu resolvo, missão aceite, às tuas ordens, sim chefe, vou já tratar disso',
// ---------- surpresa / choque ----------
'😱😮🤯 | choque, não acredito, não pode ser, a sério, estás a gozar, estás a brincar, juras, mentira, não me digas, como assim, o quê, oi, que é isso, meu deus, ai meu deus, valha-me deus, credo, cruzes, caramba, nossa senhora, não estou a acreditar, isto é real, fiquei sem palavras, caiu-me o queixo, estou chocado, estou chocada, que bomba',
'😳🫢👀 | escândalo, que escândalo, babado, fofoca, conta tudo, quero saber tudo, desembucha, conta lá, e depois, e então, e agora, continua, não pares agora, isto está a ficar bom, pipocas, vou buscar as pipocas, drama, que drama, mexerico',
'🤯😵‍💫 | confuso, não percebi nada, não entendi nada, explica outra vez, explica-me como se eu tivesse cinco anos, o quê, como é que é, perdi-me, estou perdido, estou perdida, baralhaste-me, já não sei de nada, a minha cabeça vai explodir, isto é muita informação',
// ---------- irritação / paciência ----------
'😤😡🙄 | paciência, não tenho paciência, sem paciência, já chega, chega, basta, outra vez, outra vez isto, de novo não, lá estás tu, lá vem ele, lá vem ela, não começes, não comeces, poupa-me, dá-me paciência, deus me dê paciência, estou farto, estou farta, estou por aqui, tou cheio, enche o saco, não aguento mais, isto é demais',
'😠🖕😤 | cala-te, cala a boca, fica calado, fica calada, ninguém te perguntou, ninguém pediu a tua opinião, vai dar uma volta, vai passear, vai-te catar, vai-te embora, desaparece, sai daqui, deixa-me em paz, larga-me, não me chateies, não me irrites, não me provoques, não me faças rir, vê lá se cresces',
'🙄💅✋ | e eu com isso, problema teu, o problema não é meu, não é da tua conta, não te diz respeito, mete-te na tua vida, cuida da tua vida, quem te chamou, ninguém te chamou aqui, não te metas, não tenho nada a ver com isso, isso é contigo, resolve tu',
'😒🥱 | aborrecido, que seca, que chatice, que tédio, que sono, que aborrecimento, isto não acaba, nunca mais acaba, quando é que isto acaba, que preguiça, não me apetece, não tenho vontade, hoje não, fica para amanhã, deixa para depois',
// ---------- rir / gozar ----------
'😂🤣💀 | riso, morri, morri a rir, morri de rir, estou a chorar a rir, chorei a rir, não consigo parar de rir, não aguento, rebolei a rir, fiquei sem ar, que figura, esta é boa, esta foi boa, boa piada, tu és demais, és impossível, que comédia, só tu, tu não existes, para com isso, já estou a rir',
'😜😏🤪 | gozar, estou a gozar, só a gozar, é a brincar, é só brincadeira, estou a brincar contigo, não leves a mal, não te zangues, foi só uma piada, apanhaste-me, caíste, caíste que nem um patinho, enganei-te, estava a ver se estavas atento',
'🤡🙃 | palhaço, que palhaçada, fiz figura de parvo, fiz figura de palhaço, caí que nem um patinho, fui enganado, fui enganada, sou mesmo burro, sou mesmo burra, que vergonha a minha, nunca mais faço isto, aprendi a lição',
// ---------- vergonha / desculpa ----------
'😳🙈😅 | vergonha, que vergonha, morri de vergonha, quero enfiar-me num buraco, a terra que me engula, finge que não viste, esquece o que viste, não viste nada, ignora isso, apaga isso, não era para ti, mensagem errada, enganei-me no chat, oops enganei-me',
'🙏🥺😔 | desculpa, desculpa lá, peço desculpa, foi sem querer, não foi por mal, a culpa foi minha, perdoa-me, não te zangues comigo, fazemos as pazes, estamos bem, prometo que não volta a acontecer, foi mal, sorry mesmo, perdão',
'😅😬 | ups, oops, asneira, fiz asneira, fiz porcaria, estraguei tudo, deu barraca, deu asneira, lá se foi, correu mal, isto correu mal, não era suposto, eu explico, posso explicar, não é o que parece',
// ---------- pedir / agradecer ----------
'🥺🙏👉👈 | pedido, por favor, por favorzinho, faz-me um favor, podes ajudar-me, preciso de ajuda, preciso de ti, só desta vez, só mais uma vez, prometo que é a última, vá lá, anda lá, não sejas mau, não sejas má, por mim, faz isso por mim, diz que sim, não me digas que não',
'🙏🥹🫶 | obrigado, muito obrigado, muito obrigada, obrigadão, nem sei como agradecer, ficas-me a dever uma, fico a dever-te uma, salvaste-me, salvaste-me a vida, és o maior, és a maior, és um anjo, não sei o que faria sem ti, és top, obrigado do fundo do coração',
'😊🤗 | de nada, não tens de quê, não é nada, sempre às ordens, quando precisares, estou aqui para isso, foi um prazer, não há de quê, imagina, disponha, para isso servem os amigos',
// ---------- apoio ----------
'🫂💪❤️‍🩹 | apoio, força, estou contigo, estou aqui, conta comigo, tu consegues, vais conseguir, não desistas, vai correr tudo bem, vai ficar tudo bem, isto passa, tudo passa, não estás sozinho, não estás sozinha, acredito em ti, és mais forte do que isso, respira fundo, um passo de cada vez, abraço apertado',
'👏🥳🏆 | parabéns, muitos parabéns, mereces, mereceste, estou tão orgulhoso de ti, estou tão orgulhosa de ti, sabia que conseguias, eu sabia, arrasaste, és incrível, és o maior, és a maior, vamos celebrar, isto merece festa, isto merece um brinde',
// ---------- cumprimentos / conversa ----------
'👋😊 | olá, então tudo bem, tudo bem contigo, como estás, como vais, há quanto tempo, quanto tempo, que saudades, estás vivo, estás viva, por onde andas, desapareceste, olha quem é vivo, olha quem aparece, finalmente apareces, já não se fala',
'👋😘 | adeus, até logo, até já, até amanhã, até à próxima, fica bem, cuida-te, beijinhos, um beijinho, um abraço, depois falamos, falamos depois, tenho de ir, vou indo, vou-me embora, fui, tchau tchau, adeusinho, vai com deus',
'💬📱 | responde, estás aí, alô, estás a dormir, responde-me, porque não respondes, deixaste-me no visto, vi que viste, viste e não respondeste, liga-me, liga quando puderes, manda mensagem, diz qualquer coisa, sinal de vida',
'⏳😴 | depois, já te respondo, já vejo, agora não posso, estou ocupado, estou ocupada, daqui a bocado, mais logo, depois falamos, deixa-me ver e já te digo, um momento, só um segundo, aguenta aí, espera aí, dá-me cinco minutos',
// ---------- planos ----------
'🍻🎉😎 | bora, bora lá, vamos, vamos nessa, alinho, eu alinho, estou dentro, conta comigo, partiu, onde é, a que horas, quem vai, vamos sair, vamos beber um copo, bora jantar, bora ao café, bora festejar, hoje há festa',
'🙅😴🏠 | não posso, hoje não dá, não dá mesmo, fica para a próxima, estou sem tempo, tenho planos, tenho coisas para fazer, estou cansado, estou cansada, vou ficar em casa, hoje é sofá, hoje não saio de casa, desculpa mas não',
'🏃⏰🚗 | atrasado, estou atrasado, estou atrasada, já vou, estou a chegar, chego já, cinco minutos, estou quase, estou a sair agora, estou no caminho, já estou a caminho, espera por mim, não vás sem mim, desculpa o atraso',
// ---------- emoções ----------
'😢😭💔 | triste, estou triste, estou em baixo, estou mal, não estou bem, hoje não é o meu dia, que dia horrível, só me acontece a mim, porquê eu, a vida é injusta, que pena, que chatice, fiquei triste, partiste-me o coração, magoaste-me',
'😍🥰❤️ | amor, amo-te, gosto tanto de ti, és tudo para mim, és a minha pessoa, és o meu mundo, não vivo sem ti, tenho saudades tuas, penso em ti, és lindo, és linda, que fofo, és tão fofo, és tão fofa, derreti, estou apaixonado, estou apaixonada',
'😘💋 | beijinhos, um beijinho, muitos beijinhos, um beijo grande, mil beijos, beijinhos para ti, beijos e abraços, beijinho de boa noite, manda beijinhos',
'😊🥹✨ | feliz, que bom, fiquei tão feliz, que alegria, ganhaste o meu dia, fizeste o meu dia, isto aquece o coração, que bonito, que lindo, estou tão contente, finalmente uma boa notícia',
'😨😰🙏 | nervoso, estou nervoso, estou nervosa, que nervos, estou ansioso, estou ansiosa, estou cheio de medo, estou cheia de medo, reza por mim, deseja-me sorte, cruza os dedos, vai correr bem não vai, e se correr mal',
// ---------- sono / fome / cansaço ----------
'😴🛌💤 | sono, vou dormir, vou-me deitar, estou cheio de sono, estou cheia de sono, estou morto de sono, estou morta de sono, já não me aguento, os olhos estão a fechar, preciso de dormir, boa noite a todos, dorme bem, sonha com os anjos, até amanhã',
'😋🍕🤤 | fome, estou com fome, estou cheio de fome, estou cheia de fome, estou esfomeado, morro de fome, o que é o jantar, o que há para comer, bora comer, alguém quer pizza, comia um boi, já comia qualquer coisa, que delícia, isto está ótimo',
'😩😮‍💨 | cansado, estou cansado, estou cansada, estou exausto, estou exausta, estou morto, estou morta, estou de rastos, que dia longo, não aguento mais, preciso de férias, preciso de descansar, hoje foi puxado, só quero a minha cama',
// ---------- trabalho / escola / dinheiro ----------
'💼😩💻 | trabalho, segunda-feira outra vez, mais um dia de trabalho, só quero que seja sexta, já é sexta, sextou, fim de semana chega depressa, odeio segundas, reunião que podia ser um email, o meu chefe, horas extra outra vez, quero férias',
'📚😩✏️ | estudar, tenho teste amanhã, tenho exame, não estudei nada, vou chumbar, passei, tive positiva, tive negativa, que nota, socorro, vou estudar, ninguém me ajuda, odeio matemática',
'💸😭💰 | dinheiro, estou teso, estou tesa, estou sem dinheiro, estou falido, estou falida, a carteira está a chorar, fim do mês, o ordenado já foi, gastei tudo, isso é muito caro, que roubo, quem paga, pagas tu, fica por minha conta, eu pago',
// ---------- reações curtas ----------
'👀🍿 | estou a ver, estou de olho, eu vi isso, vi tudo, não me escapa nada, estou atento, estou atenta, a observar, só a ver, fico a ver',
'🤔🧐 | será, será que sim, deixa-me pensar, vou pensar nisso, não sei não, tenho dúvidas, isso é suspeito, cheira-me a esturro, aqui há gato, há qualquer coisa que não bate certo, hmm interessante, faz sentido',
'💀🪦 | morri, já era, acabou-se, estou morto, estou morta, descansa em paz, foi-se, lá se foi, adeus mundo cruel, está tudo perdido, perdi a vontade de viver',
'🔥💯😎 | top, isto é top, que brutal, isto está brutal, está espetacular, está perfeito, é isto, assim mesmo, isso é que é, gosto disso, adorei, amei, que máximo, que bom, ficou incrível',
'🤌😋 | perfeito, perfeição, isto é arte, nem mais, que maravilha, uma delícia, simplesmente perfeito, chef’s kiss, beijinho do chef',
'🐐👑 | o maior, és o maior, és a maior, és lendário, és lendária, és uma lenda, ninguém faz como tu, és o rei, és a rainha, o melhor de sempre, inigualável',
'🛑✋ | para, para já, para com isso, chega, calma aí, calma lá, espera aí, tem calma, não tão depressa, alto e para o baile, para tudo',
'🧘😌 | calma, tem calma, relaxa, respira, está tudo bem, não te stresses, não te preocupes, tranquilo, é só isso, não há crise, não faz mal, acontece, deixa estar, não te rales, keep calm',
'🙌🎊 | finalmente, até que enfim, já não era sem tempo, aleluia, graças a deus, já estava na hora, mais vale tarde que nunca, à espera disto há anos',
'🤞🍀 | sorte, boa sorte, vai correr bem, figas, dedos cruzados, oxalá, tomara que sim, espero bem que sim, que os deuses te ouçam, força nisso',
'😈😏🔥 | provocar, vem cá, anda cá, atreve-te, vais ver, vais ver o que te acontece, prepara-te, isto não fica assim, a vingança serve-se fria, vou-me vingar, espera pela volta, quem ri por último ri melhor',
'🗿😐 | sem palavras, sem comentários, nada a dizer, ok, pronto, está bem, tudo bem então, como queiras, nem vou responder, deixa estar, fico calado, fico calada',
'🤦😑 | não acredito nisto, a sério isto, que vergonha alheia, para quê, porquê, porque é que fazes isto, outra vez a mesma coisa, não aprendes, és um caso perdido, és uma causa perdida, desisto de ti',
'🥲🙂 | rir para não chorar, é o que há, a vida é assim, fazer o quê, que remédio, tem de ser, há dias assim, amanhã é outro dia, faz parte, siga, bola para a frente',
// ---------- brasileiras ----------
'😂🤣 | kkkk, rachei, morri kkk, tô chorando, tô passada, tô passado, socorro kkk, não tô bem, me ajuda, que isso, oxe, vixe, eita, eita porra, mds, ai ai',
'🙄😒 | aff, affs, ah tá, tá bom, sei, me poupe, me poupa, nem vem, nem vem que não tem, vai nessa, conta outra, papo furado, migué, que papo é esse, tô nem aí, problema seu',
'👍🤙 | beleza, blz, fechou, tá certo, demorou, firmeza, suave, de boa, tranquilo, show, show de bola, top demais, é nóis, tamo junto, valeu, valeu mesmo'
]);
