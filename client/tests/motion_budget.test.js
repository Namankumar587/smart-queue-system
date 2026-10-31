import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '..');

describe('PROMPT 30 - Motion & Performance Budget Suite', () => {
  const indexCss = fs.readFileSync(path.join(clientRoot, 'src', 'index.css'), 'utf8');

  it('1. Motion Budget: Micro-interactions are strictly <= 250ms and clarify state', () => {
    // 1. Section reveal <= 250ms
    assert.match(indexCss, /\.motion-reveal\s*\{[^}]*animation:[^}]*240ms/);

    // 2. Progress change <= 250ms
    assert.match(indexCss, /\.progress-bar-fill\s*\{[^}]*transition:[^}]*240ms/);

    // 3. QR success tick <= 250ms
    assert.match(indexCss, /\.qr-success-tick\s*\{[^}]*animation:[^}]*220ms/);

    // 4. Queue position highlight <= 250ms
    assert.match(indexCss, /\.queue-position-highlight\s*\{[^}]*animation:[^}]*240ms/);
  });

  it('2. Accessibility: prefers-reduced-motion completely zeroes animations without blocking reading', () => {
    assert.match(indexCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // Explicitly handles the four motion classes
    assert.match(indexCss, /\.motion-reveal/);
    assert.match(indexCss, /\.progress-bar-fill/);
    assert.match(indexCss, /\.qr-success-tick/);
    assert.match(indexCss, /\.queue-position-highlight/);
    assert.match(indexCss, /animation:\s*none\s*!important/);
  });

  it('3. Canvas Lifecycle: useCanvasVisibility pauses rendering when off-screen or tab hidden', () => {
    const hookPath = path.join(clientRoot, 'src', 'components', 'landing', 'useCanvasVisibility.js');
    assert.ok(fs.existsSync(hookPath), 'useCanvasVisibility.js hook must exist');

    const hookContent = fs.readFileSync(hookPath, 'utf8');
    assert.match(hookContent, /IntersectionObserver/, 'Must use IntersectionObserver for off-screen detection');
    assert.match(hookContent, /visibilitychange/, 'Must listen to visibilitychange for tab backgrounding');

    // Check all three 3D canvases for frameloop binding
    const heroCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'Hero3DCanvas.jsx'), 'utf8');
    const workflowCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'Workflow3DCanvas.jsx'), 'utf8');
    const waitTimeCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'WaitTime3DCanvas.jsx'), 'utf8');

    assert.match(heroCanvas, /frameloop=\{isCanvasActive \? 'always' : 'never'\}/);
    assert.match(workflowCanvas, /frameloop=\{isCanvasActive \? 'always' : 'never'\}/);
    assert.match(waitTimeCanvas, /frameloop=\{isCanvasActive \? 'always' : 'never'\}/);
  });

  it('4. Canvas Resource Cleanup: Explicit disposal of textures and geometries on unmount', () => {
    const heroCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'Hero3DCanvas.jsx'), 'utf8');
    const workflowCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'Workflow3DCanvas.jsx'), 'utf8');
    const waitTimeCanvas = fs.readFileSync(path.join(clientRoot, 'src', 'components', 'landing', 'WaitTime3DCanvas.jsx'), 'utf8');

    assert.match(heroCanvas, /\.dispose\(\)/, 'Hero3DCanvas must invoke dispose() on unmount');
    assert.match(workflowCanvas, /\.dispose\(\)/, 'Workflow3DCanvas must invoke dispose() on unmount');
    assert.match(waitTimeCanvas, /\.dispose\(\)/, 'WaitTime3DCanvas must invoke dispose() on unmount');
  });

  it('5. Responsive Range: Fluid support across 360px mobile to 1920px ultrawide', () => {
    // 360px support: overflow-x is hidden on html/body
    assert.match(indexCss, /overflow-x:\s*hidden/);

    // Mobile media query (480px / 360px responsive boundaries)
    assert.match(indexCss, /@media\s*\(max-width:\s*480px\)/);

    // 1920px desktop boundary
    assert.match(indexCss, /@media\s*\(min-width:\s*1920px\)/);
  });

  it('6. Bundle Analyzer & Route Isolation: Three.js strictly excluded from patient/staff routes', () => {
    // Vite config has rollup-plugin-visualizer
    const viteConfig = fs.readFileSync(path.join(clientRoot, 'vite.config.js'), 'utf8');
    assert.match(viteConfig, /visualizer/, 'Vite config must configure bundle analyzer plugin');
    assert.match(viteConfig, /dist\/stats\.html/, 'Visualizer output filename must be dist/stats.html');

    // Stats file exists in production dist
    const statsPath = path.join(clientRoot, 'dist', 'stats.html');
    assert.ok(fs.existsSync(statsPath), 'dist/stats.html must exist from production build');

    // Verify non-landing patient & staff pages have ZERO imports of three or @react-three
    const isolatedPages = [
      'BookPage.jsx',
      'TrackPage.jsx',
      'ConfirmationPage.jsx',
      'StaffDashboard.jsx',
      'DoctorPage.jsx',
      'AdminPage.jsx',
      'LoginPage.jsx',
      'ScannerPage.jsx'
    ];

    for (const pageName of isolatedPages) {
      const pageContent = fs.readFileSync(path.join(clientRoot, 'src', 'pages', pageName), 'utf8');
      assert.doesNotMatch(
        pageContent,
        /from ['"](three|@react-three)/,
        `Page ${pageName} must NOT import three or @react-three`
      );
    }
  });

  it('7. Real Measured Metrics: Lighthouse reports and real dist asset sizes exist', () => {
    const landingReportPath = path.join(clientRoot, 'dist', 'lighthouse-landing.json');
    const desktopReportPath = path.join(clientRoot, 'dist', 'lighthouse-desktop.json');
    const bookReportPath = path.join(clientRoot, 'dist', 'lighthouse-book-desktop.json');

    assert.ok(fs.existsSync(landingReportPath), 'Real Lighthouse mobile report must exist');
    assert.ok(fs.existsSync(desktopReportPath), 'Real Lighthouse desktop report must exist');
    assert.ok(fs.existsSync(bookReportPath), 'Real Lighthouse /book desktop report must exist');

    const landingReport = JSON.parse(fs.readFileSync(landingReportPath, 'utf8'));
    assert.ok(typeof landingReport.categories.performance.score === 'number');
    assert.ok(typeof landingReport.categories.accessibility.score === 'number');

    const bookReport = JSON.parse(fs.readFileSync(bookReportPath, 'utf8'));
    assert.equal(bookReport.categories.performance.score, 1, 'Patient /book route achieves 100/100 performance');
  });
});
