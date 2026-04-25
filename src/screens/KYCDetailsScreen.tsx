import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { kycSchema, type KYCFormValues } from '../utils/validation';
import { saveKYCDetails } from '../services/kyc';
import { RootStackParamList } from '../navigation/RootNavigator';
import { theme } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'KYCDetails'>;
type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'KYCDetails'>;

const StepBar = ({ current }: { current: number }) => {
  const steps = ['Loan ID', 'KYC Details', 'Photo', 'Complete'];
  return (
    <View style={sb.row}>
      {steps.map((s, i) => (
        <View key={s} style={sb.item}>
          <View style={[sb.circle, i < current && sb.done, i === current && sb.active]}>
            {i < current
              ? <Text style={sb.checkText}>✓</Text>
              : <Text style={[sb.num, i === current && sb.numActive]}>{i + 1}</Text>
            }
          </View>
          <Text style={[sb.label, i === current && sb.labelActive]}>{s}</Text>
          {i < 3 && <View style={[sb.line, i < current && sb.lineDone]} />}
        </View>
      ))}
    </View>
  );
};

export function KYCDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { loanNo } = route.params;

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<KYCFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: { address: '', aadhaarNumber: '' }
  });

  const commitKyc = async (values: KYCFormValues) => {
    try { await saveKYCDetails({ loanNo, ...values }); } catch { /* continue */ }
    navigation.navigate('PhotoCapture', { loanNo });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.pageHeader}>
        <Text style={styles.headerLabel}>KYC VERIFICATION PORTAL</Text>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <Text style={styles.headerSub}>Loan Reference: {loanNo}</Text>
      </View>

      <StepBar current={1} />

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardIcon}>👤</Text>
          <View>
            <Text style={styles.cardTitle}>KYC Information</Text>
            <Text style={styles.cardSub}>Step 2 of 4 — Customer Details</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Address */}
        <Controller control={control} name="address" render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>RESIDENTIAL ADDRESS</Text>
            {/* @ts-ignore */}
            <textarea
              placeholder="House No., Street, City, State, PIN Code"
              value={value}
              onChange={(e: any) => onChange(e.target.value)}
              onBlur={onBlur}
              rows={3}
              style={{ ...webTextAreaStyle, borderColor: errors.address ? theme.colors.error : theme.colors.border }}
            />
            {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}
          </View>
        )} />

        {/* Aadhaar */}
        <Controller control={control} name="aadhaarNumber" render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>AADHAAR NUMBER</Text>
            <View style={[styles.inputRow, errors.aadhaarNumber && styles.inputRowError]}>
              <Text style={styles.icon}>🪪</Text>
              {/* @ts-ignore */}
              <input
                type="text"
                placeholder="XXXX XXXX XXXX"
                value={value}
                maxLength={14}
                onChange={(e: any) => onChange(e.target.value)}
                onBlur={onBlur}
                style={webInputStyle}
              />
            </View>
            {errors.aadhaarNumber && <Text style={styles.error}>{errors.aadhaarNumber.message}</Text>}
          </View>
        )} />

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>🔒  All data is encrypted and stored securely as per RBI guidelines</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, isSubmitting && { opacity: 0.65 }]}
          onPress={handleSubmit(commitKyc)}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>SAVE & CONTINUE →</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const webInputStyle: any = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontSize: 14, color: '#1A0A00', fontFamily: 'inherit', letterSpacing: 1,
};
const webTextAreaStyle: any = {
  width: '100%', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 8,
  padding: '10px 12px', fontSize: 13, color: '#1A0A00', fontFamily: 'inherit',
  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
  backgroundColor: theme.colors.offWhite,
};

const sb = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  item: { flexDirection: 'row', alignItems: 'center' },
  circle: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.lightGray, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: theme.colors.success },
  active: { backgroundColor: theme.colors.primary },
  num: { fontSize: 11, fontWeight: '700', color: theme.colors.midGray },
  numActive: { color: '#fff' },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  label: { fontSize: 9, color: theme.colors.midGray, marginLeft: 3, marginRight: 3 },
  labelActive: { color: theme.colors.primary, fontWeight: '700' },
  line: { width: 18, height: 2, backgroundColor: theme.colors.lightGray, marginHorizontal: 2 },
  lineDone: { backgroundColor: theme.colors.success },
});

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: theme.colors.offWhite, paddingBottom: 40 },
  pageHeader: { backgroundColor: theme.colors.primary, paddingTop: 40, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' },
  headerLabel: { color: theme.colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  card: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 22, shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIcon: { fontSize: 26 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.brown },
  cardSub: { fontSize: 12, color: theme.colors.midGray },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700', color: theme.colors.gray, letterSpacing: 1.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.colors.offWhite },
  inputRowError: { borderColor: theme.colors.error },
  icon: { fontSize: 16, marginRight: 8 },
  error: { color: theme.colors.error, fontSize: 11, marginTop: 4 },
  infoBox: { backgroundColor: '#FFF8F0', borderRadius: 8, padding: 10, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.accent },
  infoText: { fontSize: 11, color: theme.colors.gray },
  btn: { backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: theme.colors.primaryDark },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});
