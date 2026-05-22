/**
 * Generates a JPEG thumbnail AND extracts the duration from a video file.
 * Uses an invisible <video> + <canvas> — no FFmpeg needed.
 */
export async function generateThumbnailAndDuration(
  videoFile: File
): Promise<{ thumbnail: File; duration: number }> {
  
  // Helper to dynamically build a beautiful sleek placeholder thumbnail with gradient and title
  const createFallbackThumbnail = (): File => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Violet to Pink gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8b5cf6'); // violet-500
        gradient.addColorStop(1, '#ec4899'); // pink-500
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Styling the text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DarkWebXYoruWeb', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const cleanName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        // Truncate name if long
        const displayName = cleanName.length > 30 ? cleanName.substring(0, 27) + '...' : cleanName;
        ctx.fillText(displayName, canvas.width / 2, canvas.height / 2 + 30);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      return new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
    } catch (e) {
      console.error('[Thumbnail Generator] Fallback builder error:', e);
      return new File([], 'thumbnail.jpg', { type: 'image/jpeg' });
    }
  };

  const thumbnailPromise = new Promise<{ thumbnail: File; duration: number }>((resolve, reject) => {
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

    const cleanup = () => {
      try {
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (err) {
        console.error('[Thumbnail Generator] Video element cleanup error:', err);
      }
    };

    video.onloadedmetadata = () => {
      // Seek to 10% of the video to grab a good frame
      video.currentTime = Math.min(1.0, video.duration * 0.1);
    };

    video.onseeked = () => {
      const duration = Math.round(video.duration);
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          cleanup();
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
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = objectUrl;
  });

  // Enforce a strict 6-second timeout fallback
  return new Promise<{ thumbnail: File; duration: number }>((resolve) => {
    const timer = setTimeout(() => {
      console.warn('[Thumbnail Generator] Generation timed out (6s). Releasing resources & using dynamic gradient fallback.');
      resolve({ thumbnail: createFallbackThumbnail(), duration: 0 });
    }, 6000);

    thumbnailPromise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error('[Thumbnail Generator] Failed generating thumbnail, returning fallback:', err);
        resolve({ thumbnail: createFallbackThumbnail(), duration: 0 });
      });
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
