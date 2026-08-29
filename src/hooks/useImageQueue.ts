import { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageFile, OutputType, CompressionOptions } from '../types';
import { decode, encode, getFileType } from '../utils/imageProcessing';

export function useImageQueue(
  options: CompressionOptions,
  outputType: OutputType,
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>
) {
  const MAX_PARALLEL_PROCESSING = 3;
  const [queue, setQueue] = useState<string[]>([]);
  const processingCount = useRef(0);
  const processingImages = useRef(new Set<string>());

  const processImage = useCallback(async (image: ImageFile) => {
    if (processingImages.current.has(image.id)) {
      return; // Skip if already processing this image
    }
    processingImages.current.add(image.id);
    processingCount.current++;

    try {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, status: 'processing' as const }
            : img
        )
      );

      const fileBuffer = await image.file.arrayBuffer();
      const sourceType = getFileType(image.file);

      if (!fileBuffer.byteLength) {
        throw new Error('Empty file');
      }

      // Decode the image
      const imageData = await decode(sourceType, fileBuffer);

      if (!imageData || !imageData.width || !imageData.height) {
        throw new Error('Invalid image data');
      }

      // Encode to the target format
      const compressedBuffer = await encode(outputType, imageData, options);

      if (!compressedBuffer.byteLength) {
        throw new Error('Failed to compress image');
      }

      const blob = new Blob([compressedBuffer], { type: `image/${outputType}` });
      const preview = URL.createObjectURL(blob);

      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: 'complete' as const,
                preview,
                blob,
                compressedSize: compressedBuffer.byteLength,
                outputType,
              }
            : img
        )
      );
    } catch (error) {
      console.error('Error processing image:', error);
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: 'error' as const,
                error: error instanceof Error
                  ? error.message
                  : 'Failed to process image',
              }
            : img
        )
      );
    } finally {
      processingImages.current.delete(image.id);
      processingCount.current--;
      // Try to process next images if any
      setTimeout(processNextInQueue, 0);
    }
  }, [options, outputType, setImages]);

  const processNextInQueue = useCallback(() => {
    if (queue.length === 0) return;

    // Get all images we can process in this batch
    setImages(prev => {
      const imagesToProcess = prev.filter(img =>
        queue.includes(img.id) &&
        !processingImages.current.has(img.id) &&
        processingCount.current < MAX_PARALLEL_PROCESSING
      );

      if (imagesToProcess.length === 0) return prev;

      // Start processing these images
      imagesToProcess.forEach((image, index) => {
        setTimeout(() => {
          processImage(image);
        }, index * 100);
      });

      // Remove these from queue
      setQueue(current => current.filter(id =>
        !imagesToProcess.some(img => img.id === id)
      ));

      // Update status to queued
      return prev.map(img =>
        imagesToProcess.some(processImg => processImg.id === img.id)
          ? { ...img, status: 'queued' as const }
          : img
      );
    });
  }, [queue, processImage, setImages]);

  // Start processing when queue changes
  useEffect(() => {
    if (queue.length > 0) {
      processNextInQueue();
    }
  }, [queue, processNextInQueue]);

  const addToQueue = useCallback((imageId: string) => {
    setQueue(prev => [...prev, imageId]);
  }, []);

  return { addToQueue };
}
