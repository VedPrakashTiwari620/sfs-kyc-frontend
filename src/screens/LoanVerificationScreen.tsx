import { useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../navigation/RootNavigator';
import { verifyLoan } from '../services/loan';
import { theme } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LoanVerification'>;

export function LoanVerificationScreen() {
  const navigation = useNavigation<Nav>();
  const [loanNo, setLoanNo] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    const trimmed = loanNo.trim();
    if (!trimmed) return Toast.show({ type: 'error', text1: 'Required', text2: 'Enter a loan number.' });
    setLoading(true);
    try {
      const result = await verifyLoan(trimmed);
      if (result.exists) {
        navigation.navigate('KYCDetails', { loanNo: trimmed });
      } else {
        Toast.show({ type: 'error', text1: 'Not Found', text2: `Loan "${trimmed}" not found in system.` });
      }
    } catch {
      // Navigate anyway for now
      navigation.navigate('KYCDetails', { loanNo: trimmed });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderLabel}>KYC VERIFICATION PORTAL</Text>
        <Text style={styles.pageHeaderTitle}>Loan Application</Text>
        <Text style={styles.pageHeaderSub}>Enter the loan reference number to begin KYC process</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.steps}>
        {['Loan ID', 'KYC Details', 'Photo', 'Complete'].map((step, i) => (
          <View key={step} style={styles.stepItem}>
            <View style={[styles.stepCircle, i === 0 && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{step}</Text>
            {i < 3 && <View style={[styles.stepLine, i === 0 && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📋</Text>
          <View>
            <Text style={styles.cardTitle}>Loan Verification</Text>
            <Text style={styles.cardSub}>Step 1 of 4</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>LOAN REFERENCE NUMBER</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputPrefix}>LN-</Text>
          {/* @ts-ignore */}
          <input
            type="text"
            placeholder="0001"
            value={loanNo}
            onChange={(e: any) => setLoanNo(e.target.value)}
            onKeyDown={(e: any) => e.key === 'Enter' && verify()}
            style={webInputStyle}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={verify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>VERIFY LOAN →</Text>
          }
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️  Loan number can be found on the application form or customer letter</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const webInputStyle: any = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontSize: 16, color: '#1A0A00', fontFamily: 'inherit', letterSpacing: 2,
};

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: theme.colors.offWhite, paddingBottom: 40 },

  pageHeader: {
    backgroundColor: theme.colors.brown, paddingTop: 48, paddingBottom: 28,
    paddingHorizontal: 24, alignItems: 'center',
  },
  pageHeaderLabel: { color: theme.colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  pageHeaderTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  pageHeaderSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6, textAlign: 'center' },

  steps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: theme.colors.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: theme.colors.midGray },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: theme.colors.midGray, marginLeft: 4, marginRight: 4 },
  stepLabelActive: { color: theme.colors.primary, fontWeight: '700' },
  stepLine: { width: 20, height: 2, backgroundColor: theme.colors.lightGray, marginHorizontal: 2 },
  stepLineActive: { backgroundColor: theme.colors.accent },

  card: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 24,
    shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.brown },
  cardSub: { fontSize: 12, color: theme.colors.midGray },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.gray, letterSpacing: 1.5, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: theme.colors.primary,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inputPrefix: { fontSize: 16, fontWeight: '700', color: theme.colors.midGray, marginRight: 4 },

  btn: {
    backgroundColor: theme.colors.primary, borderRadius: 8,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
    borderBottomWidth: 3, borderBottomColor: theme.colors.primaryDark,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  infoBox: { backgroundColor: '#FFF8F0', borderRadius: 8, padding: 12, marginTop: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.accent },
  infoText: { fontSize: 12, color: theme.colors.gray },
});
