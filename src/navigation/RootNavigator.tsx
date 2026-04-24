import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { LoanVerificationScreen } from '../screens/LoanVerificationScreen';
import { KYCDetailsScreen } from '../screens/KYCDetailsScreen';
import { AadhaarQRScanScreen } from '../screens/AadhaarQRScanScreen';
import { SelfieCaptureScreen } from '../screens/SelfieCaptureScreen';

export type RootStackParamList = {
  Login: undefined;
  LoanVerification: undefined;
  KYCDetails: { loanNo: string };
  AadhaarQRScan: { loanNo: string; kycId: string };
  SelfieCapture: { loanNo: string; aadhaarQrData: AadhaarQrPayload };
};

export type AadhaarQrPayload = {
  name: string;
  aadhaarNumber: string;
  dob?: string;
  gender?: string;
  address?: string;
  aadhaarPhotoBase64?: string; // Extracted from Secure QR
  raw: string;
};


const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <Stack.Screen name="LoanVerification" component={LoanVerificationScreen} options={{ title: 'Loan Verification' }} />
      <Stack.Screen name="KYCDetails" component={KYCDetailsScreen} options={{ title: 'KYC Details' }} />
      <Stack.Screen name="AadhaarQRScan" component={AadhaarQRScanScreen} options={{ title: 'Aadhaar QR Scan' }} />
      <Stack.Screen name="SelfieCapture" component={SelfieCaptureScreen} options={{ title: 'Selfie Capture' }} />
    </Stack.Navigator>
  );
};
