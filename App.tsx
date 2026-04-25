import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Platform } from 'react-native';

// URL-based routing for web — each screen gets its own URL
const linking = {
  prefixes: ['https://sfskyc.vercel.app', 'http://localhost:8081'],
  config: {
    screens: {
      Login: 'login',
      LoanVerification: 'loan-verify',
      KYCDetails: 'kyc-details',
      PhotoCapture: 'photo-capture',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
        <RootNavigator />
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
}
