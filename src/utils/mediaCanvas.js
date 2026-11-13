/**
 * Client-side Canvas Media Renderer
 * Generates real downloadable 1080x1920 Reel covers, 1080x1080 Feed Posts,
 * and playable 9:16 WebM storyboard videos without requiring external paid APIs.
 */

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawStyledFrame(ctx, width, height, { hue = 280, handle = '@instaflow', badge = 'INSTAFLOW', headline = '', subtext = '' }) {
  const grad = ctx.createLinearGradient(0, 0, width * 0.85, height);
  grad.addColorStop(0, `hsl(${hue}, 78%, 52%)`);
  grad.addColorStop(0.55, `hsl(${(hue + 35) % 360}, 78%, 40%)`);
  grad.addColorStop(1, `hsl(${(hue + 65) % 360}, 82%, 22%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative glow circles
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.18, width * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.14, height * 0.86, width * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const padX = Math.round(width * 0.09);
  const padY = Math.round(height * 0.08);

  // Top badge & handle
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  const pillW = Math.min(width - padX * 2, 340);
  ctx.beginPath();
  ctx.roundRect(padX, padY, pillW, 54, 27);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(handle || '@instaflow', padX + 24, padY + 37);

  // Main Headline (centered vertically)
  const headlineFontSize = width >= height ? 70 : 78;
  ctx.font = `800 ${headlineFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 18;
  const lines = wrapCanvasText(ctx, headline || 'InstaFlow Creative', width - padX * 2).slice(0, 6);
  const lineHeight = headlineFontSize * 1.18;
  const startY = Math.round(height * 0.44 - (lines.length * lineHeight) / 2);

  lines.forEach((l, idx) => {
    ctx.fillText(l, padX, startY + idx * lineHeight);
  });
  ctx.shadowBlur = 0;

  // Subtext if any
  if (subtext) {
    ctx.font = '600 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const subLines = wrapCanvasText(ctx, subtext, width - padX * 2).slice(0, 3);
    const subStart = startY + lines.length * lineHeight + 38;
    subLines.forEach((l, idx) => {
      ctx.fillText(l, padX, subStart + idx * 46);
    });
  }

  // Footer label
  ctx.font = 'bold 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(badge.toUpperCase(), padX, height - padY);
}

/**
 * Renders a PNG graphic (1080x1920 for thumbnail/reel cover, 1080x1080 for post).
 * Returns a PNG data URL.
 */
export function renderGraphicPng({
  type = 'thumbnail',
  hue = 280,
  handle = '@instaflow',
  title = '',
  subtitle = '',
}) {
  const width = 1080;
  const height = type === 'post' ? 1080 : 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  drawStyledFrame(ctx, width, height, {
    hue,
    handle,
    badge: type === 'post' ? 'Instagram Feed Post · InstaFlow' : 'Instagram Reel Cover · InstaFlow',
    headline: title,
    subtext: subtitle,
  });

  return canvas.toDataURL('image/png');
}

export function triggerDataUrlDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an actual playable 9:16 WebM storyboard video in-browser from AI Reel scenes.
 */
export async function renderStoryboardWebm({
  scenes = [],
  hue = 280,
  handle = '@instaflow',
  title = 'AI Generated Reel',
  secondsPerScene = 2.2,
}) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API is not supported in this browser.');
  }

  const width = 540;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const safeScenes = scenes.length > 0 ? scenes : [{ num: 1, hook: 'Scene 1', text: title }];
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve({
        blob,
        objectUrl: URL.createObjectURL(blob),
      });
    };
  });

  recorder.start();

  const totalSceneMs = secondsPerScene * 1000;
  for (let i = 0; i < safeScenes.length; i++) {
    const sc = safeScenes[i];
    const sceneHue = (hue + i * 35) % 360;
    const steps = 12;
    for (let f = 0; f < steps; f++) {
      ctx.clearRect(0, 0, width, height);
      drawStyledFrame(ctx, width, height, {
        hue: sceneHue,
        handle,
        badge: sc.hook || `Scene ${i + 1}`,
        headline: sc.text || title,
        subtext: `${title} · ${i + 1}/${safeScenes.length}`,
      });
      await new Promise((r) => setTimeout(r, totalSceneMs / steps));
    }
  }

  recorder.stop();
  return recordingDone;
}

