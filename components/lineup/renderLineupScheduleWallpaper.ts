import type { NormalizedScheduleItem } from '../../lib/lineup-schedule-export';

const WIDTH = 1080;
const HEIGHT = 1920;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, limit = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words.shift()!;
  for (const word of words) {
    const next = `${line} ${word}`;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
      if (lines.length >= limit) break;
    }
  }
  if (lines.length < limit) lines.push(line);
  return lines.slice(0, limit);
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) * 0.22, w, h);
}

export async function renderLineupScheduleWallpaper(input: {
  festivalName: string;
  festivalDay: string;
  items: NormalizedScheduleItem[];
  untimed: NormalizedScheduleItem[];
  image?: string;
}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const base = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  base.addColorStop(0, '#171023');
  base.addColorStop(0.52, '#0a0d16');
  base.addColorStop(1, '#040507');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (input.image) {
    const image = await loadImage(input.image);
    if (image) {
      ctx.save();
      ctx.filter = 'saturate(0.8) contrast(1.04) brightness(0.58)';
      drawCover(ctx, image);
      ctx.restore();
    }
  }

  const veil = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  veil.addColorStop(0, 'rgba(4,4,9,0.34)');
  veil.addColorStop(0.28, 'rgba(4,4,9,0.55)');
  veil.addColorStop(0.62, 'rgba(4,4,9,0.84)');
  veil.addColorStop(1, 'rgba(4,4,9,0.97)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Leave the upper quarter breathable for a real lock-screen clock.
  const pad = 78;
  let y = 510;
  ctx.fillStyle = 'rgba(228, 210, 255, 0.88)';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('RAVEN  ·  MY FESTIVAL SCHEDULE', pad, y);
  y += 58;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.font = '700 58px system-ui, sans-serif';
  for (const line of wrap(ctx, input.festivalName, WIDTH - pad * 2, 2)) {
    ctx.fillText(line, pad, y);
    y += 62;
  }
  y += 12;
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.font = '400 28px system-ui, sans-serif';
  ctx.fillText(input.festivalDay, pad, y);
  y += 65;

  const usable = input.items.slice(0, input.untimed.length ? 8 : 10);
  for (const item of usable) {
    ctx.fillStyle = item.conflictGroupId ? 'rgba(251,191,36,0.95)' : 'rgba(196,176,255,0.86)';
    ctx.fillRect(pad, y - 18, 4, 66);
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.font = '600 25px system-ui, sans-serif';
    ctx.fillText(item.startTime ?? '', pad + 24, y);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = '700 36px system-ui, sans-serif';
    const artist = wrap(ctx, item.artistName, WIDTH - pad * 2 - 132, 1)[0] ?? item.artistName;
    ctx.fillText(artist, pad + 150, y);
    y += 36;
    ctx.fillStyle = item.conflictGroupId ? 'rgba(251,191,36,0.68)' : 'rgba(255,255,255,0.42)';
    ctx.font = '400 22px system-ui, sans-serif';
    ctx.fillText(
      `${item.stageName || 'Stage TBA'}${item.conflictGroupId ? '  ·  CLASH' : ''}`,
      pad + 150,
      y,
    );
    y += 60;
  }

  if (input.untimed.length && y < HEIGHT - 180) {
    y += 14;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('WAITING ON SET TIME', pad, y);
    y += 38;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '500 25px system-ui, sans-serif';
    ctx.fillText(input.untimed.slice(0, 3).map((item) => item.artistName).join('  ·  '), pad, y);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('RAVEN', pad, HEIGHT - 76);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png');
  });
}
