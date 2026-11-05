#!/usr/bin/env bash
#
# Genera el Android App Bundle de release para Google Play:
#   android/app/build/outputs/bundle/release/app-release.aab   (SIN firmar)
# y, si se indica el keystore, una copia firmada con la upload key:
#   sesolibre-mind-<versionName>-<versionCode>.aab   (sólo existe si la firma salió bien)
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
if [ -n "$KEYSTORE" ] && [ ! -f "$KEYSTORE" ]; then
  echo "No existe el keystore: $KEYSTORE" >&2
  exit 1
fi
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
# Recursos nativos propios (ícono de la notificación del recordatorio).
cp -r native/android/res/. android/app/src/main/res/
./scripts/android-optimize.sh

sed -i "s/versionCode 1$/versionCode ${VC}/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"${VN}\"/" android/app/build.gradle
grep -q "versionCode ${VC}" android/app/build.gradle
echo "versionCode=${VC} versionName=${VN}"

(cd android && ./gradlew bundleRelease --no-daemon -q)

AAB=android/app/build/outputs/bundle/release/app-release.aab
MAP=android/app/build/outputs/mapping/release/mapping.txt
[ -s "$MAP" ] || { echo "R8 no generó mapping.txt: el AAB no está optimizado" >&2; exit 1; }
echo "AAB intermedio (sin firmar, NO subir a Play): $ROOT/$AAB"

if [ -z "$KEYSTORE" ]; then
  echo "Sin keystore: el AAB queda SIN FIRMAR (Play no lo acepta)."
  exit 0
fi

# Se firma una copia temporal y sólo si la firma se verifica se le da el nombre
# final: así nunca queda en la carpeta un sesolibre-mind-*.aab sin firmar.
OUT="sesolibre-mind-${VN}-${VC}.aab"
TMP="$(mktemp --suffix=.aab)"
trap 'rm -f "$TMP"' EXIT
cp "$AAB" "$TMP"
echo
echo "Firmando con $KEYSTORE (alias $ALIAS). Escribe la contraseña y pulsa Enter:"
if ! jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "$KEYSTORE" "$TMP" "$ALIAS"; then
  echo "✗ No se pudo firmar (¿contraseña o alias incorrectos?). No se generó $OUT." >&2
  exit 1
fi
# (Sin tubería a grep -q: con pipefail, cortar la salida haría fallar la verificación.)
VERIFY="$(jarsigner -verify "$TMP" 2>&1 || true)"
if [[ "$VERIFY" != *"jar verified"* ]]; then
  echo "✗ La firma no se pudo verificar. No se generó $OUT." >&2
  exit 1
fi
mv "$TMP" "$OUT"
trap - EXIT
echo
echo "✓ AAB FIRMADO para Google Play: $ROOT/$OUT"
