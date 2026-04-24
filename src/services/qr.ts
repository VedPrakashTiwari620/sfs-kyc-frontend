import api from './api';
import { env } from '../config';
import { AadhaarQrPayload } from '../navigation/RootNavigator';

export type SaveAadhaarQrResponse = {
  success: boolean;
  recordId: string;
};

export async function saveAadhaarQr(loanNo: string, payload: AadhaarQrPayload): Promise<SaveAadhaarQrResponse> {
  const response = await api.post(env.salesforceSaveQr, {
    loanNo,
    payload
  });
  return response.data as SaveAadhaarQrResponse;
}
