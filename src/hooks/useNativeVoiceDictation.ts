import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useVoiceDictation } from "./useVoiceDictation";

/**
 * Hook de dictado por voz que funciona tanto en navegador (Web Speech API)
 * como en la app nativa (Capacitor) usando el motor de reconocimiento del
 * sistema operativo a través de @capacitor-community/speech-recognition.
 *
 * Expone exactamente la misma API que useVoiceDictation para que sea un
 * reemplazo directo en los componentes existentes.
 */
export function useNativeVoiceDictation(opts?: {
  lang?: string;
  onFinalChange?: (finalText: string) => void;
  onInterimChange?: (interimText: string) => void;
}) {
  const isNative = Capacitor.isNativePlatform();
  // En web delegamos íntegramente al hook ya validado.
  const webHook = useVoiceDictation(opts);

  const lang = opts?.lang ?? "es-ES";
  const onFinalRef = useRef(opts?.onFinalChange);
  const onInterimRef = useRef(opts?.onInterimChange);
  useEffect(() => {
    onFinalRef.current = opts?.onFinalChange;
    onInterimRef.current = opts?.onInterimChange;
  }, [opts?.onFinalChange, opts?.onInterimChange]);

  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const finalRef = useRef("");
  const pluginRef = useRef<any>(null);
  const partialListenerRef = useRef<any>(null);

  const ensurePlugin = useCallback(async () => {
    if (pluginRef.current) return pluginRef.current;
    const mod = await import("@capacitor-community/speech-recognition");
    pluginRef.current = mod.SpeechRecognition;
    return pluginRef.current;
  }, []);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      try {
        const sr = await ensurePlugin();
        const avail = await sr.available();
        if (!cancelled) setSupported(!!avail?.available);
      } catch {
        if (!cancelled) setSupported(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNative, ensurePlugin]);

  const cleanupNative = useCallback(async () => {
    try {
      const sr = pluginRef.current;
      if (sr) {
        try { await sr.stop(); } catch {}
        try { await sr.removeAllListeners?.(); } catch {}
      }
    } catch {}
    partialListenerRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    if (!isNative) return webHook.stop();
    await cleanupNative();
    setRecording(false);
    setInterim("");
    onInterimRef.current?.("");
  }, [isNative, webHook, cleanupNative]);

  const start = useCallback(async (seedText = "") => {
    if (!isNative) return webHook.start(seedText);
    try {
      const sr = await ensurePlugin();
      const perm = await sr.checkPermissions();
      if (perm?.speechRecognition !== "granted") {
        const req = await sr.requestPermissions();
        if (req?.speechRecognition !== "granted") {
          setSupported(false);
          return;
        }
      }
      finalRef.current = seedText ?? "";
      onFinalRef.current?.(finalRef.current);
      setInterim("");
      onInterimRef.current?.("");

      // Listener de resultados parciales en tiempo real.
      const listener = await sr.addListener("partialResults", (data: any) => {
        const matches: string[] = data?.matches || [];
        const text = matches[0] || "";
        const cleanInterim = text.trim();
        setInterim(cleanInterim);
        onInterimRef.current?.(cleanInterim);
      });
      partialListenerRef.current = listener;

      setRecording(true);
      await sr.start({
        language: lang,
        maxResults: 1,
        prompt: "",
        partialResults: true,
        popup: false,
      });
      // Algunos dispositivos resuelven start() con el resultado FINAL.
      // Lo recogemos también aquí por si el evento partial no se emitió.
      // sr.start es void en mayoría; envolvemos en try.
    } catch (err) {
      console.warn("[useNativeVoiceDictation] start error", err);
      // Cuando finaliza por silencio, consolidamos el interim como final.
      const finalText = mergeWithSpace(finalRef.current, interim);
      finalRef.current = finalText;
      onFinalRef.current?.(finalText);
      setInterim("");
      onInterimRef.current?.("");
      setRecording(false);
      await cleanupNative();
    }
    // Listener para cuando el reconocimiento finaliza.
    try {
      const sr = pluginRef.current;
      await sr?.addListener?.("listeningState", async (state: any) => {
        if (state?.status === "stopped") {
          // Consolida lo último escuchado como texto final.
          setInterim(curInterim => {
            if (curInterim) {
              const merged = mergeWithSpace(finalRef.current, curInterim);
              finalRef.current = merged;
              onFinalRef.current?.(merged);
              onInterimRef.current?.("");
            }
            return "";
          });
          setRecording(false);
        }
      });
    } catch {}
  }, [isNative, webHook, ensurePlugin, lang, cleanupNative, interim]);

  const toggle = useCallback((seedText = "") => {
    if (!isNative) return webHook.toggle(seedText);
    if (recording) void stop();
    else void start(seedText);
  }, [isNative, webHook, recording, start, stop]);

  const reset = useCallback((value = "") => {
    if (!isNative) return webHook.reset(value);
    finalRef.current = value;
    setInterim("");
    onInterimRef.current?.("");
    onFinalRef.current?.(value);
  }, [isNative, webHook]);

  useEffect(() => {
    return () => { if (isNative) void cleanupNative(); };
  }, [isNative, cleanupNative]);

  if (!isNative) return webHook;

  return {
    recording,
    supported,
    interim,
    getFinal: () => finalRef.current,
    start,
    stop,
    toggle,
    reset,
  };
}

function mergeWithSpace(base: string, addition: string): string {
  const b = (base || "").trimEnd();
  const a = (addition || "").trim();
  if (!a) return base;
  if (!b) return a;
  return `${b} ${a}`;
}