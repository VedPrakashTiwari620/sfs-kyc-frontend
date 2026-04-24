import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

type Props = {
  children: React.ReactNode;
};

export function ScreenContainer({ children }: Props) {
  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: '#f8fbff'
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f8fbff'
  }
});
