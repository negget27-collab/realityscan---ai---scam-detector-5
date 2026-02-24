/**
 * Extração de metadados de imagens — Camada 2 da análise forense
 * EXIF, data criação, software usado, compressão
 */

export interface ImageMetadata {
  make?: string;
  model?: string;
  software?: string;
  createDate?: string;
  modifyDate?: string;
  width?: number;
  height?: number;
  orientation?: number;
  hasThumbnail?: boolean;
  colorSpace?: string;
  compression?: string;
  raw?: Record<string, unknown>;
}

/** Extrai metadados EXIF de arquivo de imagem (se disponível) */
export async function extractImageMetadata(file: File): Promise<ImageMetadata | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const exifr = await import('exifr');
    const parsed = await exifr.parse(file, { pick: ['Make', 'Model', 'Software', 'CreateDate', 'ModifyDate', 'ImageWidth', 'ImageHeight', 'Orientation', 'ColorSpace', 'Compression'] });
    if (!parsed || typeof parsed !== 'object') return null;
    const m: ImageMetadata = {};
    if (parsed.Make) m.make = String(parsed.Make);
    if (parsed.Model) m.model = String(parsed.Model);
    if (parsed.Software) m.software = String(parsed.Software);
    if (parsed.CreateDate) m.createDate = parsed.CreateDate instanceof Date ? parsed.CreateDate.toISOString() : String(parsed.CreateDate);
    if (parsed.ModifyDate) m.modifyDate = parsed.ModifyDate instanceof Date ? parsed.ModifyDate.toISOString() : String(parsed.ModifyDate);
    if (typeof parsed.ImageWidth === 'number') m.width = parsed.ImageWidth;
    if (typeof parsed.ImageHeight === 'number') m.height = parsed.ImageHeight;
    if (typeof parsed.Orientation === 'number') m.orientation = parsed.Orientation;
    if (typeof parsed.ColorSpace === 'string') m.colorSpace = parsed.ColorSpace;
    if (typeof parsed.Compression === 'string') m.compression = parsed.Compression;
    if (Object.keys(m).length === 0) return null;
    m.raw = parsed as Record<string, unknown>;
    return m;
  } catch {
    return null;
  }
}

/** Formata metadados para inclusão no prompt da IA */
export function formatMetadataForPrompt(meta: ImageMetadata | null): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  const lines: string[] = ['--- Metadados EXIF (se disponíveis) ---'];
  if (meta.make) lines.push(`Fabricante: ${meta.make}`);
  if (meta.model) lines.push(`Modelo câmera: ${meta.model}`);
  if (meta.software) lines.push(`Software: ${meta.software}`);
  if (meta.createDate) lines.push(`Data criação: ${meta.createDate}`);
  if (meta.modifyDate) lines.push(`Data modificação: ${meta.modifyDate}`);
  if (meta.width && meta.height) lines.push(`Dimensões: ${meta.width}x${meta.height}`);
  if (meta.orientation) lines.push(`Orientação: ${meta.orientation}`);
  if (meta.colorSpace) lines.push(`Espaço de cor: ${meta.colorSpace}`);
  return lines.join('\n');
}
