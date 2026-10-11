import React, { useRef, useState, useCallback, useEffect } from 'react';
import { WaveformPoint, CalculatedMetrics } from '../types/powerElectronics';

interface OscilloscopeProps {
  points: WaveformPoint[];
  metrics: CalculatedMetrics;
  currentAngleRad: number; // Current playback/scrub angle in radians
  onAngleChange: (angleRad: number) => void;
  firingAngleDeg: number;
  frequency: number;
  isControlled: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  points,
  metrics,
  currentAngleRad,
  onAngleChange,
  firingAngleDeg,
  frequency,
  isControlled,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Channel visibility toggles - Output voltage & current only
  const [showVout, setShowVout] = useState(true);
  const [showIout, setShowIout] = useState(true);

  // Canvas geometry for Dual Stacked Oscilloscope
  const width = 840;
  const height = 440;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const plotWidth = width - padding.left - padding.right;

  // Split into 2 sub-plots:
  // Sub-plot 1 (Voltage): y = 25 to 205 (height = 180)
  // Sub-plot 2 (Current): y = 230 to 410 (height = 180)
  const vPlotTop = 25;
  const vPlotHeight = 175;
  const iPlotTop = 235;
  const iPlotHeight = 170;

  const maxTheta = 4 * Math.PI; // 2 full cycles (720 deg)

  // Dynamically compute the maximum peak values observed across all data points
  // to ensure scales are dynamically responsive and current never exceeds the box bounds
  const maxObservedI = points.reduce((acc, pt) => {
    return Math.max(acc, Math.abs(pt.iout || 0), Math.abs(pt.iin || 0));
  }, 0);

  const maxObservedV = points.reduce((acc, pt) => {
    return Math.max(acc, Math.abs(pt.vout || 0), Math.abs(pt.vin || 0));
  }, 0);

  // Dynamic max current scale with generous 25% margin so waveforms comfortably sit within box
  const targetMaxI = Math.max(
    maxObservedI * 1.25,
    (metrics.idc || 0) * 1.35,
    (metrics.iRmsOut || 0) * 1.35,
    2 // minimum baseline to prevent tiny divisions
  );

  // Round up to neat engineering scale steps
  const roundStepI =
    targetMaxI <= 2 ? 0.5 :
    targetMaxI <= 6 ? 1 :
    targetMaxI <= 15 ? 2 :
    targetMaxI <= 35 ? 5 :
    targetMaxI <= 75 ? 10 :
    targetMaxI <= 150 ? 25 : 50;
  const maxI = Math.max(2, Math.ceil(targetMaxI / roundStepI) * roundStepI);

  // Robust voltage scale
  const targetMaxV = Math.max(
    maxObservedV * 1.2,
    (metrics.vm || 0) * 1.2,
    (metrics.vdc || 0) * 1.3,
    100
  );
  const roundStepV = targetMaxV <= 200 ? 25 : targetMaxV <= 500 ? 50 : 100;
  const maxV = Math.max(100, Math.ceil(targetMaxV / roundStepV) * roundStepV);

  // Coordinate scales
  const scaleX = (theta: number) => padding.left + (theta / maxTheta) * plotWidth;

  // Voltage Y-scale: strictly clamped within upper voltage box
  const scaleYVoltage = (v: number) => {
    const centerY = vPlotTop + vPlotHeight * 0.5;
    const y = centerY - (v / maxV) * (vPlotHeight * 0.42);
    // Hard clamp to ensure strict confinement within upper voltage box
    return Math.max(vPlotTop + 2, Math.min(vPlotTop + vPlotHeight - 2, y));
  };

  // Current Y-scale: strictly clamped within lower current box
  const scaleYCurrent = (i: number) => {
    const centerY = iPlotTop + iPlotHeight * 0.5;
    const y = centerY - (i / maxI) * (iPlotHeight * 0.42);
    // Hard clamp to ensure strict confinement within lower current box
    return Math.max(iPlotTop + 2, Math.min(iPlotTop + iPlotHeight - 2, y));
  };

  // Drag scrubber handler
  const handleScrub = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left - (padding.left / width) * rect.width;
      const effectiveWidth = (plotWidth / width) * rect.width;
      const ratio = Math.max(0, Math.min(1, relativeX / effectiveWidth));
      const newAngle = ratio * maxTheta;
      onAngleChange(newAngle);
    },
    [maxTheta, onAngleChange, plotWidth, width, padding.left]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleScrub(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleScrub(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Generate paths
  const generatePath = (
    accessor: (pt: WaveformPoint) => number,
    scaleFn: (val: number) => number
  ) => {
    if (points.length === 0) return '';
    return points
      .map((pt, idx) => {
        const x = scaleX(pt.omegaT);
        const y = scaleFn(accessor(pt));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const voutPath = generatePath((p) => p.vout, scaleYVoltage);
  const ioutPath = generatePath((p) => p.iout, scaleYCurrent);

  // Probe positions
  const probeX = scaleX(currentAngleRad % maxTheta);
  const currentDeg = Math.round(((currentAngleRad % maxTheta) * 180) / Math.PI);
  const currentTimeMs = (((currentAngleRad % maxTheta) / (2 * Math.PI * frequency)) * 1000).toFixed(2);

  const probePt = points.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.omegaT - (currentAngleRad % maxTheta));
    const currDiff = Math.abs(curr.omegaT - (currentAngleRad % maxTheta));
    return currDiff < prevDiff ? curr : prev;
  }, points[0] || { vin: 0, vout: 0, iin: 0, iout: 0, vDevice1: 0, gatePulse: 0 });

  const isThreePhase = points.length > 0 && typeof points[0].va === 'number';
  // Firing angle markers (strictly for controlled converters)
  const alphaRad = (firingAngleDeg * Math.PI) / 180;
  const alphaPositions = isThreePhase
    ? [
        scaleX((Math.PI / 6 + alphaRad) % maxTheta),
        scaleX((Math.PI / 2 + alphaRad) % maxTheta),
        scaleX(((5 * Math.PI) / 6 + alphaRad) % maxTheta),
        scaleX(((7 * Math.PI) / 6 + alphaRad) % maxTheta),
        scaleX(((3 * Math.PI) / 2 + alphaRad) % maxTheta),
        scaleX(((11 * Math.PI) / 6 + alphaRad) % maxTheta),
      ]
    : [
        scaleX(alphaRad),
        scaleX(Math.PI + alphaRad),
        scaleX(2 * Math.PI + alphaRad),
        scaleX(3 * Math.PI + alphaRad),
      ];

  return (
    <div className="flex flex-col w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Oscilloscope Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-2">
        {/* Play / Step / Speed bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
            }`}
          >
            <span>{isPlaying ? '⏸ Pause' : '▶ Run Live'}</span>
          </button>

          <button
            onClick={() => onAngleChange((currentAngleRad + (5 * Math.PI) / 180) % maxTheta)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
            title="Step Forward by 5°"
          >
            +5° Step
          </button>

          {/* Speed Adjustment Bar */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400 whitespace-nowrap">Speed:</span>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.05}
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title="Adjust Simulation Speed"
            />
            <span className="text-cyan-300 font-bold min-w-[34px] text-right tabular-nums">
              {speed.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Channel Visibility Toggles */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setShowVout(!showVout)}
            className={`px-2 py-1 rounded-md transition-colors border ${
              showVout
                ? 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                : 'bg-slate-900 text-slate-500 border-transparent hover:text-slate-400'
            }`}
          >
            vo (Output V)
          </button>

          <button
            onClick={() => setShowIout(!showIout)}
            className={`px-2 py-1 rounded-md transition-colors border ${
              showIout
                ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-transparent hover:text-slate-400'
            }`}
          >
            io (Output I)
          </button>
        </div>
      </div>

      {/* Main Dual Oscilloscope Screen */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="relative w-full overflow-hidden cursor-crosshair select-none bg-[#030712]"
        style={{ minHeight: '410px' }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <pattern id="oscGridDual" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            {/* Strict clip paths guaranteeing all graph lines, curves, and probe dots stay inside their box */}
            <clipPath id="vPlotClip">
              <rect x={padding.left} y={vPlotTop} width={plotWidth} height={vPlotHeight} />
            </clipPath>
            <clipPath id="iPlotClip">
              <rect x={padding.left} y={iPlotTop} width={plotWidth} height={iPlotHeight} />
            </clipPath>
          </defs>

          {/* ================= 1. UPPER GRAPH: VOLTAGE WAVEFORMS ================= */}
          <rect
            x={padding.left}
            y={vPlotTop}
            width={plotWidth}
            height={vPlotHeight}
            fill="#030712"
          />
          <rect
            x={padding.left}
            y={vPlotTop}
            width={plotWidth}
            height={vPlotHeight}
            fill="url(#oscGridDual)"
          />
          <rect
            x={padding.left}
            y={vPlotTop}
            width={plotWidth}
            height={vPlotHeight}
            fill="none"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Voltage Graph Title Badge */}
          <text
            x={padding.left + 10}
            y={vPlotTop + 16}
            fill="#fbbf24"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
            fontWeight="bold"
          >
            OUTPUT VOLTAGE WAVEFORM: vo(t)
          </text>

          {/* Voltage Y-Axis Ticks */}
          {[-maxV, 0, maxV].map((v) => {
            const y = scaleYVoltage(v);
            return (
              <g key={`vy-${v}`}>
                <line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#64748b" strokeWidth="1" />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="end"
                >
                  {v}V
                </text>
              </g>
            );
          })}

          {/* Voltage Waveforms & Reference Line strictly clipped inside Voltage Box */}
          <g clipPath="url(#vPlotClip)">
            {/* Voltage Zero Line */}
            <line
              x1={padding.left}
              y1={scaleYVoltage(0)}
              x2={padding.left + plotWidth}
              y2={scaleYVoltage(0)}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Average Vdc Horizon Line */}
            {showVout && (
              <line
                x1={padding.left}
                y1={scaleYVoltage(metrics.vdc)}
                x2={padding.left + plotWidth}
                y2={scaleYVoltage(metrics.vdc)}
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="5 3"
                opacity={0.7}
              />
            )}

            {/* Output Load Voltage Waveform (vo) */}
            {showVout && (
              <path
                d={voutPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* Average Vdc readout label */}
          {showVout && (
            <text
              x={padding.left + plotWidth - 10}
              y={Math.max(vPlotTop + 14, Math.min(vPlotTop + vPlotHeight - 6, scaleYVoltage(metrics.vdc) - 4))}
              fill="#fbbf24"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
              fontWeight="bold"
              textAnchor="end"
            >
              Vdc = {metrics.vdc.toFixed(1)}V
            </text>
          )}

          {/* ================= 2. LOWER GRAPH: CURRENT WAVEFORMS ================= */}
          <rect
            x={padding.left}
            y={iPlotTop}
            width={plotWidth}
            height={iPlotHeight}
            fill="#030712"
          />
          <rect
            x={padding.left}
            y={iPlotTop}
            width={plotWidth}
            height={iPlotHeight}
            fill="url(#oscGridDual)"
          />
          <rect
            x={padding.left}
            y={iPlotTop}
            width={plotWidth}
            height={iPlotHeight}
            fill="none"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Current Graph Title Badge */}
          <text
            x={padding.left + 10}
            y={iPlotTop + 16}
            fill="#38bdf8"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
            fontWeight="bold"
          >
            OUTPUT CURRENT WAVEFORM: io(t)
          </text>

          {/* Current Y-Axis Ticks (5 well-spaced reference points) */}
          {[
            maxI,
            Number((maxI / 2).toFixed(1)),
            0,
            Number((-maxI / 2).toFixed(1)),
            -maxI,
          ].map((i, idx) => {
            const y = scaleYCurrent(i);
            return (
              <g key={`iy-${idx}-${i}`}>
                <line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#0284c7" strokeWidth="1" />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  fill="#38bdf8"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="end"
                >
                  {i}A
                </text>
              </g>
            );
          })}

          {/* Current Waveforms & Reference Line strictly clipped inside Current Box */}
          <g clipPath="url(#iPlotClip)">
            {/* Current Zero Line */}
            <line
              x1={padding.left}
              y1={scaleYCurrent(0)}
              x2={padding.left + plotWidth}
              y2={scaleYCurrent(0)}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Subtle mid-scale grid guides */}
            <line
              x1={padding.left}
              y1={scaleYCurrent(maxI / 2)}
              x2={padding.left + plotWidth}
              y2={scaleYCurrent(maxI / 2)}
              stroke="#1e293b"
              strokeWidth="0.6"
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <line
              x1={padding.left}
              y1={scaleYCurrent(-maxI / 2)}
              x2={padding.left + plotWidth}
              y2={scaleYCurrent(-maxI / 2)}
              stroke="#1e293b"
              strokeWidth="0.6"
              strokeDasharray="3 3"
              opacity={0.4}
            />

            {/* Average Idc Horizon Line */}
            {showIout && (
              <line
                x1={padding.left}
                y1={scaleYCurrent(metrics.idc)}
                x2={padding.left + plotWidth}
                y2={scaleYCurrent(metrics.idc)}
                stroke="#06b6d4"
                strokeWidth="1.4"
                strokeDasharray="5 3"
                opacity={0.7}
              />
            )}

            {/* Output Load Current Waveform (io) */}
            {showIout && (
              <path
                d={ioutPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* Average Idc readout label */}
          {showIout && (
            <text
              x={padding.left + plotWidth - 10}
              y={Math.max(iPlotTop + 14, Math.min(iPlotTop + iPlotHeight - 6, scaleYCurrent(metrics.idc) - 4))}
              fill="#67e8f9"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
              fontWeight="bold"
              textAnchor="end"
            >
              Idc = {metrics.idc.toFixed(2)}A
            </text>
          )}

          {/* ================= SHARED X-AXIS LABELS & DIVISION MARKERS ================= */}
          {[
            { angle: Math.PI, label: 'π (180°)' },
            { angle: 2 * Math.PI, label: '2π (360°)' },
            { angle: 3 * Math.PI, label: '3π (540°)' },
            { angle: 4 * Math.PI, label: '4π (720°)' },
          ].map(({ angle, label }) => {
            const x = scaleX(angle);
            return (
              <g key={label}>
                {/* Upper plot vertical line */}
                <line
                  x1={x}
                  y1={vPlotTop}
                  x2={x}
                  y2={vPlotTop + vPlotHeight}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                {/* Lower plot vertical line */}
                <line
                  x1={x}
                  y1={iPlotTop}
                  x2={x}
                  y2={iPlotTop + iPlotHeight}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                {/* Shared Bottom X label */}
                <text
                  x={x}
                  y={iPlotTop + iPlotHeight + 16}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}

          <text
            x={scaleX(0)}
            y={iPlotTop + iPlotHeight + 16}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            0°
          </text>

          {/* Firing Angle α Reference Lines across both plots */}
          {isControlled && (
            <g>
              {alphaPositions.map((x, idx) => (
                <g key={`alpha-${idx}`}>
                  <line
                    x1={x}
                    y1={vPlotTop}
                    x2={x}
                    y2={iPlotTop + iPlotHeight}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    opacity={0.65}
                  />
                  <rect
                    x={x - 12}
                    y={vPlotTop + 2}
                    width={24}
                    height={13}
                    fill="#0284c7"
                    rx={3}
                    opacity={0.9}
                  />
                  <text
                    x={x}
                    y={vPlotTop + 11}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="ui-monospace, monospace"
                    textAnchor="middle"
                  >
                    α{idx % 2 === 0 ? '1' : '2'}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ================= SYNCHRONIZED PROBE CURSOR ================= */}
          <g>
            {/* Full-Height Vertical Needle spanning both plots */}
            <line
              x1={probeX}
              y1={vPlotTop}
              x2={probeX}
              y2={iPlotTop + iPlotHeight}
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeDasharray="2 2"
              filter="drop-shadow(0px 0px 4px #ffffff)"
            />

            {/* Handle on top */}
            <polygon
              points={`${probeX},${vPlotTop + 7} ${probeX - 6},${vPlotTop} ${probeX + 6},${vPlotTop}`}
              fill="#ffffff"
            />

            {/* Upper Plot Intersections (Voltage) */}
            <g clipPath="url(#vPlotClip)">
              {showVout && (
                <circle
                  cx={probeX}
                  cy={scaleYVoltage(probePt.vout)}
                  r={4.5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}
            </g>

            {/* Lower Plot Intersections (Current) */}
            <g clipPath="url(#iPlotClip)">
              {showIout && (
                <circle
                  cx={probeX}
                  cy={scaleYCurrent(probePt.iout)}
                  r={4.5}
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              )}
            </g>
          </g>
        </svg>

        {/* Drag Helper Notice */}
        <div className="absolute top-2 right-4 pointer-events-none bg-slate-900/85 backdrop-blur-xs border border-slate-700/60 rounded px-2 py-0.5 text-[10px] font-mono text-slate-300">
          Click & Drag on either graph to scrub time / phase angle
        </div>
      </div>

      {/* Floating Readout Probe Deck with Fixed Widths & Tabular Numerals to Eliminate Layout Shift */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-2.5 bg-slate-900 border-t border-slate-800 text-xs font-mono">
        <div className="flex flex-col bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400">Phase Angle (ωt)</span>
          <span className="text-white font-bold text-sm tabular-nums">
            {currentDeg}° ({((currentAngleRad % maxTheta)).toFixed(2)} rad)
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">t = {currentTimeMs} ms</span>
        </div>

        <div className="flex flex-col bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-amber-400">Load Voltage (vo)</span>
          <span className="text-amber-300 font-bold text-sm tabular-nums">
            {probePt.vout.toFixed(1)} V
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">Vdc: {metrics.vdc.toFixed(1)} V</span>
        </div>

        <div className="flex flex-col bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-cyan-400">Load Current (io)</span>
          <span className="text-cyan-300 font-bold text-sm tabular-nums">
            {probePt.iout.toFixed(2)} A
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">Idc: {metrics.idc.toFixed(2)} A</span>
        </div>

        <div className="flex flex-col bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-emerald-400">Supply Voltage (vs)</span>
          <span className="text-emerald-300 font-bold text-sm tabular-nums">
            {probePt.vin >= 0 ? '+' : ''}{probePt.vin.toFixed(1)} V
          </span>
          <span className="text-[10px] text-slate-500">
            {probePt.vin >= 0 ? 'Positive Half' : 'Negative Half'}
          </span>
        </div>

        <div className="flex flex-col bg-slate-950/70 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-purple-400">Supply Current (is)</span>
          <span className="text-purple-300 font-bold text-sm tabular-nums">
            {probePt.iin >= 0 ? '+' : ''}{probePt.iin.toFixed(2)} A
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums">Irms: {metrics.iRmsIn.toFixed(2)} A</span>
        </div>
      </div>
    </div>
  );
};
