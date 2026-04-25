import { useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { loginSchema, type LoginFormValues } from '../utils/validation';
import { login } from '../services/auth';
import { useAuthStore } from '../stores/authStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { setToken } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const data = await login({ email: values.username, password: values.password });
      setToken(data.token);
      navigation.reset({ index: 0, routes: [{ name: 'LoanVerification' }] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {/* Header Band */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>SFS</Text>
        </View>
        <Text style={styles.bankName}>SFS Finance</Text>
        <Text style={styles.bankTagline}>Secure • Fast • Trusted</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome Back</Text>
        <Text style={styles.cardSubtitle}>Sign in to your officer account</Text>

        <View style={styles.divider} />

        {/* Username */}
        <Controller control={control} name="username" render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, errors.username && styles.inputError]}>
              <Text style={styles.inputIcon}>✉</Text>
              {/* @ts-ignore */}
              <input
                type="email"
                placeholder="officer@sfsfinance.com"
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                style={webInputStyle}
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
          </View>
        )} />

        {/* Password */}
        <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={[styles.inputWrap, errors.password && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              {/* @ts-ignore */}
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                style={webInputStyle}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showBtn}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>
        )} />

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.loginBtnText}>SIGN IN →</Text>
          }
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <Text style={styles.secureText}>🔐 256-bit encrypted • Secure login</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>© 2025 SFS Finance Ltd. All rights reserved.</Text>
    </ScrollView>
  );
}

const webInputStyle: any = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontSize: 14, color: '#1A0A00', fontFamily: 'inherit', padding: '0 4px',
};

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: theme.colors.offWhite, alignItems: 'center', paddingBottom: 40 },
  header: { width: '100%', backgroundColor: theme.colors.primary, alignItems: 'center', paddingTop: 60, paddingBottom: 48 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  bankName: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: 1.5 },
  bankTagline: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, letterSpacing: 2 },

  card: {
    width: '92%', maxWidth: 420, backgroundColor: '#fff',
    borderRadius: 16, padding: 28, marginTop: -24,
    shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.brown },
  cardSubtitle: { fontSize: 13, color: theme.colors.midGray, marginTop: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 20 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700', color: theme.colors.gray, letterSpacing: 1.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: theme.colors.offWhite,
  },
  inputError: { borderColor: theme.colors.error },
  inputIcon: { fontSize: 16, marginRight: 8, opacity: 0.6 },
  showBtn: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  errorText: { color: theme.colors.error, fontSize: 11, marginTop: 4 },

  loginBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 8,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
    borderBottomWidth: 3, borderBottomColor: theme.colors.primaryDark,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  secureRow: { alignItems: 'center', marginTop: 16 },
  secureText: { fontSize: 11, color: theme.colors.midGray },

  footer: { fontSize: 11, color: theme.colors.midGray, marginTop: 32, textAlign: 'center' },
});
