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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<AadhaarQrPayload | null>(null);
  const [manualQrValue, setManualQrValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isWeb) {
      setHasPermission(true);
      return;
    }

    (async () => {
      const { BarCodeScanner } = require('expo-barcode-scanner');
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, [isWeb]);

  // ---------------------------------------------------------------
  // Aadhaar Secure QR Parser
  // The new Aadhaar Secure QR (large QR) contains a signed XML/binary
  // payload. The format encodes fields as delimited values where the
  // last field is the photo as raw JPEG bytes (big-endian integers).
  //
  // Format: <version>|<last4digits>|<name>|<dob>|<gender>|<yob>|
  //         <address_fields...>|<email_hash>|<mobile_hash>|<photo_bytes>
  // ---------------------------------------------------------------
  const parseSecureQrPhoto = (raw: string): string | undefined => {
    try {
      // Secure QR data is numeric (long number string), not JSON or XML
      // It's delimited by special separators. Try to find photo bytes.
      // The photo data appears as a sequence of numbers (byte values) at the end.
      const parts = raw.split('\u00FF'); // Byte separator used in Aadhaar Secure QR v2
      if (parts.length > 1) {
        // Last part is the photo byte array encoded as string
        const photoBytes = parts[parts.length - 1];
        const byteArray = photoBytes.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 255);
        if (byteArray.length > 100) {
          // Convert byte array to base64
          const uint8 = new Uint8Array(byteArray);
          let binary = '';
          uint8.forEach(b => { binary += String.fromCharCode(b); });
          const b64 = btoa(binary);
          return `data:image/jpeg;base64,${b64}`;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const parseQrValue = (value: string): AadhaarQrPayload => {
    try {
      // Case 1: JSON format
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
      // Case 2: Aadhaar Secure QR (numeric/binary delimited format)
      const aadhaarPhotoBase64 = parseSecureQrPhoto(value);

      // Try pipe-delimited format (old Aadhaar offline XML QR)
      const parts = value.split('|');
      if (parts.length >= 6) {
        return {
          name: parts[2] || '',
          aadhaarNumber: parts[0] ? `XXXX-XXXX-${parts[0].slice(-4)}` : '',
          dob: parts[3] || undefined,
          gender: parts[4] || undefined,
          address: parts.slice(6, 13).filter(Boolean).join(', ') || undefined,
          aadhaarPhotoBase64,
          raw: value
        };
      }

      // Case 3: Plain Aadhaar number
      return {
        name: '',
        aadhaarNumber: value.trim(),
        aadhaarPhotoBase64,
        raw: value
      };
    }
  };


  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedData) return;
    const parsed = parseQrValue(data);
    setScannedData(parsed);
    Toast.show({ type: 'success', text1: 'QR scanned', text2: 'Aadhaar QR payload captured.' });
  };

  const scanManualValue = () => {
    const value = manualQrValue.trim();
    if (!value) {
      return Toast.show({ type: 'error', text1: 'Empty input', text2: 'Paste the QR payload or Aadhaar number.' });
    }
    const parsed = parseQrValue(value);
    setScannedData(parsed);
    Toast.show({ type: 'success', text1: 'QR captured', text2: 'Aadhaar QR payload captured from input.' });
  };

  const saveQr = async () => {
    if (!scannedData || !scannedData.aadhaarNumber) {
      return Toast.show({ type: 'error', text1: 'Invalid QR', text2: 'No Aadhaar number found in QR payload.' });
    }
    setIsSubmitting(true);
    try {
      await saveAadhaarQr(loanNo, scannedData);
      navigation.navigate('SelfieCapture', { loanNo, aadhaarQrData: scannedData });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save QR data';
      Alert.alert('Save QR Failed', message, [{ text: 'Retry', onPress: saveQr }, { text: 'Cancel', style: 'cancel' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <ScreenContainer>
        <Text>Loading...</Text>
      </ScreenContainer>
    );
  }

  // Web Camera QR Scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  // Attach stream to video element AFTER it renders
  useEffect(() => {
    if (pendingStream && videoRef.current) {
      videoRef.current.srcObject = pendingStream;
      videoRef.current.play().then(() => {
        setScanning(true);
        setPendingStream(null);
      }).catch(() => setCameraError('Failed to start camera preview.'));
    }
  }, [pendingStream, cameraActive]);

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setCameraActive(true);      // 1. render the <video> element
      setPendingStream(stream);   // 2. useEffect will attach stream after render
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Click the camera icon in browser address bar and allow.'
        : 'Camera not available. Try uploading manually.';
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setScanning(false);
    setPendingStream(null);
  };

  // QR scan loop
  useEffect(() => {
    if (!scanning || !isWeb) return;
    let animFrame: number;
    const tick = async () => {
      if (!videoRef.current || !canvasRef.current) { animFrame = requestAnimationFrame(tick); return; }
      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) { animFrame = requestAnimationFrame(tick); return; }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { animFrame = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          stopCamera();
          const parsed = parseQrValue(code.data);
          setScannedData(parsed);
          Toast.show({ type: 'success', text1: '✓ QR Scanned!', text2: 'Aadhaar QR captured successfully.' });
          return;
        }
      } catch { /* continue scanning */ }
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [scanning, isWeb]);

  // Cleanup camera on unmount
  useEffect(() => { return () => stopCamera(); }, []);


  if (isWeb) {
    return (
      <ScreenContainer>
        <Text style={{ marginBottom: 6, fontSize: 22, fontWeight: '700', color: '#111' }}>Scan Aadhaar QR</Text>
        <Text style={{ marginBottom: 16, color: '#475569', fontSize: 13 }}>
          Point your camera at the Aadhaar QR code to scan automatically.
        </Text>

        {/* Camera View */}
        {!scannedData && (
          <View style={{ marginBottom: 16 }}>
            {!cameraActive ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Button title="📷  Open Camera to Scan QR" onPress={startCamera} />
                {cameraError ? <Text style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{cameraError}</Text> : null}
              </View>
            ) : (
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', position: 'relative' }}>
                {/* @ts-ignore — web-only video element */}
                <video ref={videoRef} style={{ width: '100%', maxHeight: 360, display: 'block' }} muted playsInline />
                {/* @ts-ignore */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                  <View style={{ width: 200, height: 200, borderWidth: 3, borderColor: '#2dd4bf', borderRadius: 16 }} />
                  <Text style={{ color: '#fff', marginTop: 12, fontSize: 13, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                    Scanning for QR...
                  </Text>
                </View>
              </View>
            )}
            {cameraActive && (
              <View style={{ marginTop: 10 }}>
                <Button title="Stop Camera" onPress={stopCamera} variant="secondary" />
              </View>
            )}
          </View>
        )}

        {/* Manual Input Fallback */}
        {!scannedData && (
          <View>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>— or paste QR data manually —</Text>
            <TextInput
              style={styles.manualInput}
              multiline
              numberOfLines={3}
              value={manualQrValue}
              onChangeText={setManualQrValue}
              placeholder="Paste Aadhaar QR payload or Aadhaar number"
            />
            <View style={{ marginTop: 10 }}>
              <Button title="Parse Manual Input" onPress={scanManualValue} variant="secondary" />
            </View>
          </View>
        )}

        {/* Scanned Result Preview */}
        {scannedData ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>✓ Aadhaar QR Captured</Text>
            {scannedData.aadhaarPhotoBase64 ? (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={{ uri: scannedData.aadhaarPhotoBase64 }} style={styles.aadhaarPhoto} />
                <Text style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Photo extracted from QR</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⚠ No photo in QR</Text>
            )}
            <Text style={styles.previewText}>Name: {scannedData.name || 'N/A'}</Text>
            <Text style={styles.previewText}>Aadhaar: {scannedData.aadhaarNumber}</Text>
            {scannedData.dob ? <Text style={styles.previewText}>DOB: {scannedData.dob}</Text> : null}
            {scannedData.gender ? <Text style={styles.previewText}>Gender: {scannedData.gender}</Text> : null}
            {scannedData.address ? <Text style={styles.previewText}>Address: {scannedData.address}</Text> : null}
            <View style={{ marginTop: 12 }}>
              <Button title="Scan Again" onPress={() => { setScannedData(null); setManualQrValue(''); }} variant="secondary" />
            </View>
          </View>
        ) : null}

        {scannedData ? (
          <View style={{ marginTop: 16 }}>
            <Button title="Save & Continue →" onPress={saveQr} loading={isSubmitting} />
          </View>
        ) : null}
      </ScreenContainer>
    );
  }


  if (hasPermission === false) {
    return (
      <ScreenContainer>
        <Text style={{ color: '#d00', marginBottom: 12 }}>Camera permission is required to scan Aadhaar QR.</Text>
        <Button
          title="Retry Permission"
          onPress={() => {
            const { BarCodeScanner } = require('expo-barcode-scanner');
            BarCodeScanner.requestPermissionsAsync().then(resp => setHasPermission(resp.status === 'granted'));
          }}
        />
      </ScreenContainer>
    );
  }

  const BarcodeScanner = !isWeb ? require('expo-barcode-scanner').BarCodeScanner : null;

  return (
    <ScreenContainer>
      <Text style={{ marginBottom: 18, fontSize: 22, fontWeight: '700', color: '#111' }}>Scan Aadhaar QR</Text>
      {!scannedData ? (
        <View style={styles.scannerContainer}>
          {BarcodeScanner ? (
            <BarcodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
              barCodeTypes={[BarcodeScanner.Constants.BarCodeType.qr]}
            />
          ) : null}
          <View style={styles.scanFrame} />
        </View>
      ) : (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Aadhaar Preview</Text>
          {scannedData.aadhaarPhotoBase64 ? (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Image source={{ uri: scannedData.aadhaarPhotoBase64 }} style={styles.aadhaarPhoto} />
              <Text style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Photo extracted from QR</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⚠ No photo in QR (basic QR used)</Text>
          )}
          <Text style={styles.previewText}>Name: {scannedData.name || 'N/A'}</Text>
          <Text style={styles.previewText}>Aadhaar: {scannedData.aadhaarNumber}</Text>
          {scannedData.dob ? <Text style={styles.previewText}>DOB: {scannedData.dob}</Text> : null}
          {scannedData.gender ? <Text style={styles.previewText}>Gender: {scannedData.gender}</Text> : null}
          {scannedData.address ? <Text style={styles.previewText}>Address: {scannedData.address}</Text> : null}
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <Button title={scannedData ? 'Save Aadhaar QR' : 'Waiting for QR...'} onPress={saveQr} loading={isSubmitting} disabled={!scannedData} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
    minHeight: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000'
  },
  scanFrame: {
    borderWidth: 3,
    borderColor: '#2dd4bf',
    margin: 32,
    borderRadius: 18,
    flex: 1
  },
  previewBox: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    borderColor: '#d1d5db',
    borderWidth: 1
  },
  aadhaarPhoto: {
    width: 120,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2dd4bf'
  },
  previewLabel: {
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 16
  },
  previewText: {
    marginBottom: 8,
    color: '#111'
  },
  manualInput: {
    minHeight: 120,
    padding: 14,
    backgroundColor: '#fff',
    borderColor: '#d7d9df',
    borderWidth: 1,
    borderRadius: 12,
    textAlignVertical: 'top',
    color: '#111'
  }
});
