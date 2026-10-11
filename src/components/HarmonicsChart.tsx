import React from 'react';
import { WaveformPoint } from '../types/powerElectronics';
import { calculateHarmonics } from '../utils/rectifierPhysics';

interface HarmonicsChartProps {
  points: WaveformPoint[];
  frequency: number;
}

export const HarmonicsChart: React.FC<HarmonicsChartProps> = ({
  points,
  frequency,
}) => {
  const harmonics = calculateHarmonics(points, 8);
  const maxMag = Math.max(...harmonics.map((h) => h.magnitude), 1);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Output Voltage Harmonic Spectrum (Fourier Decomposition)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown of fundamental frequency harmonics (f = {frequency} Hz) and high-frequency ripple
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500">
          DC + Harmonics n=1..8
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {harmonics.map((h) => {
          const barWidthPercent = (h.magnitude / maxMag) * 100;
          const isDc = h.harmonicNumber === 0;

          return (
            <div key={h.harmonicNumber} className="flex items-center gap-3 text-xs font-mono">
              <div className="w-20 text-slate-400 truncate">
                {isDc ? 'V0 (DC)' : `h${h.harmonicNumber} (${h.harmonicNumber * frequency}Hz)`}
              </div>

              <div className="flex-1 h-5 bg-slate-950 rounded-md overflow-hidden relative border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDc
                      ? 'bg-amber-500'
                      : h.harmonicNumber % 2 === 0
                      ? 'bg-cyan-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.max(2, barWidthPercent)}%` }}
                />
              </div>

              <div className="w-24 text-right text-slate-300 font-bold">
                {h.magnitude.toFixed(1)} V
              </div>

              <div className="w-16 text-right text-slate-500 text-[11px]">
                {h.percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>● Amber: Desired DC average component (V0)</span>
        <span>● Cyan: Rectifier AC ripple harmonics (n = 2, 4, 6...)</span>
      </div>
    </div>
  );
};
