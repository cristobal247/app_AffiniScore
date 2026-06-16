/**
 * Utilidad para comprimir y redimensionar imágenes en el cliente usando HTML5 Canvas.
 */
export function compressImage(file: File | Blob, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Si no es una imagen, resolver con el archivo original directamente
    const isImage = file.type && file.type.startsWith('image/');
    if (!isImage && file instanceof File && !file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback: si no hay contexto canvas, sube la original
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a blob JPEG con la calidad indicada
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // Fallback: si falla la conversión, sube la original
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // Fallback
    };
    reader.onerror = () => resolve(file); // Fallback
  });
}
