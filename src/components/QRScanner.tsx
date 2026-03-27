import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRScannerProps } from '../types';

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // We instantiate Html5Qrcode with the ID of the div we render below
    const html5QrCode = new Html5Qrcode('reader');
    scannerRef.current = html5QrCode;

    // Start scanning
    html5QrCode.start(
      { facingMode: 'environment' }, // Prefer back camera
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      (decodedText) => {
        // Success Callback
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Failure Callback - triggered continuously while it doesn't find a QR
        if (onScanFailure) {
          onScanFailure(errorMessage);
        }
      }
    ).catch(err => {
      console.error('Failed to start scanner:', err);
      if (onScanFailure) {
        onScanFailure('Failed to start scanner. Please check camera permissions.');
      }
    });

    // Cleanup on unmount
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => {
          console.error('Failed to clear scanner:', err);
        });
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}></div>
  );
};
