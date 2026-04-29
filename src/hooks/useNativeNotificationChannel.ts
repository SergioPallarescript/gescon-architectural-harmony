import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Channel ID used by ALL notifications (push + local) on Android.
 * Importance 5 (IMPORTANCE_HIGH) → heads-up bubble, sound, vibration.
 * Visibility 1 (VISIBILITY_PUBLIC) → shown on lockscreen.
 */
export const TEKTRA_CHANNEL_ID = "incidencias-obra";

/**
 * Creates the high-importance Android notification channel on app start.
 * No-op on iOS / web (channels are an Android concept).
 */
export function useNativeNotificationChannel() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== "android") return;

    (async () => {
      try {
        // Request permission early so the channel can fire.
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }

        await LocalNotifications.createChannel({
          id: TEKTRA_CHANNEL_ID,
          name: "Incidencias y avisos de obra",
          description:
            "Notificaciones críticas de obra: órdenes, incidencias, firmas y alertas.",
          importance: 5, // IMPORTANCE_HIGH → heads-up
          visibility: 1, // VISIBILITY_PUBLIC
          vibration: true,
          sound: "default",
          lights: true,
          lightColor: "#141414",
        });
        console.log("[NativeChannel] Channel created:", TEKTRA_CHANNEL_ID);
      } catch (e) {
        console.error("[NativeChannel] Failed to create channel:", e);
      }
    })();
  }, []);
}
