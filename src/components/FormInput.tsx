import { Text, TextInput, View, StyleSheet, TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function FormInput({ label, error, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, error ? styles.inputError : null]} placeholderTextColor="#999" {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18
  },
  label: {
    marginBottom: 8,
    color: '#20232a',
    fontWeight: '600'
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d7d9df',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#121212'
  },
  inputError: {
    borderColor: '#d74444'
  },
  error: {
    marginTop: 6,
    color: '#d74444',
    fontSize: 12
  }
});
