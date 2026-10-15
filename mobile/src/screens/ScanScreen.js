import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { extractAssetCode } from '../qr';
import { Button, ErrorText, styles } from '../ui';

/**
 * QR okutma. Etiketteki QR, cihazın web adresini (…/assets/code/IT-2026-000042) taşır; koddan cihaz çözülür.
 * Kamera izni verilmezse veya etiket hasarlıysa kod elle de girilebilir.
 */
export default function ScanScreen({ onFound, active }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const handled = useRef(false);

  const handleScan = useCallback(({ data }) => {
    if (handled.current) return; // aynı kare birden çok kez okunabilir
    const code = extractAssetCode(data);
    if (!code) {
      setError('Bu QR kod bir cihaz etiketine ait değil.');
      return;
    }
    handled.current = true;
    setError('');
    onFound(code);
    setTimeout(() => { handled.current = false; }, 1500);
  }, [onFound]);

  function submitManual() {
    const code = extractAssetCode(manual);
    if (!code) return setError('Geçerli bir cihaz kodu girin (örn. IT-2026-000042).');
    setError('');
    setManual('');
    onFound(code);
  }

  let camera;
  if (!permission) {
    camera = <Text style={styles.muted}>Kamera izni kontrol ediliyor…</Text>;
  } else if (!permission.granted) {
    camera = (
      <View style={{ gap: 8 }}>
        <Text style={styles.muted}>QR okutmak için kamera izni gerekiyor.</Text>
        {permission.canAskAgain
          ? <Button title="Kamera iznini ver" onPress={requestPermission} />
          : <Text style={styles.muted}>İzin daha önce reddedildi. Telefon ayarlarından kamera iznini açın veya kodu elle girin.</Text>}
      </View>
    );
  } else if (active) {
    camera = (
      <View style={local.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
        <View pointerEvents="none" style={local.frame} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.content]}>
      <Text style={styles.title}>QR okut</Text>
      <Text style={styles.subtitle}>Kamerayı cihaz etiketindeki QR koda tutun.</Text>
      {camera}
      <ErrorText>{error}</ErrorText>
      <View style={styles.card}>
        <Text style={styles.label}>Kodu elle girin</Text>
        <TextInput
          style={styles.input}
          value={manual}
          onChangeText={setManual}
          placeholder="IT-2026-000042"
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={submitManual}
        />
        <Button title="Cihazı aç" variant="secondary" onPress={submitManual} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  cameraBox: { height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 200, height: 200, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
});
