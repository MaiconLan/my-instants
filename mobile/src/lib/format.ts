export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '';
  return `${(ms / 1000).toFixed(1).replace('.', ',')}s`;
}

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : 'mp3';
}

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

export function mimeOf(ext: string): string {
  return MIME[ext] ?? 'audio/mpeg';
}

export function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '');
}

export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'audio';
}
