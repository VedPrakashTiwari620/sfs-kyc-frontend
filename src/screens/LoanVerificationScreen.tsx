import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { loanSchema, type LoanFormValues } from '../utils/validation';
import { verifyLoan, type VerifyLoanResponse } from '../services/loan';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'LoanVerification'>;

export function LoanVerificationScreen() {
  const navigation = useNavigation<NavigationProps>();
  const [verifiedLoan, setVerifiedLoan] = useState<VerifyLoanResponse | null>(null);
  const [verifiedLoanNo, setVerifiedLoanNo] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: { loanNo: '' }
  });

  const onSubmit = async (values: LoanFormValues) => {
    try {
      const response = await verifyLoan(values.loanNo.trim());
      if (response.exists) {
        setVerifiedLoan(response);
        setVerifiedLoanNo(values.loanNo.trim());
        Toast.show({ type: 'success', text1: '✓ Loan Verified', text2: 'Loan found in Salesforce' });
      } else {
        setVerifiedLoan(null);
        Toast.show({ type: 'error', text1: 'Loan Not Found', text2: response.message ?? 'Please check the loan number.' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      Toast.show({ type: 'error', text1: 'Verification Error', text2: message });
    }
  };

  const proceedToKYC = () => {
    navigation.navigate('KYCDetails', { loanNo: verifiedLoanNo });
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Loan Verification</Text>
      <Text style={styles.subtitle}>Enter the loan number to verify it in Salesforce</Text>

      <Controller
        control={control}
        name="loanNo"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Loan Number"
            placeholder="e.g. Loan-0003"
            autoCapitalize="none"
            autoComplete="off"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.loanNo?.message}
          />
        )}
      />

      <View style={{ marginTop: 16 }}>
        <Button title="Verify Loan" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      </View>

      {/* Loan Details Card — shows after successful verification */}
      {verifiedLoan && verifiedLoan.exists && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultStatus}>✓ Loan Verified Successfully</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Loan Number</Text>
            <Text style={styles.resultValue}>{verifiedLoan.loanData?.Name || verifiedLoanNo}</Text>
          </View>

          {verifiedLoan.loanData?.Loan_Amount__c ? (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Loan Amount</Text>
              <Text style={styles.resultValue}>
                ₹{Number(verifiedLoan.loanData.Loan_Amount__c).toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Status</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: verifiedLoan.loanData?.Status__c === 'Active' ? '#dcfce7' : '#fef3c7'
            }]}>
              <Text style={[styles.statusText, {
                color: verifiedLoan.loanData?.Status__c === 'Active' ? '#15803d' : '#92400e'
              }]}>
                {verifiedLoan.loanData?.Status__c || 'Pending'}
              </Text>
            </View>
          </View>

          {verifiedLoan.loanId && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Salesforce ID</Text>
              <Text style={[styles.resultValue, { fontSize: 11, color: '#94a3b8' }]}>
                {verifiedLoan.loanId}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 20 }}>
            <Button title="Proceed to KYC →" onPress={proceedToKYC} />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 6,
    fontSize: 24,
    fontWeight: '700',
    color: '#111'
  },
  subtitle: {
    marginBottom: 24,
    color: '#64748b',
    fontSize: 14
  },
  resultCard: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#16a34a',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  resultHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7'
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803d'
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  resultLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500'
  },
  resultValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700'
  }
});
