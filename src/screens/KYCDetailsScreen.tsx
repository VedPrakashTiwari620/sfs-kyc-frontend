import { Alert, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { kycSchema, type KYCFormValues } from '../utils/validation';
import { saveKYCDetails } from '../services/kyc';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'KYCDetails'>;
type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'KYCDetails'>;

export function KYCDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { loanNo } = route.params;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<KYCFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: { address: '', aadhaarNumber: '' }
  });

  const commitKyc = async (values: KYCFormValues) => {
    try {
      const response = await saveKYCDetails({ loanNo, ...values });
      navigation.navigate('AadhaarQRScan', { loanNo, kycId: response.kycId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save KYC details';
      Alert.alert('Save Failed', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => handleSubmit(commitKyc)() }
      ]);
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ marginBottom: 24, fontSize: 22, fontWeight: '700', color: '#111' }}>KYC Details</Text>
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Address"
            placeholder="Enter customer address"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.address?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="aadhaarNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Aadhaar Number"
            placeholder="XXXX XXXX XXXX"
            keyboardType="number-pad"
            maxLength={14}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.aadhaarNumber?.message}
          />
        )}
      />
      <View style={{ marginTop: 16 }}>
        <Button title="Next" onPress={handleSubmit(commitKyc)} loading={isSubmitting} />
      </View>
    </ScreenContainer>
  );
}
