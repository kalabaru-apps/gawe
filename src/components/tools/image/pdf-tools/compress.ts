import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFArray, JpegEmbedder, decodePDFRawStream } from 'pdf-lib'

export type CompressLevel = 'low' | 'recommended' | 'extreme'

export const COMPRESS_LEVELS: Record<CompressLevel, { maxDimension: number; quality: number }> = {
  low: { maxDimension: Infinity, quality: 0.85 },
  recommended: { maxDimension: 2200, quality: 0.7 },
  extreme: { maxDimension: 1200, quality: 0.5 },
}

export interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  outputSize: number
  imagesProcessed: number
}

type ImageInfo =
  | { kind: 'jpeg' }
  | { kind: 'raw-bitmap'; width: number; height: number; channels: 1 | 3 }

// PDFName#asString() includes the leading slash (e.g. "/Image"), not just "Image".
function nameOf(obj: PDFName): string {
  return obj.asString().replace(/^\//, '')
}

function filterNamesOf(obj: PDFRawStream): string[] {
  const filter = obj.dict.lookup(PDFName.of('Filter'))
  if (filter instanceof PDFName) return [nameOf(filter)]
  if (filter instanceof PDFArray) {
    return filter.asArray().filter((f): f is PDFName => f instanceof PDFName).map(nameOf)
  }
  return []
}

/**
 * Figures out whether an indirect object is an image we know how to recompress.
 * Handles already-JPEG images (DCTDecode) and raw 8-bit Gray/RGB bitmaps
 * (FlateDecode — the common case for scanner/phone-scan output that was never
 * JPEG to begin with). CMYK, indexed palettes, CCITT fax, JBIG2, and JPEG2000
 * are left untouched — decoding those correctly needs codecs browsers don't
 * expose, and getting a colorspace conversion wrong is worse than a no-op.
 * Images with a soft mask (/SMask) are skipped too, since JPEG can't carry alpha.
 */
function classifyImageStream(obj: unknown): ImageInfo | null {
  if (!(obj instanceof PDFRawStream)) return null
  const dict = obj.dict
  const subtype = dict.lookupMaybe(PDFName.of('Subtype'), PDFName)
  if (!subtype || nameOf(subtype) !== 'Image') return null
  if (dict.has(PDFName.of('SMask'))) return null

  const filters = filterNamesOf(obj)
  if (filters.includes('DCTDecode')) return { kind: 'jpeg' }

  if (filters.length === 1 && filters[0] === 'FlateDecode') {
    const bpc = dict.lookupMaybe(PDFName.of('BitsPerComponent'), PDFNumber)?.asNumber()
    const width = dict.lookupMaybe(PDFName.of('Width'), PDFNumber)?.asNumber()
    const height = dict.lookupMaybe(PDFName.of('Height'), PDFNumber)?.asNumber()
    const colorSpaceName = dict.lookupMaybe(PDFName.of('ColorSpace'), PDFName)
    const colorSpace = colorSpaceName ? nameOf(colorSpaceName) : null
    const channels = colorSpace === 'DeviceGray' ? 1 : colorSpace === 'DeviceRGB' ? 3 : null
    if (bpc === 8 && width && height && channels) {
      return { kind: 'raw-bitmap', width, height, channels }
    }
  }
  return null
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array | null> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null
}

function scaledDimensions(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Re-encodes an already-JPEG image at a smaller size/quality via canvas. */
async function recompressJpeg(bytes: Uint8Array, maxDimension: number, quality: number): Promise<Uint8Array | null> {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/jpeg' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to decode embedded JPEG'))
      image.src = url
    })
    const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, maxDimension)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    return canvasToJpeg(canvas, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Encodes a raw Gray/RGB pixel buffer (no prior JPEG compression at all) as a downsized JPEG. */
async function recompressRawBitmap(
  pixels: Uint8Array,
  width: number,
  height: number,
  channels: 1 | 3,
  maxDimension: number,
  quality: number,
): Promise<Uint8Array | null> {
  if (pixels.length < width * height * channels) return null

  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, p = 0; i < width * height; i++, p += channels) {
    const r = pixels[p]
    const g = channels === 3 ? pixels[p + 1] : r
    const b = channels === 3 ? pixels[p + 2] : r
    const o = i * 4
    rgba[o] = r
    rgba[o + 1] = g
    rgba[o + 2] = b
    rgba[o + 3] = 255
  }

  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = width
  sourceCanvas.height = height
  sourceCanvas.getContext('2d')!.putImageData(new ImageData(rgba, width, height), 0, 0)

  const scaled = scaledDimensions(width, height, maxDimension)
  const outCanvas = document.createElement('canvas')
  outCanvas.width = scaled.width
  outCanvas.height = scaled.height
  outCanvas.getContext('2d')!.drawImage(sourceCanvas, 0, 0, scaled.width, scaled.height)
  return canvasToJpeg(outCanvas, quality)
}

/**
 * Downsamples and recompresses embedded raster images — both already-JPEG (DCTDecode)
 * and raw uncompressed Gray/RGB bitmaps (FlateDecode, the common output of scanner
 * apps that never produced a JPEG in the first place) — leaving text and vector
 * content untouched. Mirrors iLovePDF's approach rather than rasterizing whole pages.
 */
export async function compressPdf(buffer: ArrayBuffer, level: CompressLevel): Promise<CompressResult> {
  const { maxDimension, quality } = COMPRESS_LEVELS[level]
  const originalSize = buffer.byteLength
  const doc = await PDFDocument.load(buffer)
  const context = doc.context

  let imagesProcessed = 0
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    const info = classifyImageStream(obj)
    if (!info) continue
    const stream = obj as PDFRawStream
    try {
      const original = stream.getContents()
      const recompressed = info.kind === 'jpeg'
        ? await recompressJpeg(original, maxDimension, quality)
        : await recompressRawBitmap(decodePDFRawStream(stream).decode(), info.width, info.height, info.channels, maxDimension, quality)

      if (!recompressed || recompressed.length >= original.length) continue
      const embedder = await JpegEmbedder.for(recompressed)
      await embedder.embedIntoContext(context, ref)
      imagesProcessed++
    } catch {
      // One malformed/undecodable image shouldn't fail the whole job — leave it as-is.
      continue
    }
  }

  const bytes = await doc.save({ useObjectStreams: true })
  return { bytes, originalSize, outputSize: bytes.byteLength, imagesProcessed }
}
