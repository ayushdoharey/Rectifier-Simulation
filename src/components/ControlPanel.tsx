import React from 'react';
import {
  CircuitParameters,
  TopologyType,
  LoadType,
} from '../types/powerElectronics';

interface ControlPanelProps {
  params: CircuitParameters;
  onChange: (updated: Partial<CircuitParameters>) => void;
  onApplyPreset: (name: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChange,
  onApplyPreset,
}) => {
  const isControlled = !params.topology.includes('uncontrolled');

  return (
    <div className="flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* 1. Topology Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Converter Topology
          </label>
          <span className="text-xs text-slate-500 font-mono">
            {params.topology.replace(/-/g, ' ')}
          </span>
        </div>

        {/* Grid of Topologies: 1-Phase Bridge, 3-Phase Bridge, Half-Wave/Center-Tap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mb-2">
          {/* Group 1: 3-Phase Bridge Rectifiers */}
          <div className="flex flex-col gap-1.5 p-2.5 bg-slate-950/70 rounded-lg border border-cyan-500/30">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>3-Phase 6-Pulse Rectifiers</span>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onChange({ topology: 'three-phase-bridge-uncontrolled', firingAngleDeg: 0 })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'three-phase-bridge-uncontrolled'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Uncontrolled (6 Diodes)
              </button>

              <button
                onClick={() => onChange({ topology: 'three-phase-bridge-controlled' })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'three-phase-bridge-controlled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Fully Controlled (6 SCRs)
              </button>

              <button
                onClick={() => onChange({ topology: 'three-phase-bridge-semi' })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'three-phase-bridge-semi'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Semi-Controlled (3 SCRs + 3 Diodes)
              </button>
            </div>
          </div>

          {/* Group 2: Single-Phase Full Bridge */}
          <div className="flex flex-col gap-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400">1-Phase Full Bridge</span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onChange({ topology: 'full-bridge-uncontrolled', firingAngleDeg: 0 })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'full-bridge-uncontrolled'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Uncontrolled Bridge (4 Diodes)
              </button>

              <button
                onClick={() => onChange({ topology: 'full-bridge-controlled' })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'full-bridge-controlled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Fully Controlled (4 SCRs)
              </button>

              <button
                onClick={() => onChange({ topology: 'full-bridge-semi' })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'full-bridge-semi'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Semi-Controlled (2 SCRs + 2 Diodes)
              </button>
            </div>
          </div>

          {/* Group 3: Half-Wave Converters */}
          <div className="flex flex-col gap-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400">Half-Wave Converters</span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onChange({ topology: 'half-wave-controlled' })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'half-wave-controlled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Half-Wave Controlled (1 SCR)
              </button>

              <button
                onClick={() => onChange({ topology: 'half-wave-uncontrolled', firingAngleDeg: 0 })}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  params.topology === 'half-wave-uncontrolled'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                Half-Wave Uncontrolled (1 Diode)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Thyristor Firing Angle Control (α) */}
      <div className={`p-3.5 rounded-xl border transition-all ${
        isControlled
          ? 'bg-slate-950/80 border-amber-500/30 shadow-inner'
          : 'bg-slate-950/30 border-slate-800 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              isControlled ? 'text-amber-300' : 'text-slate-500'
            }`}>
              Thyristor Firing Angle (α)
            </span>
            {!isControlled && (
              <span className="text-[10px] text-emerald-400 font-mono">
                (Fixed at 0° for Diodes — Natural Commutation)
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-bold ${isControlled ? 'text-amber-400' : 'text-slate-500'}`}>
              {isControlled ? params.firingAngleDeg : 0}°
            </span>
            <span className="text-xs text-slate-500">
              ({(((isControlled ? params.firingAngleDeg : 0) * Math.PI) / 180).toFixed(2)} rad)
            </span>
          </div>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={0}
          max={isControlled ? 180 : 0}
          step={1}
          value={isControlled ? params.firingAngleDeg : 0}
          onChange={(e) => {
            if (isControlled) {
              onChange({ firingAngleDeg: Number(e.target.value) });
            }
          }}
          disabled={!isControlled}
          className={`w-full h-2 rounded-lg appearance-none ${
            isControlled
              ? 'bg-slate-800 cursor-pointer accent-amber-500'
              : 'bg-slate-900 cursor-not-allowed opacity-40 accent-slate-600'
          }`}
        />

        {/* Presets Bar */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80 gap-1 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-500 font-mono shrink-0">Presets:</span>
          {[0, 30, 45, 60, 90, 120, 150].map((deg) => (
            <button
              key={deg}
              onClick={() => {
                if (isControlled) {
                  onChange({ firingAngleDeg: deg });
                }
              }}
              disabled={!isControlled}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                !isControlled
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  : params.firingAngleDeg === deg
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* 3. Load Type Selection */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
          Load Characteristic
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {[
            { id: 'R', label: 'Resistive (R)', desc: 'Current mimics voltage' },
            { id: 'RL', label: 'Inductive (R-L)', desc: 'Current lag & extinction β' },
            { id: 'RL-FD', label: 'R-L + Freewheeling', desc: 'Clamped vo ≥ 0 via FD' },
            { id: 'CONSTANT_I', label: 'Highly Inductive (L→∞)', desc: 'Ripple-free Idc' },
            { id: 'RLE', label: 'Battery / Motor (R-L-E)', desc: 'Back-EMF threshold' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                const isFd = item.id === 'RL-FD';
                onChange({
                  loadType: item.id as LoadType,
                  hasFreewheelingDiode: isFd,
                });
              }}
              className={`p-2 rounded-lg text-left transition-colors border ${
                params.loadType === item.id
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-xs'
                  : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-850'
              }`}
            >
              <div className="text-xs font-bold">{item.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Electrical Parameters Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
        {/* Resistance R */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Resistance (R):</span>
            <span className="font-mono font-bold text-slate-200">{params.resistance} Ω</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={params.resistance}
            onChange={(e) => onChange({ resistance: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Inductance L */}
        <div className={`flex flex-col gap-1 ${params.loadType === 'R' ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Inductance (L):</span>
            <span className="font-mono font-bold text-slate-200">{params.inductance} mH</span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={params.inductance}
            onChange={(e) => onChange({ inductance: Number(e.target.value) })}
            disabled={params.loadType === 'R'}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Supply RMS Voltage */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Supply Voltage (Vrms):</span>
            <span className="font-mono font-bold text-slate-200">{params.vRms} V</span>
          </div>
          <input
            type="range"
            min={24}
            max={400}
            step={1}
            value={params.vRms}
            onChange={(e) => onChange({ vRms: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Back-EMF E (for RLE) */}
        <div className={`flex flex-col gap-1 ${params.loadType !== 'RLE' ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Back-EMF (E):</span>
            <span className="font-mono font-bold text-amber-300">{params.backEmf} V</span>
          </div>
          <input
            type="range"
            min={0}
            max={150}
            step={5}
            value={params.backEmf}
            onChange={(e) => onChange({ backEmf: Number(e.target.value) })}
            disabled={params.loadType !== 'RLE'}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 5. Quick Application Scenarios */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
          Engineering Lab Scenarios
        </label>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onApplyPreset('heating')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            🔥 Industrial Heating (Full Bridge R, α=60°)
          </button>
          <button
            onClick={() => onApplyPreset('motor')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            ⚙️ DC Motor Drive (Full Bridge RL, α=45°)
          </button>
          <button
            onClick={() => onApplyPreset('semiconverter')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            ⚡ Semiconverter Freewheeling (RL, α=60°)
          </button>
          <button
            onClick={() => onApplyPreset('charger')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            🔋 Battery Charger (Half-Wave R-E, α=30°)
          </button>
        </div>
      </div>
    </div>
  );
};
