
global.window = {};
// Read the file and evaluate it to avoid issues with absolute paths in require if they are not correctly formatted for node on windows
const fs = require('fs');
const code = fs.readFileSync('f:/moalab/survey/assets/js/scenario_engine.js', 'utf8');
eval(code);

const engine = global.window.ScenarioEngine;
const baseline = { RTRI: 54, SII: 38, LSI: 62, CGS: 58, PTS: 48, SUS: 44 };
const selected = ['MEDICAL_UPGRADE'];
const assumptions = { intensity: 1.0, reach: 0.5, durationWeight: 1.0 };
const result = engine.simulate({ baselineKpi: baseline, selectedPolicyIds: selected, assumptions, ri: '모항리' });

console.log('Result:', JSON.stringify(result, null, 2));
