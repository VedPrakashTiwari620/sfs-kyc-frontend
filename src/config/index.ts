import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};

export type AppEnv = {
  API_BASE_URL: string;
  AUTH_LOGIN: string;
  AUTH_REFRESH: string;
  SALESFORCE_VERIFY_LOAN: string;
  SALESFORCE_UPDATE_KYC: string;
  SALESFORCE_SAVE_QR: string;
  FACE_MATCH: string;
  MATCH_THRESHOLD: string;
};

// Default to localhost for web dev, can be overridden by .env
const DEFAULT_API = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://10.0.2.2:3000'; // Android emulator localhost

export const env = {
  apiBaseUrl: String(extra.API_BASE_URL && extra.API_BASE_URL !== 'https://example.com/api' ? extra.API_BASE_URL : DEFAULT_API),
  authLogin: String(extra.AUTH_LOGIN ?? '/auth/login'),
  authRefresh: String(extra.AUTH_REFRESH ?? '/auth/refresh'),
  salesforceVerifyLoan: String(extra.SALESFORCE_VERIFY_LOAN ?? '/salesforce/loan/verify'),
  salesforceUpdateKyc: String(extra.SALESFORCE_UPDATE_KYC ?? '/salesforce/kyc/update'),
  salesforceSaveQr: String(extra.SALESFORCE_SAVE_QR ?? '/salesforce/kyc/qr'),
  faceMatch: String(extra.FACE_MATCH ?? '/face-match'),
  matchThreshold: Number(extra.MATCH_THRESHOLD ?? '80')
};
