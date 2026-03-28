import { AttendanceRecord } from '../types';

// Placeholder for the actual Google Apps Script Web App URL
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwmpfCNm_uz6aaIEV_Ui8kereGoyRYML4-ZGbNY65gcEhSDYekS_7-tRShItp-QNQJBWA/exec';

export interface VerificationResult {
  isClockedIn: boolean; // Server tells us if the user is already clocked in today
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
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...record, action: 'RECORD', actionType: type })
    });

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
    throw new Error('Network error trying to write to Server.');
  }
}
