import { useMemo, useState } from "react";
import IsoFrameStage from "./components/IsoFrameStage";
import { ISO_UNITS } from "./lib/isoUnits";

/**
 * Standalone dev page for the apartment interior viewer, switchable between
 * unit types. The pan/hotspot mechanics live in IsoFrameStage (shared with
 * the compare-flow walkthrough modal); this page adds the unit switcher and
 * the dev-only hotspot tagger.
 */
export default function InteriorViewer() {
  const [unitId, setUnitId] = useState(ISO_UNITS[0].id);
  const unit = useMemo(() => ISO_UNITS.find((u) => u.id === unitId) ?? ISO_UNITS[0], [unitId]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="flex gap-1 rounded-full border border-neutral-700 bg-neutral-900 p-1">
        {ISO_UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setUnitId(u.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              u.id === unitId
                ? "bg-white text-neutral-900"
                : "text-neutral-300 hover:text-white"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      <IsoFrameStage key={unitId} unit={unit} enableTagging />
    </div>
  );
}
