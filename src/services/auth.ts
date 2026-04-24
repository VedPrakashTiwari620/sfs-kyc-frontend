import api from './api';
import { env } from '../config';
import { saveAuthToken, deleteAuthToken } from '../utils/storage';

export type LoginPayload = {
  email: string;
  password: string;
};


export type AuthResponse = {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post(env.authLogin, payload);
  const data = response.data as AuthResponse;
  if (!data.token) {
    throw new Error('Authentication failed: token missing');
  }
  await saveAuthToken(data.token);
  return data;
}

export async function logout() {
  await deleteAuthToken();
}
