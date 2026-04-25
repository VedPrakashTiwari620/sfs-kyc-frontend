import { Platform, useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { saveAadhaarQr } from '../services/qr';
import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, AadhaarQrPayload } from '../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'AadhaarQRScan'>;

export function AadhaarQRScanScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'AadhaarQRScan'>>();
  const { loanNo } = route.params;
  const isWeb = Platform.OS === 'web';

  // ── ALL HOOKS MUST BE AT THE TOP — no hooks after conditional returns ──
  const [hasPermission, setHasPermission] = useState<boolean | null>(isWeb ? true : null);
  const [scannedData, setScannedData] = useState<AadhaarQrPayload | null>(null);
  const [manualQrValue, setManualQrValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Web camera refs
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const jsQRRef = useRef<any>(null); // cached jsQR module
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingStream, setPendingStream] = useState<any>(null);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  // Native camera permission
  useEffect(() => {
    if (isWeb) {
      // Pre-load jsQR for faster scanning
      import('jsqr').then(m => { jsQRRef.current = m.default; });
      return;
    }
    (async () => {
      const { BarCodeScanner } = require('expo-barcode-scanner');
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, [isWeb]);

  // Attach stream to video AFTER element renders
  useEffect(() => {
    if (!isWeb || !pendingStream || !videoRef.current) return;
    videoRef.current.srcObject = pendingStream;
    videoRef.current.play()
      .then(() => { setScanning(true); setPendingStream(null); })
      .catch(() => setCameraError('Failed to start camera preview.'));
  }, [pendingStream, cameraActive, isWeb]);

  // QR scan loop (web)
  useEffect(() => {
    if (!scanning || !isWeb) return;
    let animFrame: number;
    const tick = () => {
      if (!videoRef.current || !canvasRef.current) { animFrame = requestAnimationFrame(tick); return; }
      const video = videoRef.current;
      if (video.readyState < 2) { animFrame = requestAnimationFrame(tick); return; }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) { animFrame = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = jsQRRef.current;
        if (jsQR) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            stopCamera();
            const parsed = parseQrValue(code.data);
            setScannedData(parsed);
            Toast.show({ type: 'success', text1: '✓ QR Scanned!', text2: 'Aadhaar QR captured successfully.' });
            return;
          }
        }
      } catch { /* continue */ }
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [scanning, isWeb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks?.().forEach((t: any) => t.stop());
      }
    };
  }, []);

  // ── Helper Functions ──────────────────────────────────────────────
  const parseQrValue = (value: string): AadhaarQrPayload => {
    try {
      const parsed = JSON.parse(value);
      const photo = parsed.photo || parsed.image || parsed.photoBase64 || undefined;
      return {
        name: String(parsed.name ?? ''),
        aadhaarNumber: String(parsed.aadhaarNumber ?? parsed.aadhar ?? parsed.uid ?? ''),
        dob: parsed.dob ? String(parsed.dob) : undefined,
        gender: parsed.gender ? String(parsed.gender) : undefined,
        address: parsed.address ? String(parsed.address) : undefined,
        aadhaarPhotoBase64: photo ? (photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`) : undefined,
        raw: value
      };
    } catch {
      const parts = value.split('|');
      if (parts.length >= 6) {
        return {
          name: parts[2] || '',
          aadhaarNumber: parts[0] ? `XXXX-XXXX-${parts[0].slice(-4)}` : '',
          dob: parts[3] || undefined,
          gender: parts[4] || undefined,
          address: parts.slice(6, 13).filter(Boolean).join(', ') || undefined,
          raw: value
        };
      }
      return { name: '', aadhaarNumber: value.trim(), raw: value };
    }
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setCameraActive(true);
      setPendingStream(stream);
    } catch (err: any) {
      setCameraError(err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera in browser address bar.'
        : 'Camera not available. Use manual entry below.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    setCameraActive(false);
    setScanning(false);
    setPendingStream(null);
  };

  const scanManualValue = () => {
    const value = manualQrValue.trim();
    if (!value) return Toast.show({ type: 'error', text1: 'Empty input', text2: 'Paste QR payload or Aadhaar number.' });
    setScannedData(parseQrValue(value));
    Toast.show({ type: 'success', text1: '✓ QR captured', text2: 'Aadhaar data entered manually.' });
  };

  const saveQr = async () => {
    if (!scannedData?.aadhaarNumber) {
      return Toast.show({ type: 'error', text1: 'Invalid QR', text2: 'No Aadhaar number found.' });
    }
    setIsSubmitting(true);
    try {
      await saveAadhaarQr(loanNo, scannedData);
    } catch {
      // Continue even if save fails
    } finally {
      setIsSubmitting(false);
    }
    navigation.navigate('SelfieCapture', { loanNo, aadhaarQrData: scannedData });
  };

  // ── Native camera handler ──────────────────────────────────────────
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedData) return;
    setScannedData(parseQrValue(data));
    Toast.show({ type: 'success', text1: 'QR scanned', text2: 'Aadhaar QR payload captured.' });
  };

  // ── Loading state (native only) ───────────────────────────────────
  if (!isWeb && hasPermission === null) {
    return <ScreenContainer><Text>Requesting camera permission...</Text></ScreenContainer>;
  }

  // ── WEB UI ────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <ScreenContainer>
        <Text style={{ marginBottom: 6, fontSize: 22, fontWeight: '700', color: '#111' }}>Scan Aadhaar QR</Text>
        <Text style={{ marginBottom: 16, color: '#475569', fontSize: 13 }}>
          Point your camera at the Aadhaar QR code to scan automatically.
        </Text>

        {/* Camera Preview */}
        {cameraActive && (
          <View style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
            {/* @ts-ignore */}
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', maxHeight: 300, display: 'block' }} />
            {/* @ts-ignore */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </View>
        )}

        {/* Camera Error */}
        {cameraError ? (
          <View style={{ padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#b91c1c', fontSize: 13 }}>{cameraError}</Text>
          </View>
        ) : null}

        {/* Camera Buttons */}
        {!scannedData && (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {!cameraActive
              ? <Button title="📷 Open Camera to Scan QR" onPress={startCamera} />
              : <Button title="⏹ Stop Camera" onPress={stopCamera} variant="secondary" />
            }
          </View>
        )}

        {/* Manual Entry */}
        {!scannedData && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: '600' }}>
              — OR enter manually —
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Paste Aadhaar QR data or enter 12-digit Aadhaar number"
              multiline
              numberOfLines={3}
              value={manualQrValue}
              onChangeText={setManualQrValue}
            />
            <View style={{ marginTop: 8 }}>
              <Button title="Submit Manual Entry" onPress={scanManualValue} variant="secondary" />
            </View>
          </View>
        )}

        {/* Scanned Result */}
        {scannedData && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>✓ Aadhaar QR Captured</Text>
            {scannedData.name ? <Text style={styles.resultRow}>Name: {scannedData.name}</Text> : null}
            {scannedData.aadhaarNumber ? <Text style={styles.resultRow}>Aadhaar: {scannedData.aadhaarNumber}</Text> : null}
            {scannedData.dob ? <Text style={styles.resultRow}>DOB: {scannedData.dob}</Text> : null}
            {scannedData.gender ? <Text style={styles.resultRow}>Gender: {scannedData.gender}</Text> : null}
            {scannedData.address ? <Text style={styles.resultRow}>Address: {scannedData.address}</Text> : null}
            {scannedData.aadhaarPhotoBase64 && (
              <Image source={{ uri: scannedData.aadhaarPhotoBase64 }}
                style={{ width: 80, height: 80, borderRadius: 40, marginTop: 8, alignSelf: 'center' }} />
            )}
            <View style={{ marginTop: 12, gap: 8 }}>
              <Button title="Save & Continue →" onPress={saveQr} loading={isSubmitting} />
              <Button title="Rescan" onPress={() => setScannedData(null)} variant="secondary" />
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  // ── NATIVE UI ─────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <ScreenContainer>
        <Text style={{ color: '#dc2626', marginBottom: 16 }}>
          Camera permission denied. Please allow camera access in settings.
        </Text>
      </ScreenContainer>
    );
  }

  const { BarCodeScanner } = require('expo-barcode-scanner');
  return (
    <ScreenContainer>
      <Text style={{ marginBottom: 16, fontSize: 22, fontWeight: '700', color: '#111' }}>Scan Aadhaar QR</Text>
      {!scannedData ? (
        <BarCodeScanner onBarCodeScanned={handleBarCodeScanned}
          style={{ width: '100%', height: 300, borderRadius: 12 }} />
      ) : (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>✓ Aadhaar QR Captured</Text>
          {scannedData.name ? <Text style={styles.resultRow}>Name: {scannedData.name}</Text> : null}
          {scannedData.aadhaarNumber ? <Text style={styles.resultRow}>Aadhaar: {scannedData.aadhaarNumber}</Text> : null}
          <View style={{ marginTop: 12, gap: 8 }}>
            <Button title="Save & Continue →" onPress={saveQr} loading={isSubmitting} />
            <Button title="Rescan" onPress={() => setScannedData(null)} variant="secondary" />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  textArea: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8,
    padding: 12, fontSize: 13, color: '#1e293b',
    backgroundColor: '#f8fafc', minHeight: 80,
    textAlignVertical: 'top'
  },
  resultBox: {
    backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac',
    borderRadius: 12, padding: 16, marginTop: 8
  },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#15803d', marginBottom: 8 },
  resultRow: { fontSize: 14, color: '#166534', marginBottom: 4 }
});
