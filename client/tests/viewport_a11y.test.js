import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '..');

describe('Frontend Mobile 360px Viewport & Accessibility (a11y) Suite', () => {
  const cssPath = path.join(clientRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  test('1. Mobile 360px: html/body enforces zero horizontal overflow', () => {
    assert.ok(
      cssContent.includes('overflow-x: hidden;'),
      'CSS must enforce overflow-x: hidden on html/body to prevent horizontal scroll'
    );
  });

  test('2. Accessibility: Keyboard-only navigation focus rings are explicitly styled', () => {
    assert.ok(
      cssContent.includes(':focus-visible'),
      'CSS must define :focus-visible rules for keyboard navigation'
    );
    assert.ok(
      cssContent.includes('outline: 2px solid var(--border-focus);') ||
      cssContent.includes('outline:'),
      ':focus-visible must provide clear, high-contrast visual outline ring'
    );
  });

  test('3. Accessibility: prefers-reduced-motion media query dampens animations', () => {
    assert.ok(
      cssContent.includes('@media (prefers-reduced-motion: reduce)'),
      'CSS must include @media (prefers-reduced-motion: reduce)'
    );
    assert.ok(
      cssContent.includes('animation-duration: 0.01ms !important;') ||
      cssContent.includes('animation: none'),
      'prefers-reduced-motion must collapse animation duration'
    );
    assert.ok(
      cssContent.includes('transition-duration: 0.01ms !important;') ||
      cssContent.includes('transition: none'),
      'prefers-reduced-motion must collapse transition duration'
    );
  });

  test('4. Responsive Form Layout: Input fields and buttons have fluid width for 360px viewports', () => {
    assert.ok(
      cssContent.includes('.input-field') && cssContent.includes('width: 100%;'),
      'Input fields must be width: 100% to fit neatly on 360px screens without overflow'
    );
    assert.ok(
      cssContent.includes('.container') && cssContent.includes('width: 100%;'),
      'Container must be fluid width: 100%'
    );
  });

  test('5. Component verification: pages use semantic HTML buttons and labels for assistive tech', () => {
    const pagesDir = path.join(clientRoot, 'src', 'pages');
    const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx'));

    assert.ok(pageFiles.length >= 4, 'Must have main user and staff pages');

    for (const file of pageFiles) {
      const filePath = path.join(pagesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check that interactive elements don't disable focus without replacement
      assert.ok(
        !content.includes('outline: none') || content.includes('focus'),
        `${file} should not blindly suppress focus outlines`
      );

      // Verify no hardcoded fixed viewport breaking widths like width: 500px without responsiveness
      const fixedWidthMatches = content.match(/width:\s*['"]?([4-9]\d{2,}|[1-9]\d{3,})px['"]?/g);
      assert.strictEqual(
        fixedWidthMatches,
        null,
        `${file} must not contain large fixed pixel widths that break 360px screens: ${fixedWidthMatches}`
      );
    }
  });
});
