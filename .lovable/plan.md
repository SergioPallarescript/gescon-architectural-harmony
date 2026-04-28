# Plan: Dictado y cámara nativos en la app Capacitor

## Causa raíz

En la app nativa (Capacitor) el WebView no se comporta igual que un navegador:

1. **Dictado no funciona**: el hook `useVoiceDictation` usa `window.webkitSpeechRecognition` (Web Speech API). Esta API **no está disponible** en el WebView de Android/iOS, por lo que `supported` queda en `false` y nunca arranca. Además, aunque existiera, haría falta el permiso de micrófono nativo (`RECORD_AUDIO` / `NSMicrophoneUsageDescription`).
2. **Botón de foto abre la galería**: los tres módulos (`OrdersModule`, `IncidentsModule`, `BrainModule`) usan `<input type="file" accept="image/*" capture="environment">`. En el WebView de Capacitor el atributo `capture` se ignora con frecuencia y se abre el selector de archivos/galería en vez de la cámara.

## Solución

### 1. Dictado nativo (micrófono)

- Añadir el plugin `@capacitor-community/speech-recognition`.
- Crear un nuevo hook `useNativeVoiceDictation` que envuelva `useVoiceDictation` actual:
  - Detecta si estamos en nativo con `Capacitor.isNativePlatform()`.
  - **Web/PWA**: sigue usando el hook actual (sin cambios, funciona en navegador).
  - **Nativo**: usa `SpeechRecognition.requestPermissions()` y `SpeechRecognition.start({ language: "es-ES", partialResults: true, popup: false })`, escucha `partialResults` con `addListener`, acumula resultados con la misma lógica de deduplicación (`mergeFinal`) que ya tenemos.
- Sustituir las llamadas a `useVoiceDictation` en `OrdersModule`, `IncidentsModule` y `BrainModule` por el nuevo hook (misma API: `recording`, `supported`, `interim`, `start`, `stop`, `toggle`, `reset`).
- Permisos nativos:
  - **Android** (`android/app/src/main/AndroidManifest.xml`): `<uses-permission android:name="android.permission.RECORD_AUDIO" />`.
  - **iOS** (`ios/App/App/Info.plist`): `NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription` con texto en español.
- Estos archivos los genera `npx cap add android/ios` localmente; daré al usuario los snippets exactos a pegar.

### 2. Cámara nativa

- Añadir el plugin `@capacitor/camera` (probablemente ya está instalado vía `useNativePush`/dependencias; si no, se instala).
- Crear un helper `pickPhoto(source: "camera" | "gallery")` en `src/lib/nativeMedia.ts`:
  - **Nativo**: usa `Camera.getPhoto({ source: CameraSource.Camera | CameraSource.Photos, resultType: CameraResultType.Uri, quality: 85 })` y convierte el `webPath` resultante a `File` con `fetch().blob()` para mantener compatibilidad con el flujo actual (`setPhotos(prev => [...prev, file])`).
  - **Web**: hace click en el `<input type="file">` correspondiente (comportamiento actual).
- Modificar los botones de "Cámara" y "Galería" en los tres módulos para llamar a este helper en lugar de disparar el input directamente. Los `<input>` se mantienen como fallback web.
- Permisos nativos:
  - **Android**: `<uses-permission android:name="android.permission.CAMERA" />` y `READ_MEDIA_IMAGES`.
  - **iOS**: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` en `Info.plist`.

### 3. Instrucciones al usuario

Tras aplicar los cambios de código, el usuario deberá ejecutar en su máquina:

```
git pull
npm install
npx cap sync
npx cap run android   # o ios
```

Y antes del `cap sync`, pegar los permisos en `AndroidManifest.xml` / `Info.plist` (te paso los snippets exactos).

## Archivos afectados

- **Nuevos**: `src/hooks/useNativeVoiceDictation.ts`, `src/lib/nativeMedia.ts`.
- **Modificados**: `src/pages/OrdersModule.tsx`, `src/pages/IncidentsModule.tsx`, `src/pages/BrainModule.tsx`, `package.json` (deps).
- **Sin tocar**: `useVoiceDictation.ts` (sigue siendo el motor web).

## Notas

- En nativo, el dictado utiliza el motor de reconocimiento del sistema (Google / Apple), independiente del navegador, así que será incluso más fiable que en el WebView.
- Los inputs file ocultos se conservan para que la PWA siga funcionando exactamente igual.
- No se requieren cambios de backend ni base de datos.