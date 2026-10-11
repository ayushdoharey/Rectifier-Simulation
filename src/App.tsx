import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CircuitParameters,
  TopologyType,
  LoadType,
} from './types/powerElectronics';
import {
  calculateWaveforms,
  getInstantaneousState,
} from './utils/rectifierPhysics';
import { CircuitSchematic } from './components/CircuitSchematic';
import { Oscilloscope } from './components/Oscilloscope';
import { ControlPanel } from './components/ControlPanel';
import {
  RotateCcw,
  Gauge,
  Play,
  Pause,
  Activity,
  Zap,
} from 'lucide-react';

const DEFAULT_PARAMS: CircuitParameters = {
  topology: 'full-bridge-controlled',
  loadType: 'RL',
  firingAngleDeg: 45,
  vRms: 230,
  frequency: 50,
  resistance: 10,
  inductance: 50,
  backEmf: 40,
  hasFreewheelingDiode: false,
};

// Calibrated base angular velocity:
// 1 full cycle (2π radians) takes ~3.5 seconds at speed = 1.0x.
// This ensures peaceful, clear, non-vibrating real-time visualization.
const BASE_RAD_PER_SEC = (2 * Math.PI) / 3.5;

export default function App() {
  const [params, setParams] = useState<CircuitParameters>(DEFAULT_PARAMS);
  const [currentAngleRad, setCurrentAngleRad] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5); // Calm 0.5x default speed (1 cycle every 7 seconds)

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Compute waveforms and metrics whenever parameters change
  const { points, metrics } = useMemo(() => {
    return calculateWaveforms(params, 2);
  }, [params]);

  // Compute instantaneous state at current probe angle
  const instantState = useMemo(() => {
    return getInstantaneousState(params, currentAngleRad);
  }, [params, currentAngleRad]);

  // Main animation ticker with calibrated velocity to prevent rapid 50Hz strobe vibration
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      // Cap deltaMs to avoid jumps when tab is inactive
      const deltaMs = Math.min(64, timestamp - lastTimeRef.current);
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        // Smooth calibrated angle progression: 1 cycle takes 3.5s at 1.0x
        const dTheta = BASE_RAD_PER_SEC * (deltaMs / 1000) * speed;
        setCurrentAngleRad((prev) => (prev + dTheta) % (4 * Math.PI));
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, speed]);

  // Handle parameter changes
  const handleParamChange = useCallback((updated: Partial<CircuitParameters>) => {
    setParams((prev) => {
      const next = { ...prev, ...updated };
      if (updated.loadType === 'RL-FD') {
        next.hasFreewheelingDiode = true;
      } else if (updated.loadType === 'R' || updated.loadType === 'RL') {
        next.hasFreewheelingDiode = false;
      }
      // If switching to an uncontrolled topology, guarantee firing angle is strictly 0
      if (updated.topology && updated.topology.includes('uncontrolled')) {
        next.firingAngleDeg = 0;
      }
      return next;
    });
  }, []);

  // Quick Presets
  const applyPreset = useCallback((preset: string) => {
    switch (preset) {
      case 'heating':
        setParams({
          topology: 'full-bridge-controlled',
          loadType: 'R',
          firingAngleDeg: 60,
          vRms: 230,
          frequency: 50,
          resistance: 10,
          inductance: 5,
          backEmf: 0,
          hasFreewheelingDiode: false,
        });
        break;
      case 'motor':
        setParams({
          topology: 'full-bridge-controlled',
          loadType: 'RL',
          firingAngleDeg: 45,
          vRms: 230,
          frequency: 50,
          resistance: 8,
          inductance: 60,
          backEmf: 30,
          hasFreewheelingDiode: false,
        });
        break;
      case 'semiconverter':
        setParams({
          topology: 'full-bridge-semi',
          loadType: 'RL',
          firingAngleDeg: 60,
          vRms: 230,
          frequency: 50,
          resistance: 10,
          inductance: 70,
          backEmf: 0,
          hasFreewheelingDiode: true,
        });
        break;
      case 'charger':
        setParams({
          topology: 'half-wave-controlled',
          loadType: 'RLE',
          firingAngleDeg: 30,
          vRms: 120,
          frequency: 50,
          resistance: 5,
          inductance: 20,
          backEmf: 48,
          hasFreewheelingDiode: true,
        });
        break;
    }
  }, []);

  const resetToDefault = () => {
    setParams(DEFAULT_PARAMS);
    setCurrentAngleRad(0);
    setSpeed(0.5);
  };

  const isControlled = !params.topology.includes('uncontrolled');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ================= 3-ZONE TOP BAR CONTRACT ================= */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Single Text Wordmark with Requested User Tag */}
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            RectiSim
          </span>
          <span className="text-xs text-slate-400 font-mono">
            ayush doharey 24EE10044
          </span>
        </div>

        {/* Zone 2: Converter Status Kicker */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-300">
          <span className="text-cyan-400 font-semibold uppercase tracking-wider">
            {params.topology.replace(/-/g, ' ')}
          </span>
          <span className="text-slate-600">·</span>
          <span>Load: {params.loadType}</span>
          {isControlled && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-bold">α = {params.firingAngleDeg}°</span>
            </>
          )}
        </div>

        {/* Zone 3: Reset Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            title="Reset parameters to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Lab</span>
          </button>
        </div>
      </header>

      {/* Main Virtual Lab Container */}
      <main className="flex-1 w-full max-w-[1580px] mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Topology Title Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-cyan-400 font-semibold uppercase tracking-wider">
                Virtual Lab Mode
              </span>
              <span aria-hidden="true">·</span>
              <span>Supply: {params.vRms}V RMS @ {params.frequency}Hz</span>
              <span aria-hidden="true">·</span>
              <span>Load: R={params.resistance}Ω {params.loadType !== 'R' ? `L=${params.inductance}mH` : ''}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-100 text-balance">
              {params.topology === 'three-phase-bridge-uncontrolled' && 'Three-Phase 6-Pulse Uncontrolled Diode Bridge Rectifier'}
              {params.topology === 'three-phase-bridge-controlled' && 'Three-Phase 6-Pulse Fully Controlled Thyristor Converter'}
              {params.topology === 'three-phase-bridge-semi' && 'Three-Phase Semi-Controlled Rectifier (Half-Controlled Converter)'}
              {params.topology === 'full-bridge-controlled' && 'Single-Phase Fully Controlled Full-Bridge Rectifier'}
              {params.topology === 'full-bridge-semi' && 'Single-Phase Semi-Controlled Rectifier (Semiconverter)'}
              {params.topology === 'full-bridge-uncontrolled' && 'Single-Phase Full-Bridge Uncontrolled Diode Rectifier'}
              {params.topology === 'half-wave-controlled' && 'Single-Phase Half-Wave Controlled Rectifier (SCR)'}
              {params.topology === 'half-wave-uncontrolled' && 'Single-Phase Half-Wave Uncontrolled Diode Rectifier'}
              {params.topology === 'half-bridge-controlled' && 'Center-Tapped Full-Wave Controlled Converter'}
              {params.topology === 'half-bridge-uncontrolled' && 'Center-Tapped Full-Wave Uncontrolled Diode Rectifier'}
            </h1>
          </div>

          {/* Quick Real-Time Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Average Vdc</span>
              <span className="text-sm font-bold text-amber-400 tabular-nums">{metrics.vdc.toFixed(1)} V</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Average Idc</span>
              <span className="text-sm font-bold text-cyan-400 tabular-nums">{metrics.idc.toFixed(2)} A</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Ripple Factor</span>
              <span className="text-sm font-bold text-slate-200 tabular-nums">{(metrics.rippleFactorV * 100).toFixed(1)}%</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Efficiency</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">{metrics.efficiency.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* PRIMARY STAGE: Circuit Diagram on Left, Dual Oscilloscope on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Zone: Circuit Diagram with Blue Conducting Wires */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-[460px]">
            <CircuitSchematic
              params={params}
              state={instantState}
            />
          </div>

          {/* Right Zone: Dual Oscilloscope (Separate Voltage & Current Graphs) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[460px]">
            <Oscilloscope
              points={points}
              metrics={metrics}
              currentAngleRad={currentAngleRad}
              onAngleChange={setCurrentAngleRad}
              firingAngleDeg={params.firingAngleDeg}
              frequency={params.frequency}
              isControlled={isControlled}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              speed={speed}
              onSpeedChange={setSpeed}
            />
          </div>
        </div>

        {/* CALIBRATED SPEED & TIMELINE TRANSPORT BAR (Steady, smooth, zero vibrating) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
          {/* 1. Time Scrubber (ωt) */}
          <div className="flex-1 flex items-center gap-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/50'
                }`}
                title={isPlaying ? 'Pause Simulation' : 'Run Simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setCurrentAngleRad((prev) => (prev + (5 * Math.PI) / 180) % (4 * Math.PI))}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap"
                title="Step forward by 5 degrees"
              >
                +5° Step
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Time Scrub (ωt):</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {Math.round(((currentAngleRad % (4 * Math.PI)) * 180) / Math.PI)}° ({(((currentAngleRad % (4 * Math.PI)) / (2 * Math.PI * params.frequency)) * 1000).toFixed(1)} ms)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={4 * Math.PI}
                step={0.01}
                value={currentAngleRad % (4 * Math.PI)}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentAngleRad(Number(e.target.value));
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* 2. Calibrated Simulation Speed Bar */}
          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4 text-[11px] font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  Simulation Speed:
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {speed.toFixed(2)}x {speed <= 0.25 ? '(Slow-Mo)' : speed >= 1.2 ? '(Fast)' : '(Normal)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-36 sm:w-44 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                {/* Speed Presets */}
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {[0.1, 0.25, 0.5, 1.0, 1.5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        Math.abs(speed - s) < 0.02
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Conduction Legend Tag */}
          <div className="px-3.5 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 bg-slate-950 border border-slate-800 text-cyan-300 shrink-0 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            <span>Active Paths Glow Blue</span>
          </div>
        </div>

        {/* BOTTOM SECTION: Controls Deck & Live Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Parameter Controls Deck */}
          <div className="lg:col-span-7">
            <ControlPanel
              params={params}
              onChange={handleParamChange}
              onApplyPreset={applyPreset}
            />
          </div>

          {/* Virtual Lab Live Engineering Measurements Card */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Engineering Measurements
              </h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                metrics.isContinuous
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
              }`}>
                {metrics.isContinuous ? 'Continuous (CCM)' : 'Discontinuous (DCM)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 block mb-1">Average DC Voltage (Vdc)</span>
                <span className="text-xl font-bold text-amber-300 tabular-nums">{metrics.vdc.toFixed(2)} V</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-cyan-400 block mb-1">Average DC Current (Idc)</span>
                <span className="text-xl font-bold text-cyan-300 tabular-nums">{metrics.idc.toFixed(2)} A</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 block mb-1">RMS Output Voltage (Vrms)</span>
                <span className="text-xl font-bold text-emerald-300 tabular-nums">{metrics.vRmsOut.toFixed(2)} V</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-sky-400 block mb-1">RMS Output Current (Irms)</span>
                <span className="text-xl font-bold text-sky-300 tabular-nums">{metrics.iRmsOut.toFixed(2)} A</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Voltage Ripple Factor</span>
                <span className="text-lg font-bold text-slate-100 tabular-nums">{(metrics.rippleFactorV * 100).toFixed(1)}%</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Form Factor (FF = Vrms/Vdc)</span>
                <span className="text-lg font-bold text-slate-100 tabular-nums">{metrics.formFactorV.toFixed(3)}</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Rectification Efficiency (η)</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">{metrics.efficiency.toFixed(1)}%</span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Conduction Angle (γ)</span>
                <span className="text-lg font-bold text-amber-300 tabular-nums">{metrics.conductionAngleDeg.toFixed(0)}°</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
              <span className="text-slate-300 font-semibold">Active State: </span>
              {params.topology.replace(/-/g, ' ')} driving {params.loadType} load. Drag the time probe on either graph to freeze and inspect exact instantaneous values.
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Clean Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <div>
          <span>RectiSim Power Electronics Simulator</span>
          <span className="mx-2">·</span>
          <span>ayush doharey 24EE10044</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Standard IEEE Electrical Symbology</span>
          <span className="mx-2">·</span>
          <span>Dual Voltage & Current Oscilloscope</span>
        </div>
      </footer>
    </div>
  );
}
