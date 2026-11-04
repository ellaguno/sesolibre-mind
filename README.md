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

## Documentación

Ver [`docs/PLAN.md`](./docs/PLAN.md): visión, reglas de propiedad intelectual,
catálogo completo, arquitectura y roadmap.

## Licencia

[Apache License 2.0](./LICENSE) © 2026 Eduardo Llaguno.
