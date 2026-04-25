import { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';
import { theme } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'PhotoCapture'>;

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
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
          setLocationStatus('ok');
        },
        () => { setLocation({ latitude: '', longitude: '' }); setLocationStatus('denied'); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocation({ latitude: '', longitude: '' });
      setLocationStatus('denied');
    }
  }, []);

  useEffect(() => {
    if (!pendingStream || !videoRef.current) return;
    videoRef.current.srcObject = pendingStream;
    videoRef.current.play().catch(() => setCameraError('Failed to start camera.'));
  }, [pendingStream]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks?.().forEach((t: any) => t.stop()); };
  }, []);

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
      setCameraError(err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Camera not available.');
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
    Toast.show({ type: 'success', text1: '✓ Photo Captured', text2: 'Review and submit below.' });
  };

  const submitToSalesforce = async () => {
    if (!capturedPhoto) return Toast.show({ type: 'error', text1: 'No Photo', text2: 'Capture photo first.' });
    setIsSubmitting(true);
    try {
      await api.post('/salesforce/kyc/photo', {
        loanNo, photoBase64: capturedPhoto,
        latitude: location?.latitude || '', longitude: location?.longitude || '',
      });
      setSubmitted(true);
      Toast.show({ type: 'success', text1: '✅ KYC Submitted!', text2: 'Photo saved to Salesforce.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Submit Failed', text2: 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.headerLabel}>KYC VERIFICATION PORTAL</Text>
          <Text style={styles.headerTitle}>KYC Complete</Text>
          <Text style={styles.headerSub}>Loan Reference: {loanNo}</Text>
        </View>
        <StepBar current={4} />
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>KYC Successfully Submitted</Text>
          <Text style={styles.successSub}>Applicant photo and location data have been saved to Salesforce loan record.</Text>
          <View style={styles.successDetails}>
            <Text style={styles.successDetail}>📋  Loan: {loanNo}</Text>
            {location?.latitude ? <Text style={styles.successDetail}>📍  {location.latitude}, {location.longitude}</Text> : null}
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'LoanVerification' }] })}>
            <Text style={styles.newBtnText}>+ NEW KYC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.headerLabel}>KYC VERIFICATION PORTAL</Text>
        <Text style={styles.headerTitle}>Applicant Photo</Text>
        <Text style={styles.headerSub}>Loan Reference: {loanNo}</Text>
      </View>

      <StepBar current={2} />

      {/* GPS Status */}
      <View style={styles.gpsBar}>
        {locationStatus === 'loading' && <><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.gpsText}> Getting GPS location...</Text></>}
        {locationStatus === 'ok' && <Text style={styles.gpsTextOk}>📍 GPS: {location?.latitude}, {location?.longitude}</Text>}
        {locationStatus === 'denied' && <Text style={styles.gpsTextWarn}>⚠️ GPS denied — submitting without location</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardIcon}>📷</Text>
          <View>
            <Text style={styles.cardTitle}>Capture Applicant Photo</Text>
            <Text style={styles.cardSub}>Step 3 of 4 — Photo Verification</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Camera Preview */}
        {cameraActive && (
          <View style={styles.cameraBox}>
            <View style={styles.cameraOverlay}>
              <View style={styles.faceGuide} />
            </View>
            {/* @ts-ignore */}
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', borderRadius: 8, display: 'block' }} />
            {/* @ts-ignore */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </View>
        )}

        {/* Captured Photo */}
        {capturedPhoto && !cameraActive && (
          <View style={styles.previewBox}>
            {/* @ts-ignore */}
            <img src={capturedPhoto} alt="Captured applicant" style={{ width: '100%', borderRadius: 8, maxHeight: 260, objectFit: 'cover', display: 'block' }} />
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>✓ Photo Ready</Text>
            </View>
          </View>
        )}

        {/* Error */}
        {cameraError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {cameraError}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.btnGroup}>
          {!cameraActive && !capturedPhoto && (
            <TouchableOpacity style={styles.btnPrimary} onPress={startCamera}>
              <Text style={styles.btnPrimaryText}>📷  OPEN CAMERA</Text>
            </TouchableOpacity>
          )}
          {cameraActive && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={styles.btnCapture} onPress={capturePhoto}>
                <View style={styles.captureDot} />
                <Text style={styles.btnCaptureText}>CAPTURE PHOTO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={stopCamera}>
                <Text style={styles.btnSecondaryText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}
          {capturedPhoto && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.btnPrimary, isSubmitting && { opacity: 0.65 }]}
                onPress={submitToSalesforce}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>✅  SUBMIT TO SALESFORCE</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => { setCapturedPhoto(null); startCamera(); }}>
                <Text style={styles.btnSecondaryText}>🔄  RETAKE PHOTO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>Photo Guidelines</Text>
          <Text style={styles.guideItem}>• Face clearly visible, no obstructions</Text>
          <Text style={styles.guideItem}>• Good lighting, no harsh shadows</Text>
          <Text style={styles.guideItem}>• Plain background preferred</Text>
        </View>
      </View>
    </ScrollView>
  );
}

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

  gpsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 0, borderRadius: 8, padding: 10, marginBottom: 0, borderWidth: 1, borderColor: theme.colors.border },
  gpsText: { fontSize: 12, color: theme.colors.gray, marginLeft: 6 },
  gpsTextOk: { fontSize: 12, color: theme.colors.success, fontWeight: '600' },
  gpsTextWarn: { fontSize: 12, color: theme.colors.warning },

  card: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIcon: { fontSize: 26 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.brown },
  cardSub: { fontSize: 12, color: theme.colors.midGray },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },

  cameraBox: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', marginBottom: 12, position: 'relative' },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: 'none' as any, alignItems: 'center', justifyContent: 'center' },
  faceGuide: { width: 160, height: 200, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed' as any },

  previewBox: { borderRadius: 10, overflow: 'hidden', marginBottom: 12, borderWidth: 2, borderColor: theme.colors.success, position: 'relative' },
  previewBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: theme.colors.success, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  previewBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  errorBox: { backgroundColor: theme.colors.errorBg, padding: 10, borderRadius: 8, marginBottom: 12 },
  errorText: { color: theme.colors.error, fontSize: 12 },

  btnGroup: { gap: 0 },
  btnPrimary: { backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: theme.colors.primaryDark, marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  btnCapture: { backgroundColor: theme.colors.brown, borderRadius: 8, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: '#1A0A00', marginBottom: 10, gap: 10 },
  captureDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  btnCaptureText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  btnSecondary: { borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  guideBox: { marginTop: 16, backgroundColor: theme.colors.surfaceAlt, borderRadius: 8, padding: 12 },
  guideTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.brown, marginBottom: 6 },
  guideItem: { fontSize: 12, color: theme.colors.gray, marginBottom: 3 },

  // Success
  successCard: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 28, alignItems: 'center', shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.brown, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 13, color: theme.colors.gray, textAlign: 'center', lineHeight: 20 },
  successDetails: { marginTop: 16, backgroundColor: theme.colors.surfaceAlt, borderRadius: 8, padding: 14, width: '100%', gap: 6 },
  successDetail: { fontSize: 13, color: theme.colors.brown, fontWeight: '600' },
  newBtn: { marginTop: 20, backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 32, borderBottomWidth: 3, borderBottomColor: theme.colors.primaryDark },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});
