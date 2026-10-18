/** Draws a branded translation card on a canvas and shares (or downloads) it. */
export async function shareTranslationImage(input: {
  sourceLabel: string;
  targetLabel: string;
  sourceText: string;
  translatedText: string;
}): Promise<void> {
  const scale = 2;
  const width = 1080;
  const pad = 72;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');

  const font = (size: number, weight = 400): string =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif`;

  const wrap = (text: string, size: number, weight: number): string[] => {
    ctx.font = font(size, weight);
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > width - pad * 2 && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines.slice(0, 14);
  };

  const srcLines = wrap(input.sourceText, 40, 400);
  const outLines = wrap(input.translatedText, 54, 600);
  const height = pad * 2 + 60 + 40 + srcLines.length * 54 + 60 + 40 + outLines.length * 70 + 80;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#2a2f45');
  bg.addColorStop(0.5, '#363d5a');
  bg.addColorStop(1, '#1e2236');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  let y = pad + 30;
  ctx.fillStyle = '#00d9ff';
  ctx.font = font(30, 800);
  ctx.fillText('ZOMI TRANSLATOR', pad, y);

  y += 70;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = font(24, 700);
  ctx.fillText(input.sourceLabel.toUpperCase(), pad, y);
  y += 50;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = font(40, 400);
  for (const line of srcLines) {
    ctx.fillText(line, pad, y);
    y += 54;
  }

  y += 10;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(pad, y, width - pad * 2, 2);
  y += 56;

  ctx.fillStyle = '#00ff88';
  ctx.font = font(24, 700);
  ctx.fillText(input.targetLabel.toUpperCase(), pad, y);
  y += 64;
  ctx.fillStyle = '#ffffff';
  ctx.font = font(54, 600);
  for (const line of outLines) {
    ctx.fillText(line, pad, y);
    y += 70;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(24, 500);
  ctx.fillText('zomitranslator.com', pad, height - pad + 20);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('no image');
  const file = new File([blob], 'zomi-translation.png', { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zomi-translation.png';
  a.click();
  URL.revokeObjectURL(url);
}
