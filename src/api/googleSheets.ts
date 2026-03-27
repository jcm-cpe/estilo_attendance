import { AttendanceRecord } from '../types';

// Placeholder for the actual Google Apps Script Web App URL
const GOOGLE_SHEETS_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

/**
 * Logs the scanned attendance data by sending a POST request to a Google Sheet via Apps Script Web App URL.
 * Currently uses a mock implementation based on user request.
 * 
 * @param record - The extracted QR code value and its scan timestamp.
 * @returns A promise that resolves if the update was successful.
 */
export async function logAttendance(record: AttendanceRecord): Promise<void> {
  console.log('--- [MOCK API] Sending data to Google Sheets ---');
  console.log('Endpoint URL:', GOOGLE_SHEETS_WEB_APP_URL);
  console.log('Payload:', record);

  // Simulate network delay behavior
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate an 80% success rate for demonstration purposes
      if (Math.random() > 0.2) {
        console.log('--- [MOCK API] Successfully logged attendance ---');
        resolve();
      } else {
        console.error('--- [MOCK API] Simulated Network Error ---');
        reject(new Error('Simulated network error connecting to Google Sheets.'));
      }
    }, 1500);
  });
}
