export interface AttendanceRecord {
  /** The value decoded from the QR code (e.g., a simple ID or Name) */
  qrValue: string;
  /** ISO timestamp when the QR code was scanned */
  scannedAt: string;
  /** Whether this is a Time IN or Time OUT event */
  actionType?: 'IN' | 'OUT';
  /** Base64 encoded selfie image from the event */
  photoData?: string;
  /** Device location string (GPS Lat/Long or City via IP) */
  locationData?: string;
}

export interface QRScannerProps {
  /** Callback triggered when a QR code is successfully parsed */
  onScanSuccess: (decodedText: string) => void;
  /** Optional callback for scan failures/errors */
  onScanFailure?: (errorMessage: string) => void;
}

export type ViewState = 'idle' | 'scanning' | 'submitting' | 'success' | 'error' | 'not-found' | 'action-selection';
