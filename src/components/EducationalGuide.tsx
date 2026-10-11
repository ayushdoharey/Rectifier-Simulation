import React, { useState } from 'react';

export const EducationalGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'principles' | 'commutation' | 'comparison'>('principles');

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Power Electronics Principles & Reference Guide
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Standard engineering textbook explanations (Rashid, Mohan, Bimbhra)
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('principles')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'principles'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SCR Firing Principles
          </button>
          <button
            onClick={() => setActiveTab('commutation')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'commutation'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Freewheeling & Inversion
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'comparison'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Topology Comparison Matrix
          </button>
        </div>
      </div>

      {/* Tab 1: SCR Firing Principles */}
      {activeTab === 'principles' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col gap-2">
            <h4 className="font-semibold text-amber-300">1. Forward Blocking Mode (ωt &lt; α)</h4>
            <p className="text-slate-300">
              Even though the anode is positive with respect to the cathode, junctions J1 and J3 are forward-biased while junction J2 is reverse-biased. The thyristor blocks forward voltage and only a tiny leakage current flows until a gate pulse is injected.
            </p>
            <div className="mt-auto text-[11px] font-mono text-slate-500 bg-slate-900/80 p-2 rounded">
              vT1 = vs(t), io = 0, vo = 0
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col gap-2">
            <h4 className="font-semibold text-emerald-300">2. Gate Triggering & Latching (ωt = α)</h4>
            <p className="text-slate-300">
              When a positive current pulse is applied to the gate terminal, regenerative internal carrier multiplication triggers the SCR into conduction. Once anode current exceeds the <strong>Latching Current (IL)</strong>, the gate loses control and conduction sustains.
            </p>
            <div className="mt-auto text-[11px] font-mono text-slate-500 bg-slate-900/80 p-2 rounded">
              Pulse width &gt; 10μs, ig &gt; IGT
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col gap-2">
            <h4 className="font-semibold text-cyan-300">3. Natural Commutation & Turn-Off</h4>
            <p className="text-slate-300">
              The thyristor turns off when the anode current drops below the <strong>Holding Current (IH)</strong> and reverse voltage is applied across J2 for a duration exceeding the circuit turn-off time (tq &gt; tc). In AC line-commutated rectifiers, this occurs naturally as the AC voltage alternates.
            </p>
            <div className="mt-auto text-[11px] font-mono text-slate-500 bg-slate-900/80 p-2 rounded">
              Natural AC line reversal clamps current to 0
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Freewheeling & Inversion */}
      {activeTab === 'commutation' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col gap-2">
            <h4 className="font-semibold text-amber-300">Freewheeling Diode (FD) Action</h4>
            <p className="text-slate-300">
              When driving inductive loads (R-L), the stored magnetic energy in inductor L tends to keep current flowing even after the AC supply reverses at ωt = π.
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>Without FD in full converter: vo goes negative during [π, π+α], reducing average DC voltage Vdc.</li>
              <li>With FD: the diode forward-biases at π, clamping vo = 0V and routing inductor current through the local diode loop.</li>
              <li>Benefit: Prevents negative voltage spikes, enhances Vdc, and removes reactive current from AC mains.</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col gap-2">
            <h4 className="font-semibold text-rose-300">Line-Commutated Inverter Mode (α &gt; 90°)</h4>
            <p className="text-slate-300">
              In a fully controlled full-bridge rectifier connected to a DC load with an active back-EMF (such as a regenerating DC motor or battery):
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>When α &lt; 90°: Vdc &gt; 0, power flows from AC source into DC load (Rectification).</li>
              <li>When α &gt; 90°: Vdc = (2Vm/π)·cos(α) becomes negative. If the DC source is reversed, power flows from DC source back into AC grid (Inversion)!</li>
              <li>Maximum safe firing angle is restricted to ~150°-165° to prevent commutation failure due to thyristor turn-off time (tq).</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Topology Comparison Matrix */}
      {activeTab === 'comparison' && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Topology</th>
                <th className="py-2 px-3">Active Switches</th>
                <th className="py-2 px-3">Average Voltage (Vdc)</th>
                <th className="py-2 px-3">Ripple Frequency</th>
                <th className="py-2 px-3">Peak Inverse (PIV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-300">Full Bridge Controlled</td>
                <td className="py-2.5 px-3">4 SCRs</td>
                <td className="py-2.5 px-3">(2Vm/π)·cos(α)</td>
                <td className="py-2.5 px-3">2fs (100 Hz)</td>
                <td className="py-2.5 px-3">Vm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-cyan-300">Full Bridge Semi-Controlled</td>
                <td className="py-2.5 px-3">2 SCRs + 2 Diodes</td>
                <td className="py-2.5 px-3">(Vm/π)·(1 + cos α)</td>
                <td className="py-2.5 px-3">2fs (100 Hz)</td>
                <td className="py-2.5 px-3">Vm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-300">Full Bridge Uncontrolled</td>
                <td className="py-2.5 px-3">4 Diodes</td>
                <td className="py-2.5 px-3">2Vm/π ≈ 0.637 Vm</td>
                <td className="py-2.5 px-3">2fs (100 Hz)</td>
                <td className="py-2.5 px-3">Vm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Half-Wave Controlled</td>
                <td className="py-2.5 px-3">1 SCR</td>
                <td className="py-2.5 px-3">(Vm/2π)·(1 + cos α)</td>
                <td className="py-2.5 px-3">fs (50 Hz)</td>
                <td className="py-2.5 px-3">Vm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Half-Bridge Center Tap</td>
                <td className="py-2.5 px-3">2 SCRs / Diodes</td>
                <td className="py-2.5 px-3">(2Vm/π)·cos(α)</td>
                <td className="py-2.5 px-3">2fs (100 Hz)</td>
                <td className="py-2.5 px-3">2Vm</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
