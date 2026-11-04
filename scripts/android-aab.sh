#!/usr/bin/env bash
#
# Genera el Android App Bundle de release para Google Play:
#   android/app/build/outputs/bundle/release/app-release.aab   (SIN firmar)
# y, si se indica el keystore, una copia firmada con la upload key:
#   sesolibre-mind-<versionName>-<versionCode>.aab
#
# Uso:
#   ./scripts/android-aab.sh                         # sólo compila (sin firmar)
#   ./scripts/android-aab.sh ruta/upload.jks [alias] # compila y firma
#
# jarsigner pide las contraseñas por teclado: nunca se pasan por argumentos.
# versionCode: variable VERSION_CODE o, por defecto, nº de commits del repo
# (siempre crece, como exige Play). versionName = "version" de package.json.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ -z "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm/java-21-openjdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
fi

KEYSTORE="${1:-}"
ALIAS="${2:-upload}"
VC="${VERSION_CODE:-$(git rev-list --count HEAD)}"
VN="$(node -p "require('./package.json').version")"

# Proyecto Android limpio: la optimización y la versión se aplican sobre la
# plantilla de Capacitor recién generada.
rm -rf android
npm run build
npx cap add android
sed -i 's/android:launchMode="singleTask"/android:launchMode="singleTask"\n            android:screenOrientation="portrait"/' \
  android/app/src/main/AndroidManifest.xml
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
grep -q "targetSdkVersion = 36" android/variables.gradle # Play exige targetSdk 36
npx cap sync android
npx @capacitor/assets generate --android
./scripts/android-optimize.sh

sed -i "s/versionCode 1$/versionCode ${VC}/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"${VN}\"/" android/app/build.gradle
grep -q "versionCode ${VC}" android/app/build.gradle
echo "versionCode=${VC} versionName=${VN}"

(cd android && ./gradlew bundleRelease --no-daemon -q)

AAB=android/app/build/outputs/bundle/release/app-release.aab
MAP=android/app/build/outputs/mapping/release/mapping.txt
[ -s "$MAP" ] || { echo "R8 no generó mapping.txt: el AAB no está optimizado" >&2; exit 1; }
echo "AAB sin firmar: $ROOT/$AAB"

if [ -n "$KEYSTORE" ]; then
  OUT="sesolibre-mind-${VN}-${VC}.aab"
  cp "$AAB" "$OUT"
  jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "$KEYSTORE" "$OUT" "$ALIAS"
  jarsigner -verify "$OUT"
  echo "AAB firmado para Google Play: $ROOT/$OUT"
fi
