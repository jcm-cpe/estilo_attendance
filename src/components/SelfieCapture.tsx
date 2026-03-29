import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface SelfieCaptureRef {
  capture: () => string | null;
}

export const SelfieCapture = forwardRef<SelfieCaptureRef, {}>((_props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return null;

      const maxCaptureWidth = 1080;
      const scale = maxCaptureWidth / video.videoWidth;

      canvas.width = maxCaptureWidth;
      canvas.height = video.videoHeight * scale;

      // Draw the current video frame into the scaled canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Export as Base64 JPEG string with lower quality (0.5)
      return canvas.toDataURL('image/jpeg', 0.85);
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' } // Use front/user-facing camera for selfies
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to open selfie camera:', err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '1rem auto', aspectRatio: '4/3', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
});

SelfieCapture.displayName = 'SelfieCapture';
