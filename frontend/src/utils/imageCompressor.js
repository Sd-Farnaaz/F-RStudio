/**
 * Utility to compress and resize image files client-side before upload or base64 storage.
 * Keeps aspect ratio, limits max dimensions (default 1200x1200), and outputs clean JPEG.
 *
 * @param {File|Blob} file The input image file
 * @param {Object} options Configuration options
 * @param {number} [options.maxWidth=1200] Maximum width
 * @param {number} [options.maxHeight=1200] Maximum height
 * @param {number} [options.quality=0.82] JPEG compression quality (0 to 1)
 * @returns {Promise<{ dataUrl: string, file: File, originalSize: number, compressedSize: number }>}
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82
  } = options;

  if (!file || !(file instanceof Blob)) {
    throw new Error('Invalid file provided for compression.');
  }

  // If SVG or GIF, preserve vector or animation format
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        dataUrl: reader.result,
        file,
        originalSize: file.size,
        compressedSize: file.size
      });
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            dataUrl: e.target.result,
            file,
            originalSize: file.size,
            compressedSize: file.size
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const outputMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, quality);

        canvas.toBlob(
          (blob) => {
            const compressedFile = blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: outputMime, lastModified: Date.now() })
              : file;

            resolve({
              dataUrl,
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob ? blob.size : file.size
            });
          },
          outputMime,
          quality
        );
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
