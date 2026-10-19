import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { analyzeMealImage, GeminiServiceError } from '../../src/services/gemini';
import { useReducedMotion } from 'react-native-reanimated';
import { triggerHaptic } from '../../src/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '../../src/theme/layout';

export default function ScannerScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 720 || width < 360;
  const cameraRef = useRef<CameraView>(null);
  const permissionRequested = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [laserAnim] = useState(() => new Animated.Value(0));
  const [guidePulse] = useState(() => new Animated.Value(0));
  const [processingEntrance] = useState(() => new Animated.Value(0));
  const [shutterScale] = useState(() => new Animated.Value(1));
  const [shutterPulse] = useState(() => new Animated.Value(0));
  const [captureFlash] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      laserAnim.setValue(0.5);
      guidePulse.setValue(0.5);
      shutterPulse.setValue(0);
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain && !permissionRequested.current) {
      permissionRequested.current = true;
      void requestPermission();
    }
  }, [guidePulse, laserAnim, permission, reduceMotion, requestPermission, shutterPulse]);

  useEffect(() => {
    const laserAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(guidePulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const shutterAnimation = Animated.loop(
      Animated.timing(shutterPulse, {
        toValue: 1,
        duration: 1450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    laserAnimation.start();
    pulseAnimation.start();
    shutterAnimation.start();
    return () => {
      laserAnimation.stop();
      pulseAnimation.stop();
      shutterAnimation.stop();
    };
  }, [guidePulse, laserAnim, reduceMotion, shutterPulse]);

  useEffect(() => {
    if (!isProcessing) return;
    processingEntrance.setValue(0);
    Animated.spring(processingEntrance, {
      toValue: 1,
      damping: 16,
      stiffness: 150,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [isProcessing, processingEntrance]);

  const analyzeImage = async (uri: string, base64: string | null) => {
    setImageUri(uri);
    setIsProcessing(true);
    setProcessingStep(0);
    try {
      setTimeout(() => setProcessingStep(1), 450);
      const analysisResult = await analyzeMealImage(uri, base64, 'refeição fotografada');
      setProcessingStep(2);
      void triggerHaptic('success');
      setTimeout(() => {
        setIsProcessing(false);
        setImageUri(null);
        router.push({
          pathname: '/(modals)/meal-result',
          params: {
            foodName: analysisResult.name,
            imageUri: uri,
            scannedData: JSON.stringify(analysisResult),
          },
        });
      }, 450);
    } catch (reason) {
      setIsProcessing(false);
      setImageUri(null);
      const message = reason instanceof GeminiServiceError
        ? reason.message
        : 'Não foi possível analisar esta imagem. Tente novamente.';
      Alert.alert('Não foi possível analisar', message, [
        { text: 'Escolher da galeria', onPress: pickImage },
        { text: 'Tentar outra foto', style: 'cancel' },
      ]);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing || isProcessing) return;
    void triggerHaptic('medium');
    if (!reduceMotion) {
      captureFlash.setValue(0.38);
      Animated.timing(captureFlash, { toValue: 0, duration: 190, useNativeDriver: true }).start();
    }
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55, base64: true, shutterSound: true });
      if (photo?.uri) await analyzeImage(photo.uri, photo.base64 || null);
    } catch {
      Alert.alert('Câmera indisponível', 'Não foi possível tirar a foto. Confira a permissão e tente novamente.');
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      void triggerHaptic('selection');
      const asset = result.assets[0];
      await analyzeImage(asset.uri, asset.base64 || null);
    }
  };

  const toggleFacing = () => {
    void triggerHaptic('selection');
    setFlash('off');
    setFacing(current => current === 'back' ? 'front' : 'back');
  };
  const toggleFlash = () => {
    if (facing === 'front') {
      Alert.alert('Flash indisponível', 'Use a câmera traseira para ativar a iluminação contínua.');
      return;
    }
    void triggerHaptic('selection');
    setFlash(current => current === 'off' ? 'on' : 'off');
  };
  const animateShutter = (toValue: number) => Animated.spring(shutterScale, {
    toValue,
    damping: 14,
    stiffness: 260,
    mass: 0.6,
    useNativeDriver: true,
  }).start();
  const scanLineTranslate = laserAnim.interpolate({ inputRange: [0, 1], outputRange: [-105, 105] });
  const processingLineTranslate = laserAnim.interpolate({ inputRange: [0, 1], outputRange: [-96, 96] });
  const guideOpacity = guidePulse.interpolate({ inputRange: [0, 1], outputRange: [0.46, 1] });
  const guideScale = guidePulse.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1.025] });
  const processingScale = processingEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const shutterRingScale = shutterPulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.34] });
  const shutterRingOpacity = shutterPulse.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.75, 0] });

  // Estados explícitos: sem permissão, câmera iniciando e câmera pronta.
  // Enquadramento, laser e "IA pronta" só aparecem quando a câmera está realmente pronta.
  const granted = Boolean(permission?.granted);
  const ready = granted && cameraReady;
  const canAskAgain = permission?.canAskAgain !== false;
  const caption = !granted
    ? 'Libere a câmera ou escolha uma foto da galeria'
    : !cameraReady ? 'Preparando a câmera…' : 'Toque para fotografar e analisar';
  // Barra de abas + o botão central, que sobe 24dp acima dela.
  const bottomSpace = layout.tabBarHeight + Math.max(insets.bottom, 8);

  return (
    <BaseScreen edges={[]} style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.topButton} hitSlop={4} accessibilityRole="button" accessibilityLabel="Fechar scanner">
          <Ionicons name="close" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>Escanear refeição</Text>
          <Text style={styles.subtitle} numberOfLines={1}>Enquadre o prato inteiro</Text>
        </View>
        <Pressable
          onPress={toggleFlash}
          disabled={!ready}
          style={[styles.topButton, flash === 'on' && styles.topButtonActive, !ready && styles.disabled]}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={flash === 'on' ? 'Desligar lanterna' : 'Ligar lanterna'}
          accessibilityState={{ disabled: !ready }}
        >
          <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={22} color={flash === 'on' ? '#FFD34E' : '#FFF'} />
        </Pressable>
      </View>

      <View style={[styles.stageShell, { paddingHorizontal: compact ? 12 : 16 }]}>
        <View style={[styles.cameraStage, { maxWidth: Math.min(width - (compact ? 24 : 32), 560) }]}>
          {granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              enableTorch={flash === 'on' && facing === 'back'}
              mode="picture"
              mirror={facing === 'front'}
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => setCameraReady(false)}
            />
          ) : (
            <View style={styles.centerState}>
              <View style={styles.stateIcon}><Ionicons name="camera-outline" size={30} color="#3DD68C" /></View>
              <Text style={styles.stateTitle}>Permita o acesso à câmera</Text>
              <Text style={styles.stateText}>A imagem aparece só nesta área e é usada para analisar sua refeição.</Text>
              <Pressable
                onPress={() => { if (canAskAgain) void requestPermission(); else void Linking.openSettings(); }}
                style={[styles.permissionButton, { backgroundColor: globalColors.action }]}
                accessibilityRole="button"
              >
                <Text style={styles.permissionButtonText}>{canAskAgain ? 'Liberar câmera' : 'Abrir configurações'}</Text>
              </Pressable>
            </View>
          )}

          {granted && !cameraReady ? (
            <View style={[styles.centerState, styles.loadingState]} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color="#3DD68C" />
              <Text style={styles.loadingText}>Preparando câmera…</Text>
            </View>
          ) : null}

          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.captureFlash, { opacity: captureFlash }]} />

          {ready ? (
            <>
              <View pointerEvents="none" style={styles.cameraShade} />
              <Animated.View pointerEvents="none" style={[styles.guideFrame, { opacity: guideOpacity, transform: [{ scale: guideScale }] }]}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {reduceMotion ? null : <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]} />}
              </Animated.View>
              <View pointerEvents="none" style={styles.readyChip}>
                <Animated.View style={[styles.aiDot, { opacity: guideOpacity }]} />
                <Text style={styles.readyChipText}>IA pronta</Text>
              </View>
              <View pointerEvents="none" style={styles.cameraHint}>
                <Text style={styles.cameraHintTitle}>Centralize toda a refeição</Text>
                <Text style={styles.cameraHintText}>Boa iluminação melhora a identificação</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={[styles.controls, { paddingTop: compact ? 8 : 12, paddingBottom: bottomSpace + 28 }]}>
        <View style={styles.controlsRow}>
          <Pressable onPress={() => void pickImage()} style={styles.sideControl} disabled={isProcessing} accessibilityRole="button" accessibilityLabel="Escolher foto da galeria">
            <Ionicons name="images-outline" size={26} color="#FFF" />
            <Text style={styles.sideControlText}>Galeria</Text>
          </Pressable>

          <View style={styles.shutterWrap}>
            {ready ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.shutterPulseRing, { opacity: shutterRingOpacity, transform: [{ scale: shutterRingScale }] }]}
              />
            ) : null}
            <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
              <Pressable
                onPress={() => void capturePhoto()}
                onPressIn={() => animateShutter(0.84)}
                onPressOut={() => animateShutter(1)}
                disabled={!ready || capturing || isProcessing}
                style={[styles.shutterOuter, !ready && styles.shutterOuterDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Fotografar e analisar refeição"
                accessibilityState={{ disabled: !ready || capturing || isProcessing }}
              >
                <View style={[styles.shutterInner, !ready && styles.shutterInnerDisabled]}>
                  {capturing || (granted && !cameraReady)
                    ? <ActivityIndicator color={ready ? '#0D1117' : '#A3ADA7'} />
                    : <Ionicons name="camera" size={26} color={ready ? '#0D1117' : '#A3ADA7'} />}
                </View>
              </Pressable>
            </Animated.View>
          </View>

          <Pressable
            onPress={toggleFacing}
            style={[styles.sideControl, !ready && styles.disabled]}
            disabled={isProcessing || !ready}
            accessibilityRole="button"
            accessibilityLabel="Inverter câmera"
            accessibilityState={{ disabled: isProcessing || !ready }}
          >
            <Ionicons name="camera-reverse-outline" size={27} color="#FFF" />
            <Text style={styles.sideControlText}>Inverter</Text>
          </Pressable>
        </View>
        <Text style={styles.captureLabel}>{caption}</Text>
      </View>

      {isProcessing ? (
        <Animated.View style={[styles.processingOverlay, { opacity: processingEntrance }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <Animated.View style={[styles.processingPreview, { transform: [{ scale: processingScale }] }]}>
            {imageUri ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.processingDim} />
            {reduceMotion ? null : <Animated.View style={[styles.processingScanLine, { transform: [{ translateY: processingLineTranslate }] }]} />}
            <View style={styles.processingSpinner}><ActivityIndicator size="large" color="#FFF" /></View>
          </Animated.View>
          <Text style={styles.processingTitle}>Analisando sua refeição</Text>
          <Text style={styles.processingText}>{processingStep === 0 ? 'Identificando alimentos…' : processingStep === 1 ? 'Calculando nutrientes…' : 'Preparando o resultado…'}</Text>
          <View style={styles.progressDots}>
            {[0, 1, 2].map(step => <View key={step} style={[styles.progressDot, processingStep >= step && { backgroundColor: '#3DD68C' }]} />)}
          </View>
        </Animated.View>
      ) : null}
    </BaseScreen>
  );
}

// Tema câmera: escuro nos dois temas do app. Textos auxiliares em 12sp com contraste >= 8:1.
const CAMERA = { bg: '#050706', surface: '#151A17', border: '#2A312D', text2: '#C2CBC6', text3: '#A3ADA7', brand: '#3DD68C' };

const styles = StyleSheet.create({
  screen: { backgroundColor: CAMERA.bg },
  topBar: { paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: CAMERA.surface, borderWidth: 1, borderColor: CAMERA.border, alignItems: 'center', justifyContent: 'center' },
  topButtonActive: { backgroundColor: '#2B2714', borderColor: '#5C5120' },
  disabled: { opacity: 0.45 },
  titleArea: { flex: 1, alignItems: 'center', minWidth: 0 },
  title: { color: '#FFF', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  subtitle: { color: CAMERA.text2, fontSize: 12, lineHeight: 16, marginTop: 1 },
  stageShell: { flex: 1, paddingVertical: 4, alignItems: 'center' },
  cameraStage: { flex: 1, width: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: CAMERA.surface, borderWidth: 1, borderColor: CAMERA.border, position: 'relative' },
  cameraShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  loadingState: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: CAMERA.surface },
  stateIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#193524', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateTitle: { color: '#FFF', fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  stateText: { color: CAMERA.text2, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  loadingText: { color: '#FFF', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  permissionButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  guideFrame: { position: 'absolute', left: '13%', right: '13%', top: 64, bottom: 84, justifyContent: 'center' },
  corner: { position: 'absolute', width: 36, height: 36, borderWidth: 0, borderColor: CAMERA.brand },
  cornerTL: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 16 },
  scanLine: { height: 3, left: 10, right: 10, position: 'absolute', top: '50%', borderRadius: 2, backgroundColor: CAMERA.brand, shadowColor: CAMERA.brand, shadowOpacity: 1, shadowRadius: 14, elevation: 6 },
  readyChip: { position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(4,8,6,0.80)' },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CAMERA.brand },
  readyChipText: { color: '#FFF', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  cameraHint: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(4,8,6,0.80)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  cameraHintTitle: { color: '#FFF', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  cameraHintText: { color: CAMERA.text2, fontSize: 12, lineHeight: 16, marginTop: 2, textAlign: 'center' },
  controls: { paddingHorizontal: 16 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sideControl: { width: 72, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4 },
  sideControlText: { color: CAMERA.text2, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  shutterWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  shutterPulseRing: { position: 'absolute', width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: CAMERA.brand },
  shutterOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFF', padding: 6, alignItems: 'center', justifyContent: 'center' },
  shutterOuterDisabled: { borderColor: '#5C6660' },
  shutterInner: { width: '100%', height: '100%', borderRadius: 34, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  shutterInnerDisabled: { backgroundColor: CAMERA.border },
  captureLabel: { color: CAMERA.text2, fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  processingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5,7,6,0.96)', zIndex: 30, alignItems: 'center', justifyContent: 'center', padding: 30 },
  processingPreview: { width: 210, height: 210, borderRadius: 32, overflow: 'hidden', backgroundColor: CAMERA.surface, marginBottom: 24 },
  processingDim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  processingScanLine: { position: 'absolute', left: 12, right: 12, top: '50%', height: 2, borderRadius: 2, backgroundColor: CAMERA.brand, shadowColor: CAMERA.brand, shadowOpacity: 1, shadowRadius: 12, elevation: 5 },
  processingSpinner: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  processingTitle: { color: '#FFF', fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  processingText: { color: CAMERA.text2, fontSize: 14, lineHeight: 20, marginTop: 6 },
  captureFlash: { backgroundColor: '#FFFFFF', zIndex: 12 },
  progressDots: { flexDirection: 'row', gap: 7, marginTop: 20 },
  progressDot: { width: 24, height: 5, borderRadius: 3, backgroundColor: '#2D332F' },
});
