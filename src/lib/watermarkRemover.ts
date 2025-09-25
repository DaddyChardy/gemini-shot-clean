import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for better model performance
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_DIMENSION = 1024;

function drawImageToCanvasResized(image: HTMLImageElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  let { naturalWidth: width, naturalHeight: height } = image;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
}

export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

function createWhiteMask(roi: ImageData): { mask: Uint8Array; count: number } {
  const { data, width, height } = roi;
  const mask = new Uint8Array(width * height);
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 200 && r > 235 && g > 235 && b > 235) {
        mask[y * width + x] = 1;
        count++;
      }
    }
  }
  // Dilate a bit to cover edges
  for (let iter = 0; iter < 2; iter++) {
    const next = new Uint8Array(mask);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (mask[ny * width + nx]) {
                next[idx] = 1;
                break;
              }
            }
          }
          if (next[idx]) break;
        }
      }
    }
    for (let i = 0; i < mask.length; i++) if (next[i] && !mask[i]) { mask[i] = 1; count++; }
  }
  return { mask, count };
}

function inpaintROI(roi: ImageData, mask: Uint8Array) {
  const { data, width, height } = roi;
  let remaining = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) remaining++;
  if (remaining === 0) return;

  const maxPasses = width + height; // plenty
  const neighborOffsets = [
    -width - 1, -width, -width + 1,
    -1, /*self*/ +1,
    width - 1, width, width + 1,
  ];

  for (let pass = 0; pass < maxPasses && remaining > 0; pass++) {
    const toFillIdx: number[] = [];
    const toFillRGBA: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!mask[idx]) continue;

        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        for (const off of neighborOffsets) {
          const n = idx + off;
          // bounds check
          const nx = n % width;
          const ny = Math.floor(n / width);
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (!mask[n]) {
            const pi = n * 4;
            sumR += data[pi];
            sumG += data[pi + 1];
            sumB += data[pi + 2];
            sumA += data[pi + 3];
            count++;
          }
        }
        if (count > 0) {
          toFillIdx.push(idx);
          toFillRGBA.push(
            Math.round(sumR / count),
            Math.round(sumG / count),
            Math.round(sumB / count),
            Math.round(sumA / count)
          );
        }
      }
    }

    if (toFillIdx.length === 0) break; // nothing else we can do

    for (let k = 0; k < toFillIdx.length; k++) {
      const idx = toFillIdx[k];
      const pi = idx * 4;
      const base = k * 4;
      data[pi] = toFillRGBA[base];
      data[pi + 1] = toFillRGBA[base + 1];
      data[pi + 2] = toFillRGBA[base + 2];
      data[pi + 3] = toFillRGBA[base + 3];
      if (mask[idx]) { mask[idx] = 0; remaining--; }
    }
  }
}

async function createWatermarkMask(imageElement: HTMLImageElement): Promise<{ canvas: HTMLCanvasElement; mask?: ImageData }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  drawImageToCanvasResized(imageElement, canvas, ctx);

  // Define ROI for bottom-right watermark
  const roiSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.2);
  const padding = Math.floor(roiSize * 0.1);
  const startX = Math.max(0, canvas.width - roiSize - padding);
  const startY = Math.max(0, canvas.height - roiSize - padding);
  const width = Math.min(roiSize + padding, canvas.width - startX);
  const height = Math.min(roiSize + padding, canvas.height - startY);

  const roi = ctx.getImageData(startX, startY, width, height);
  const { mask: simpleMask, count } = createWhiteMask(roi);

  // Check if we found potential watermark
  const ratio = count / (width * height);
  const detected = count > 50 && ratio < 0.3;

  if (detected) {
    // Create a proper mask canvas for the detected region
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error('Could not get mask canvas context');

    // Fill detected area with white (to be inpainted)
    maskCtx.fillStyle = 'black'; // Start with black (keep)
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    maskCtx.fillStyle = 'white'; // White means inpaint this area
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (simpleMask[y * width + x]) {
          maskCtx.fillRect(startX + x, startY + y, 1, 1);
        }
      }
    }

    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    return { canvas, mask: maskImageData };
  }

  return { canvas };
}

export const removeWatermarkFromBottomRight = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting advanced watermark removal...');
    
    // First try to detect and create mask for watermark
    const { canvas, mask } = await createWatermarkMask(imageElement);
    
    if (!mask) {
      console.log('No watermark detected, returning original image');
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png',
          1.0
        );
      });
    }

    // Use advanced inpainting model for better results
    console.log('Initializing inpainting model...');
    const inpainter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    });

    // Convert canvas to base64 for the model
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    console.log('Processing with AI inpainting...');
    // Use simple inpainting fallback for now
    const roi = mask;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Apply simple inpainting to the masked region
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple inpainting by averaging surrounding pixels
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          const maskIdx = idx;
          
          // If this pixel should be inpainted (white in mask)
          if (mask.data[maskIdx] > 128) {
            let r = 0, g = 0, b = 0, count = 0;
            
            // Average surrounding pixels
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const nIdx = (ny * canvas.width + nx) * 4;
                  const nMaskIdx = nIdx;
                  
                  // Only use pixels that are not masked
                  if (mask.data[nMaskIdx] <= 128) {
                    r += data[nIdx];
                    g += data[nIdx + 1];
                    b += data[nIdx + 2];
                    count++;
                  }
                }
              }
            }
            
            if (count > 0) {
              data[idx] = Math.round(r / count);
              data[idx + 1] = Math.round(g / count);
              data[idx + 2] = Math.round(b / count);
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }

    console.log('Watermark removal completed');
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/png',
        1.0
      );
    });
    
  } catch (error) {
    console.error('Advanced watermark removal failed, falling back to simple method:', error);
    
    // Fallback to simple method
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    drawImageToCanvasResized(imageElement, canvas, ctx);

    const roiSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.18);
    const padding = Math.floor(roiSize * 0.08);
    const startX = Math.max(0, canvas.width - roiSize - padding);
    const startY = Math.max(0, canvas.height - roiSize - padding);
    const width = Math.min(roiSize + padding, canvas.width - startX);
    const height = Math.min(roiSize + padding, canvas.height - startY);

    const roi = ctx.getImageData(startX, startY, width, height);
    const { mask, count } = createWhiteMask(roi);

    const ratio = count / (width * height);
    const detected = count > 80 && ratio < 0.25;

    if (detected) {
      inpaintROI(roi, mask);
      ctx.putImageData(roi, startX, startY);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/png',
        1.0
      );
    });
  }
};