import { AttendanceRecord } from '../types';

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/a/macros/estilodesignplus.com/s/AKfycbxGL00fwOfNUb_tkhccLA7LH8rF1ngdriW6SxCPk4Vny7PBGeEtlwHY41wW93brVeE1/exec';

export interface VerificationResult {
  isClockedIn: boolean;
}

/**
 * Checks if the scanned ID exists on the server AND its current clock-in state for today.
 */
export async function verifyUserStatus(record: AttendanceRecord): Promise<VerificationResult> {
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...record, action: 'VERIFY' })
    });

    const data = await response.json();

    if (!data.success) {
      if (data.reason === 'NOT_FOUND') {
        throw new Error('NOT_FOUND');
      }
      throw new Error(data.error || 'Server rejected the entry.');
    }

    return {
      isClockedIn: data.isClockedIn || false
    };
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      throw err;
    }
    throw new Error('Network error connecting to the Server.');
  }
}

/**
 * Logs the actual 'Time IN' or 'Time OUT' into the Google Sheet.
 */
export async function submitAttendanceTime(record: AttendanceRecord, type: 'IN' | 'OUT'): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...record, action: 'RECORD', actionType: type, photoData: record.photoData, locationData: record.locationData }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!data.success) {
      if (data.reason === 'NOT_FOUND') {
        throw new Error('NOT_FOUND');
      }
      throw new Error(data.error || 'Server rejected the write.');
    }
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      throw err;
    }
    // Bubble up the actual error message so we can see what failed!
    throw err;
  }
}
