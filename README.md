# StickTag

App Android para pôr **tags** (emojis e palavras) nos teus stickers, criar packs para o WhatsApp
e usar um **teclado de stickers** que lê a frase que escreveste e sugere os stickers que combinam.

- `src/` — código Java (packs, conversão WebP, metadados EXIF, ligação ao WhatsApp, teclado de stickers)
- `assets/www/` — interface (HTML/JS): `index.html` (app), `kb.html` (teclado), `match.js` (procura por palavras)
- `assets/www/emoji.json` — emojis com palavras em PT/EN (Unicode CLDR + emojibase), gerado com `tools/build_emoji.py`
- `tools/build.sh` — compila o APK sem Gradle

## Descarregar
Cada alteração no ramo `main` é compilada pelo GitHub Actions. O APK mais recente está em **Releases** → `StickTag.apk`.
