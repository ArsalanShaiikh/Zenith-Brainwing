import { useEffect, useRef, useState } from "react";

/**
 * Preloads a frame sequence and — the part that matters — *keeps* the images
 * alive for as long as the sequence is on screen.
 *
 * Letting the Image objects fall out of scope the moment the effect returned
 * left the frames to the browser's own memory cache, and anything that puts
 * real pressure on that cache evicts them. The panorama a hotspot opens is
 * exactly that: Marzipano's cube textures push 121 full-size frames straight
 * out. What came back was a viewer where every frame needed a fresh
 * fetch/decode mid-pan — the hotspots (pure maths on the index) tracked the
 * cursor while the picture landed seconds behind. Held in a ref, they stay.
 *
 * Returns the array by ref rather than by value: the caller draws the current
 * frame from it, so it must read the live slot, not a render-time snapshot.
 */
export default function useFramePreloader(frameCount, frameUrl) {
  const framesRef = useRef([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoadedCount(0);
    setReady(false);

    const images = new Array(frameCount);
    framesRef.current = images;

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
      // Only now — when the sequence itself is going away — do we let go.
      if (framesRef.current === images) framesRef.current = [];
    };
  }, [frameCount, frameUrl]);

  const progress = frameCount > 0 ? Math.round((loadedCount / frameCount) * 100) : 0;

  return { framesRef, ready, loadedCount, progress };
}
