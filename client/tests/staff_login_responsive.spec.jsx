import React from 'react';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StaffLoginPage - Responsive & Accessibility Rules Verification', () => {
  const cssPath = path.resolve(__dirname, '../src/pages/StaffLoginPage.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('1. Design Tokens: Uses Cosmic Crimson (#FF2D55), Frosted Obsidian surface, and Rose-Ruby borders', () => {
    expect(cssContent).toContain('#FF2D55');
    expect(cssContent).toContain('rgba(32, 6, 16');
    expect(cssContent).toContain('rgba(255, 60, 95');
  });

  it('2. Card Geometry: Max width 900px, border-radius 24px, soft shadow', () => {
    expect(cssContent).toContain('max-width: 900px;');
    expect(cssContent).toContain('border-radius: 24px;');
    expect(cssContent).toContain('box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9)');
  });

  it('3. Slide Animation: 600-700ms with cubic-bezier(0.65, 0, 0.35, 1) using transform: translateX', () => {
    expect(cssContent).toContain('cubic-bezier(0.65, 0, 0.35, 1)');
    expect(cssContent).toContain('transform: translateX');
    expect(cssContent).toContain('transition: transform 650ms');
  });

  it('4. Accessibility & Reduced Motion: Dampens transitions on prefers-reduced-motion', () => {
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('transition: none !important;');
  });

  it('5. Mobile 360px Viewport: Stacks vertically below 768px with top image banner', () => {
    expect(cssContent).toContain('@media (max-width: 767px)');
    expect(cssContent).toContain('flex-direction: column;');
    expect(cssContent).toContain('transform: none !important;');
  });

  it('6. Tap Targets & Focus Rings: 44px tap targets and focus-visible outlines', () => {
    expect(cssContent.includes('44px') || cssContent.includes('48px')).toBe(true);
    expect(cssContent).toContain(':focus-visible');
    expect(cssContent).toContain('outline: 2px solid');
  });
});
