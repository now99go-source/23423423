const ALLOWED_EXTENSIONS = {
  pdf: ['.pdf'],
  word: ['.doc', '.docx'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
};

const ALL_ALLOWED = [...ALLOWED_EXTENSIONS.pdf, ...ALLOWED_EXTENSIONS.word, ...ALLOWED_EXTENSIONS.image];

export function getFileExtension(filename) {
  return '.' + filename.split('.').pop().toLowerCase();
}

export function isAllowedFile(filename) {
  const ext = getFileExtension(filename);
  return ALL_ALLOWED.includes(ext);
}

export function getFileType(filename) {
  const ext = getFileExtension(filename);
  if (ALLOWED_EXTENSIONS.pdf.includes(ext)) return 'pdf';
  if (ALLOWED_EXTENSIONS.word.includes(ext)) return 'word';
  if (ALLOWED_EXTENSIONS.image.includes(ext)) return 'image';
  return null;
}

export function getAllowedExtensionsString() {
  return ALL_ALLOWED.join(', ');
}

export async function compressImage(file) {
  const TWO_MB = 2 * 1024 * 1024;
  
  if (file.size <= TWO_MB) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.5
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}