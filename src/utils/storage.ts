import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'kyc_loan_auth_token';

const isWeb = Platform.OS === 'web';

export async function saveAuthToken(token: string) {
  if (isWeb) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  return SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY
  });
}

export async function getAuthToken(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function deleteAuthToken() {
  if (isWeb) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  return SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
