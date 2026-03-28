import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRScannerProps } from '../types';

// 🔒 Global lock to ensure that unmount cleanup finishes before the next mount starts!
let activeCameraLock = Promise.resolve();

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // We instantiate Html5Qrcode with the ID of the div we render below
    let isCancelled = false;
    const html5QrCode = new Html5Qrcode('reader');
    scannerRef.current = html5QrCode;

    // Track the start promise so we can wait for it if we unmount quickly!
    let startPromise: Promise<any> | null = null;

    const startScanning = async () => {
      try {
        startPromise = html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isCancelled) onScanSuccess(decodedText);
          },
          () => {} // Mute failures to prevent excessive noise in console
        );
        await startPromise;
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to start scanner:', err);
          if (onScanFailure) {
            onScanFailure('Failed to start scanner. Please check camera permissions.');
          }
        }
      }
    };

    // 🔑 Wait for any previous camera shutdown to finish before booting this one!
    activeCameraLock = activeCameraLock.then(async () => {
      if (!isCancelled) {
        await startScanning();
      }
    });

    return () => {
      isCancelled = true;
      
      const shutdown = async () => {
        if (startPromise) {
          try { await startPromise; } catch (e) { /* ignore start errors during unmount */ }
        }
        
        if (html5QrCode.isScanning) {
          try {
            await html5QrCode.stop();
            html5QrCode.clear();
          } catch (err) {
            console.error('Failed to stop scanner:', err);
          }
        }
      };

      // 🔑 Enqueue this shutdown to the global lock so the next mount waits for it!
      activeCameraLock = activeCameraLock.then(shutdown);
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}></div>
  );
};
