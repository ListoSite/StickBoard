# StickTag

App Android para pôr **tags** (emojis e palavras) nos teus stickers, criar packs para o WhatsApp
e usar um **teclado de stickers** que lê a frase que escreveste e sugere os stickers que combinam.

- `src/` — código Java (packs, conversão WebP, metadados EXIF, ligação ao WhatsApp, teclado de stickers)
- `assets/www/` — interface (HTML/JS): `index.html` (app), `kb.html` (teclado), `match.js` (procura por palavras)
- `assets/www/emoji.json` — emojis com palavras em PT/EN (Unicode CLDR + emojibase), gerado com `tools/build_emoji.py`
- `tools/build.sh` — compila o APK sem Gradle

## Descarregar
Cada alteração no ramo `main` é compilada pelo GitHub Actions. O APK mais recente está em **Releases** → `StickTag.apk`.

## Componentes de terceiros
- `assets/www/webp/` — [wasm-webp](https://github.com/nieyuyao/webp-wasm) (libwebp em WebAssembly, licença MIT) para criar stickers animados.
- `assets/www/mp/` — MediaPipe Selfie Segmentation (Google, licença Apache-2.0) para remover o fundo de fotos com pessoas.
- `assets/www/emoji.json` — dados de emojis do Unicode CLDR e emojibase (licenças Unicode e MIT).

### Leitura de texto (tags automáticas)
Usa o [Tesseract.js](https://github.com/naptha/tesseract.js) e o tesseract.js-core (Apache-2.0), com os dados de português `@tesseract.js-data/por` (4.0.0_best_int). Tudo corre offline dentro da app (`assets/www/ocr`). O `worker.min.js` tem uma pequena correção (ver `ocr/PATCH.txt`).

## Sugestões de palavras e emojis (4.2)

- `assets/www/lex.js`: base de palavras do dia a dia (PT-PT, PT-BR, calão e abreviaturas), em grupos ligados a emojis.
- `assets/www/syn.json`: sinónimos filtrados pelas palavras mais usadas em conversa. Gerado por `tools/build_syn.py` a partir de:
  - Dicionário de sinónimos pt_PT do LibreOffice (Onto.PT, CC BY 3.0, Hugo Gonçalo Oliveira et al.);
  - Thesaurus pt_BR do LibreOffice;
  - Listas de frequência FrequencyWords (Hermit Dave, CC BY-SA 4.0), feitas a partir de legendas (OpenSubtitles).
- `assets/www/suggest.js`: junta estas fontes com o uso de cada pessoa (outros stickers, palavras dos emojis, o que o teclado aprendeu, imagens parecidas) e explica cada emoji sugerido.
