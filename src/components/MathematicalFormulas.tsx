import React from 'react';
import { CircuitParameters, CalculatedMetrics } from '../types/powerElectronics';
import { getAnalyticalFormulas } from '../utils/rectifierPhysics';

interface MathematicalFormulasProps {
  params: CircuitParameters;
  metrics: CalculatedMetrics;
}

export const MathematicalFormulas: React.FC<MathematicalFormulasProps> = ({
  params,
  metrics,
}) => {
  const formulas = getAnalyticalFormulas(params);
  const isControlled = !params.topology.includes('uncontrolled');
  const alphaRad = ((params.firingAngleDeg * Math.PI) / 180).toFixed(3);

  return (
    <div className="flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Power Electronics Mathematical Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time theoretical derivations and numerical metrics evaluated across active cycle
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Mode:</span>
          <span className={`px-2 py-0.5 rounded font-semibold ${
            metrics.isContinuous
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-950 text-amber-400 border border-amber-500/30'
          }`}>
            {metrics.isContinuous ? 'Continuous Conduction (CCM)' : 'Discontinuous Conduction (DCM)'}
          </span>
        </div>
      </div>

      {/* Grid of Key Numerical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Vdc */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-amber-400 font-medium">Average DC Voltage (Vdc)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-2xl font-bold text-amber-300">{metrics.vdc.toFixed(2)}</span>
            <span className="text-xs text-slate-400">V</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Analytical: {formulas.analyticalVdc.toFixed(2)} V
          </span>
        </div>

        {/* Vrms */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-emerald-400 font-medium">RMS Output Voltage (Vrms)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-2xl font-bold text-emerald-300">{metrics.vRmsOut.toFixed(2)}</span>
            <span className="text-xs text-slate-400">V</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Input Vrms: {params.vRms} V
          </span>
        </div>

        {/* Idc */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-cyan-400 font-medium">Average DC Current (Idc)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-2xl font-bold text-cyan-300">{metrics.idc.toFixed(2)}</span>
            <span className="text-xs text-slate-400">A</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Load: R = {params.resistance} Ω
          </span>
        </div>

        {/* Irms */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-sky-400 font-medium">RMS Output Current (Irms)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-2xl font-bold text-sky-300">{metrics.iRmsOut.toFixed(2)}</span>
            <span className="text-xs text-slate-400">A</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Source Irms: {metrics.iRmsIn.toFixed(2)} A
          </span>
        </div>

        {/* Ripple Factor */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Ripple Factor (RF)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-xl font-bold text-slate-100">
              {(metrics.rippleFactorV * 100).toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            RF = √(FF² - 1) = {metrics.rippleFactorV.toFixed(3)}
          </span>
        </div>

        {/* Form Factor */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Form Factor (FF)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-xl font-bold text-slate-100">
              {metrics.formFactorV.toFixed(3)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            FF = Vrms / Vdc
          </span>
        </div>

        {/* Rectification Efficiency */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Rectification Ratio (η)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-xl font-bold text-emerald-400">
              {metrics.efficiency.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Pdc / Pac = {metrics.powerDc.toFixed(0)}W / {metrics.powerAc.toFixed(0)}W
          </span>
        </div>

        {/* Conduction / Extinction Angles */}
        <div className="flex flex-col p-3 bg-slate-950/70 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Conduction Angle (γ)</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-xl font-bold text-amber-300">
              {metrics.conductionAngleDeg.toFixed(0)}°
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            {metrics.extinctionAngleDeg !== null
              ? `Extinction β = ${metrics.extinctionAngleDeg.toFixed(0)}°`
              : 'Continuous Conduction'}
          </span>
        </div>
      </div>

      {/* Analytical Formulation Display Box */}
      <div className="flex flex-col gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 font-sans font-semibold">
          <span>Standard Mathematical Formula</span>
          {isControlled ? (
            <span className="text-[11px] text-slate-500 font-mono">α = {params.firingAngleDeg}° ({alphaRad} rad)</span>
          ) : (
            <span className="text-[11px] text-emerald-400 font-mono">Natural Commutation (Diodes α = 0°)</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Average Voltage Integral */}
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
            <span className="text-amber-400 font-semibold text-[11px]">DC Voltage Integral Vdc:</span>
            <div className="text-slate-200 text-sm py-1 font-bold">
              {formulas.vdcFormula}
            </div>
            <div className="text-slate-400 text-[11px]">
              {isControlled ? (
                <>
                  Vdc = ({metrics.vm.toFixed(1)} / {params.topology.startsWith('full-bridge') ? 'π' : '2π'}) · (1 + cos({params.firingAngleDeg}°))
                  {' '}= <span className="text-amber-300 font-bold">{formulas.analyticalVdc.toFixed(2)} V</span>
                </>
              ) : (
                <>
                  Analytical Vdc = <span className="text-amber-300 font-bold">{formulas.analyticalVdc.toFixed(2)} V</span>
                </>
              )}
            </div>
          </div>

          {/* RMS Voltage Integral */}
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 flex flex-col gap-1.5">
            <span className="text-emerald-400 font-semibold text-[11px]">RMS Voltage Equation Vrms:</span>
            <div className="text-slate-200 text-sm py-1 font-bold">
              {formulas.vrmsFormula}
            </div>
            <div className="text-slate-400 text-[11px]">
              Evaluated Vrms = <span className="text-emerald-300 font-bold">{metrics.vRmsOut.toFixed(2)} V</span>
            </div>
          </div>
        </div>

        {/* Physical Principle Explanation Note */}
        <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800 text-slate-400 font-sans text-xs leading-relaxed">
          <strong className="text-slate-300">Physics Principle: </strong>
          {formulas.explanation}
        </div>
      </div>
    </div>
  );
};
