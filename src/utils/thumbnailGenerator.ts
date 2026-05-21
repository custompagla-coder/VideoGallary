/**
 * Generates a JPEG thumbnail from a video file by:
 * 1. Loading the video into a hidden <video> element
 * 2. Seeking to 1 second (to avoid black/empty frames)
 * 3. Drawing the frame onto a <canvas>
 * 4. Exporting the canvas as a JPEG File object
 */
export async function generateThumbnail(videoFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas 2D context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoFile);

    video.onloadedmetadata = () => {
      // Seek to 1 second, or 10% of duration if the video is short
      video.currentTime = Math.min(1.0, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Failed to generate thumbnail blob'));
            return;
          }
          const thumbnailFile = new File([blob], 'thumbnail.jpg', {
            type: 'image/jpeg',
          });
          resolve(thumbnailFile);
        },
        'image/jpeg',
        0.85
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = objectUrl;
  });
}
