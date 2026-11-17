const zoneLabels: Record<string, string> = {
  heart: 'Heart & cardiovascular', bone: 'Bones & muscles', belly: 'Abdomen & metabolism (glucose)',
  skin: 'Skin & thermoregulation', radiation: 'Radiation exposure', whole_body: 'Whole body · unlocalized measures'
};
const sectionLabels: Record<string, string> = {
  'bone-muscle': 'Bones and muscles', cardiovascular: 'Cardiovascular', radiation: 'Radiation',
  eyes: 'Eyes', metabolism: 'Metabolism and hydration', cabin: 'Cabin environment'
};
const indicatorLabels: Record<string, string> = {
  bone: 'Bone mineral density Z-score', muscle: 'Muscle strength loss', 'heart-rate': 'Heart rate',
  'blood-pressure': 'Blood pressure', spo2: 'Oxygen saturation (SpO₂)', 'radiation-daily': 'Daily radiation dose',
  'radiation-cumulative': 'Cumulative radiation dose', 'eye-pressure': 'Intraocular pressure',
  temperature: 'Body temperature', 'urine-specific-gravity': 'Urine specific gravity', glucose: 'Fasting blood glucose', co2: 'Cabin CO₂ partial pressure'
};
const fieldLabels: Record<string, string> = {
  Bone_ZScore: 'Bone mineral density Z-score', Muscle_Strength_Loss: 'Muscle strength loss', Heart_Rate: 'Heart rate',
  Systolic_BP: 'Systolic blood pressure', Diastolic_BP: 'Diastolic blood pressure', SpO2: 'Oxygen saturation (SpO₂)',
  Radiation_Dose_Daily: 'Daily radiation dose', Radiation_Dose_Cumulative: 'Cumulative radiation dose',
  Intraocular_Pressure: 'Intraocular pressure', Body_Temperature: 'Body temperature',
  Urine_Specific_Gravity: 'Urine specific gravity', CO2_Partial_Pressure: 'Cabin CO₂ partial pressure', Fasting_Glucose: 'Fasting blood glucose'
};
const sectionRisk: Record<string, string> = {
  'bone-muscle': 'Bone fragility and fracture risk.', cardiovascular: 'Cardiovascular adaptation and risk of fainting.',
  radiation: 'Radiation exposure may increase long-term health risks.', eyes: 'Spaceflight-associated neuro-ocular syndrome (SANS).',
  metabolism: 'Hydration, temperature regulation, and metabolic changes.', cabin: 'Elevated cabin CO₂ can affect comfort and performance.'
};
const devices: Record<string, string> = {
  bone: 'Bone ultrasound / DEXA', muscle: 'Grip dynamometer', 'heart-rate': 'Bio-Monitor (smart shirt)',
  'blood-pressure': 'Onboard blood pressure monitor', spo2: 'Bio-Monitor pulse oximeter',
  'radiation-daily': 'CANS neutron spectrometer', 'radiation-cumulative': 'Rad-Silk dosimeter',
  'eye-pressure': 'Portable iCare tonometer', temperature: 'Bio-Monitor',
  'urine-specific-gravity': 'Urine refractometer', glucose: 'Finger-stick meter / CGM', co2: 'ECLSS cabin sensors'
};
const nominalRanges: Record<string, string> = {
  Bone_ZScore: 'Normal: ≥ -1.0 SD', Muscle_Strength_Loss: 'Normal: < 10%', Heart_Rate: 'Normal: 55 to 90 bpm',
  Systolic_BP: 'Normal: 95 to 125 mmHg', Diastolic_BP: 'Normal: 60 to 80 mmHg', SpO2: 'Normal: ≥ 96%',
  Radiation_Dose_Daily: 'Normal: < 1.0 mSv/day', Radiation_Dose_Cumulative: 'Normal: < 100 mSv',
  Intraocular_Pressure: 'Normal: 11 to 20 mmHg', Body_Temperature: 'Normal: 36.5 to 37.5 °C',
  Urine_Specific_Gravity: 'Normal: 1.005 to 1.020', Fasting_Glucose: 'Normal: 0.70 to 1.10 g/L',
  CO2_Partial_Pressure: 'Normal: < 3.0 mmHg'
};

export function bodyZoneLabel(id: string, french: string, language: string) {
  return language.startsWith('fr') ? french : zoneLabels[id] ?? french;
}
export function bodySectionLabel(id: string, french: string, language: string) {
  return language.startsWith('fr') ? french : sectionLabels[id] ?? french;
}
export function bodyIndicatorLabel(id: string, french: string, language: string) {
  return language.startsWith('fr') ? french : indicatorLabels[id] ?? french;
}
export function bodyFieldLabel(key: string, french: string, language: string) {
  return language.startsWith('fr') ? french : fieldLabels[key] ?? french;
}
export function bodyStatus(status: 'normal' | 'watch' | 'action', language: string) {
  if (language.startsWith('fr')) return ({ normal: 'Dans la plage nominale', watch: 'À surveiller', action: 'Alerte' } as const)[status];
  return ({ normal: 'Within nominal range', watch: 'Monitor', action: 'Alert' } as const)[status];
}
export function bodyRisk(section: string, french: string, language: string) {
  return language.startsWith('fr') ? french : sectionRisk[section] ?? french;
}
export function bodyDevice(id: string, french: string, language: string) {
  return language.startsWith('fr') ? french : devices[id] ?? french;
}
export function bodyNominal(key: string, french: string, language: string) {
  return language.startsWith('fr') ? french : nominalRanges[key] ?? french;
}
