/**
 * Compresses an image file using canvas before upload.
 * @param {File} file - Original image file
 * @param {object} options
 * @param {number} options.maxWidth - Max width in px (default: 400)
 * @param {number} options.maxHeight - Max height in px (default: 400)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.72)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, { maxWidth = 400, maxHeight = 400, quality = 0.72 } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down proportionally
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.src = url;
  });
}