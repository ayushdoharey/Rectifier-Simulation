export type TopologyType =
  | 'full-bridge-controlled'
  | 'full-bridge-semi'
  | 'full-bridge-uncontrolled'
  | 'half-bridge-controlled'
  | 'half-bridge-uncontrolled'
  | 'half-wave-controlled'
  | 'half-wave-uncontrolled'
  | 'three-phase-bridge-controlled'
  | 'three-phase-bridge-semi'
  | 'three-phase-bridge-uncontrolled';

export type LoadType = 'R' | 'RL' | 'RL-FD' | 'RLE' | 'CONSTANT_I';

export type FlowMode = 'ELECTRON' | 'CONVENTIONAL';

export interface CircuitParameters {
  topology: TopologyType;
  loadType: LoadType;
  firingAngleDeg: number; // α in degrees (0 to 180)
  vRms: number; // Input RMS voltage (e.g., 230V)
  frequency: number; // Frequency in Hz (e.g., 50Hz)
  resistance: number; // Load R in Ohms
  inductance: number; // Load L in mH
  backEmf: number; // DC Back EMF E in Volts
  hasFreewheelingDiode: boolean;
}

export interface InstantaneousState {
  omegaT: number; // Current electrical angle in radians (0 to 4π)
  omegaTDeg: number; // In degrees
  timeMs: number; // Current time in ms
  vin: number; // Supply voltage (Phase A or Line AB)
  iin: number; // Supply current (Phase A current)
  vout: number; // Load voltage
  iout: number; // Load current
  gate1: boolean; // Gate pulse for T1/T2
  gate2: boolean; // Gate pulse for T3/T4
  switchStates: {
    S1: 'ON' | 'OFF' | 'BLOCKING'; // T1 or D1 (Phase A Top)
    S2: 'ON' | 'OFF' | 'BLOCKING'; // T2 or D2 (Phase C Bottom)
    S3: 'ON' | 'OFF' | 'BLOCKING'; // T3 or D3 (Phase B Top)
    S4: 'ON' | 'OFF' | 'BLOCKING'; // T4 or D4 (Phase A Bottom)
    S5?: 'ON' | 'OFF' | 'BLOCKING'; // T5 or D5 (Phase C Top for 3-Phase)
    S6?: 'ON' | 'OFF' | 'BLOCKING'; // T6 or D6 (Phase B Bottom for 3-Phase)
    FD: 'ON' | 'OFF'; // Freewheeling Diode
  };
  deviceVoltages: {
    vS1: number;
    vS2: number;
    vS3: number;
    vS4: number;
    vFD: number;
  };
  currentLoop: 'SOURCE_POS' | 'SOURCE_NEG' | 'FREEWHEEL' | 'NONE' | 'PHASE_AB' | 'PHASE_AC' | 'PHASE_BC' | 'PHASE_BA' | 'PHASE_CA' | 'PHASE_CB';
  currentMagnitude: number;
  va?: number;
  vb?: number;
  vc?: number;
}

export interface CalculatedMetrics {
  vm: number; // Peak input voltage
  vdc: number; // Average DC output voltage
  vRmsOut: number; // RMS output voltage
  idc: number; // Average output current
  iRmsOut: number; // RMS output current
  iRmsIn: number; // RMS input current
  rippleFactorV: number; // Ripple factor
  formFactorV: number; // Form factor
  powerDc: number; // DC output power (Vdc * Idc)
  powerAc: number; // Total AC input active power
  powerFactor: number; // Displacement/power factor
  efficiency: number; // Rectification ratio
  extinctionAngleDeg: number | null; // Extinction angle β if discontinuous
  conductionAngleDeg: number; // γ = β - α
  isContinuous: boolean; // Continuous vs discontinuous conduction
}

export interface WaveformPoint {
  omegaT: number;
  omegaTDeg: number;
  vin: number;
  vout: number;
  iin: number;
  iout: number;
  vDevice1: number;
  gatePulse: number;
  va?: number;
  vb?: number;
  vc?: number;
}
