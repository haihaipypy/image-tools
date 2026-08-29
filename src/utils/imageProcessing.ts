import * as avif from '@jsquash/avif';
import * as jpeg from '@jsquash/jpeg';
import * as jxl from '@jsquash/jxl';
import * as png from '@jsquash/png';
import * as webp from '@jsquash/webp';
import type { OutputType, CompressionOptions } from '../types';
import type { AvifEncodeOptions, JpegEncodeOptions, JxlEncodeOptions, WebpEncodeOptions } from '../types/encoders';
import { ensureWasmLoaded } from './wasm';

export async function decode(sourceType: string, fileBuffer: ArrayBuffer): Promise<ImageData> {
  // Ensure WASM is loaded for the source type
  await ensureWasmLoaded(sourceType as OutputType);

  try {
    switch (sourceType) {
      case 'avif':
        return await avif.decode(fileBuffer);
      case 'jpeg':
      case 'jpg':
        return await jpeg.decode(fileBuffer);
      case 'jxl':
        return await jxl.decode(fileBuffer);
      case 'png':
        return await png.decode(fileBuffer);
      case 'webp':
        return await webp.decode(fileBuffer);
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  } catch (error) {
    console.error(`Failed to decode ${sourceType} image:`, error);
    throw new Error(`Failed to decode ${sourceType} image`);
  }
}

export async function encode(outputType: OutputType, imageData: ImageData, options: CompressionOptions): Promise<ArrayBuffer> {
  // Ensure WASM is loaded for the output type
  await ensureWasmLoaded(outputType);

  try {
    switch (outputType) {
      case 'avif': {
        const avifOptions: AvifEncodeOptions = {
          quality: options.quality,
          effort: 4 // Medium encoding effort
        };
        return await avif.encode(imageData, avifOptions as any);
      }
      case 'jpeg': {
        const jpegOptions: JpegEncodeOptions = {
          quality: options.quality
        };
        return await jpeg.encode(imageData, jpegOptions as any);
      }
      case 'jxl': {
        const jxlOptions: JxlEncodeOptions = {
          quality: options.quality
        };
        return await jxl.encode(imageData, jxlOptions as any);
      }
      case 'png':
        return await png.encode(imageData);
      case 'webp': {
        const webpOptions: WebpEncodeOptions = {
          quality: options.quality
        };
        return await webp.encode(imageData, webpOptions as any);
      }
      default:
        throw new Error(`Unsupported output type: ${outputType}`);
    }
  } catch (error) {
    console.error(`Failed to encode to ${outputType}:`, error);
    throw new Error(`Failed to encode to ${outputType}`);
  }
}

export function getFileType(file: File): string {
  if (file.name.toLowerCase().endsWith('jxl')) return 'jxl';
  const type = file.type.split('/')[1];
  return type === 'jpeg' ? 'jpg' : type;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
