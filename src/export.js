import { mermaidOutput, plantUmlOutput } from './diagramText.js';
import { THEMES, activeSheet, contentBounds } from './model.js';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slug(value) {
  return String(value || 'arcprint').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arcprint';
}

export function sheetFilename(doc, sheet, ext) {
  return `${slug(doc.name)}-${slug(sheet.code)}-${slug(sheet.title)}.${ext}`;
}

export function serializeVisibleSheet(svg, doc) {
  const sheet = activeSheet(doc);
  const layer = svg.querySelector('[data-layer="shapes"]');
  if (!layer) return '';
  const theme = THEMES[doc.theme] || THEMES.blue;
  const bounds = contentBounds(sheet.nodes);
  const pad = 64;
  const foot = 96;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = Math.max(720, bounds.w + pad * 2);
  const h = bounds.h + pad * 2 + foot;
  const index = doc.sheets.findIndex((item) => item.id === sheet.id);
  const titleY = y + h - 62;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${theme.paper}"/>
  <g color="${theme.ink}" fill="none" stroke="${theme.ink}">
    ${layer.innerHTML}
  </g>
  <g color="${theme.ink}" font-family="Barlow Condensed, Arial Narrow, sans-serif">
    <rect x="${x + 24}" y="${titleY}" width="${w - 48}" height="52" fill="${theme.panel}" stroke="${theme.ink}"/>
    <text x="${x + 36}" y="${titleY + 22}" fill="${theme.ink}" font-size="14" letter-spacing="1.5">${escapeXml(doc.name)}</text>
    <text x="${x + 36}" y="${titleY + 42}" fill="${theme.ink}" font-size="18" font-weight="600" letter-spacing="1.6">${escapeXml(sheet.title)}</text>
    <text x="${x + w - 40}" y="${titleY + 32}" fill="${theme.ink}" font-size="13" text-anchor="end" font-family="IBM Plex Mono, monospace">${escapeXml(sheet.code)} · ${index + 1} OF ${doc.sheets.length}</text>
  </g>
</svg>`;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

export function downloadSvg(svg, doc) {
  const sheet = activeSheet(doc);
  const markup = serializeVisibleSheet(svg, doc);
  downloadBlob(new Blob([markup], { type: 'image/svg+xml' }), sheetFilename(doc, sheet, 'svg'));
}

export function downloadPng(svg, doc) {
  const sheet = activeSheet(doc);
  const markup = serializeVisibleSheet(svg, doc);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, sheetFilename(doc, sheet, 'png'));
      URL.revokeObjectURL(url);
    });
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

export function downloadJson(doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${slug(doc.name)}.arcprint.json`);
}

export function downloadMermaid(doc) {
  const sheet = activeSheet(doc);
  downloadBlob(new Blob([mermaidOutput(doc)], { type: 'text/plain;charset=utf-8' }), sheetFilename(doc, sheet, 'mmd'));
}

export function downloadPlantUml(doc) {
  const sheet = activeSheet(doc);
  downloadBlob(new Blob([plantUmlOutput(doc)], { type: 'text/plain;charset=utf-8' }), sheetFilename(doc, sheet, 'puml'));
}

export function printPdf(svg, doc) {
  const markup = serializeVisibleSheet(svg, doc);
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return false;
  popup.document.write(`<!doctype html><html><head><title>${escapeXml(doc.name)}</title>
    <style>
      @page { size: A3 landscape; margin: 12mm; }
      html, body { margin: 0; background: white; }
      svg { width: 100%; height: auto; }
    </style></head><body>${markup}
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
  popup.document.close();
  return true;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeShare(doc) {
  const json = JSON.stringify(doc);
  const source = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') {
    const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('deflate'));
    const packed = new Uint8Array(await new Response(stream).arrayBuffer());
    return `z.${bytesToBase64(packed)}`;
  }
  return `r.${bytesToBase64(source)}`;
}

export async function decodeShare(token) {
  const [kind, payload] = String(token).split('.');
  const bytes = base64ToBytes(payload);
  let json;
  if (kind === 'z' && typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    json = await new Response(stream).text();
  } else {
    json = new TextDecoder().decode(bytes);
  }
  return JSON.parse(json);
}
