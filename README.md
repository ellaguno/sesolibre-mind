# SesoLibre Mind

Ejercicios mentales y puzzles de lógica cortos para usar unos minutos al día.
Bilingüe (español / inglés), **offline-first**: web (PWA instalable) y app nativa
(Android primero, iOS después) mediante Capacitor.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · React Router · Zustand · vite-plugin-pwa · Capacitor

Base y servicios heredados de [sesolibre-games](https://github.com/ellaguno/sesolibre-games).

## Actividades

| Tipo | Actividades (MVP) | Estado |
|---|---|---|
| Puzzles | Coronas, Sol y Luna, Hilo, Parcelas, Sudoku mini | ✅ |
| Ejercicios | Cálculo relámpago, Choque de colores, Cuenta atrás, Retén la cifra, Sendero, ¿Cuántos quedan? | ✅ |
| Sesión diaria | 3 ejercicios + puzzle del día, resumen para compartir, calendario de constancia | ✅ |

## Desarrollo

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm run build    # build de producción (dist/, estático)
npm run preview  # previsualizar el build
npm run test     # tests de lógica (Vitest)
npm run lint     # ESLint
```

## APK de Android

```bash
npm run android:apk   # genera android/ la primera vez y compila el APK de depuración
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Requiere JDK 21 y el SDK de Android (`ANDROID_HOME`, por defecto `~/Android/Sdk`).

## Google Play (AAB firmado)

```bash
./scripts/android-aab.sh ~/ruta/upload-keystore.jks upload
```

Compila el bundle de release (R8 activado, targetSdk 36), le pone
`versionCode` = nº de commits y `versionName` = versión de `package.json`, y lo
firma con la *upload key* (jarsigner pide la contraseña). Sale
`sesolibre-mind-<versión>-<versionCode>.aab`. Sin argumentos lo deja sin firmar.

Crear la upload key (una sola vez; guárdala muy bien, nunca en el repo):

```bash
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 9125
```

## Documentación

Ver [`docs/PLAN.md`](./docs/PLAN.md): visión, reglas de propiedad intelectual,
catálogo completo, arquitectura y roadmap. Publicación:
[`docs/PLAY-LISTING.md`](./docs/PLAY-LISTING.md) (ficha de Play) y
[`docs/PRIVACY.md`](./docs/PRIVACY.md) (política de privacidad).

## Licencia

[Apache License 2.0](./LICENSE) © 2026 Eduardo Llaguno.
