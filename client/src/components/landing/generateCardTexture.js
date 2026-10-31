import * as THREE from 'three';

const textureCache = new Map();

/**
 * Generates a crisp, high-resolution CanvasTexture for queue token cards.
 * Completely local, zero network requests, clinical typography and badges.
 */
export function generateCardTexture({
  code,
  badgeText,
  badgeBg,
  badgeTextColor,
  subtext,
  borderColor,
  glowColor,
  bgStart,
  bgEnd,
  isYou = false
}) {
  const cacheKey = `${code}-${badgeText}-${subtext}-${isYou}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallbackTex = new THREE.Texture();
    return fallbackTex;
  }

  // Helper for rounded rectangle
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 1. Background fill with smooth gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 300);
  grad.addColorStop(0, bgStart || '#26050f');
  grad.addColorStop(1, bgEnd || '#0f0206');

  roundRect(8, 8, 496, 284, 24);
  ctx.fillStyle = grad;
  ctx.fill();

  // 2. High-contrast border
  ctx.lineWidth = isYou ? 6 : 4;
  ctx.strokeStyle = borderColor || '#FF2D55';
  ctx.stroke();

  // 3. Top Status / Priority Badge
  roundRect(28, 28, isYou ? 200 : 220, 42, 10);
  ctx.fillStyle = badgeBg || 'rgba(255, 45, 85, 0.2)';
  ctx.fill();
  ctx.strokeStyle = borderColor || '#FF2D55';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Badge Status Dot
  ctx.beginPath();
  ctx.arc(46, 49, 6, 0, Math.PI * 2);
  ctx.fillStyle = glowColor || '#FF6B8B';
  ctx.fill();

  // Badge text
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = badgeTextColor || '#ffffff';
  ctx.fillText(badgeText, 64, 55);

  // 4. Large Token Code Display
  ctx.font = '900 78px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(code, 256, 172);

  // 5. Subtext / Waiting Estimate
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = glowColor || '#E2B4BE';
  ctx.fillText(subtext, 256, 230);

  // 6. Subtle clinic verification seal in footer
  ctx.font = '500 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(226, 180, 190, 0.6)';
  ctx.fillText('GL BAJAJ CLINIC &bull; DETERMINISTIC QUEUE', 256, 268);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

export function clearTextureCache() {
  textureCache.clear();
}
