import { Capacitor } from "@capacitor/core";

/**
 * Helper unificado para captura de imágenes.
 *
 * - En web/PWA: hace click en el <input type="file"> que se le pasa
 *   (mantiene comportamiento existente y filtros por extensión).
 * - En nativo (Capacitor): abre la cámara real o la galería real
 *   usando el plugin @capacitor/camera, y devuelve el resultado como
 *   File para que el flujo de subida actual funcione sin cambios.
 */
export async function pickImage(
  source: "camera" | "gallery",
  fallbackInput: HTMLInputElement | null,
): Promise<File[] | null> {
  if (!Capacitor.isNativePlatform()) {
    fallbackInput?.click();
    return null; // el onChange del input se encarga
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    // Solicita permisos antes de abrir.
    try {
      const perms = await Camera.checkPermissions();
      const needsCam = source === "camera" && perms.camera !== "granted";
      const needsPhotos = source === "gallery" && perms.photos !== "granted";
      if (needsCam || needsPhotos) {
        await Camera.requestPermissions({
          permissions: source === "camera" ? ["camera"] : ["photos"],
        });
      }
    } catch {
      // Algunos dispositivos no exponen checkPermissions; seguimos.
    }

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      saveToGallery: false,
    });

    const uri = photo.webPath || photo.path;
    if (!uri) return [];
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = photo.format || "jpg";
    const file = new File([blob], `foto-${Date.now()}.${ext}`, {
      type: blob.type || `image/${ext}`,
    });
    return [file];
  } catch (err: any) {
    // Cancelación del usuario o error: devolvemos array vacío.
    if (err?.message?.toLowerCase?.().includes("cancel")) return [];
    console.warn("[nativeMedia] pickImage error", err);
    return [];
  }
}

export const isNative = () => Capacitor.isNativePlatform();