import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Easing, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAppState } from '../../src/hooks/useAppState';
import { BaseScreen, Button } from '../../src/components';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { analyzeMealImage } from '../../src/services/gemini';

const PRESETS = [
  { name: 'Salada com Frango', emoji: '🥗' },
  { name: 'Hambúrguer com Fritas', emoji: '🍔' },
  { name: 'Ovos Mexidos com Torrada', emoji: '🍳' },
  { name: 'Iogurte com Granola', emoji: '🥣' },
  { name: 'Salmão com Aspargos', emoji: '🍣' },
];

export default function ScannerScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { mockScannerScan } = useAppState();

  const [activeSource, setActiveSource] = useState<'camera' | 'gallery' | 'manual'>('camera');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [scanningPreset, setScanningPreset] = useState(PRESETS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Web Webcam integration states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Viewfinder Emoji Rotation (when not processing, simulate AI detection)
  const [viewfinderEmoji, setViewfinderEmoji] = useState('🥗');

  // Animation values
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track active state to cycle detection emojis
  useEffect(() => {
    if (isProcessing) return;

    const interval = setInterval(() => {
      setViewfinderEmoji((prev) => {
        const nextIndex = (PRESETS.findIndex(p => p.emoji === prev) + 1) % PRESETS.length;
        return PRESETS[nextIndex].emoji;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  // Laser animation loop
  useEffect(() => {
    const startLaserAnimation = () => {
      laserAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 245,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startLaserAnimation();
  }, [laserAnim]);

  // Viewfinder corners pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const startScanningWithImage = async (uri: string) => {
    const preset = PRESETS[selectedPresetIndex];
    setScanningPreset(preset);
    setIsProcessing(true);
    setProcessingStep(0);

    try {
      // Simulate step 1 (detecting food)
      setTimeout(() => setProcessingStep(1), 500);
      
      const analysisResult = await analyzeMealImage(uri, preset.name);
      
      // Complete step 2 and 3
      setProcessingStep(2);
      
      setTimeout(() => {
        setIsProcessing(false);
        // Navigate to modal meal-result passing the real analyzed details
        router.push({
          pathname: '/(modals)/meal-result',
          params: { 
            foodName: analysisResult.name, 
            imageUri: uri,
            scannedData: JSON.stringify(analysisResult)
          },
        });
      }, 600);
    } catch (err) {
      console.log("Erro no escaneamento com Gemini:", err);
      setIsProcessing(false);
      Alert.alert(
        "Erro de Análise", 
        "Não foi possível analisar a imagem com o Gemini. Tente novamente ou use outra foto."
      );
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para usar a câmera para tirar fotos.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        startScanningWithImage(uri);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      if (Platform.OS === 'web') {
        Alert.alert(
          'Câmera indisponível',
          'Não foi possível acessar a webcam. Se você estiver em um computador de mesa sem webcam, use a opção "Galeria" para enviar um arquivo de imagem, ou execute o app pelo celular (Expo Go).'
        );
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao abrir a câmera.');
      }
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua galeria.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        startScanningWithImage(uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir a galeria.');
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 480, height: 480 } 
      });
      setWebcamStream(stream);
      setIsWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.log('Error starting webcam:', err);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track: any) => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  };

  const captureWebcam = () => {
    if (videoRef.current && webcamStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror image for a natural look
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageUri(dataUrl);
        stopWebcam();
        startScanningWithImage(dataUrl);
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (activeSource === 'camera' && !isProcessing && !imageUri) {
        if (!isWebcamActive && !webcamStream) {
          startWebcam();
        }
      } else {
        stopWebcam();
      }
    }
  }, [activeSource, isProcessing, imageUri]);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && webcamStream) {
        webcamStream.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, [webcamStream]);

  const handleCapture = () => {
    // If not using real camera/gallery, run standard simulation
    const preset = PRESETS[selectedPresetIndex];
    setScanningPreset(preset);
    setIsProcessing(true);
    setProcessingStep(0);

    // Simulate AI loading steps
    setTimeout(() => {
      setProcessingStep(1); // 73% calculated
      setTimeout(() => {
        setProcessingStep(2); // Completed
        setTimeout(() => {
          setIsProcessing(false);
          // Navigate to modal meal-result passing the pre-selected name
          router.push({
            pathname: '/(modals)/meal-result',
            params: { foodName: preset.name },
          });
        }, 600);
      }, 800);
    }, 800);
  };

  const selectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setViewfinderEmoji(PRESETS[index].emoji);
    setImageUri(null);
    if (Platform.OS === 'web') {
      stopWebcam();
    }
  };

  const getButtonProps = () => {
    if (Platform.OS === 'web') {
      if (activeSource === 'gallery') {
        return {
          title: "Adicionar arquivo da Galeria",
          icon: <Ionicons name="image" size={20} color="#FFFFFF" />,
          onPress: pickImage
        };
      } else { // camera
        if (isWebcamActive) {
          return {
            title: "Capturar da Webcam",
            icon: <Ionicons name="camera" size={20} color="#FFFFFF" />,
            onPress: captureWebcam
          };
        } else {
          return {
            title: "Iniciar Webcam",
            icon: <Ionicons name="videocam" size={20} color="#FFFFFF" />,
            onPress: startWebcam
          };
        }
      }
    } else {
      // Native platforms
      if (activeSource === 'gallery') {
        return {
          title: "Adicionar arquivo da Galeria",
          icon: <Ionicons name="image" size={20} color="#FFFFFF" />,
          onPress: pickImage
        };
      } else {
        return {
          title: "Tirar foto com a Câmera",
          icon: <Ionicons name="camera" size={20} color="#FFFFFF" />,
          onPress: takePhoto
        };
      }
    }
  };

  return (
    <BaseScreen edges={[]} style={styles.darkBackground}>
      {/* Absolute top bar */}
      <View style={styles.topBar}>
        <Pressable 
          onPress={() => router.replace('/(tabs)')}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topTitle}>Escanear refeição</Text>
        <Pressable style={styles.flashBtn}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
        </Pressable>
      </View>

      {/* Preset selector overlay (AI simulator helper) */}
      <View style={styles.presetOverlay}>
        <Text style={styles.presetTitle}>SELECIONE PARA TESTAR A IA:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {PRESETS.map((preset, idx) => {
            const isSelected = selectedPresetIndex === idx;
            return (
              <Pressable
                key={preset.name}
                onPress={() => selectPreset(idx)}
                style={[
                  styles.presetChip,
                  isSelected && { backgroundColor: globalColors.primary, borderColor: globalColors.primary }
                ]}
              >
                <Text style={styles.presetChipText}>
                  {preset.emoji} {preset.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Viewport */}
      <View style={styles.viewport}>
        {/* Viewfinder frame */}
        <View style={styles.viewfinder}>
          {/* Corners */}
          <Animated.View style={[styles.cornerTL, { borderColor: globalColors.primaryGlow, opacity: pulseAnim }]} />
          <Animated.View style={[styles.cornerTR, { borderColor: globalColors.primaryGlow, opacity: pulseAnim }]} />
          <Animated.View style={[styles.cornerBL, { borderColor: globalColors.primaryGlow, opacity: pulseAnim }]} />
          <Animated.View style={[styles.cornerBR, { borderColor: globalColors.primaryGlow, opacity: pulseAnim }]} />

          {/* Laser animated line */}
          <Animated.View 
            style={[
              styles.laserLine, 
              { 
                top: laserAnim,
                backgroundColor: globalColors.primaryGlow,
                shadowColor: globalColors.primaryGlow,
              }
            ]} 
          />

          {/* Food Emoji or Captured/Selected Image or Webcam Video */}
          {Platform.OS === 'web' && isWebcamActive ? (
            <video
              ref={videoRef as any}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 16,
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror effect for selfie webcam
              }}
            />
          ) : imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.viewfinderImage} 
              contentFit="cover"
            />
          ) : (
            <Text style={styles.viewfinderEmoji}>
              {isProcessing ? scanningPreset.emoji : viewfinderEmoji}
            </Text>
          )}
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsHeader}>Aponte para sua refeição</Text>
          <Text style={styles.instructionsSub}>A IA vai identificar os alimentos automaticamente</Text>
        </View>
      </View>

      {/* Processing Screen Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <View style={styles.processingEmojiContainer}>
              <Text style={{ fontSize: 64 }}>{scanningPreset.emoji}</Text>
            </View>
            <View style={styles.dotsRow}>
              <View style={[styles.pulseDot, { backgroundColor: globalColors.primary }]} />
              <View style={[styles.pulseDot, { backgroundColor: globalColors.primary, animationDelay: '0.2s' } as any]} />
              <View style={[styles.pulseDot, { backgroundColor: globalColors.primary, animationDelay: '0.4s' } as any]} />
            </View>

            <Text style={styles.processingTitle}>Processando imagem</Text>
            <Text style={styles.processingSub}>Nossa IA está identificando os alimentos e calculando os macros...</Text>

            <View style={styles.loadingSteps}>
              {/* Step 1 */}
              <View style={styles.stepRow}>
                <Ionicons 
                  name={processingStep >= 0 ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={processingStep >= 0 ? globalColors.primary : '#E2E4E8'} 
                />
                <Text style={[styles.stepText, processingStep >= 0 && { fontWeight: '700' }]}>
                  Detectando alimentos (100%)
                </Text>
              </View>

              {/* Step 2 */}
              <View style={styles.stepRow}>
                {processingStep >= 1 ? (
                  <Ionicons name="checkmark-circle" size={20} color={globalColors.primary} />
                ) : (
                  <ActivityIndicator size="small" color={globalColors.primary} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.stepText, processingStep >= 1 && { fontWeight: '700' }]}>
                  Calculando nutrientes {processingStep >= 1 ? '(100%)' : '(73%)'}
                </Text>
              </View>

              {/* Step 3 */}
              <View style={styles.stepRow}>
                <Ionicons 
                  name={processingStep >= 2 ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={processingStep >= 2 ? globalColors.primary : '#CBD0D8'} 
                />
                <Text style={[styles.stepText, { color: processingStep >= 2 ? '#000000' : '#CBD0D8' }]}>
                  Estimando porções
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Source Selector */}
        <View style={styles.sourcesRow}>
          <Pressable 
            onPress={() => {
              setActiveSource('camera');
              setImageUri(null);
              if (Platform.OS === 'web') {
                stopWebcam();
              }
            }}
            style={[styles.sourceBtn, activeSource === 'camera' && styles.sourceBtnActive]}
          >
            <Text style={{ fontSize: 24, marginBottom: 5 }}>📷</Text>
            <Text style={styles.sourceBtnText}>Câmera</Text>
          </Pressable>
          <Pressable 
            onPress={() => {
              setActiveSource('gallery');
              setImageUri(null);
              if (Platform.OS === 'web') {
                stopWebcam();
              }
            }}
            style={[styles.sourceBtn, activeSource === 'gallery' && styles.sourceBtnActive]}
          >
            <Text style={{ fontSize: 24, marginBottom: 5 }}>🖼️</Text>
            <Text style={styles.sourceBtnText}>Galeria</Text>
          </Pressable>
          <Pressable 
            onPress={() => {
              setActiveSource('manual');
              setImageUri(null);
              if (Platform.OS === 'web') {
                stopWebcam();
              }
              router.push({
                pathname: '/(modals)/meal-edit',
                params: { mode: 'create' }
              });
            }}
            style={[styles.sourceBtn, activeSource === 'manual' && styles.sourceBtnActive]}
          >
            <Text style={{ fontSize: 24, marginBottom: 5 }}>✏️</Text>
            <Text style={styles.sourceBtnText}>Manual</Text>
          </Pressable>
        </View>

        {/* Action Button */}
        <Button
          title={getButtonProps().title}
          onPress={getButtonProps().onPress}
          variant="primary"
          style={styles.captureButton}
          icon={getButtonProps().icon}
        />
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  darkBackground: {
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 94,
    paddingTop: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  flashBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetOverlay: {
    position: 'absolute',
    top: 102,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  presetTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  presetChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  viewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  viewfinder: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  laserLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2.5,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  viewfinderEmoji: {
    fontSize: 82,
    opacity: 0.85,
  },
  viewfinderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsHeader: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
  },
  instructionsSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bottomPanel: {
    backgroundColor: '#111111',
    padding: 20,
    paddingBottom: 110, // Account for bottom tab menu
  },
  sourcesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  sourceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sourceBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sourceBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  captureButton: {
    height: 54,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 28,
  },
  processingCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  processingEmojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0D1117',
    marginBottom: 8,
  },
  processingSub: {
    fontSize: 14,
    color: '#6B7585',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingSteps: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontSize: 14,
    color: '#0D1117',
  },
});
