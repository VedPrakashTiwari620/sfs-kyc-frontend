import api from './api';
import { env } from '../config';

export type KYCDetailsPayload = {
  loanNo: string;
  address: string;
  aadhaarNumber: string;
};

export type KYCDetailsResponse = {
  kycId: string;
  status: string;
};

export async function saveKYCDetails(payload: KYCDetailsPayload): Promise<KYCDetailsResponse> {
  const response = await api.post(env.salesforceUpdateKyc, payload);
  return response.data as KYCDetailsResponse;
}
