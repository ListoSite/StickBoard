'use strict';
/* Calão pesado, palavrões e insultos (PT-PT e PT-BR). Aparecem sempre nas sugestões.
   LEX_ADULT: vocabulário sexual, só no modo +18 ou em stickers/packs +18.
   Mesmo formato do lex.js: 'emojis | palavras-chave, expressão, …'. */
window.LEX_CA = (window.LEX || []).length;
window.LEX = (window.LEX || []).concat([
// ---------- palavrões de desabafo ----------
'🤬😡💢 | foda-se, fodasse, fds, caralho, crl, porra, merda, puta que pariu, pqp, que se foda, que se lixe, foda-se pá, ó caralho, mas que caralho, que caralho é isto, que porra é esta, que merda é esta, puta de vida, raios, raios partam, raio que o parta, raios te partam, bolas, chiça, catano, carago, carai, caraças, caraças pá, ai o caralho, porra pá, merda pá, foda-se mano',
// ---------- mandar alguém embora ----------
'🖕😠🤬 | vai-te foder, vai te foder, vai foder, vai se foder, vai te fuder, vai se fuder, vai-te lixar, vai pó caralho, vai pro caralho, vai para o caralho, vai à merda, vai bardamerda, vai levar no cu, vai tomar no cu, toma no cu, vai pastar, vai chatear o camões, vai dar banho ao cão, vai-te catar, vai cagar, vai cagar e andar, enfia no cu, mete no cu, mete-o onde o sol não brilha, desaparece da minha frente, sai daqui caralho, cala-te caralho, cala a boca caralho, fecha a matraca, foda-se para ti',
// ---------- insultos ----------
'🤡💩🖕 | filho da puta, fdp, cabrão, cabra, otário, otária, idiota, estúpido, estúpida, burro do caralho, anormal, palhaço, merdoso, merdas, cagão, cagona, bimbo, labrego, parolo, chunga, azeiteiro, azeiteira, broeiro, javardo, javarda, porco, porca, besta, animal, totó, palerma, tanso, morcão, mongo, cromo, otário do caralho, filho de uma cabra, és um merdas, és uma besta, és mesmo burro, és parvo ou quê, és um palhaço',
// ---------- quando corre mal ----------
'😩💩🤦 | estou fodido, estou fodida, estamos fodidos, estou lixado, estou lixada, fodeu, fodeu-se, lixou-se, já fodeste, fizeste merda, fiz merda, deu merda, que merda, que cagada, cagada, que bosta, merda de vida, vida de merda, dia de merda, isto está uma merda, isto está fodido, que porcaria, cagou-se tudo, foi tudo à merda, foi tudo pó caralho, mandei tudo à merda, estragou-se tudo, borrei a pintura',
// ---------- não querer saber ----------
'😴💩🤷 | estou-me a cagar, tou-me a cagar, estou-me a borrifar, quero lá saber, caguei, cago nisso, caguei para isso, estou-me nas tintas, quero que se foda, que se foda isso, nem quero saber, pouco me importa, não me interessa para nada, tanto se me dá, problema teu caralho, não é da tua conta caralho',
// ---------- irritação forte ----------
'😤😡 | chateado pra caralho, chateada pra caralho, fodido da vida, puto da vida, puta da vida, que nervos, estou passado, estou passada, estou-me a passar, vou-me passar, perdi a cabeça, estou a ferver, enche o saco, encher o saco, encher chouriços, estás a encher, encheste-me a paciência, chato do caralho, és uma seca do caralho, não me fodas, não me fodas a cabeça, não me lixes, não me chateies caralho, deixa-me em paz caralho, outra vez caralho',
// ---------- caralho como reforço (bom ou mau) ----------
'🔥😂🤯 | do caralho, bom pra caralho, bom como o caralho, brutal do caralho, fixe do caralho, ganda, granda, ganda cena, granda cena, ganda maluco, ganda merda, granda pinta, ganda nóia, é bom à brava, à brava, bué da fixe, que foda, caralho que bom, isto é do caralho, puta que pariu que bom, que cena do caralho, fodasse que bom',
'😱🤯 | caralho, foda-se, puta que pariu, mas que caralho, ai o caralho, eh lá, eh pá, ó pá, porra que susto, cagado de medo, borrei-me todo, borrei-me toda, quase me caguei, apanhei um cagaço, que cagaço',
// ---------- inglês ----------
'🤬🖕😂 | fuck, fuck off, fuck you, fuck this, fuck my life, fml, wtf, what the fuck, shit, holy shit, bullshit, bitch, damn, goddamn, motherfucker, stfu, shut up, asshole, dickhead, son of a bitch, screw you, piss off',
// ---------- Brasil ----------
'🤬🖕 | porra, caralho, caraio, krl, puta merda, puta que pariu, pqp, vsf, vai se foder, vtnc, vai tomar no cu, tnc, toma no cu, filho da puta, fdp, cuzão, babaca, otário, arrombado, desgraçado, desgraçada, vagabundo, vagabunda, corno, imbecil, escroto, que merda, foda, fodeu, se fodeu, tô fodido, puta que me pariu'
]);

window.LEX_ADULT = [
'🍆🍑💦😈 | sexo, tesão, com tesão, cheio de tesão, cheia de tesão, excitado, excitada, foder, quero foder, fazer amor, ir para a cama, vamos para a cama, quero-te, quero-te tanto, quero-te agora, vem cá, anda cá, anda cá para a cama, safado, safada, safadeza, putaria, malandro, malandra, só putaria, sem roupa, nu, nua, nudes, manda nudes, manda foto, quero ver, mostra, deixa ver',
'🔥😏🥵 | gostoso, gostosa, boa como o milho, estás tão boa, estás tão bom, que boa que estás, que bom que estás, estás um pecado, és um perigo, és uma tentação, comia-te todo, comia-te toda, devorava-te, ai se te apanho, ai se eu te pego, que calor, fiquei com calor, está a ficar quente aqui, picante, provocante, provocadora, provocador',
'🍑🍑 | rabo, cu, rabão, rabinho, bunda, bundão, que rabo, que cu, rabo grande, palmada, palmadinha, dar uma palmada, apalpar, apalpão',
'🍈🍒 | mamas, maminhas, peitos, peitões, decote, que decote, que mamas, mamalhuda',
'🍆🥒 | pila, piça, pau, caralho, pirilau, pinto, pau grande, tamanho, tusa, teso, tesudo, ficar teso, de pau feito',
'💦👅😮‍💨 | molhado, molhada, toda molhada, lamber, lambidinha, chupar, chupada, mamar, broche, minete, gemer, gemido, orgasmo, vir-me, vim-me, gozar, gozei, foder-te, fode-me, com força, devagarinho, mais, não pares',
'🛏️🔞😈 | quarto, cama, motel, a noite toda, hoje à noite, depois do jantar, rapidinha, uma rapidinha, preliminares, posição, por cima, de quatro, algemas, brinquedo, vibrador, lingerie, cuecas, sem cuecas, fio dental, tanga',
'😘💋🔞 | beijo na boca, linguado, chupão, marcar o pescoço, dar uns amassos, curtir, pegar, engatar, ficar com alguém, one night stand, amizade colorida, peguete, crush safado'
];
