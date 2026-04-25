import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { LoanVerificationScreen } from '../screens/LoanVerificationScreen';
import { KYCDetailsScreen } from '../screens/KYCDetailsScreen';
import { PhotoCaptureScreen } from '../screens/PhotoCaptureScreen';

export type RootStackParamList = {
  Login: undefined;
  LoanVerification: undefined;
  KYCDetails: { loanNo: string };
  PhotoCapture: { loanNo: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <Stack.Screen name="LoanVerification" component={LoanVerificationScreen} options={{ title: 'Loan Verification' }} />
      <Stack.Screen name="KYCDetails" component={KYCDetailsScreen} options={{ title: 'KYC Details' }} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} options={{ title: 'Applicant Photo' }} />
    </Stack.Navigator>
  );
};
