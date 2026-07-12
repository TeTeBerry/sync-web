import {
  JOURNEY_SHARE_ASPECTS,
  JOURNEY_SHARE_SITE_HOST,
  type JourneyShareAspect,
  type JourneyShareCardData,
} from '../../lib/journey-share';
import type { JourneyShareLabels } from './JourneyShareMetadata';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines) break;
    }
  }

  if (lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  return lines;
}

export async function renderJourneySharePng(input: {
  data: JourneyShareCardData;
  labels: JourneyShareLabels;
  aspect: JourneyShareAspect;
}): Promise<Blob> {
  const { data, labels, aspect } = input;
  const spec = JOURNEY_SHARE_ASPECTS[aspect];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const w = spec.width;
  const h = spec.height;
  const isOg = aspect === 'og';
  const pad = isOg ? 56 : Math.round(w * 0.075);

  // Atmosphere base
  const base = ctx.createLinearGradient(0, 0, w * 0.2, h);
  base.addColorStop(0, '#0c0c14');
  base.addColorStop(0.5, '#12121c');
  base.addColorStop(1, '#0a0a10');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  if (data.heroImage) {
    const img = await loadImage(data.heroImage);
    if (img) {
      const scale = Math.max(w / img.width, h / img.height) * 1.04;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) * 0.28 - dh * 0.1;
      ctx.save();
      ctx.filter = 'saturate(0.92) contrast(1.05) brightness(0.72)';
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }
  } else {
    // Subtle journey path glow
    ctx.strokeStyle = 'rgba(244,241,234,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.42);
    ctx.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.82, h * 0.55);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,241,234,0.45)';
    for (const [x, y] of [
      [0.22, 0.4],
      [0.48, 0.3],
      [0.78, 0.52],
    ] as const) {
      ctx.beginPath();
      ctx.arc(w * x, h * y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Veil
  const veil = ctx.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, 'rgba(6,6,12,0.18)');
  veil.addColorStop(0.38, 'rgba(6,6,12,0.42)');
  veil.addColorStop(0.72, 'rgba(6,6,12,0.88)');
  veil.addColorStop(1, 'rgba(6,6,12,0.97)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, h);

  let y = isOg ? pad : h * 0.42;

  ctx.fillStyle = 'rgba(196, 176, 255, 0.9)';
  ctx.font = `650 ${Math.round(w * 0.022)}px system-ui, sans-serif`;
  ctx.letterSpacing = '0.18em';
  ctx.fillText(labels.eyebrow.toUpperCase(), pad, y);
  y += Math.round(h * (isOg ? 0.08 : 0.055));

  ctx.fillStyle = 'rgba(250,248,242,0.98)';
  const titleSize = isOg ? Math.round(h * 0.14) : Math.round(w * 0.092);
  ctx.font = `700 ${titleSize}px Outfit, system-ui, sans-serif`;
  ctx.letterSpacing = '-0.03em';
  const titleLines = wrapText(ctx, data.festivalName, w - pad * 2, isOg ? 1 : 3);
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += titleSize * 0.95;
  }

  y += Math.round(h * 0.02);
  ctx.fillStyle = 'rgba(244,241,234,0.72)';
  ctx.font = `400 ${Math.round(w * 0.032)}px "DM Sans", system-ui, sans-serif`;
  ctx.letterSpacing = '0.02em';
  if (data.festivalLocation) {
    ctx.fillText(data.festivalLocation, pad, y);
    y += Math.round(w * 0.042);
  }
  if (data.festivalDate) {
    ctx.fillStyle = 'rgba(244,241,234,0.55)';
    ctx.font = `400 ${Math.round(w * 0.028)}px "DM Sans", system-ui, sans-serif`;
    ctx.fillText(data.festivalDate, pad, y);
    y += Math.round(w * 0.04);
  }

  y += Math.round(h * 0.015);
  ctx.fillStyle = 'rgba(244,241,234,0.22)';
  roundRect(ctx, pad, y, Math.round(w * 0.06), 1, 0);
  ctx.fill();
  y += Math.round(h * 0.035);

  const breathLines = [
    data.origin ? `${labels.origin} ${data.origin}` : '',
    data.accommodation,
    data.budget,
  ].filter(Boolean);

  const breathSize = Math.round(w * 0.03);
  ctx.fillStyle = 'rgba(244,241,234,0.78)';
  ctx.font = `400 ${breathSize}px "DM Sans", system-ui, sans-serif`;
  if (isOg) {
    ctx.fillText(breathLines.join('  ·  '), pad, y);
    y += Math.round(h * 0.12);
  } else {
    for (const line of breathLines) {
      ctx.fillText(line, pad, y);
      y += breathSize + Math.round(h * 0.012);
    }
    y += Math.round(h * 0.01);
  }

  const labelSize = Math.round(w * 0.02);

  if (data.favoriteArtists.length) {
    ctx.fillStyle = 'rgba(244,241,234,0.4)';
    ctx.font = `600 ${labelSize}px system-ui, sans-serif`;
    ctx.fillText(labels.artists.toUpperCase(), pad, y);
    y += labelSize + 12;
    ctx.fillStyle = 'rgba(250,248,242,0.94)';
    ctx.font = `600 ${Math.round(w * 0.036)}px Outfit, system-ui, sans-serif`;
    const artistLine = data.favoriteArtists.join(' · ');
    const artistLines = wrapText(ctx, artistLine, w - pad * 2, 2);
    artistLines.forEach((line) => {
      ctx.fillText(line, pad, y);
      y += Math.round(w * 0.042);
    });
    y += Math.round(h * 0.012);
  }

  const looking = data.lookingFor
    .map((intent) => labels.lookingForLabels[intent])
    .filter(Boolean);
  if (looking.length) {
    ctx.fillStyle = 'rgba(244,241,234,0.4)';
    ctx.font = `600 ${labelSize}px system-ui, sans-serif`;
    ctx.fillText(labels.lookingFor.toUpperCase(), pad, y);
    y += labelSize + 12;
    ctx.fillStyle = 'rgba(244,241,234,0.78)';
    ctx.font = `400 ${Math.round(w * 0.03)}px "DM Sans", system-ui, sans-serif`;
    ctx.fillText(looking.join('  ·  '), pad, y);
  }

  // Footer
  const footerY = h - pad;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(pad, footerY - Math.round(h * 0.05));
  ctx.lineTo(w - pad, footerY - Math.round(h * 0.05));
  ctx.stroke();

  ctx.fillStyle = 'rgba(244,241,234,0.88)';
  ctx.font = `700 ${Math.round(w * 0.04)}px Outfit, system-ui, sans-serif`;
  ctx.fillText('Rraven', pad, footerY);
  ctx.fillStyle = 'rgba(244,241,234,0.42)';
  ctx.font = `400 ${Math.round(w * 0.022)}px system-ui, sans-serif`;
  const urlWidth = ctx.measureText(JOURNEY_SHARE_SITE_HOST).width;
  ctx.fillText(JOURNEY_SHARE_SITE_HOST, w - pad - urlWidth, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('PNG encode failed'));
      else resolve(blob);
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
