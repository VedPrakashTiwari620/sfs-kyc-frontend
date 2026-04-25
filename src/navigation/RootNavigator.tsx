import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { LoanVerificationScreen } from '../screens/LoanVerificationScreen';
import { KYCDetailsScreen } from '../screens/KYCDetailsScreen';
import { PhotoCaptureScreen } from '../screens/PhotoCaptureScreen';
import { theme } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  LoanVerification: undefined;
  KYCDetails: { loanNo: string };
  PhotoCapture: { loanNo: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false, // We have custom headers in each screen
        contentStyle: { backgroundColor: theme.colors.offWhite },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LoanVerification" component={LoanVerificationScreen} />
      <Stack.Screen name="KYCDetails" component={KYCDetailsScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
    </Stack.Navigator>
  );
};
