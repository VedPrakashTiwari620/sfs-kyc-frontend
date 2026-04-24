import api from './api';
import { env } from '../config';
import { AadhaarQrPayload } from '../navigation/RootNavigator';

export type FaceMatchPayload = {
  loanNo: string;
  selfieBase64: string;
  aadhaarQrData: AadhaarQrPayload;
};

export type FaceMatchResponse = {
  matchPercentage: number;
  passed: boolean;
  message?: string;
};

export async function submitFaceMatch(payload: FaceMatchPayload): Promise<FaceMatchResponse> {
  const response = await api.post(env.faceMatch, payload);
  return response.data as FaceMatchResponse;
}
