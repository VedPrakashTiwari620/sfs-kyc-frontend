import { Platform, useEffect, useState, useRef } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { submitFaceMatch } from '../services/faceMatch';
import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { env } from '../config';
import { RootStackParamList } from '../navigation/RootNavigator';

// Native only — safe import
const toBase64 = async (uri: string): Promise<string> => {
  const FileSystem = require('expo-file-system');
  const file = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/jpeg;base64,${file}`;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Unable to convert file to base64'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type RouteProps = RouteProp<RootStackParamList, 'SelfieCapture'>;

const MATCH_THRESHOLD = 70;



export function SelfieCaptureScreen() {
  const route = useRoute<RouteProps>();
  const { loanNo, aadhaarQrData } = route.params;
  const isWeb = Platform.OS === 'web';

  // Native camera
  const cameraRef = useRef<any>(null);
  const [permission, setPermission] = useState<boolean | null>(isWeb ? true : null);

  // Web camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [webCameraActive, setWebCameraActive] = useState(false);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [webCameraError, setWebCameraError] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [result, setResult] = useState<{ percentage: number; passed: boolean; attemptNo: number; attemptsLeft: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (isWeb) return;
    (async () => {
      const { Camera } = require('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === 'granted');
    })();
  }, [isWeb]);

  // Attach stream to video AFTER it renders
  useEffect(() => {
    if (pendingStream && videoRef.current) {
      videoRef.current.srcObject = pendingStream;
      videoRef.current.play().catch(() => setWebCameraError('Failed to start camera.'));
      setPendingStream(null);
    }
  }, [pendingStream, webCameraActive]);


  // Web: start camera
  const startWebCamera = async () => {
    try {
      setWebCameraError('');
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setWebCameraActive(true);  // 1. render video element
      setPendingStream(stream);  // 2. useEffect attaches stream
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow in browser address bar.'
        : 'Camera not available. Upload photo instead.';
      setWebCameraError(msg);
    }
  };

  const stopWebCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setWebCameraActive(false);
    setPendingStream(null);
  };

  // Web: take photo from video stream
  const takeWebPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoUri(dataUrl);
    setPhotoBase64(dataUrl);
    stopWebCamera();
  };

  // Web: file upload fallback
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const b64 = await fileToBase64(file);
    setPhotoUri(URL.createObjectURL(file));
    setPhotoBase64(b64);
  };

  // Native: capture
  const capture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });
    setPhotoUri(photo.uri);
  };

  const submit = async () => {
    if (!photoUri) return Toast.show({ type: 'error', text1: 'Take selfie first' });
    setLoading(true);
    try {
      const selfieBase64 = isWeb
        ? (photoBase64 ?? '')
        : await toBase64(photoUri);

      const response = await submitFaceMatch({
        loanNo,
        selfieBase64,
        aadhaarQrData,
        aadhaarPhotoBase64: aadhaarQrData.aadhaarPhotoBase64 ?? null
      });
      const attemptNo = response.attemptNo ?? 1;
      const attemptsLeft = response.attemptsLeft ?? 0;
      setAttemptsUsed(attemptNo);
      setResult({ percentage: response.matchPercentage, passed: response.passed, attemptNo, attemptsLeft });
      if (!response.passed && attemptsLeft === 0) setExhausted(true);
      Toast.show({
        type: response.passed ? 'success' : 'error',
        text1: response.passed ? 'Face Match Passed ✓' : 'Face Match Failed ✗',
        text2: response.message ?? ''
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Face match failed';
      Alert.alert('Match Error', message, [{ text: 'Retry', onPress: submit }, { text: 'Cancel', style: 'cancel' }]);
    } finally {
      setLoading(false);
    }
  };

  const retake = () => { setPhotoUri(null); setPhotoBase64(null); setResult(null); };

  if (permission === null) {
    return <ScreenContainer><Text>Requesting camera access...</Text></ScreenContainer>;
  }

  if (!isWeb && permission === false) {
    return (
      <ScreenContainer>
        <Text style={{ marginBottom: 16, color: '#d00' }}>Camera access is required.</Text>
        <Button title="Retry Permission" onPress={() => {
          const { Camera } = require('expo-camera');
          Camera.requestCameraPermissionsAsync().then((r: any) => setPermission(r.status === 'granted'));
        }} />
      </ScreenContainer>
    );
  }

  const CameraComponent = !isWeb ? require('expo-camera').Camera : null;
  const CameraType = !isWeb ? require('expo-camera').CameraType : undefined;

  return (
    <ScreenContainer>
      <Text style={{ marginBottom: 6, fontSize: 22, fontWeight: '700', color: '#111' }}>Selfie & Face Match</Text>
      {/* Attempt Counter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        {[1,2,3].map(n => (
          <View key={n} style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: attemptsUsed >= n ? (result?.passed ? '#16a34a' : '#dc2626') : '#e2e8f0',
            justifyContent: 'center', alignItems: 'center'
          }}>
            <Text style={{ color: attemptsUsed >= n ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 13 }}>{n}</Text>
          </View>
        ))}
        <Text style={{ color: '#64748b', fontSize: 13, marginLeft: 4 }}>
          {exhausted ? '3 attempts exhausted' : attemptsUsed > 0 ? `Attempt ${attemptsUsed}/3` : '3 attempts available'}
        </Text>
      </View>

      {/* Side-by-side comparison */}
      <View style={styles.compareRow}>
        <View style={styles.compareBox}>
          <Text style={styles.compareLabel}>Aadhaar Photo</Text>
          {aadhaarQrData.aadhaarPhotoBase64 ? (
            <Image source={{ uri: aadhaarQrData.aadhaarPhotoBase64 }} style={styles.compareImage} />
          ) : (
            <View style={[styles.compareImage, styles.noPhotoBox]}>
              <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 12 }}>No photo{'\n'}in QR</Text>
            </View>
          )}
        </View>
        <View style={styles.compareBox}>
          <Text style={styles.compareLabel}>Live Selfie</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.compareImage} />
          ) : (
            <View style={[styles.compareImage, styles.noPhotoBox]}>
              <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 12 }}>Not{'\n'}captured</Text>
            </View>
          )}
        </View>
      </View>

      {/* Web Camera */}
      {isWeb && !photoUri && (
        <View style={{ marginBottom: 16 }}>
          {!webCameraActive ? (
            <View>
              <Button title="📷  Open Camera for Selfie" onPress={startWebCamera} />
              {webCameraError ? (
                <Text style={{ color: '#dc2626', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{webCameraError}</Text>
              ) : null}
              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 8 }}>— or upload from gallery —</Text>
              {/* @ts-ignore */}
              <input type="file" accept="image/*" onChange={handleFileChange}
                style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }} />
            </View>
          ) : (
            <View>
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
                {/* @ts-ignore */}
                <video ref={videoRef} style={{ width: '100%', maxHeight: 300, display: 'block' }} muted playsInline />
                {/* @ts-ignore */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </View>
              <View style={{ marginTop: 10, gap: 8 }}>
                <Button title="📸  Take Photo" onPress={takeWebPhoto} />
                <Button title="Cancel" onPress={stopWebCamera} variant="secondary" />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Native Camera */}
      {!isWeb && !photoUri && CameraComponent && (
        <CameraComponent ref={cameraRef} style={styles.camera} type={CameraType?.front} ratio="16:9">
          <View style={styles.cameraOverlay} />
        </CameraComponent>
      )}

      {/* Result */}
      {result && (
        <View style={[styles.resultBox, { borderColor: result.passed ? '#16a34a' : '#dc2626' }]}>
          <Text style={styles.resultText}>Match: {result.percentage}%</Text>
          <Text style={{ color: result.passed ? '#15803d' : '#b91c1c', fontWeight: '700', fontSize: 18 }}>
            {result.passed ? '✓ PASSED — Successfully Matched' : exhausted ? '✗ 3 Attempts Exhausted' : '✗ FAILED'}
          </Text>
          <Text style={styles.thresholdText}>Threshold: {MATCH_THRESHOLD}% | Attempt {result.attemptNo}/3</Text>
          {!result.passed && !exhausted && (
            <Text style={{ marginTop: 6, color: '#f59e0b', fontWeight: '600' }}>
              {result.attemptsLeft} attempt(s) remaining
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ marginTop: 16, gap: 8 }}>
        {!photoUri ? (
          !isWeb ? <Button title="Capture Selfie" onPress={capture} /> : null
        ) : (
          <>
            {!result && <Button title="Submit for Face Match" onPress={submit} loading={loading} />}
            {result && !result.passed && !exhausted && (
              <Button title={`Retry (${result.attemptsLeft} left)`} onPress={retake} />
            )}
            {result && result.passed && (
              <View style={{ padding: 12, backgroundColor: '#dcfce7', borderRadius: 10 }}>
                <Text style={{ color: '#15803d', fontWeight: '700', textAlign: 'center' }}>
                  ✓ KYC Submitted to Salesforce
                </Text>
              </View>
            )}
            {exhausted && (
              <View style={{ padding: 12, backgroundColor: '#fee2e2', borderRadius: 10 }}>
                <Text style={{ color: '#b91c1c', fontWeight: '700', textAlign: 'center' }}>
                  ✗ All 3 attempts used. Contact branch for manual KYC.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}


const styles = StyleSheet.create({
  compareRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  compareBox: { alignItems: 'center', flex: 1, marginHorizontal: 6 },
  compareLabel: { fontWeight: '700', fontSize: 12, marginBottom: 6, color: '#475569' },
  compareImage: { width: 130, height: 160, borderRadius: 10, borderWidth: 2, borderColor: '#2dd4bf' },
  noPhotoBox: { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  camera: { width: '100%', minHeight: 260, borderRadius: 20, overflow: 'hidden' },
  cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  resultBox: { marginTop: 18, padding: 16, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 2 },
  resultText: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  thresholdText: { marginTop: 8, color: '#475569' }
});
