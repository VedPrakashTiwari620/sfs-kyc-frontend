import api from './api';
import { env } from '../config';

export type VerifyLoanResponse = {
  exists: boolean;
  loanId?: string;
  message?: string;
  loanData?: {
    Name?: string;
    Loan_Amount__c?: number;
    Status__c?: string;
    [key: string]: unknown;
  };
};


export async function verifyLoan(loanNo: string): Promise<VerifyLoanResponse> {
  const response = await api.post(env.salesforceVerifyLoan, { loanNo });
  return response.data as VerifyLoanResponse;
}
