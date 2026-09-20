import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BaseScreen } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { analyzeMealImage, GeminiServiceError } from '../../src/services/gemini';

export default function ScannerScreen() {
  const router = useRouter();
  const { globalColors } = useTheme();
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

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !permissionRequested.current) {
      permissionRequested.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

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
  }, [guidePulse, laserAnim, shutterPulse]);

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
      const asset = result.assets[0];
      await analyzeImage(asset.uri, asset.base64 || null);
    }
  };

  const toggleFacing = () => setFacing(current => current === 'back' ? 'front' : 'back');
  const toggleFlash = () => setFlash(current => current === 'off' ? 'on' : 'off');
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

  return (
    <BaseScreen edges={[]} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.topButton}>
          <Ionicons name="close" size={26} color="#FFF" />
        </Pressable>
        <View style={styles.titleArea}>
          <Text style={styles.title}>Escanear refeição</Text>
          <Text style={styles.subtitle}>Enquadre o prato para analisar</Text>
        </View>
        <Pressable onPress={toggleFlash} style={[styles.topButton, flash === 'on' && styles.topButtonActive]}>
          <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={22} color={flash === 'on' ? '#FFD34E' : '#FFF'} />
        </Pressable>
      </View>

      <View style={styles.stageShell}>
        <View style={styles.cameraStage}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode="picture"
              mirror={facing === 'front'}
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => setCameraReady(false)}
            />
          ) : (
            <View style={styles.permissionState}>
              <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={32} color={globalColors.primary} /></View>
              <Text style={styles.permissionTitle}>Permita o acesso à câmera</Text>
              <Text style={styles.permissionText}>A imagem aparece somente nesta área e é usada para analisar sua refeição.</Text>
              <Pressable onPress={() => void requestPermission()} style={[styles.permissionButton, { backgroundColor: globalColors.primary }]}>
                <Text style={styles.permissionButtonText}>Liberar câmera</Text>
              </Pressable>
            </View>
          )}

          <View pointerEvents="none" style={styles.cameraShade} />
          <Animated.View pointerEvents="none" style={[styles.guideFrame, { opacity: guideOpacity, transform: [{ scale: guideScale }] }]}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: globalColors.primaryGlow }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: globalColors.primaryGlow }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: globalColors.primaryGlow }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: globalColors.primaryGlow }]} />
            <Animated.View style={[styles.scanLine, { backgroundColor: globalColors.primaryGlow, transform: [{ translateY: scanLineTranslate }] }]} />
          </Animated.View>

          <View pointerEvents="none" style={styles.cameraHint}>
            <View style={styles.aiBadge}><Animated.View style={[styles.aiDot, { backgroundColor: globalColors.primaryGlow, opacity: guideOpacity }]} /><Text style={styles.aiBadgeText}>IA PRONTA</Text></View>
            <Text style={styles.cameraHintTitle}>Centralize toda a refeição</Text>
            <Text style={styles.cameraHintText}>Boa iluminação melhora a identificação</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <Pressable onPress={() => void pickImage()} style={styles.sideControl} disabled={isProcessing}>
            <Ionicons name="images-outline" size={25} color="#FFF" />
            <Text style={styles.sideControlText}>Galeria</Text>
          </Pressable>

          <View style={styles.shutterWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shutterPulseRing,
                { borderColor: globalColors.primaryGlow, opacity: shutterRingOpacity, transform: [{ scale: shutterRingScale }] },
              ]}
            />
            <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
              <Pressable
                onPress={() => void capturePhoto()}
                onPressIn={() => animateShutter(0.84)}
                onPressOut={() => animateShutter(1)}
                disabled={!permission?.granted || !cameraReady || capturing || isProcessing}
                style={styles.shutterOuter}
              >
                <View style={[styles.shutterInner, (!cameraReady || capturing) && styles.shutterDisabled]}>
                  {capturing ? <ActivityIndicator color="#0D1117" /> : <Ionicons name="sparkles" size={23} color="#0D1117" />}
                </View>
              </Pressable>
            </Animated.View>
          </View>

          <Pressable onPress={toggleFacing} style={styles.sideControl} disabled={isProcessing}>
            <Ionicons name="camera-reverse-outline" size={27} color="#FFF" />
            <Text style={styles.sideControlText}>Inverter</Text>
          </Pressable>
        </View>
        <Text style={styles.captureLabel}>Toque para fotografar e analisar</Text>
      </View>

      {isProcessing ? (
        <Animated.View style={[styles.processingOverlay, { opacity: processingEntrance }]}>
          <Animated.View style={[styles.processingPreview, { transform: [{ scale: processingScale }] }]}>
            {imageUri ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.processingDim} />
            <Animated.View style={[styles.processingScanLine, { backgroundColor: globalColors.primaryGlow, transform: [{ translateY: processingLineTranslate }] }]} />
            <View style={styles.processingSpinner}><ActivityIndicator size="large" color="#FFF" /></View>
          </Animated.View>
          <Text style={styles.processingTitle}>Analisando sua refeição</Text>
          <Text style={styles.processingText}>{processingStep === 0 ? 'Identificando alimentos…' : processingStep === 1 ? 'Calculando nutrientes…' : 'Preparando o resultado…'}</Text>
          <View style={styles.progressDots}>
            {[0, 1, 2].map(step => <View key={step} style={[styles.progressDot, processingStep >= step && { backgroundColor: globalColors.primary }]} />)}
          </View>
        </Animated.View>
      ) : null}
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#050706' },
  topBar: { height: Platform.OS === 'ios' ? 108 : 94, paddingTop: Platform.OS === 'ios' ? 48 : 34, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#171B19', borderWidth: 1, borderColor: '#303632', alignItems: 'center', justifyContent: 'center' },
  topButtonActive: { backgroundColor: '#2B2714', borderColor: '#5C5120' },
  titleArea: { alignItems: 'center' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: '#8E9792', fontSize: 10, marginTop: 3 },
  stageShell: { flex: 1, paddingHorizontal: 14, paddingVertical: 8 },
  cameraStage: { flex: 1, minHeight: 390, borderRadius: 30, overflow: 'hidden', backgroundColor: '#111512', borderWidth: 1, borderColor: '#252B27', position: 'relative' },
  cameraShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  guideFrame: { position: 'absolute', left: '12%', right: '12%', top: '18%', bottom: '27%', justifyContent: 'center' },
  corner: { position: 'absolute', width: 42, height: 42, borderWidth: 0 },
  cornerTL: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 },
  cornerTR: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 },
  cornerBL: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 },
  cornerBR: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 },
  scanLine: { height: 4, left: 8, right: 8, position: 'absolute', top: '50%', borderRadius: 3, shadowColor: '#27C76B', shadowOpacity: 1, shadowRadius: 16, elevation: 8 },
  cameraHint: { position: 'absolute', left: 20, right: 20, bottom: 20, backgroundColor: 'rgba(4,8,6,0.66)', borderRadius: 18, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  aiDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  aiBadgeText: { color: '#B8C3BD', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  cameraHintTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cameraHintText: { color: '#ABB3AF', fontSize: 11, marginTop: 3 },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#101411' },
  permissionIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#193524', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  permissionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  permissionText: { color: '#9AA39E', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  permissionButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  permissionButtonText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  controls: { paddingHorizontal: 26, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 108 : 100 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sideControl: { width: 72, alignItems: 'center', gap: 5 },
  sideControlText: { color: '#AEB6B1', fontSize: 10, fontWeight: '700' },
  shutterOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: '#FFF', padding: 6, alignItems: 'center', justifyContent: 'center' },
  shutterWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  shutterPulseRing: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 3 },
  shutterInner: { width: '100%', height: '100%', borderRadius: 34, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.45 },
  captureLabel: { color: '#747D78', fontSize: 10, textAlign: 'center', marginTop: 10 },
  processingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5,7,6,0.96)', zIndex: 30, alignItems: 'center', justifyContent: 'center', padding: 30 },
  processingPreview: { width: 210, height: 210, borderRadius: 32, overflow: 'hidden', backgroundColor: '#151A17', marginBottom: 24 },
  processingDim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  processingScanLine: { position: 'absolute', left: 12, right: 12, top: '50%', height: 2, borderRadius: 2, shadowColor: '#27C76B', shadowOpacity: 1, shadowRadius: 12, elevation: 5 },
  processingSpinner: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  processingTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  processingText: { color: '#9EA8A2', fontSize: 13, marginTop: 7 },
  progressDots: { flexDirection: 'row', gap: 7, marginTop: 20 },
  progressDot: { width: 24, height: 5, borderRadius: 3, backgroundColor: '#2D332F' },
});
