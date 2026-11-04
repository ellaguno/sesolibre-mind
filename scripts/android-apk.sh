#!/usr/bin/env bash
#
# Compila un APK de depuración (instalable, firmado con la clave debug de
# Android) en android/app/build/outputs/apk/debug/app-debug.apk.
#
# `android/` no se versiona: se genera aquí con `npx cap add android` la
# primera vez y se sincroniza en cada compilación.
#
# Requiere JDK 21 y el SDK de Android (ANDROID_HOME, por defecto ~/Android/Sdk).

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ -z "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm/java-21-openjdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
fi

npm run build

if [ ! -d android ]; then
  npx cap add android
  # Sólo vertical: las actividades no están diseñadas para horizontal.
  sed -i 's/android:launchMode="singleTask"/android:launchMode="singleTask"\n            android:screenOrientation="portrait"/' \
    android/app/src/main/AndroidManifest.xml
  grep -q 'screenOrientation="portrait"' android/app/src/main/AndroidManifest.xml
fi
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties

npx cap sync android
npx @capacitor/assets generate --android

cd android
./gradlew assembleDebug --no-daemon -q
echo "APK: $ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
