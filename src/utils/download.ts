import type { ImageFile } from '../types';

export function downloadImage(image: ImageFile) {
  if (!image.blob || !image.outputType) return;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(image.blob);
  link.download = `${image.file.name.split('.')[0]}.${image.outputType}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadAllImages(images: ImageFile[]) {
  images
    .filter(image => image.status === 'complete' && image.blob)
    .forEach(downloadImage);
}