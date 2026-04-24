import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...(config as ExpoConfig),
    name: config.name ?? 'KYC Loan Flow App',
    extra: {
      API_BASE_URL: process.env.API_BASE_URL ?? 'https://example.com/api',
      AUTH_LOGIN: process.env.AUTH_LOGIN ?? '/auth/login',
      AUTH_REFRESH: process.env.AUTH_REFRESH ?? '/auth/refresh',
      SALESFORCE_VERIFY_LOAN: process.env.SALESFORCE_VERIFY_LOAN ?? '/salesforce/loan/verify',
      SALESFORCE_UPDATE_KYC: process.env.SALESFORCE_UPDATE_KYC ?? '/salesforce/kyc/update',
      SALESFORCE_SAVE_QR: process.env.SALESFORCE_SAVE_QR ?? '/salesforce/kyc/qr',
      FACE_MATCH: process.env.FACE_MATCH ?? '/face-match',
      MATCH_THRESHOLD: process.env.MATCH_THRESHOLD ?? '80'
    }
  };
};
