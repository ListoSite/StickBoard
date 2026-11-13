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
