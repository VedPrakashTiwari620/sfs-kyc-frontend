import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'PhotoCapture'>;

export function PhotoCaptureScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { loanNo } = route.params;

  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [pendingStream, setPendingStream] = useState<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState('📍 Getting location...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Get GPS location on mount
  useEffect(() => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6),
          });
          setLocationStatus(`✅ Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocationStatus('⚠️ Location denied — will submit without GPS');
          setLocation({ latitude: '', longitude: '' });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationStatus('⚠️ GPS not supported');
      setLocation({ latitude: '', longitude: '' });
    }
  }, []);

  // Attach stream to video after mount
  useEffect(() => {
    if (!pendingStream || !videoRef.current) return;
    videoRef.current.srcObject = pendingStream;
    videoRef.current.play().catch(() => setCameraError('Failed to start camera preview.'));
  }, [pendingStream]);

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setPendingStream(stream);
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera in browser settings.'
          : 'Camera not available on this device.'
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    setCameraActive(false);
    setPendingStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64);
    stopCamera();
    Toast.show({ type: 'success', text1: '✓ Photo Captured!', text2: 'Review and submit.' });
  };

  const submitToSalesforce = async () => {
    if (!capturedPhoto) {
      return Toast.show({ type: 'error', text1: 'No Photo', text2: 'Please capture applicant photo first.' });
    }
    if (!location) {
      return Toast.show({ type: 'error', text1: 'Getting Location...', text2: 'Please wait for GPS.' });
    }

    setIsSubmitting(true);
    try {
      await api.post('/salesforce/kyc/photo', {
        loanNo,
        photoBase64: capturedPhoto,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Toast.show({ type: 'success', text1: '✅ KYC Submitted!', text2: 'Photo saved to Salesforce.' });
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'LoanVerification' }] }), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Submission failed. Try again.';
      Toast.show({ type: 'error', text1: 'Submit Failed', text2: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>📷 Applicant Photo</Text>
      <Text style={styles.subtitle}>Capture applicant's photo for KYC verification</Text>
      <Text style={styles.locationText}>{locationStatus}</Text>
      <Text style={styles.loanBadge}>Loan: {loanNo}</Text>

      {/* Camera Preview */}
      {cameraActive && (
        <View style={styles.cameraBox}>
          {/* @ts-ignore */}
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 8 }} />
          {/* @ts-ignore */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </View>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && !cameraActive && (
        <View style={styles.previewBox}>
          {/* @ts-ignore */}
          <img src={capturedPhoto} alt="Captured" style={{ width: '100%', borderRadius: 8, maxHeight: 280, objectFit: 'cover' }} />
        </View>
      )}

      {/* Camera Error */}
      {cameraError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{cameraError}</Text>
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.btnGroup}>
        {!cameraActive && !capturedPhoto && (
          <Button title="📷 Open Camera" onPress={startCamera} />
        )}
        {cameraActive && (
          <>
            <Button title="📸 Capture Photo" onPress={capturePhoto} />
            <Button title="✕ Cancel" onPress={stopCamera} variant="secondary" />
          </>
        )}
        {capturedPhoto && (
          <>
            <Button
              title={isSubmitting ? 'Submitting...' : '✅ Submit to Salesforce'}
              onPress={submitToSalesforce}
              loading={isSubmitting}
            />
            <Button
              title="🔄 Retake Photo"
              onPress={() => { setCapturedPhoto(null); startCamera(); }}
              variant="secondary"
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  locationText: { fontSize: 12, color: '#475569', marginBottom: 4, backgroundColor: '#f1f5f9', padding: 6, borderRadius: 6 },
  loanBadge: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginBottom: 16 },
  cameraBox: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', marginBottom: 12 },
  previewBox: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 2, borderColor: '#86efac' },
  errorBox: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  btnGroup: { gap: 8 },
});
