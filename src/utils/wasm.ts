import type { OutputType } from '../types';

// Track WASM module initialization
const wasmInitialized = new Map<OutputType, boolean>();

export async function ensureWasmLoaded(format: OutputType): Promise<void> {
  if (wasmInitialized.get(format)) return;
  
  try {
    switch (format) {
      case 'avif':
        await import('@jsquash/avif');
        break;
      case 'jpeg':
        await import('@jsquash/jpeg');
        break;
      case 'jxl':
        await import('@jsquash/jxl');
        break;
      case 'png':
        await import('@jsquash/png');
        break;
      case 'webp':
        await import('@jsquash/webp');
        break;
    }
    wasmInitialized.set(format, true);
  } catch (error) {
    console.error(`Failed to initialize WASM for ${format}:`, error);
    throw new Error(`Failed to initialize ${format} support`);
  }
}