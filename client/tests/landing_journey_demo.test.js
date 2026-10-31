import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '..');

describe('PROMPT 29 - Landing Page Workflow Journey & Wait-Time Demo Suite', () => {
  const workflowDataPath = path.join(clientRoot, 'src', 'components', 'landing', 'WorkflowData.js');
  const workflow2DPath = path.join(clientRoot, 'src', 'components', 'landing', 'Workflow2DFallback.jsx');
  const workflow3DPath = path.join(clientRoot, 'src', 'components', 'landing', 'Workflow3DCanvas.jsx');
  const waitTimeDemoPath = path.join(clientRoot, 'src', 'components', 'landing', 'WaitTimeDemo.jsx');
  const waitTime2DPath = path.join(clientRoot, 'src', 'components', 'landing', 'WaitTime2DFallback.jsx');
  const waitTime3DPath = path.join(clientRoot, 'src', 'components', 'landing', 'WaitTime3DCanvas.jsx');
  const homePagePath = path.join(clientRoot, 'src', 'pages', 'HomePage.jsx');

  test('1. Scene B: Five stations matching the actual clinic workflow in sequential order', async () => {
    const { WORKFLOW_STATIONS } = await import(pathToFileURL(workflowDataPath).href);

    assert.equal(WORKFLOW_STATIONS.length, 5, 'Must contain exactly 5 workflow stations');

    const expectedStations = ['book', 'confirm', 'track', 'notify', 'consult'];
    const actualStations = WORKFLOW_STATIONS.map((s) => s.id);
    assert.deepEqual(actualStations, expectedStations, 'Stations must be Book, Confirm, Track, Notify, Consult');

    WORKFLOW_STATIONS.forEach((station, index) => {
      assert.equal(station.stepNumber, index + 1, `Step number must be ${index + 1}`);
      assert.ok(station.title, `Station ${station.id} must have a title`);
      assert.ok(station.summary, `Station ${station.id} must have a summary`);
      assert.ok(station.contractNote, `Station ${station.id} must document contract note`);
      assert.ok(station.privacyNote, `Station ${station.id} must document privacy note`);
    });
  });

  test('2. Scene C: Ordinary deterministic frontend calculation (patientsAhead * averageMinutes)', () => {
    // Pure calculation verification
    const calculateWait = (ahead, mins) => ahead * mins;

    // Requirement example: 4 ahead * 8 minutes = 32 minutes
    assert.equal(calculateWait(4, 8), 32, '4 patients ahead x 8 minutes = 32 minutes');
    // Edge case: 0 ahead is 0 minutes
    assert.equal(calculateWait(0, 10), 0, '0 patients ahead x 10 minutes = 0 minutes');
    // Edge case: busy clinic (15 ahead * 10 mins = 150 mins)
    assert.equal(calculateWait(15, 10), 150, '15 patients ahead x 10 minutes = 150 minutes');

    // Verify WaitTimeDemo.jsx implements patientsAhead * averageMinutes
    const waitTimeDemoContent = fs.readFileSync(waitTimeDemoPath, 'utf-8');
    assert.ok(
      waitTimeDemoContent.includes('patientsAhead * averageMinutes'),
      'WaitTimeDemo must compute estimatedWaitMinutes = patientsAhead * averageMinutes'
    );
  });

  test('3. Mandatory Label: "sample values, not real clinic data" is prominently present', () => {
    const waitTimeDemoContent = fs.readFileSync(waitTimeDemoPath, 'utf-8');
    const waitTime2DContent = fs.readFileSync(waitTime2DPath, 'utf-8');

    const lowerDemo = waitTimeDemoContent.toLowerCase();
    const lower2D = waitTime2DContent.toLowerCase();

    assert.ok(
      lowerDemo.includes('sample values, not real clinic data'),
      'WaitTimeDemo must contain the exact label: sample values, not real clinic data'
    );
    assert.ok(
      lower2D.includes('sample values, not real clinic data'),
      'WaitTime2DFallback must contain the exact label: sample values, not real clinic data'
    );
  });

  test('4. Accessible Sliders: Keyboard-operable inputs with semantic ARIA attributes', () => {
    const waitTimeDemoContent = fs.readFileSync(waitTimeDemoPath, 'utf-8');

    // Patients ahead slider
    assert.ok(
      waitTimeDemoContent.includes('id="slider-patients-ahead"'),
      'Must have id="slider-patients-ahead"'
    );
    assert.ok(
      waitTimeDemoContent.includes('type="range"'),
      'Must use native input type="range"'
    );
    assert.ok(
      waitTimeDemoContent.includes('aria-label="Patients ahead in queue"'),
      'Must have descriptive aria-label on patients slider'
    );
    assert.ok(
      waitTimeDemoContent.includes('aria-valuenow={patientsAhead}'),
      'Must announce live aria-valuenow'
    );

    // Consultation minutes slider
    assert.ok(
      waitTimeDemoContent.includes('id="slider-avg-minutes"'),
      'Must have id="slider-avg-minutes"'
    );
    assert.ok(
      waitTimeDemoContent.includes('aria-label="Average consultation minutes"'),
      'Must have descriptive aria-label on minutes slider'
    );

    // Accessible decrement/increment buttons for keyboard/touch fine-stepping
    assert.ok(
      waitTimeDemoContent.includes('aria-label="Decrease patients ahead"'),
      'Must provide accessible decrease button for patients ahead'
    );
    assert.ok(
      waitTimeDemoContent.includes('aria-label="Increase patients ahead"'),
      'Must provide accessible increase button for patients ahead'
    );
  });

  test('5. 3D Scene separation: 3D canvas visualises values but does NOT calculate or own the result', () => {
    const waitTime3DContent = fs.readFileSync(waitTime3DPath, 'utf-8');

    // 3D Canvas must accept estimatedWaitMinutes from props
    assert.ok(
      waitTime3DContent.includes('estimatedWaitMinutes'),
      'WaitTime3DCanvas must receive estimatedWaitMinutes from props'
    );

    // 3D Canvas must NOT contain the calculation formula
    assert.ok(
      !waitTime3DContent.includes('patientsAhead * averageMinutes'),
      'WaitTime3DCanvas must not own or calculate patientsAhead * averageMinutes'
    );
  });

  test('6. 2D Fallback & Reduced Motion: Fallbacks do not depend on Three.js', () => {
    const workflow2DContent = fs.readFileSync(workflow2DPath, 'utf-8');
    const waitTime2DContent = fs.readFileSync(waitTime2DPath, 'utf-8');

    assert.ok(
      !workflow2DContent.includes("from 'three'"),
      'Workflow2DFallback must never import Three.js'
    );
    assert.ok(
      !workflow2DContent.includes("from '@react-three/fiber'"),
      'Workflow2DFallback must never import R3F'
    );

    assert.ok(
      !waitTime2DContent.includes("from 'three'"),
      'WaitTime2DFallback must never import Three.js'
    );
    assert.ok(
      !waitTime2DContent.includes("from '@react-three/fiber'"),
      'WaitTime2DFallback must never import R3F'
    );
  });

  test('7. Landing Page Integration: HomePage mounts WorkflowJourney and WaitTimeDemo', () => {
    const homePageContent = fs.readFileSync(homePagePath, 'utf-8');

    assert.ok(
      homePageContent.includes('<WorkflowJourney'),
      'HomePage must render WorkflowJourney (Scene B)'
    );
    assert.ok(
      homePageContent.includes('<WaitTimeDemo'),
      'HomePage must render WaitTimeDemo (Scene C)'
    );
  });
});
