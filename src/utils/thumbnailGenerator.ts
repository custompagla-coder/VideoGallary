/**
 * Generates a JPEG thumbnail AND extracts the duration from a video file.
 * Uses an invisible <video> + <canvas> — no FFmpeg needed.
 */
export async function generateThumbnailAndDuration(
  videoFile: File
): Promise<{ thumbnail: File; duration: number }> {
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
      video.currentTime = Math.min(1.0, video.duration * 0.1);
    };

    video.onseeked = () => {
      const duration = Math.round(video.duration);
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
          const thumbnail = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
          resolve({ thumbnail, duration });
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

/** Format seconds → "m:ss" or "h:mm:ss" */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
