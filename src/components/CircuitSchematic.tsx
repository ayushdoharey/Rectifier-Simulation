import React from 'react';
import {
  CircuitParameters,
  InstantaneousState,
} from '../types/powerElectronics';

interface CircuitSchematicProps {
  params: CircuitParameters;
  state: InstantaneousState;
  animationTick?: number;
  speed?: number;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  params,
  state,
}) => {
  const { topology, loadType, hasFreewheelingDiode, backEmf } = params;
  const isThreePhase = topology.startsWith('three-phase');
  const isFullBridge = topology.startsWith('full-bridge');
  const isHalfBridge = topology.startsWith('half-bridge');
  const isHalfWave = topology.startsWith('half-wave');
  const isSemi = topology.includes('-semi');
  const isControlled = !topology.includes('uncontrolled');

  // Freewheeling Diode is strictly active ONLY when selected AND NOT in pure R or pure RL load
  const effectiveHasFd = (hasFreewheelingDiode || loadType === 'RL-FD') && loadType !== 'R' && loadType !== 'RL';

  // Node voltages and switch states
  const { vin, switchStates, gate1, gate2, currentLoop } = state;
  const isVinPositive = vin >= 0;

  // Real-time conduction flags
  const isConducting = Math.abs(state.currentMagnitude) > 0.02;
  const isPosHalf = isConducting && currentLoop === 'SOURCE_POS';
  const isNegHalf = isConducting && currentLoop === 'SOURCE_NEG';
  const isFreewheeling = isConducting && effectiveHasFd && currentLoop === 'FREEWHEEL';
  const isSourceActive = isPosHalf || isNegHalf;
  const isBridgeConducting = isPosHalf || isNegHalf;
  const is3PhaseBridgeActive = isConducting && currentLoop.startsWith('PHASE_');

  // Reliable wire stroke helpers
  const getWireColor = (active: boolean) => (active ? '#38bdf8' : '#475569');
  const getWireWidth = (active: boolean) => (active ? 3.4 : 2.4);

  // Coordinates
  const sourceX = 80;
  const sourceY = 210;
  const sourceRadius = 26;

  const topRailY = 100;    // Continuous Upper Rail / DC+
  const bottomRailY = 320; // Continuous Lower Rail / DC-
  const midY = 210;

  // Single-phase coordinates
  const leg1X = 250;
  const leg2X = 390;
  const fdX = 490;
  const loadX = 610;

  // 3-Phase coordinates
  const tpLeg1X = 210; // Phase A leg
  const tpLeg2X = 320; // Phase B leg
  const tpLeg3X = 430; // Phase C leg
  const tpFdX = 510;   // Freewheeling Diode branch
  const tpLoadX = 615; // Load branch

  // Render Switch Symbol (Thyristor SCR or Diode)
  const renderSwitch = (
    label: string,
    x: number,
    y: number,
    direction: 'up' | 'down' | 'right' | 'left',
    type: 'SCR' | 'DIODE',
    status: 'ON' | 'OFF' | 'BLOCKING',
    isGateFiring: boolean
  ) => {
    // Diodes NEVER block with gate delay - they are simply ON or OFF
    const effectiveStatus = type === 'DIODE' && status === 'BLOCKING' ? 'OFF' : status;
    const isSwitchOn = effectiveStatus === 'ON';
    const isBlocking = effectiveStatus === 'BLOCKING';
    const effectiveGateFiring = type === 'SCR' && isGateFiring;

    const strokeColor = isSwitchOn
      ? '#38bdf8' // Electric Blue when conducting
      : isBlocking
      ? '#f59e0b' // Warning Amber (forward blocking for SCR)
      : '#64748b'; // Slate 500 (reverse biased / off)

    const fillColor = isSwitchOn ? '#0284c7' : isBlocking ? '#78350f' : '#1e293b';

    let rotation = 0;
    if (direction === 'up') rotation = -90;
    if (direction === 'down') rotation = 90;
    if (direction === 'right') rotation = 0;
    if (direction === 'left') rotation = 180;

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Conducting Blue Glow Halo */}
        {isSwitchOn && (
          <circle
            cx={0}
            cy={0}
            r={24}
            fill="#38bdf8"
            opacity={0.25}
          />
        )}

        {/* Gate Firing Pulse Blast (SCR only) */}
        {effectiveGateFiring && (
          <circle
            cx={0}
            cy={0}
            r={28}
            fill="#38bdf8"
            opacity={0.4}
          />
        )}

        <g transform={`rotate(${rotation})`}>
          {/* Internal Wire Leads */}
          <line
            x1={-25}
            y1={0}
            x2={-14}
            y2={0}
            stroke={strokeColor}
            strokeWidth={isSwitchOn ? 3.4 : 2.4}
            strokeLinecap="round"
          />
          <line
            x1={11}
            y1={0}
            x2={25}
            y2={0}
            stroke={strokeColor}
            strokeWidth={isSwitchOn ? 3.4 : 2.4}
            strokeLinecap="round"
          />

          {/* Diode / Thyristor Triangle (Anode -> Cathode) */}
          <polygon
            points="-14,-11 11,0 -14,11"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          {/* Cathode Bar */}
          <line
            x1={11}
            y1={-12}
            x2={11}
            y2={12}
            stroke={strokeColor}
            strokeWidth={3.2}
            strokeLinecap="round"
          />

          {/* Gate Terminal for Thyristor (SCR only) */}
          {type === 'SCR' && (
            <g>
              <path
                d="M -4,7 L -8,18 L -14,18"
                fill="none"
                stroke={effectiveGateFiring ? '#38bdf8' : strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={-18}
                y={22}
                fill={effectiveGateFiring ? '#38bdf8' : '#94a3b8'}
                fontSize={10}
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                G
              </text>
            </g>
          )}
        </g>

        {/* Switch Label */}
        <text
          x={direction === 'up' || direction === 'down' ? -22 : 0}
          y={direction === 'up' || direction === 'down' ? -2 : -22}
          textAnchor={direction === 'up' || direction === 'down' ? 'end' : 'middle'}
          fill={isSwitchOn ? '#38bdf8' : '#cbd5e1'}
          fontSize={12}
          fontWeight="bold"
          fontFamily="ui-monospace, monospace"
        >
          {label}
        </text>

        {/* Status Tag */}
        <text
          x={direction === 'up' || direction === 'down' ? -22 : 0}
          y={direction === 'up' || direction === 'down' ? 12 : -34}
          textAnchor={direction === 'up' || direction === 'down' ? 'end' : 'middle'}
          fill={isSwitchOn ? '#38bdf8' : isBlocking ? '#f59e0b' : '#64748b'}
          fontSize={9}
          fontWeight="semibold"
          fontFamily="ui-monospace, monospace"
        >
          {effectiveStatus}
        </text>
      </g>
    );
  };

  const actualLoadX = isThreePhase ? tpLoadX : loadX;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner / Status Overview */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            Circuit Diagram
          </span>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            <span>Complete Closed-Loop Circuit (Active Wires in Blue)</span>
          </div>
        </div>

        {/* Live Conduction State Tag */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span
            className={`font-semibold ${
              isConducting
                ? 'text-cyan-400'
                : 'text-slate-500'
            }`}
          >
            {isThreePhase && isConducting && isFreewheeling && '● 3-Phase Freewheeling (FD Active Loop)'}
            {isThreePhase && isConducting && !isFreewheeling && `● 3-Phase Conduction (${currentLoop})`}
            {!isThreePhase && currentLoop === 'SOURCE_POS' && '● Pos. Half Conduction (Active)'}
            {!isThreePhase && currentLoop === 'SOURCE_NEG' && '● Neg. Half Conduction (Active)'}
            {!isThreePhase && isFreewheeling && '● Freewheeling Diode (FD Active Loop)'}
            {!isConducting && '○ Idle / Zero Current'}
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center p-2 min-h-[380px]">
        <svg
          viewBox="0 0 780 420"
          className="w-full h-full max-h-[460px] select-none"
          style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)' }}
        >
          <defs>
            <pattern id="circuitGridV4" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          <rect width="780" height="420" fill="url(#circuitGridV4)" />

          {/* ================= 1. 3-PHASE RECTIFIER SCHEMATIC ================= */}
          {isThreePhase && (
            <g>
              {/* 3-Phase Balanced AC Source (Phase A, B, C) */}
              {[
                { phase: 'A', y: 150, color: '#f87171', label: 'va(t)', legX: tpLeg1X, active: switchStates.S1 === 'ON' || switchStates.S4 === 'ON' },
                { phase: 'B', y: 210, color: '#fbbf24', label: 'vb(t)', legX: tpLeg2X, active: switchStates.S3 === 'ON' || switchStates.S6 === 'ON' },
                { phase: 'C', y: 270, color: '#38bdf8', label: 'vc(t)', legX: tpLeg3X, active: (switchStates.S5 === 'ON') || switchStates.S2 === 'ON' },
              ].map(({ phase, y, color, label, legX, active }) => (
                <g key={`tp-src-${phase}`}>
                  {/* AC Circle */}
                  <circle
                    cx={sourceX}
                    cy={y}
                    r={18}
                    fill="#0f172a"
                    stroke={active ? '#38bdf8' : color}
                    strokeWidth={active ? 3.2 : 2.2}
                  />
                  {/* Sine Wave */}
                  <path
                    d={`M ${sourceX - 9} ${y} Q ${sourceX - 4.5} ${y - 9} ${sourceX} ${y} T ${sourceX + 9} ${y}`}
                    fill="none"
                    stroke={active ? '#38bdf8' : color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {/* Phase Label */}
                  <text
                    x={sourceX - 25}
                    y={y + 4}
                    textAnchor="end"
                    fill={color}
                    fontSize={11}
                    fontFamily="ui-monospace, monospace"
                    fontWeight="bold"
                  >
                    Phase {phase}
                  </text>
                  <text
                    x={sourceX + 26}
                    y={y - 8}
                    fill="#94a3b8"
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                  >
                    {label}
                  </text>

                  {/* Feed wire from source into midpoint of respective bridge leg */}
                  <line
                    x1={sourceX + 18}
                    y1={y}
                    x2={legX}
                    y2={y}
                    stroke={getWireColor(active)}
                    strokeWidth={getWireWidth(active)}
                  />
                  {/* Route from input y to leg midY if different */}
                  {y !== midY && (
                    <line
                      x1={legX}
                      y1={y}
                      x2={legX}
                      y2={midY}
                      stroke={getWireColor(active)}
                      strokeWidth={getWireWidth(active)}
                    />
                  )}
                  <circle cx={legX} cy={midY} r={4} fill={active ? '#38bdf8' : '#475569'} />
                </g>
              ))}

              {/* DC (+) Top Rail across 3 legs and to Load */}
              <line
                x1={tpLeg1X}
                y1={topRailY}
                x2={tpLeg3X}
                y2={topRailY}
                stroke={getWireColor(is3PhaseBridgeActive)}
                strokeWidth={getWireWidth(is3PhaseBridgeActive)}
              />
              {effectiveHasFd ? (
                <>
                  {/* Segment from 3-Phase Bridge to FD Junction: active ONLY when bridge feeds current */}
                  <line
                    x1={tpLeg3X}
                    y1={topRailY}
                    x2={tpFdX}
                    y2={topRailY}
                    stroke={getWireColor(is3PhaseBridgeActive)}
                    strokeWidth={getWireWidth(is3PhaseBridgeActive)}
                  />
                  {/* Segment from FD Junction to Load: active whenever load current flows */}
                  <line
                    x1={tpFdX}
                    y1={topRailY}
                    x2={tpLoadX}
                    y2={topRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                </>
              ) : (
                <line
                  x1={tpLeg3X}
                  y1={topRailY}
                  x2={tpLoadX}
                  y2={topRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              )}
              <text x={tpLeg1X - 25} y={topRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                DC (+)
              </text>

              {/* DC (-) Bottom Rail across 3 legs and to Load */}
              <line
                x1={tpLeg1X}
                y1={bottomRailY}
                x2={tpLeg3X}
                y2={bottomRailY}
                stroke={getWireColor(is3PhaseBridgeActive)}
                strokeWidth={getWireWidth(is3PhaseBridgeActive)}
              />
              {effectiveHasFd ? (
                <>
                  {/* Segment from 3-Phase Bridge to FD Junction: active ONLY when bridge feeds current */}
                  <line
                    x1={tpLeg3X}
                    y1={bottomRailY}
                    x2={tpFdX}
                    y2={bottomRailY}
                    stroke={getWireColor(is3PhaseBridgeActive)}
                    strokeWidth={getWireWidth(is3PhaseBridgeActive)}
                  />
                  {/* Segment from Load to FD Junction: active whenever load current flows */}
                  <line
                    x1={tpFdX}
                    y1={bottomRailY}
                    x2={tpLoadX}
                    y2={bottomRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                </>
              ) : (
                <line
                  x1={tpLeg3X}
                  y1={bottomRailY}
                  x2={tpLoadX}
                  y2={bottomRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              )}
              <text x={tpLeg1X - 25} y={bottomRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                DC (−)
              </text>

              {/* Leg 1 (Phase A): Upper S1 (T1/D1), Lower S4 (T4/D4) */}
              <line x1={tpLeg1X} y1={topRailY} x2={tpLeg1X} y2={130} stroke={getWireColor(switchStates.S1 === 'ON')} strokeWidth={getWireWidth(switchStates.S1 === 'ON')} />
              <line x1={tpLeg1X} y1={180} x2={tpLeg1X} y2={midY} stroke={getWireColor(switchStates.S1 === 'ON')} strokeWidth={getWireWidth(switchStates.S1 === 'ON')} />
              <line x1={tpLeg1X} y1={midY} x2={tpLeg1X} y2={240} stroke={getWireColor(switchStates.S4 === 'ON')} strokeWidth={getWireWidth(switchStates.S4 === 'ON')} />
              <line x1={tpLeg1X} y1={290} x2={tpLeg1X} y2={bottomRailY} stroke={getWireColor(switchStates.S4 === 'ON')} strokeWidth={getWireWidth(switchStates.S4 === 'ON')} />

              {/* Leg 2 (Phase B): Upper S3 (T3/D3), Lower S6 (T6/D6) */}
              <line x1={tpLeg2X} y1={topRailY} x2={tpLeg2X} y2={130} stroke={getWireColor(switchStates.S3 === 'ON')} strokeWidth={getWireWidth(switchStates.S3 === 'ON')} />
              <line x1={tpLeg2X} y1={180} x2={tpLeg2X} y2={midY} stroke={getWireColor(switchStates.S3 === 'ON')} strokeWidth={getWireWidth(switchStates.S3 === 'ON')} />
              <line x1={tpLeg2X} y1={midY} x2={tpLeg2X} y2={240} stroke={getWireColor(switchStates.S6 === 'ON')} strokeWidth={getWireWidth(switchStates.S6 === 'ON')} />
              <line x1={tpLeg2X} y1={290} x2={tpLeg2X} y2={bottomRailY} stroke={getWireColor(switchStates.S6 === 'ON')} strokeWidth={getWireWidth(switchStates.S6 === 'ON')} />

              {/* Leg 3 (Phase C): Upper S5 (T5/D5), Lower S2 (T2/D2) */}
              <line x1={tpLeg3X} y1={topRailY} x2={tpLeg3X} y2={130} stroke={getWireColor(switchStates.S5 === 'ON')} strokeWidth={getWireWidth(switchStates.S5 === 'ON')} />
              <line x1={tpLeg3X} y1={180} x2={tpLeg3X} y2={midY} stroke={getWireColor(switchStates.S5 === 'ON')} strokeWidth={getWireWidth(switchStates.S5 === 'ON')} />
              <line x1={tpLeg3X} y1={midY} x2={tpLeg3X} y2={240} stroke={getWireColor(switchStates.S2 === 'ON')} strokeWidth={getWireWidth(switchStates.S2 === 'ON')} />
              <line x1={tpLeg3X} y1={290} x2={tpLeg3X} y2={bottomRailY} stroke={getWireColor(switchStates.S2 === 'ON')} strokeWidth={getWireWidth(switchStates.S2 === 'ON')} />

              {/* Switches for 3-Phase */}
              {/* Upper Group */}
              {renderSwitch(
                isControlled ? 'T1' : 'D1',
                tpLeg1X,
                155,
                'up',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S1,
                state.gate1
              )}
              {renderSwitch(
                isControlled ? 'T3' : 'D3',
                tpLeg2X,
                155,
                'up',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S3,
                state.gate2
              )}
              {renderSwitch(
                isControlled ? 'T5' : 'D5',
                tpLeg3X,
                155,
                'up',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S5 || 'OFF',
                state.gate1
              )}

              {/* Lower Group */}
              {renderSwitch(
                isControlled && !isSemi ? 'T4' : 'D4',
                tpLeg1X,
                265,
                'up',
                isControlled && !isSemi ? 'SCR' : 'DIODE',
                switchStates.S4,
                state.gate2
              )}
              {renderSwitch(
                isControlled && !isSemi ? 'T6' : 'D6',
                tpLeg2X,
                265,
                'up',
                isControlled && !isSemi ? 'SCR' : 'DIODE',
                switchStates.S6 || 'OFF',
                state.gate1
              )}
              {renderSwitch(
                isControlled && !isSemi ? 'T2' : 'D2',
                tpLeg3X,
                265,
                'up',
                isControlled && !isSemi ? 'SCR' : 'DIODE',
                switchStates.S2,
                state.gate2
              )}

              {/* Freewheeling Diode for 3-Phase (only if effectiveHasFd) */}
              {effectiveHasFd && (
                <g>
                  <line x1={tpFdX} y1={topRailY} x2={tpFdX} y2={midY - 25} stroke={getWireColor(isFreewheeling)} strokeWidth={getWireWidth(isFreewheeling)} />
                  <line x1={tpFdX} y1={midY + 25} x2={tpFdX} y2={bottomRailY} stroke={getWireColor(isFreewheeling)} strokeWidth={getWireWidth(isFreewheeling)} />
                  <circle cx={tpFdX} cy={topRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  <circle cx={tpFdX} cy={bottomRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  {renderSwitch('FD', tpFdX, midY, 'up', 'DIODE', isFreewheeling ? 'ON' : 'OFF', false)}
                </g>
              )}
            </g>
          )}

          {/* ================= 2. SINGLE-PHASE AC VOLTAGE SOURCE ================= */}
          {!isThreePhase && (
            <g>
              <circle
                cx={sourceX}
                cy={sourceY}
                r={sourceRadius}
                fill="#0f172a"
                stroke={isSourceActive ? '#38bdf8' : '#0284c7'}
                strokeWidth={isSourceActive ? 3.4 : 2.5}
              />
              <path
                d={`M ${sourceX - 14} ${sourceY} Q ${sourceX - 7} ${sourceY - 14} ${sourceX} ${sourceY} T ${sourceX + 14} ${sourceY}`}
                fill="none"
                stroke={isSourceActive ? '#38bdf8' : '#0284c7'}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <text
                x={sourceX}
                y={sourceY + 44}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
              >
                vs(t) = Vm·sin(ωt)
              </text>

              {/* Upper Terminal Marker */}
              <circle
                cx={sourceX}
                cy={sourceY - sourceRadius - 10}
                r={9}
                fill={isVinPositive ? '#065f46' : '#881337'}
                stroke={isVinPositive ? '#10b981' : '#f43f5e'}
                strokeWidth={1.5}
              />
              <text
                x={sourceX}
                y={sourceY - sourceRadius - 6}
                textAnchor="middle"
                fill={isVinPositive ? '#6ee7b7' : '#fda4af'}
                fontSize={11}
                fontWeight="bold"
              >
                {isVinPositive ? '+' : '−'}
              </text>

              {/* Lower Terminal Marker */}
              <circle
                cx={sourceX}
                cy={sourceY + sourceRadius + 10}
                r={9}
                fill={!isVinPositive ? '#065f46' : '#881337'}
                stroke={!isVinPositive ? '#10b981' : '#f43f5e'}
                strokeWidth={1.5}
              />
              <text
                x={sourceX}
                y={sourceY + sourceRadius + 14}
                textAnchor="middle"
                fill={!isVinPositive ? '#6ee7b7' : '#fda4af'}
                fontSize={11}
                fontWeight="bold"
              >
                {!isVinPositive ? '+' : '−'}
              </text>
            </g>
          )}

          {/* ================= 3. SINGLE-PHASE FULL BRIDGE TOPOLOGY ================= */}
          {isFullBridge && !isThreePhase && (
            <g>
              {/* AC Input Feed: Phase A (Source Top -> Leg 1 Mid) */}
              <path
                d={`M ${sourceX} ${sourceY - sourceRadius} L ${sourceX} 150 L 170 150 L 170 ${midY} L ${leg1X} ${midY}`}
                fill="none"
                stroke={getWireColor(isSourceActive)}
                strokeWidth={getWireWidth(isSourceActive)}
                strokeLinecap="round"
              />
              <circle cx={leg1X} cy={midY} r={4} fill={isSourceActive ? '#38bdf8' : '#475569'} />
              <text x={leg1X - 10} y={midY - 8} fill="#94a3b8" fontSize={10} fontFamily="ui-monospace, monospace" textAnchor="end">
                Node A
              </text>

              {/* AC Input Feed: Phase B (Source Bottom -> Leg 2 Mid) */}
              <path
                d={`M ${sourceX} ${sourceY + sourceRadius} L ${sourceX} ${bottomRailY} L 190 ${bottomRailY} L 190 270 L 440 270 L 440 ${midY} L ${leg2X} ${midY}`}
                fill="none"
                stroke={getWireColor(isSourceActive)}
                strokeWidth={getWireWidth(isSourceActive)}
                strokeLinecap="round"
              />
              <circle cx={leg2X} cy={midY} r={4} fill={isSourceActive ? '#38bdf8' : '#475569'} />
              <text x={leg2X + 10} y={midY - 8} fill="#94a3b8" fontSize={10} fontFamily="ui-monospace, monospace">
                Node B
              </text>

              {/* Continuous Positive DC Bus (Top Rail, +) */}
              <line
                x1={leg1X}
                y1={topRailY}
                x2={leg2X}
                y2={topRailY}
                stroke={getWireColor(isPosHalf)}
                strokeWidth={getWireWidth(isPosHalf)}
              />
              {effectiveHasFd ? (
                <>
                  {/* Segment from Bridge Leg 2 to FD Junction: active ONLY when bridge feeds current */}
                  <line
                    x1={leg2X}
                    y1={topRailY}
                    x2={fdX}
                    y2={topRailY}
                    stroke={getWireColor(isBridgeConducting)}
                    strokeWidth={getWireWidth(isBridgeConducting)}
                  />
                  {/* Segment from FD Junction to Load: active whenever current flows */}
                  <line
                    x1={fdX}
                    y1={topRailY}
                    x2={loadX}
                    y2={topRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                </>
              ) : (
                <line
                  x1={leg2X}
                  y1={topRailY}
                  x2={loadX}
                  y2={topRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              )}
              <text x={leg1X - 25} y={topRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                DC (+)
              </text>

              {/* Continuous Negative DC Bus (Bottom Rail, -) */}
              <line
                x1={leg1X}
                y1={bottomRailY}
                x2={leg2X}
                y2={bottomRailY}
                stroke={getWireColor(isNegHalf)}
                strokeWidth={getWireWidth(isNegHalf)}
              />
              {effectiveHasFd ? (
                <>
                  {/* Segment from Bridge Leg 2 to FD Junction: active ONLY when bridge feeds current */}
                  <line
                    x1={leg2X}
                    y1={bottomRailY}
                    x2={fdX}
                    y2={bottomRailY}
                    stroke={getWireColor(isBridgeConducting)}
                    strokeWidth={getWireWidth(isBridgeConducting)}
                  />
                  {/* Segment from Load to FD Junction: active whenever current flows */}
                  <line
                    x1={fdX}
                    y1={bottomRailY}
                    x2={loadX}
                    y2={bottomRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                </>
              ) : (
                <line
                  x1={leg2X}
                  y1={bottomRailY}
                  x2={loadX}
                  y2={bottomRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              )}
              <text x={leg1X - 25} y={bottomRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                DC (−)
              </text>

              {/* Leg 1 Vertical Wires */}
              <line x1={leg1X} y1={topRailY} x2={leg1X} y2={130} stroke={getWireColor(isPosHalf)} strokeWidth={getWireWidth(isPosHalf)} />
              <line x1={leg1X} y1={180} x2={leg1X} y2={midY} stroke={getWireColor(isPosHalf)} strokeWidth={getWireWidth(isPosHalf)} />
              <line x1={leg1X} y1={midY} x2={leg1X} y2={240} stroke={getWireColor(isNegHalf)} strokeWidth={getWireWidth(isNegHalf)} />
              <line x1={leg1X} y1={290} x2={leg1X} y2={bottomRailY} stroke={getWireColor(isNegHalf)} strokeWidth={getWireWidth(isNegHalf)} />

              {/* Leg 2 Vertical Wires */}
              <line x1={leg2X} y1={topRailY} x2={leg2X} y2={130} stroke={getWireColor(isNegHalf)} strokeWidth={getWireWidth(isNegHalf)} />
              <line x1={leg2X} y1={180} x2={leg2X} y2={midY} stroke={getWireColor(isNegHalf)} strokeWidth={getWireWidth(isNegHalf)} />
              <line x1={leg2X} y1={midY} x2={leg2X} y2={240} stroke={getWireColor(isPosHalf)} strokeWidth={getWireWidth(isPosHalf)} />
              <line x1={leg2X} y1={290} x2={leg2X} y2={bottomRailY} stroke={getWireColor(isPosHalf)} strokeWidth={getWireWidth(isPosHalf)} />

              {/* Switches */}
              {renderSwitch(
                isControlled ? 'T1' : 'D1',
                leg1X,
                155,
                'up',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S1,
                gate1
              )}
              {renderSwitch(
                isControlled && !isSemi ? 'T4' : 'D4',
                leg1X,
                265,
                'up',
                isControlled && !isSemi ? 'SCR' : 'DIODE',
                switchStates.S4,
                gate2
              )}
              {renderSwitch(
                isControlled ? (isSemi ? 'T2' : 'T3') : 'D3',
                leg2X,
                155,
                'up',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S3,
                gate2
              )}
              {renderSwitch(
                isControlled && !isSemi ? 'T2' : 'D2',
                leg2X,
                265,
                'up',
                isControlled && !isSemi ? 'SCR' : 'DIODE',
                switchStates.S2,
                gate1
              )}

              {/* Freewheeling Diode Branch */}
              {effectiveHasFd && (
                <g>
                  <line
                    x1={fdX}
                    y1={topRailY}
                    x2={fdX}
                    y2={midY - 25}
                    stroke={getWireColor(isFreewheeling)}
                    strokeWidth={getWireWidth(isFreewheeling)}
                  />
                  <line
                    x1={fdX}
                    y1={midY + 25}
                    x2={fdX}
                    y2={bottomRailY}
                    stroke={getWireColor(isFreewheeling)}
                    strokeWidth={getWireWidth(isFreewheeling)}
                  />
                  <circle cx={fdX} cy={topRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  <circle cx={fdX} cy={bottomRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  {renderSwitch(
                    'FD',
                    fdX,
                    midY,
                    'up',
                    'DIODE',
                    isFreewheeling ? 'ON' : 'OFF',
                    false
                  )}
                </g>
              )}
            </g>
          )}

          {/* ================= 4. CENTER-TAPPED HALF BRIDGE ================= */}
          {isHalfBridge && (
            <g>
              <g transform="translate(180, 210)">
                <rect x={-8} y={-90} width={16} height={180} fill="#1e293b" stroke="#334155" strokeWidth={1} rx={2} />
                <path
                  d="M -25,-80 C -40,-80 -40,-50 -25,-50 C -40,-50 -40,-20 -25,-20 C -40,-20 -40,10 -25,10 C -40,10 -40,40 -25,40 C -40,40 -40,70 -25,70"
                  fill="none"
                  stroke={getWireColor(isSourceActive)}
                  strokeWidth={getWireWidth(isSourceActive)}
                />
                <path
                  d="M 25,-100 C 40,-100 40,-70 25,-70 C 40,-70 40,-40 25,-40 C 40,-40 40,-10 25,-10 L 25,0"
                  fill="none"
                  stroke={getWireColor(isPosHalf)}
                  strokeWidth={getWireWidth(isPosHalf)}
                />
                <path
                  d="M 25,0 L 25,10 C 40,10 40,40 25,40 C 40,40 40,70 25,70 C 40,70 40,100 25,100"
                  fill="none"
                  stroke={getWireColor(isNegHalf)}
                  strokeWidth={getWireWidth(isNegHalf)}
                />
                <line
                  x1={25}
                  y1={0}
                  x2={320}
                  y2={0}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
                <circle cx={25} cy={0} r={4} fill={isConducting ? '#38bdf8' : '#94a3b8'} />
                <text x={35} y={-8} fill="#94a3b8" fontSize={10} fontFamily="ui-monospace, monospace">
                  Center Tap (Neutral)
                </text>
              </g>

              {/* Source feed to primary */}
              <path
                d={`M ${sourceX} ${sourceY - sourceRadius} L ${sourceX} 140 L 160 140`}
                fill="none"
                stroke={getWireColor(isSourceActive)}
                strokeWidth={getWireWidth(isSourceActive)}
              />
              <path
                d={`M ${sourceX} ${sourceY + sourceRadius} L ${sourceX} 280 L 160 280`}
                fill="none"
                stroke={getWireColor(isSourceActive)}
                strokeWidth={getWireWidth(isSourceActive)}
              />

              {/* Top Secondary to Switch S1 to Load Top */}
              <line x1={205} y1={topRailY} x2={325} y2={topRailY} stroke={getWireColor(isPosHalf)} strokeWidth={getWireWidth(isPosHalf)} />
              {renderSwitch(
                isControlled ? 'T1' : 'D1',
                350,
                topRailY,
                'right',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S1,
                gate1
              )}
              <line x1={375} y1={topRailY} x2={loadX} y2={topRailY} stroke={getWireColor(isConducting)} strokeWidth={getWireWidth(isConducting)} />

              {/* Bottom Secondary to Switch S2 */}
              <line x1={205} y1={bottomRailY} x2={325} y2={bottomRailY} stroke={getWireColor(isNegHalf)} strokeWidth={getWireWidth(isNegHalf)} />
              {renderSwitch(
                isControlled ? 'T2' : 'D2',
                350,
                bottomRailY,
                'right',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S2,
                gate2
              )}
              <path
                d={`M 375 ${bottomRailY} L 430 ${bottomRailY} L 430 ${topRailY}`}
                fill="none"
                stroke={getWireColor(isNegHalf)}
                strokeWidth={getWireWidth(isNegHalf)}
              />

              {/* Load Return Wire to Center Tap */}
              <path
                d={`M ${loadX} ${bottomRailY} L 500 ${bottomRailY} L 500 ${midY}`}
                fill="none"
                stroke={getWireColor(isConducting)}
                strokeWidth={getWireWidth(isConducting)}
              />
            </g>
          )}

          {/* ================= 5. HALF-WAVE RECTIFIER ================= */}
          {isHalfWave && (
            <g>
              <path
                d={`M ${sourceX} ${sourceY - sourceRadius} L ${sourceX} ${topRailY} L 325 ${topRailY}`}
                fill="none"
                stroke={getWireColor(isPosHalf)}
                strokeWidth={getWireWidth(isPosHalf)}
              />
              {renderSwitch(
                isControlled ? 'T1' : 'D1',
                350,
                topRailY,
                'right',
                isControlled ? 'SCR' : 'DIODE',
                switchStates.S1,
                gate1
              )}
              {effectiveHasFd ? (
                <>
                  {/* Segment from Switch S1 to FD: active only when S1 conducts */}
                  <line
                    x1={375}
                    y1={topRailY}
                    x2={fdX}
                    y2={topRailY}
                    stroke={getWireColor(isPosHalf)}
                    strokeWidth={getWireWidth(isPosHalf)}
                  />
                  {/* Segment from FD to Load: active whenever current flows */}
                  <line
                    x1={fdX}
                    y1={topRailY}
                    x2={loadX}
                    y2={topRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                </>
              ) : (
                <line
                  x1={375}
                  y1={topRailY}
                  x2={loadX}
                  y2={topRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              )}

              {/* Bottom Return Wire */}
              {effectiveHasFd ? (
                <>
                  {/* Segment from Load to FD: active whenever current flows */}
                  <line
                    x1={loadX}
                    y1={bottomRailY}
                    x2={fdX}
                    y2={bottomRailY}
                    stroke={getWireColor(isConducting)}
                    strokeWidth={getWireWidth(isConducting)}
                  />
                  {/* Segment from FD back to Source: active ONLY when source is supplying current (isPosHalf) */}
                  <path
                    d={`M ${fdX} ${bottomRailY} L ${sourceX} ${bottomRailY} L ${sourceX} ${sourceY + sourceRadius}`}
                    fill="none"
                    stroke={getWireColor(isPosHalf)}
                    strokeWidth={getWireWidth(isPosHalf)}
                  />
                </>
              ) : (
                <path
                  d={`M ${loadX} ${bottomRailY} L ${sourceX} ${bottomRailY} L ${sourceX} ${sourceY + sourceRadius}`}
                  fill="none"
                  stroke={getWireColor(isPosHalf)}
                  strokeWidth={getWireWidth(isPosHalf)}
                />
              )}

              {effectiveHasFd && (
                <g>
                  <line
                    x1={fdX}
                    y1={topRailY}
                    x2={fdX}
                    y2={midY - 25}
                    stroke={getWireColor(isFreewheeling)}
                    strokeWidth={getWireWidth(isFreewheeling)}
                  />
                  <line
                    x1={fdX}
                    y1={midY + 25}
                    x2={fdX}
                    y2={bottomRailY}
                    stroke={getWireColor(isFreewheeling)}
                    strokeWidth={getWireWidth(isFreewheeling)}
                  />
                  <circle cx={fdX} cy={topRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  <circle cx={fdX} cy={bottomRailY} r={3.5} fill={isConducting ? '#38bdf8' : '#475569'} />
                  {renderSwitch(
                    'FD',
                    fdX,
                    midY,
                    'up',
                    'DIODE',
                    isFreewheeling ? 'ON' : 'OFF',
                    false
                  )}
                </g>
              )}
            </g>
          )}

          {/* ================= 6. LOAD SECTION (ALL TOPOLOGIES) ================= */}
          <g transform={`translate(${actualLoadX}, 0)`}>
            {/* Top Terminal Marker and Label */}
            <circle cx={0} cy={topRailY} r={5} fill={isConducting ? '#38bdf8' : '#64748b'} />
            <text x={16} y={topRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={12} fontWeight="bold" fontFamily="ui-monospace, monospace">
              + Vo
            </text>

            {/* Bottom Terminal Marker and Label */}
            <circle cx={0} cy={bottomRailY} r={5} fill={isConducting ? '#38bdf8' : '#64748b'} />
            <text x={16} y={bottomRailY + 4} fill={isConducting ? '#38bdf8' : '#64748b'} fontSize={12} fontWeight="bold" fontFamily="ui-monospace, monospace">
              − Vo
            </text>

            {/* Connecting Wire from Top Rail into Resistor */}
            <line
              x1={0}
              y1={topRailY}
              x2={0}
              y2={130}
              stroke={getWireColor(isConducting)}
              strokeWidth={getWireWidth(isConducting)}
            />

            {/* RESISTOR (R): y = 130 to y = 180 */}
            <g transform="translate(0, 155)">
              <path
                d="M 0,-25 L 10,-18 L -10,-8 L 10,2 L -10,12 L 0,25"
                fill="none"
                stroke={isConducting ? '#38bdf8' : '#64748b'}
                strokeWidth={isConducting ? 3.4 : 2.5}
                strokeLinejoin="round"
              />
              <text x={-18} y={4} textAnchor="end" fill="#cbd5e1" fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                R={params.resistance}Ω
              </text>
            </g>

            {/* Pure Resistive Load (R) */}
            {loadType === 'R' && (
              <line
                x1={0}
                y1={180}
                x2={0}
                y2={bottomRailY}
                stroke={getWireColor(isConducting)}
                strokeWidth={getWireWidth(isConducting)}
              />
            )}

            {/* Inductive Load (RL, RL-FD, CONSTANT_I) */}
            {(loadType === 'RL' || loadType === 'RL-FD' || loadType === 'CONSTANT_I') && (
              <g>
                <line
                  x1={0}
                  y1={180}
                  x2={0}
                  y2={200}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
                <g transform="translate(0, 240)">
                  <path
                    d="M 0,-40 C 22,-40 22,-20 0,-20 C 22,-20 22,0 0,0 C 22,0 22,20 0,20 C 22,20 22,40 0,40"
                    fill="none"
                    stroke={isConducting ? '#38bdf8' : '#64748b'}
                    strokeWidth={isConducting ? 3.4 : 2.5}
                    strokeLinecap="round"
                  />
                  <text x={-18} y={4} textAnchor="end" fill="#cbd5e1" fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                    {loadType === 'CONSTANT_I' ? 'L=∞ (Ideal Idc)' : `L=${params.inductance}mH`}
                  </text>
                </g>
                <line
                  x1={0}
                  y1={280}
                  x2={0}
                  y2={bottomRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              </g>
            )}

            {/* R-L-E Load (Motor / Battery Charger) */}
            {loadType === 'RLE' && (
              <g>
                <line
                  x1={0}
                  y1={180}
                  x2={0}
                  y2={195}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
                {/* Compact 3-loop Inductor */}
                <g transform="translate(0, 222)">
                  <path
                    d="M 0,-27 C 18,-27 18,-9 0,-9 C 18,-9 18,9 0,9 C 18,9 18,27 0,27"
                    fill="none"
                    stroke={isConducting ? '#38bdf8' : '#64748b'}
                    strokeWidth={isConducting ? 3.2 : 2.4}
                  />
                  <text x={-18} y={4} textAnchor="end" fill="#cbd5e1" fontSize={10} fontFamily="ui-monospace, monospace">
                    L={params.inductance}mH
                  </text>
                </g>
                <line
                  x1={0}
                  y1={249}
                  x2={0}
                  y2={265}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
                {/* DC Back-EMF Battery Symbol */}
                <g transform="translate(0, 280)">
                  <line x1={-18} y1={-8} x2={18} y2={-8} stroke="#38bdf8" strokeWidth={3.5} strokeLinecap="round" />
                  <text x={24} y={-5} fill="#38bdf8" fontSize={10} fontWeight="bold">+</text>
                  <line x1={-10} y1={8} x2={10} y2={8} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
                  <text x={16} y={11} fill="#ef4444" fontSize={10} fontWeight="bold">−</text>
                  <text x={-24} y={4} textAnchor="end" fill="#38bdf8" fontSize={11} fontWeight="bold" fontFamily="ui-monospace, monospace">
                    E={backEmf}V
                  </text>
                </g>
                <line
                  x1={0}
                  y1={288}
                  x2={0}
                  y2={bottomRailY}
                  stroke={getWireColor(isConducting)}
                  strokeWidth={getWireWidth(isConducting)}
                />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
