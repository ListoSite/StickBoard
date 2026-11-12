#!/bin/bash
# Compila o StickTag sem Gradle (aapt + javac + dx + apksigner).
# Precisa dos pacotes Ubuntu: aapt apksigner dalvik-exchange android-sdk-platform-23 zipalign openjdk
set -e
P="$(cd "$(dirname "$0")/.." && pwd)"; B="$P/build"
SDK=/usr/lib/android-sdk; JAR=$(ls $SDK/platforms/*/android.jar | head -1)
DX=$SDK/build-tools/debian/dx
rm -rf "$B"; mkdir -p "$B/gen" "$B/classes"
aapt package -f -M "$P/AndroidManifest.xml" -S "$P/res" -A "$P/assets" -I "$JAR" -J "$B/gen" -F "$B/app.unaligned.apk" -0 json
javac -encoding UTF-8 -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -d "$B/classes" $(find "$P/src" "$B/gen" -name '*.java')
"$DX" --dex --min-sdk-version=21 --output="$B/classes.dex" "$B/classes"
(cd "$B" && aapt add app.unaligned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$B/app.unaligned.apk" "$B/app.aligned.apk"
apksigner sign --ks "$P/signing/sticktag.keystore" --ks-pass pass:sticktag --key-pass pass:sticktag --ks-key-alias sticktag --out "$B/StickTag.apk" "$B/app.aligned.apk"
apksigner verify "$B/StickTag.apk"
ls -la "$B/StickTag.apk"
