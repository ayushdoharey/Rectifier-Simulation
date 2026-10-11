import {
  CircuitParameters,
  CalculatedMetrics,
  InstantaneousState,
  WaveformPoint,
} from '../types/powerElectronics';

/**
 * Power Electronics Simulation Engine
 * Handles full analytical solutions and numerical ODE evaluations
 * for single-phase (half-wave, half-bridge, full-bridge)
 * and three-phase (uncontrolled, semi-controlled, fully controlled) rectifiers.
 */

export function calculateWaveforms(params: CircuitParameters, numCycles = 2): {
  points: WaveformPoint[];
  metrics: CalculatedMetrics;
} {
  const {
    topology,
    loadType,
    firingAngleDeg,
    vRms,
    frequency,
    resistance: R,
    inductance: LmH,
    backEmf: E,
    hasFreewheelingDiode,
  } = params;

  // Peak phase voltage Vm
  const Vm = vRms * Math.SQRT2;
  const omega = 2 * Math.PI * frequency;
  const L = (LmH || 0.001) / 1000; // in Henries
  const alpha = (firingAngleDeg * Math.PI) / 180;

  // Determine topology families
  const isThreePhase = topology.startsWith('three-phase');
  const isControlled = !topology.includes('uncontrolled');
  const isSemi = topology.includes('-semi');
  const isFullBridge = topology.startsWith('full-bridge');
  const isHalfBridgeCenterTap = topology.startsWith('half-bridge');
  const isHalfWave = topology.startsWith('half-wave');

  // Effective firing angle: STRICTLY 0 for all uncontrolled diode topologies!
  const effAlpha = isControlled ? alpha : 0;
  const effectiveAlphaDeg = isControlled ? firingAngleDeg : 0;

  // Freewheeling diode is strictly active ONLY when selected and NOT in pure R or pure RL load
  const effectiveHasFd = (hasFreewheelingDiode || loadType === 'RL-FD') && loadType !== 'R' && loadType !== 'RL';

  // Line-to-line peak voltage for 3-phase
  const VlinePeak = Math.sqrt(3) * Vm;

  // Points per cycle
  const pointsPerCycle = 360;
  const totalPoints = pointsPerCycle * numCycles;
  const step = (2 * Math.PI) / pointsPerCycle;

  // History buffers
  const currentHistory: number[] = new Array(totalPoints).fill(0);
  const voutHistory: number[] = new Array(totalPoints).fill(0);
  const vinHistory: number[] = new Array(totalPoints).fill(0);
  const iinHistory: number[] = new Array(totalPoints).fill(0);
  const gatePulseHistory: number[] = new Array(totalPoints).fill(0);
  const vDev1History: number[] = new Array(totalPoints).fill(0);
  const vaHistory: number[] = new Array(totalPoints).fill(0);
  const vbHistory: number[] = new Array(totalPoints).fill(0);
  const vcHistory: number[] = new Array(totalPoints).fill(0);

  let currentI = 0;
  const warmUpSteps = pointsPerCycle * 4;
  const dTheta = step;
  const dt = dTheta / omega;

  const effBackEmf = loadType === 'RLE' ? E : 0;

  // Convergence & Recording Loop
  for (let s = 0; s < warmUpSteps + totalPoints; s++) {
    const totalTheta = s * dTheta;
    const cycleTheta = totalTheta % (2 * Math.PI);

    // Single-phase voltage
    const vin = Vm * Math.sin(cycleTheta);

    // Three-phase balanced voltages (Phase A, B, C)
    const va = Vm * Math.sin(cycleTheta);
    const vb = Vm * Math.sin(cycleTheta - (2 * Math.PI) / 3);
    const vc = Vm * Math.sin(cycleTheta - (4 * Math.PI) / 3);

    // Line-to-line voltages
    const vab = va - vb;
    const vbc = vb - vc;
    const vca = vc - va;
    const vba = -vab;
    const vcb = -vbc;
    const vac = -vca;

    let voutInstant = 0;
    let conductingFromSource = false;
    let sourcePolarity: 'POS' | 'NEG' | 'NONE' = 'NONE';
    let isFreewheeling = false;
    let iSourceInstant = 0; // Source current (Phase A)
    let isGateActive = false;

    if (isThreePhase) {
      // ================= 3-PHASE RECTIFIERS =================
      // Natural commutation crossover points occur every 60° (π/3 rad) starting from π/6 (30°)
      // For controlled rectifiers, conduction is delayed by effAlpha
      const baseAlpha = effAlpha;
      const gateWidth = (8 * Math.PI) / 180;

      // 6 firing / conduction intervals
      // Interval 0: [30° + α, 90° + α]   -> T1/D1 & T6/D6 conduct (Vab)
      // Interval 1: [90° + α, 150° + α]  -> T1/D1 & T2/D2 conduct (Vac)
      // Interval 2: [150° + α, 210° + α] -> T3/D3 & T2/D2 conduct (Vbc)
      // Interval 3: [210° + α, 270° + α] -> T3/D3 & T4/D4 conduct (Vba)
      // Interval 4: [270° + α, 330° + α] -> T5/D5 & T4/D4 conduct (Vca)
      // Interval 5: [330° + α, 390° + α] -> T5/D5 & T6/D6 conduct (Vcb)

      const startAngle = Math.PI / 6 + baseAlpha;
      const angleRel = ((cycleTheta - startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const interval = Math.floor(angleRel / (Math.PI / 3)); // 0 to 5

      // Check gate trigger active for controlled converters
      if (isControlled) {
        for (let k = 0; k < 6; k++) {
          const triggerAngle = (Math.PI / 6 + baseAlpha + k * (Math.PI / 3)) % (2 * Math.PI);
          if (Math.abs(cycleTheta - triggerAngle) < gateWidth) {
            isGateActive = true;
            break;
          }
        }
      }

      let lineVoltage = 0;
      let phaseACurrentDirection = 0; // +1 if Phase A top conducts, -1 if Phase A bottom conducts, 0 otherwise

      switch (interval) {
        case 0:
          lineVoltage = vab;
          phaseACurrentDirection = 1; // S1 (Phase A top) & S6 (Phase B bottom)
          break;
        case 1:
          lineVoltage = vac;
          phaseACurrentDirection = 1; // S1 (Phase A top) & S2 (Phase C bottom)
          break;
        case 2:
          lineVoltage = vbc;
          phaseACurrentDirection = 0; // S3 (Phase B top) & S2 (Phase C bottom)
          break;
        case 3:
          lineVoltage = vba;
          phaseACurrentDirection = -1; // S3 (Phase B top) & S4 (Phase A bottom)
          break;
        case 4:
          lineVoltage = vca;
          phaseACurrentDirection = -1; // S5 (Phase C top) & S4 (Phase A bottom)
          break;
        case 5:
        default:
          lineVoltage = vcb;
          phaseACurrentDirection = 0; // S5 (Phase C top) & S6 (Phase B bottom)
          break;
      }

      if (topology === 'three-phase-bridge-uncontrolled') {
        // UNCONTROLLED 6-DIODE BRIDGE:
        // Output voltage is strictly the upper phase envelope minus lower phase envelope
        const maxPhase = Math.max(va, vb, vc);
        const minPhase = Math.min(va, vb, vc);
        voutInstant = Math.max(0, maxPhase - minPhase);
        conductingFromSource = true;
        // Determine which pair is naturally forward biased
        if (va === maxPhase) phaseACurrentDirection = 1;
        else if (va === minPhase) phaseACurrentDirection = -1;
        else phaseACurrentDirection = 0;
      } else if (isSemi) {
        // 3-PHASE SEMI-CONTROLLED:
        // Freewheels whenever line voltage drops to zero
        if (lineVoltage >= 0) {
          voutInstant = lineVoltage;
          conductingFromSource = true;
        } else {
          voutInstant = 0;
          isFreewheeling = true;
          phaseACurrentDirection = 0;
        }
      } else {
        // 3-PHASE FULLY CONTROLLED:
        if (loadType === 'R') {
          voutInstant = Math.max(0, lineVoltage);
          conductingFromSource = lineVoltage >= 0;
          if (lineVoltage < 0) phaseACurrentDirection = 0;
        } else if (effectiveHasFd) {
          if (lineVoltage >= 0) {
            voutInstant = lineVoltage;
            conductingFromSource = true;
          } else {
            voutInstant = 0;
            isFreewheeling = true;
            phaseACurrentDirection = 0;
          }
        } else {
          // Highly inductive continuous: follows line voltage even if negative!
          voutInstant = lineVoltage;
          conductingFromSource = true;
        }
      }

      // Compute load current
      if (loadType === 'CONSTANT_I') {
        currentI = Math.max(1, (1.35 * VlinePeak) / (R || 10));
      } else if (loadType === 'R') {
        currentI = Math.max(0, (voutInstant - effBackEmf) / Math.max(0.5, R));
      } else {
        // Runge-Kutta 4th order step for L di/dt + Ri = vout - E
        const di_dt = (v: number, i: number) => {
          if (i <= 0 && v <= effBackEmf && !conductingFromSource) return 0;
          return (v - effBackEmf - R * i) / L;
        };
        const k1 = di_dt(voutInstant, currentI);
        const k2 = di_dt(voutInstant, Math.max(0, currentI + 0.5 * dt * k1));
        const k3 = di_dt(voutInstant, Math.max(0, currentI + 0.5 * dt * k2));
        const k4 = di_dt(voutInstant, Math.max(0, currentI + dt * k3));
        currentI = Math.max(0, currentI + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
      }

      iSourceInstant = phaseACurrentDirection * currentI;
    } else {
      // ================= SINGLE-PHASE RECTIFIERS =================
      const gateWidth = (10 * Math.PI) / 180;
      const isGate1Active = isControlled && Math.abs(cycleTheta - effAlpha) < gateWidth;
      const isGate2Active =
        isControlled &&
        (isFullBridge || isHalfBridgeCenterTap) &&
        Math.abs(cycleTheta - (Math.PI + effAlpha)) < gateWidth;
      isGateActive = isGate1Active || isGate2Active;

      if (loadType === 'CONSTANT_I') {
        currentI = Math.max(1, (0.9 * Vm) / (R || 1));
        if (isFullBridge) {
          if (!isControlled) {
            // Pure Uncontrolled Diode Bridge: always strictly |vin|
            voutInstant = Math.abs(vin);
            conductingFromSource = true;
            sourcePolarity = cycleTheta < Math.PI ? 'POS' : 'NEG';
          } else if (isSemi) {
            if (cycleTheta >= effAlpha && cycleTheta < Math.PI) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else if (cycleTheta >= Math.PI + effAlpha && cycleTheta < 2 * Math.PI) {
              voutInstant = -vin;
              conductingFromSource = true;
              sourcePolarity = 'NEG';
            } else {
              voutInstant = 0;
              isFreewheeling = true;
            }
          } else {
            if (cycleTheta >= effAlpha && cycleTheta < Math.PI + effAlpha) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else {
              voutInstant = -vin;
              conductingFromSource = true;
              sourcePolarity = 'NEG';
            }
          }
        } else if (isHalfBridgeCenterTap) {
          if (!isControlled) {
            voutInstant = Math.abs(vin);
            conductingFromSource = true;
            sourcePolarity = cycleTheta < Math.PI ? 'POS' : 'NEG';
          } else {
            if (cycleTheta >= effAlpha && cycleTheta < Math.PI + effAlpha) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else {
              voutInstant = -vin;
              conductingFromSource = true;
              sourcePolarity = 'NEG';
            }
          }
        } else {
          // Half-wave
          if (!isControlled) {
            if (cycleTheta < Math.PI) {
              voutInstant = Math.max(0, vin);
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else {
              voutInstant = 0;
              isFreewheeling = true;
            }
          } else {
            if (cycleTheta >= effAlpha && cycleTheta < Math.PI) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else {
              voutInstant = 0;
              isFreewheeling = true;
            }
          }
        }
      } else {
        // Dynamic R, RL, RL-FD, RLE simulation
        if (isFullBridge) {
          if (!isControlled) {
            // UNCONTROLLED DIODE BRIDGE:
            // D1, D2 conduct when vin > effBackEmf
            // D3, D4 conduct when -vin > effBackEmf
            // Diode bridge NEVER outputs negative voltage! Commutates naturally.
            if (vin > effBackEmf) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else if (-vin > effBackEmf) {
              voutInstant = -vin;
              conductingFromSource = true;
              sourcePolarity = 'NEG';
            } else if (currentI > 0.001) {
              if (effectiveHasFd) {
                voutInstant = 0;
                isFreewheeling = true;
              } else {
                voutInstant = Math.abs(vin);
                conductingFromSource = true;
                sourcePolarity = cycleTheta < Math.PI ? 'POS' : 'NEG';
              }
            } else {
              voutInstant = effBackEmf;
            }
          } else if (isSemi) {
            // SEMI-CONTROLLED: T1, T2 controlled; D1, D2 diodes
            const inPosFireWindow = cycleTheta >= effAlpha && cycleTheta < Math.PI;
            const inNegFireWindow = cycleTheta >= Math.PI + effAlpha && cycleTheta < 2 * Math.PI;

            if (inPosFireWindow && (vin > effBackEmf || currentI > 0.001)) {
              voutInstant = vin;
              conductingFromSource = true;
              sourcePolarity = 'POS';
            } else if (inNegFireWindow && (-vin > effBackEmf || currentI > 0.001)) {
              voutInstant = -vin;
              conductingFromSource = true;
              sourcePolarity = 'NEG';
            } else if (currentI > 0.001) {
              voutInstant = 0;
              isFreewheeling = true;
            } else {
              voutInstant = effBackEmf;
            }
          } else {
            // FULLY CONTROLLED FULL BRIDGE:
            const hasFD = effectiveHasFd;
            const posHalf = cycleTheta >= effAlpha && cycleTheta < Math.PI + effAlpha;

            if (posHalf) {
              if (cycleTheta < Math.PI) {
                if (vin > effBackEmf || currentI > 0.001) {
                  voutInstant = vin;
                  conductingFromSource = true;
                  sourcePolarity = 'POS';
                } else {
                  voutInstant = effBackEmf;
                }
              } else {
                if (hasFD && currentI > 0.001) {
                  voutInstant = 0;
                  isFreewheeling = true;
                } else if (currentI > 0.001 && loadType !== 'R') {
                  voutInstant = vin;
                  conductingFromSource = true;
                  sourcePolarity = 'POS';
                } else {
                  voutInstant = effBackEmf;
                }
              }
            } else {
              const thetaRel = cycleTheta - Math.PI;
              if (thetaRel < Math.PI) {
                if (-vin > effBackEmf || currentI > 0.001) {
                  voutInstant = -vin;
                  conductingFromSource = true;
                  sourcePolarity = 'NEG';
                } else {
                  voutInstant = effBackEmf;
                }
              } else {
                if (hasFD && currentI > 0.001) {
                  voutInstant = 0;
                  isFreewheeling = true;
                } else if (currentI > 0.001 && loadType !== 'R') {
                  voutInstant = -vin;
                  conductingFromSource = true;
                  sourcePolarity = 'NEG';
                } else {
                  voutInstant = effBackEmf;
                }
              }
            }
          }
        } else if (isHalfBridgeCenterTap) {
          if (!isControlled) {
            voutInstant = Math.abs(vin);
            conductingFromSource = true;
            sourcePolarity = cycleTheta < Math.PI ? 'POS' : 'NEG';
          } else {
            const posHalf = cycleTheta >= effAlpha && cycleTheta < Math.PI + effAlpha;
            if (posHalf) {
              if (cycleTheta < Math.PI || currentI > 0.001) {
                voutInstant = vin;
                conductingFromSource = true;
                sourcePolarity = 'POS';
              } else {
                voutInstant = 0;
              }
            } else {
              if (cycleTheta < 2 * Math.PI || currentI > 0.001) {
                voutInstant = -vin;
                conductingFromSource = true;
                sourcePolarity = 'NEG';
              } else {
                voutInstant = 0;
              }
            }
          }
        } else {
          // Half-wave
          const hasFD = hasFreewheelingDiode || loadType === 'RL-FD';
          if (!isControlled) {
            if (cycleTheta < Math.PI) {
              voutInstant = vin > effBackEmf ? vin : effBackEmf;
              if (vin > effBackEmf) {
                conductingFromSource = true;
                sourcePolarity = 'POS';
              }
            } else if (currentI > 0.001) {
              if (hasFD) {
                voutInstant = 0;
                isFreewheeling = true;
              } else {
                voutInstant = vin;
                conductingFromSource = true;
                sourcePolarity = 'POS';
              }
            } else {
              voutInstant = effBackEmf;
            }
          } else {
            if (cycleTheta >= effAlpha && cycleTheta < Math.PI) {
              if (vin > effBackEmf || currentI > 0.001) {
                voutInstant = vin;
                conductingFromSource = true;
                sourcePolarity = 'POS';
              } else {
                voutInstant = effBackEmf;
              }
            } else if (cycleTheta >= Math.PI && currentI > 0.001) {
              if (hasFD) {
                voutInstant = 0;
                isFreewheeling = true;
              } else {
                voutInstant = vin;
                conductingFromSource = true;
                sourcePolarity = 'POS';
              }
            } else {
              voutInstant = effBackEmf;
            }
          }
        }

        // Numerical ODE integration
        if (loadType === 'R') {
          currentI = Math.max(0, (voutInstant - effBackEmf) / Math.max(0.5, R));
        } else {
          const di_dt = (v: number, i: number) => {
            if (i <= 0 && v <= effBackEmf && !conductingFromSource) return 0;
            return (v - effBackEmf - R * i) / L;
          };

          const k1 = di_dt(voutInstant, currentI);
          const k2 = di_dt(voutInstant, Math.max(0, currentI + 0.5 * dt * k1));
          const k3 = di_dt(voutInstant, Math.max(0, currentI + 0.5 * dt * k2));
          const k4 = di_dt(voutInstant, Math.max(0, currentI + dt * k3));
          currentI = Math.max(0, currentI + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
        }
      }

      if (conductingFromSource) {
        iSourceInstant = sourcePolarity === 'POS' ? currentI : -currentI;
      } else {
        iSourceInstant = 0;
      }
    }

    // Record into history after warm-up
    if (s >= warmUpSteps) {
      const idx = s - warmUpSteps;
      vinHistory[idx] = vin;
      voutHistory[idx] = voutInstant;
      currentHistory[idx] = currentI;
      iinHistory[idx] = iSourceInstant;
      gatePulseHistory[idx] = isGateActive ? 1 : 0;
      vaHistory[idx] = va;
      vbHistory[idx] = vb;
      vcHistory[idx] = vc;

      // Device 1 voltage
      if (isFullBridge) {
        vDev1History[idx] = sourcePolarity === 'POS' ? 0 : -Math.abs(vin);
      } else {
        vDev1History[idx] = conductingFromSource ? 0 : vin - voutInstant;
      }
    }
  }

  // Build waveform points array
  const points: WaveformPoint[] = [];
  for (let i = 0; i < totalPoints; i++) {
    const omegaT = i * dTheta;
    const omegaTDeg = Math.round((omegaT * 180) / Math.PI);
    points.push({
      omegaT,
      omegaTDeg,
      vin: vinHistory[i],
      vout: voutHistory[i],
      iin: iinHistory[i],
      iout: currentHistory[i],
      vDevice1: vDev1History[i],
      gatePulse: gatePulseHistory[i],
      va: vaHistory[i],
      vb: vbHistory[i],
      vc: vcHistory[i],
    });
  }

  // Calculate standard electrical metrics over 1 complete cycle
  let sumVout = 0;
  let sumVoutSq = 0;
  let sumIout = 0;
  let sumIoutSq = 0;
  let sumIinSq = 0;
  let sumPActive = 0;
  let minCurrentInCycle = Infinity;
  let extinctionAngleDeg: number | null = null;

  for (let i = 0; i < pointsPerCycle; i++) {
    const v = voutHistory[i];
    const io = currentHistory[i];
    const vi = vinHistory[i];
    const ii = iinHistory[i];

    sumVout += v;
    sumVoutSq += v * v;
    sumIout += io;
    sumIoutSq += io * io;
    sumIinSq += ii * ii;
    sumPActive += vi * ii;

    if (io < minCurrentInCycle) {
      minCurrentInCycle = io;
    }

    const deg = (i * 360) / pointsPerCycle;
    if (deg > effectiveAlphaDeg + 5 && io <= 0.005 && extinctionAngleDeg === null) {
      extinctionAngleDeg = deg;
    }
  }

  const vdc = sumVout / pointsPerCycle;
  const vRmsOut = Math.sqrt(sumVoutSq / pointsPerCycle);
  const idc = sumIout / pointsPerCycle;
  const iRmsOut = Math.sqrt(sumIoutSq / pointsPerCycle);
  const iRmsIn = Math.sqrt(sumIinSq / pointsPerCycle);
  const powerDc = vdc * idc;
  const powerAc = sumPActive / pointsPerCycle;

  const formFactorV = vdc !== 0 ? Math.abs(vRmsOut / vdc) : 0;
  const rippleRatio = formFactorV * formFactorV - 1;
  const rippleFactorV = rippleRatio > 0 ? Math.sqrt(rippleRatio) : 0;

  const apparentPower = (isThreePhase ? Math.sqrt(3) * (vRms * Math.sqrt(3)) : vRms) * (iRmsIn || 0.001);
  const powerFactor = Math.min(1, Math.max(0, apparentPower > 0 ? Math.abs(powerAc / apparentPower) : 0));
  const efficiency = powerAc > 0 ? Math.min(100, Math.max(0, (powerDc / powerAc) * 100)) : 0;

  const isContinuous = minCurrentInCycle > 0.05;
  const conductionAngleDeg = extinctionAngleDeg !== null
    ? Math.max(0, extinctionAngleDeg - effectiveAlphaDeg)
    : (isThreePhase ? 60 : isFullBridge ? 180 : 360);

  return {
    points,
    metrics: {
      vm: isThreePhase ? VlinePeak : Vm,
      vdc,
      vRmsOut,
      idc,
      iRmsOut,
      iRmsIn,
      rippleFactorV,
      formFactorV,
      powerDc,
      powerAc,
      powerFactor,
      efficiency,
      extinctionAngleDeg: isContinuous ? null : extinctionAngleDeg,
      conductionAngleDeg,
      isContinuous,
    },
  };
}

/**
 * Analytical Formula Evaluator for textbook-exact values
 */
export function getAnalyticalFormulas(params: CircuitParameters): {
  vdcFormula: string;
  vrmsFormula: string;
  analyticalVdc: number;
  explanation: string;
} {
  const { topology, loadType, firingAngleDeg, vRms } = params;
  const Vm = vRms * Math.SQRT2;
  const aRad = (firingAngleDeg * Math.PI) / 180;
  const cosA = Math.cos(aRad);

  switch (topology) {
    case 'half-wave-uncontrolled':
      return {
        vdcFormula: 'V_{dc} = \\frac{V_m}{\\pi} \\approx 0.318 V_m',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{2} = 0.5 V_m',
        analyticalVdc: Vm / Math.PI,
        explanation: 'Single diode conducts naturally for positive half cycle [0, π]. Peak inverse voltage is Vm.',
      };
    case 'half-wave-controlled':
      return {
        vdcFormula: 'V_{dc} = \\frac{V_m}{2\\pi}(1 + \\cos\\alpha)',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{2} \\sqrt{\\frac{1}{\\pi} [(\\pi - \\alpha) + \\frac{1}{2}\\sin 2\\alpha]}',
        analyticalVdc: (Vm / (2 * Math.PI)) * (1 + cosA),
        explanation: 'Thyristor T1 fired at α, conducts until π for R load. For R-L load, conducts until extinction angle β.',
      };
    case 'full-bridge-uncontrolled':
      return {
        vdcFormula: 'V_{dc} = \\frac{2V_m}{\\pi} \\approx 0.637 V_m',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} = V_{rms,in}',
        analyticalVdc: (2 * Vm) / Math.PI,
        explanation: 'Four diodes conduct in diagonal pairs: D1-D2 in [0, π], D3-D4 in [π, 2π]. Conduction depends strictly on voltage polarity, independent of firing angle.',
      };
    case 'full-bridge-semi':
      return {
        vdcFormula: 'V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} \\sqrt{\\frac{1}{\\pi} [(\\pi - \\alpha) + \\frac{1}{2}\\sin 2\\alpha]}',
        analyticalVdc: (Vm / Math.PI) * (1 + cosA),
        explanation: 'Semiconverter with 2 SCRs and 2 diodes. Freewheeling occurs naturally when source polarity reverses, preventing negative output voltage.',
      };
    case 'full-bridge-controlled':
      if (loadType === 'CONSTANT_I' || loadType === 'RL') {
        return {
          vdcFormula: 'V_{dc} = \\frac{2V_m}{\\pi} \\cos\\alpha',
          vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}}',
          analyticalVdc: ((2 * Vm) / Math.PI) * cosA,
          explanation: 'Fully controlled converter (4 SCRs). Conduction is continuous across all 2π. Inductor drives voltage negative between π and π+α until opposite pair triggers.',
        };
      } else {
        return {
          vdcFormula: 'V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
          vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} \\sqrt{\\frac{1}{\\pi} [(\\pi - \\alpha) + \\frac{1}{2}\\sin 2\\alpha]}',
          analyticalVdc: (Vm / Math.PI) * (1 + cosA),
          explanation: 'Fully controlled bridge with R load: Current extinguishes at π, so output voltage is clamped at zero until π+α.',
        };
      }
    case 'half-bridge-uncontrolled':
      return {
        vdcFormula: 'V_{dc} = \\frac{2V_m}{\\pi} \\approx 0.637 V_m',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}}',
        analyticalVdc: (2 * Vm) / Math.PI,
        explanation: 'Center-tapped half bridge with 2 diodes. Each diode conducts naturally for one half cycle without gating delay.',
      };
    case 'half-bridge-controlled':
      return {
        vdcFormula: 'V_{dc} = \\frac{2V_m}{\\pi} \\cos\\alpha',
        vrmsFormula: 'V_{rms} = \\frac{V_m}{\\sqrt{2}}',
        analyticalVdc: ((2 * Vm) / Math.PI) * cosA,
        explanation: 'Center-tapped half bridge with 2 SCRs fired at α and π+α.',
      };
    case 'three-phase-bridge-uncontrolled':
      return {
        vdcFormula: 'V_{dc} = \\frac{3\\sqrt{3}V_m}{\\pi} \\approx 1.654 V_m = 1.35 V_{LL,rms}',
        vrmsFormula: 'V_{rms} = V_{L,m} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}} \\approx 1.655 V_m',
        analyticalVdc: (3 * Math.sqrt(3) * Vm) / Math.PI,
        explanation: 'Three-phase 6-pulse diode bridge: 6 diodes commutate naturally every 60° based on maximum line voltage envelope. Exceptionally low 4.2% ripple factor.',
      };
    case 'three-phase-bridge-controlled':
      return {
        vdcFormula: 'V_{dc} = \\frac{3\\sqrt{3}V_m}{\\pi} \\cos\\alpha',
        vrmsFormula: 'V_{rms} = V_{L,m} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}\\cos 2\\alpha}',
        analyticalVdc: ((3 * Math.sqrt(3) * Vm) / Math.PI) * cosA,
        explanation: 'Three-phase 6-pulse fully controlled converter (6 SCRs). Thyristors are triggered in sequence at 60° intervals delayed by firing angle α.',
      };
    case 'three-phase-bridge-semi':
      return {
        vdcFormula: 'V_{dc} = \\frac{3\\sqrt{3}V_m}{2\\pi}(1 + \\cos\\alpha)',
        vrmsFormula: 'V_{rms} = V_{L,m} \\sqrt{\\frac{3}{2\\pi} [(\\pi - \\alpha) + \\frac{1}{2}\\sin 2\\alpha]}',
        analyticalVdc: ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * (1 + cosA),
        explanation: 'Three-phase semi-controlled converter (3 SCRs upper + 3 Diodes lower). Lower diodes freewheel naturally, preventing negative output voltage.',
      };
  }
}

/**
 * Harmonic Fourier series decomposition of output voltage
 */
export function calculateHarmonics(points: WaveformPoint[], maxHarmonic = 8): {
  harmonicNumber: number;
  frequencyHz: number;
  magnitude: number;
  percentage: number;
}[] {
  const n = Math.floor(points.length / 2);
  if (n <= 0) return [];

  const harmonics: { harmonicNumber: number; frequencyHz: number; magnitude: number; percentage: number }[] = [];
  const baseFreq = 50;

  let v0 = 0;
  for (let i = 0; i < n; i++) {
    v0 += points[i].vout;
  }
  v0 = v0 / n;
  harmonics.push({
    harmonicNumber: 0,
    frequencyHz: 0,
    magnitude: Math.abs(v0),
    percentage: 100,
  });

  const refMag = Math.max(1, Math.abs(v0));

  for (let h = 1; h <= maxHarmonic; h++) {
    let a_h = 0;
    let b_h = 0;
    for (let i = 0; i < n; i++) {
      const theta = points[i].omegaT;
      a_h += points[i].vout * Math.cos(h * theta);
      b_h += points[i].vout * Math.sin(h * theta);
    }
    a_h = (2 / n) * a_h;
    b_h = (2 / n) * b_h;
    const mag = Math.sqrt(a_h * a_h + b_h * b_h);
    harmonics.push({
      harmonicNumber: h,
      frequencyHz: h * baseFreq,
      magnitude: mag,
      percentage: Math.min(100, (mag / refMag) * 100),
    });
  }

  return harmonics;
}

/**
 * Returns instantaneous states for any arbitrary electrical angle omegaT
 */
export function getInstantaneousState(
  params: CircuitParameters,
  omegaT: number
): InstantaneousState {
  const { points } = calculateWaveforms(params, 2);
  const twoPi = 2 * Math.PI;
  const wrappedTheta = ((omegaT % twoPi) + twoPi) % twoPi;

  let nearest = points[0];
  let minDiff = Infinity;
  for (const pt of points) {
    const diff = Math.abs(pt.omegaT - wrappedTheta);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = pt;
    }
  }

  const { topology, firingAngleDeg, loadType, hasFreewheelingDiode } = params;
  const isThreePhase = topology.startsWith('three-phase');
  const isControlled = !topology.includes('uncontrolled');
  const isSemi = topology.includes('-semi');
  const isFullBridge = topology.startsWith('full-bridge');
  const alphaDeg = isControlled ? firingAngleDeg : 0;
  const deg = (wrappedTheta * 180) / Math.PI;

  const effectiveHasFd = (hasFreewheelingDiode || loadType === 'RL-FD') && loadType !== 'R' && loadType !== 'RL';

  const currentMagnitude = Math.abs(nearest.iout);

  const switchStates: InstantaneousState['switchStates'] = {
    S1: 'OFF',
    S2: 'OFF',
    S3: 'OFF',
    S4: 'OFF',
    S5: 'OFF',
    S6: 'OFF',
    FD: 'OFF',
  };

  let currentLoop: InstantaneousState['currentLoop'] = 'NONE';
  const vin = nearest.vin;

  if (isThreePhase) {
    // 3-PHASE RECTIFIER SWITCH STATES
    // Upper switches: S1 (Phase A), S3 (Phase B), S5 (Phase C)
    // Lower switches: S4 (Phase A), S6 (Phase B), S2 (Phase C)
    const baseAlpha = alphaDeg * (Math.PI / 180);
    const startAngle = Math.PI / 6 + baseAlpha;
    const angleRel = ((wrappedTheta - startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const interval = Math.floor(angleRel / (Math.PI / 3)); // 0 to 5

    if (currentMagnitude > 0.02) {
      if (effectiveHasFd && Math.abs(nearest.vout) < 0.5) {
        currentLoop = 'FREEWHEEL';
        switchStates.FD = 'ON';
      } else {
        switch (interval) {
          case 0:
            switchStates.S1 = 'ON';
            switchStates.S6 = 'ON';
            currentLoop = 'PHASE_AB';
            break;
          case 1:
            switchStates.S1 = 'ON';
            switchStates.S2 = 'ON';
            currentLoop = 'PHASE_AC';
            break;
          case 2:
            switchStates.S3 = 'ON';
            switchStates.S2 = 'ON';
            currentLoop = 'PHASE_BC';
            break;
          case 3:
            switchStates.S3 = 'ON';
            switchStates.S4 = 'ON';
            currentLoop = 'PHASE_BA';
            break;
          case 4:
            switchStates.S5 = 'ON';
            switchStates.S4 = 'ON';
            currentLoop = 'PHASE_CA';
            break;
          case 5:
          default:
            switchStates.S5 = 'ON';
            switchStates.S6 = 'ON';
            currentLoop = 'PHASE_CB';
            break;
        }
      }
    } else {
      currentLoop = 'NONE';
    }

    // Set forward blocking status for controlled SCRs if waiting for firing pulse
    if (isControlled) {
      const naturalCommInterval = Math.floor(
        (((wrappedTheta - Math.PI / 6) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 3)
      );
      if (naturalCommInterval !== interval && currentMagnitude <= 0.02) {
        // Mark upcoming switch as BLOCKING
        if (interval === 0) switchStates.S1 = 'BLOCKING';
        if (interval === 1) switchStates.S2 = 'BLOCKING';
        if (interval === 2) switchStates.S3 = 'BLOCKING';
        if (interval === 3) switchStates.S4 = 'BLOCKING';
        if (interval === 4) switchStates.S5 = 'BLOCKING';
        if (interval === 5) switchStates.S6 = 'BLOCKING';
      }
    }
  } else {
    // SINGLE-PHASE RECTIFIERS
    if (!isControlled) {
      // PURE UNCONTROLLED DIODE BRIDGE:
      // Diodes conduct strictly when forward biased! NEVER in BLOCKING state!
      if (currentMagnitude > 0.01) {
        if (nearest.iin > 0.01) {
          switchStates.S1 = 'ON';
          switchStates.S2 = 'ON';
          currentLoop = 'SOURCE_POS';
        } else if (nearest.iin < -0.01) {
          switchStates.S3 = 'ON';
          switchStates.S4 = 'ON';
          currentLoop = 'SOURCE_NEG';
        } else if (effectiveHasFd) {
          switchStates.FD = 'ON';
          currentLoop = 'FREEWHEEL';
        } else {
          // If no FD, natural forward bias maintains conducting pair
          if (vin >= 0) {
            switchStates.S1 = 'ON';
            switchStates.S2 = 'ON';
            currentLoop = 'SOURCE_POS';
          } else {
            switchStates.S3 = 'ON';
            switchStates.S4 = 'ON';
            currentLoop = 'SOURCE_NEG';
          }
        }
      } else {
        // Natural forward bias when idle / at zero crossing
        if (vin > 0) {
          switchStates.S1 = 'ON';
          switchStates.S2 = 'ON';
        } else if (vin < 0) {
          switchStates.S3 = 'ON';
          switchStates.S4 = 'ON';
        }
        currentLoop = 'NONE';
      }
    } else {
      // CONTROLLED CONVERTER (SCRs):
      if (currentMagnitude > 0.01) {
        if (Math.abs(nearest.iin) > 0.01) {
          if (nearest.iin > 0) {
            currentLoop = 'SOURCE_POS';
            switchStates.S1 = 'ON';
            switchStates.S2 = 'ON';
          } else {
            currentLoop = 'SOURCE_NEG';
            switchStates.S3 = 'ON';
            switchStates.S4 = 'ON';
          }
        } else if (effectiveHasFd) {
          currentLoop = 'FREEWHEEL';
          switchStates.FD = 'ON';
          if (isSemi) {
            switchStates.S2 = 'ON';
            switchStates.S4 = 'ON';
          }
        } else {
          // Without FD, inductive continuous conduction continues through active SCR pair
          if (deg >= alphaDeg && deg < 180 + alphaDeg) {
            currentLoop = 'SOURCE_POS';
            switchStates.S1 = 'ON';
            switchStates.S2 = 'ON';
          } else {
            currentLoop = 'SOURCE_NEG';
            switchStates.S3 = 'ON';
            switchStates.S4 = 'ON';
          }
        }
      } else {
        currentLoop = 'NONE';
        if (vin > 0) {
          switchStates.S1 = deg < alphaDeg ? 'BLOCKING' : 'OFF';
          switchStates.S2 = switchStates.S1;
        } else {
          switchStates.S3 = deg < 180 + alphaDeg ? 'BLOCKING' : 'OFF';
          switchStates.S4 = switchStates.S3;
        }
      }
    }
  }

  const gateWidthDeg = 8;
  const gate1 = isControlled && Math.abs(deg - alphaDeg) < gateWidthDeg;
  const gate2 = isControlled && (isFullBridge || topology.startsWith('half-bridge')) && Math.abs(deg - (180 + alphaDeg)) < gateWidthDeg;

  return {
    omegaT: wrappedTheta,
    omegaTDeg: Math.round(deg),
    timeMs: (wrappedTheta / (2 * Math.PI * params.frequency)) * 1000,
    vin: nearest.vin,
    iin: nearest.iin,
    vout: nearest.vout,
    iout: nearest.iout,
    gate1,
    gate2,
    switchStates,
    deviceVoltages: {
      vS1: nearest.vDevice1,
      vS2: 0,
      vS3: 0,
      vS4: 0,
      vFD: 0,
    },
    currentLoop,
    currentMagnitude,
    va: nearest.va,
    vb: nearest.vb,
    vc: nearest.vc,
  };
}
