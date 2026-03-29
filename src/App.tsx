import { useState, useCallback, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import { verifyUserStatus, submitAttendanceTime } from './api/googleSheets';
import { ViewState, AttendanceRecord } from './types';
import { SelfieCapture, SelfieCaptureRef } from './components/SelfieCapture';
import './index.css';

const getDeviceLocation = async (): Promise<string> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getIpFallbackLocation());
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      async (error) => {
        console.warn('GPS location failed, trying IP fallback:', error);
        resolve(await getIpFallbackLocation());
      },
      { timeout: 5000 }
    );
  });
};

const getIpFallbackLocation = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    if (data.city && data.country_name) {
      return `${data.city}, ${data.country_name} (IP-bound)`;
    }
    return "Unknown (IP parse failed)";
  } catch (err) {
    return "Unknown (IP fetch failed)";
  }
};

function App() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastScan, setLastScan] = useState<AttendanceRecord | null>(null);

  // New States for Manual Mode
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualId, setManualId] = useState<string>('');

  // ⏰ New States for Clock In/Out Flow
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [scannedId, setScannedId] = useState<string>('');

  const [gpsWarningVisible, setGpsWarningVisible] = useState<boolean>(false);

  // Synchronous flag to prevent concurrent rapid-fire scans
  const isProcessingRef = useRef<boolean>(false);
  const selfieRef = useRef<SelfieCaptureRef>(null);

  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          setGpsWarningVisible(true);
        } else if (result.state === 'prompt') {
          // Trigger standard browser prompt
          navigator.geolocation.getCurrentPosition(() => { }, () => { });
        }
      });
    } else if (!("geolocation" in navigator)) {
      setGpsWarningVisible(true); // Unsupported
    }
  }, []);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true; // Lock immediately
    
    setViewState('submitting');
    setScannedId(decodedText); // 👈 Missing link!

    const record: AttendanceRecord = {
      qrValue: decodedText,
      scannedAt: new Date().toISOString(),
    };
    setLastScan(record);

    try {
      const result = await verifyUserStatus(record);
      setIsClockedIn(result.isClockedIn);
      setViewState('action-selection');
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        setViewState('not-found');
      } else {
        setErrorMessage(err.message || 'Verification Error');
        setViewState('error');
      }
    }
  }, []); // Empty dependency array ensures reference stability

  const handleManualAction = async (type: 'IN' | 'OUT') => {
    if (!scannedId) return;
    setViewState('submitting');
    
    let photo: string | null = null;
    if (selfieRef.current) {
      photo = selfieRef.current.capture();
    }
    
    const locationStr = await getDeviceLocation();
    
    const record: AttendanceRecord = {
      qrValue: scannedId,
      scannedAt: new Date().toISOString(),
      actionType: type,
      photoData: photo || undefined,
      locationData: locationStr || undefined
    };
    setLastScan(record);

    try {
      await submitAttendanceTime(record, type);
      setViewState('success');
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        setViewState('not-found');
      } else {
        setErrorMessage(err.message || 'Failed to submit time.');
        setViewState('error');
      }
    }
  };

  const handleScanFailure = useCallback((_errorStr: string) => {
    // Hidden logging
  }, []);

  const resetView = () => {
    isProcessingRef.current = false; // Unlock for the next scan
    setViewState('idle');
    setErrorMessage('');
    setLastScan(null);
    setIsManualMode(false);
    setManualId('');
  };

  const retryScan = () => {
    isProcessingRef.current = false; // Unlock for the next scan
    setViewState('scanning');
    setErrorMessage('');
    setLastScan(null);
    setIsManualMode(false);
    setManualId('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    handleScanSuccess(manualId.trim());
  };

  return (
    <div className="app-container">
      {gpsWarningVisible && (viewState === 'idle' || viewState === 'scanning') && (
        <div style={{ backgroundColor: 'rgba(255, 149, 0, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #ff9500', color: '#ff9500', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <XCircle size={20} />
          <div>
            <p style={{ fontWeight: '600', margin: 0, color: '#ff9500' }}>Precise Location Disabled</p>
          </div>
        </div>
      )}

      <header>
        <h1>Secure Pass</h1>
        <p className="subtitle">Enterprise Attendance System</p>
      </header>

      {/* --- IDLE STATE --- */}
      {viewState === 'idle' && !isManualMode && (
        <div className="state-container">
          <p>Ready to record attendance. Please aim the camera at the QR code.</p>
          <button className="primary-btn w-full" onClick={() => setViewState('scanning')}>
            <Camera size={20} />
            Start Scanner
          </button>

          <div className="w-full h-px bg-white/10 my-2"></div>

          <button className="secondary-btn w-full" onClick={() => setIsManualMode(true)}>
            Manual Entry
          </button>
        </div>
      )}

      {/* --- MANUAL ENTRY FORM --- */}
      {viewState === 'idle' && isManualMode && (
        <div className="state-container">
          <form className="flex flex-col gap-4 w-full" onSubmit={handleManualSubmit}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <label htmlFor="manual-id" style={{ color: "var(--text-secondary)", fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                Employee ID
              </label>
              <input
                id="manual-id"
                type="text"
                className="p-3 bg-black/30 border border-white/10 rounded-xl text-white autofill:bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                placeholder="Ex. EMP-001"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                autoFocus
              />
            </div>

            <div className="id-form__actions">
              <button type="submit" className="primary-btn">
                Submit ID
              </button>
              <button type="button" className="secondary-btn" onClick={() => setIsManualMode(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ACTION SELECTION STATE --- */}
      {viewState === 'action-selection' && (
        <div className="state-container">
          <h2>Shift Action Selection</h2>
          <p style={{ color: "var(--text-secondary)" }}>User verified! Please look at the camera.</p>
          
          <SelfieCapture ref={selfieRef} />
          
          <div className="id-form__actions" style={{ flexDirection: 'column', marginTop: '1.5rem', width: '100%', gap: '1rem' }}>
            <button 
              className="primary-btn" 
              style={{ width: '100%', opacity: isClockedIn ? 0.3 : 1, cursor: isClockedIn ? 'not-allowed' : 'pointer' }} 
              disabled={isClockedIn} 
              onClick={() => handleManualAction('IN')}
            >
              Time IN
            </button>
            
            <button 
              className="primary-btn" 
              style={{ width: '100%', opacity: !isClockedIn ? 0.3 : 1, cursor: !isClockedIn ? 'not-allowed' : 'pointer' }} 
              disabled={!isClockedIn} 
              onClick={() => handleManualAction('OUT')}
            >
              Time OUT
            </button>
          </div>

          <button className="secondary-btn" style={{ width: '100%', marginTop: '0.5rem' }} onClick={resetView}>
            Cancel and Reset
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

          <button className="primary-btn" style={{ width: '100%' }} onClick={retryScan}>
            <RefreshCw size={20} />
            Try Again
          </button>
        </div>
      )}

      {/* --- NOT FOUND STATE (Requested) --- */}
      {viewState === 'not-found' && (
        <div className="state-container">
          <div className="icon-wrapper error">
            <XCircle size={32} />
          </div>
          <h2>Record Not Found</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}>
            The scanned ID does not match any current employee record. Please verify the QR code or contact Human Resources for assistance.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={resetView}>
              Go Back
            </button>
            <button className="primary-btn" style={{ flex: 1 }} onClick={() => alert('Contacting support...')}>
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
