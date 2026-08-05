import { useEffect, useState } from "react";

/**
 * Preloads a sequence of frame images so they're already decoded/cached
 * before interaction is enabled. Mirrors Viewer360's preload effect.
 */
export default function useFramePreloader(frameCount, frameUrl) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoadedCount(0);
    setReady(false);

    const images = new Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = img.onerror = () => {
        if (cancelled) return;
        setLoadedCount((count) => {
          const next = count + 1;
          if (next === frameCount) setReady(true);
          return next;
        });
      };
      images[i] = img;
    }

    return () => {
      cancelled = true;
    };
  }, [frameCount, frameUrl]);

  const progress = frameCount > 0 ? Math.round((loadedCount / frameCount) * 100) : 0;

  return { ready, loadedCount, progress };
}
