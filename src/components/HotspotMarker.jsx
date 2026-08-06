/**
 * A single room hotspot pin, positioned as a fraction of its parent's box.
 * The wrapper ignores pointer events so it never blocks hover-pan tracking
 * on the rest of the image; only the visible dot is clickable.
 */
export default function HotspotMarker({ x, y, label, onClick }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group relative flex items-center justify-center w-6 h-6 rounded-full bg-white/90 border border-white shadow-lg pointer-events-auto cursor-pointer"
        aria-label={`View ${label} panorama`}
      >
        <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" />
        <span className="relative w-2.5 h-2.5 rounded-full bg-neutral-900" />

        <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      </button>
    </div>
  );
}
