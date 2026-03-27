import { useState, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import { logAttendance } from './api/googleSheets';
import { ViewState, AttendanceRecord } from './types';
import './index.css';

function App() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastScan, setLastScan] = useState<AttendanceRecord | null>(null);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple submissions
    if (viewState === 'submitting') return;
    
    setViewState('submitting');
    const record: AttendanceRecord = {
      qrValue: decodedText,
      scannedAt: new Date().toISOString(),
    };
    
    setLastScan(record);

    try {
      await logAttendance(record);
      setViewState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with server.');
      setViewState('error');
    }
  }, [viewState]);

  const handleScanFailure = useCallback((_errorStr: string) => {
    // Only log continuous camera/parsing errors if necessary in real apps
    // For now, we optionally ignore them to prevent console spam
  }, []);

  const resetView = () => {
    setViewState('idle');
    setErrorMessage('');
    setLastScan(null);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Secure Pass</h1>
        <p className="subtitle">Enterprise Attendance System</p>
      </header>

      {/* --- IDLE STATE --- */}
      {viewState === 'idle' && (
        <div className="state-container">
          <p>Ready to record attendance. Please aim the camera at the QR code.</p>
          <button className="primary-btn" onClick={() => setViewState('scanning')}>
            <Camera size={20} />
            Start Scanner
          </button>
        </div>
      )}

      {/* --- SCANNING STATE --- */}
      {viewState === 'scanning' && (
        <div className="scanner-container">
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onScanFailure={handleScanFailure} 
          />
          <button className="secondary-btn" onClick={resetView} style={{ marginTop: '1rem', width: '100%' }}>
            Cancel Scan
          </button>
        </div>
      )}

      {/* --- SUBMITTING STATE --- */}
      {viewState === 'submitting' && (
        <div className="state-container">
          <div className="icon-wrapper loading">
            <Loader2 size={32} className="spinner" />
          </div>
          <h2>Logging Entry...</h2>
          <p>Please wait while we sync the attendance record securely.</p>
        </div>
      )}

      {/* --- SUCCESS STATE --- */}
      {viewState === 'success' && (
        <div className="state-container">
          <div className="icon-wrapper success" style={{ animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <CheckCircle size={32} />
          </div>
          <h2>Access Granted</h2>
          <p style={{ color: 'var(--success-color)' }}>Attendance successfully recorded!</p>
          
          {lastScan && (
            <div className="data-display">
              <p>ID: <code>{lastScan.qrValue}</code></p>
              <p>Time: <code>{new Date(lastScan.scannedAt).toLocaleTimeString()}</code></p>
            </div>
          )}

          <button className="primary-btn" style={{ width: '100%' }} onClick={resetView}>
            Scan Next Person
          </button>
        </div>
      )}

      {/* --- ERROR STATE --- */}
      {viewState === 'error' && (
        <div className="state-container">
          <div className="icon-wrapper error">
            <XCircle size={32} />
          </div>
          <h2>Scan Failed</h2>
          <p className="error-text">{errorMessage}</p>

          <button className="primary-btn" style={{ width: '100%' }} onClick={resetView}>
            <RefreshCw size={20} />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
