'use client';

/**
 * SwitchPathModal
 *
 * Rendered over the pipeline canvas when the PipelineRunner pauses at a
 * SwitchNode. The user clicks which path to continue on; the chosen index
 * is returned to the runner via the onChoose callback.
 *
 * Sprint 12 (S12-002)
 */

interface SwitchPathModalProps {
  switchLabel: string;
  paths: string[];
  onChoose: (pathIndex: number) => void;
}

export default function SwitchPathModal({ switchLabel, paths, onChoose }: SwitchPathModalProps) {
  return (
    /* Backdrop */
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-violet-600 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">◆</span>
          <div>
            <p className="text-white font-semibold text-sm">{switchLabel}</p>
            <p className="text-violet-200 text-xs">Choose a path to continue</p>
          </div>
        </div>

        {/* Path buttons */}
        <div className="p-5 space-y-3">
          {paths.map((path, idx) => (
            <button
              key={idx}
              onClick={() => onChoose(idx)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-left group"
            >
              <span className="w-7 h-7 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0 transition-colors">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-gray-800 group-hover:text-violet-800">
                {path}
              </span>
              <span className="ml-auto text-gray-300 group-hover:text-violet-400 text-lg">→</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Pipeline will continue only down the chosen path
        </p>
      </div>
    </div>
  );
}
