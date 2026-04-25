import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { loginSchema, type LoginFormValues } from '../utils/validation';
import { login } from '../services/auth';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { setToken, loadToken, token } = useAuthStore();

  useEffect(() => {
    loadToken().then(() => {
      // If token already exists (persisted session) → skip login
      const stored = useAuthStore.getState().token;
      if (stored) {
        navigation.reset({ index: 0, routes: [{ name: 'LoanVerification' }] });
      }
    });
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const data = await login({ email: values.username, password: values.password });
      setToken(data.token);
      navigation.reset({ index: 0, routes: [{ name: 'LoanVerification' }] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      Toast.show({ type: 'error', text1: 'Login Error', text2: message });
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ marginBottom: 8, fontSize: 26, fontWeight: '700', color: '#111' }}>Welcome back</Text>
      <Text style={{ marginBottom: 24, color: '#64748b', fontSize: 14 }}>Sign in to continue to SFS KYC Portal</Text>
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Email"
            placeholder="Enter your email"
            autoCapitalize="none"
            autoComplete="username"
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.username?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Password"
            placeholder="Enter password"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
          />
        )}
      />
      <View style={{ marginTop: 16 }}>
        <Button title="Login" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}
