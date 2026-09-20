import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { BaseScreen } from '../../src/components';
import { useAppState } from '../../src/hooks/useAppState';
import { useTheme } from '../../src/hooks/useTheme';
import { chatWithGemini, GeminiServiceError } from '../../src/services/gemini';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  time: string;
  excludeFromHistory?: boolean;
}

const MASCOT_IMAGE = require('../../assets/images/caloriq-ai-mascot.png');

export default function AIChatModal() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();
  const { state } = useAppState();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const isInitialRender = useRef(true);
  const sending = useRef(false);
  const [mascotFloat] = useState(() => new Animated.Value(0));
  const [heroEntrance] = useState(() => new Animated.Value(0));
  const [typingDots] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  const mascotSize = Math.min(156, Math.max(108, width * 0.34));
  const compactHero = width < 370;

  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Olá, ${state.profile.name}! Sou seu assistente nutricional CaloriQ. 🤖`,
      sender: 'bot',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      excludeFromHistory: true,
    },
    {
      id: '2',
      text: 'Posso ajudar com estimativas de calorias e dúvidas sobre alimentos. O que você gostaria de saber?',
      sender: 'bot',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      excludeFromHistory: true,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: -11,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mascotFloat, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    Animated.spring(heroEntrance, {
      toValue: 1,
      damping: 13,
      stiffness: 125,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
    return () => animation.stop();
  }, [heroEntrance, mascotFloat]);

  useEffect(() => {
    if (!isTyping) {
      typingDots.forEach(dot => dot.setValue(0));
      return;
    }

    const animation = Animated.loop(
      Animated.stagger(130, typingDots.map(dot => Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]))),
    );
    animation.start();
    return () => animation.stop();
  }, [isTyping, typingDots]);

  const heroTranslateY = heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const heroScale = heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] });
  const mascotScale = mascotFloat.interpolate({ inputRange: [-11, 0], outputRange: [1.055, 1] });

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputVal.trim() || sending.current) return;
    sending.current = true;

    const userText = inputVal.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: userText,
      sender: 'user',
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      // Build history for Gemini
      const geminiHistory = messages.filter(msg => !msg.excludeFromHistory).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text }]
      }));

      // Call Gemini API
      const botResponse = await chatWithGemini(userText, geminiHistory);

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        text: botResponse,
        sender: 'bot',
        time: timeStr,
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.log("Erro no chat com o Gemini:", err);
      setIsTyping(false);
      const isCapacityError = err instanceof GeminiServiceError && ['QUOTA', 'UNAVAILABLE', 'TIMEOUT'].includes(err.code);
      const errorMsg: Message = {
        excludeFromHistory: true,
        id: `msg-${Date.now() + 1}`,
        text: isCapacityError
          ? 'A IA está temporariamente ocupada ou atingiu o limite de uso. Aguarde um pouco e tente novamente; seu histórico foi preservado.'
          : err instanceof GeminiServiceError ? err.message : 'Não consegui processar a mensagem agora. Tente novamente.',
        sender: 'bot',
        time: timeStr,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      sending.current = false;
    }
  };

  return (
    <BaseScreen edges={['top', 'bottom', 'left', 'right']} style={{ backgroundColor: colors.bgApp }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderColor }]}>
          <Pressable onPress={() => router.dismiss()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textMain} />
          </Pressable>
          <View style={styles.headerInfo}>
            <LinearGradient
              colors={[globalColors.primaryGlow, globalColors.primary]}
              style={styles.botAvatar}
            >
              <Image
                source={MASCOT_IMAGE}
                style={styles.headerMascot}
                contentFit="contain"
                accessibilityLabel="Mascote do assistente NutriCaloriQ"
              />
            </LinearGradient>
            <View>
              <Text style={[styles.botName, { color: colors.textMain }]}>NutriCaloriQ IA</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: globalColors.primary }]} />
                <Text style={[styles.onlineText, { color: colors.textLight }]}>Assistente nutricional</Text>
              </View>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Messages Stream */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <Animated.View
            style={[
              styles.heroCard,
              compactHero && styles.heroCardCompact,
              { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
              { opacity: heroEntrance, transform: [{ translateY: heroTranslateY }, { scale: heroScale }] },
            ]}
            accessible
            accessibilityLabel="Q, o assistente nutricional do CaloriQ, está pronto para ajudar"
          >
            <Animated.View
              style={[
                styles.heroMascotWrap,
                { width: mascotSize, height: mascotSize, transform: [{ translateY: mascotFloat }, { scale: mascotScale }] },
              ]}
            >
              <View style={[styles.mascotGlow, { backgroundColor: `${globalColors.primary}20` }]} />
              <Image source={MASCOT_IMAGE} style={styles.heroMascot} contentFit="contain" />
            </Animated.View>
            <View style={[styles.heroCopy, compactHero && styles.heroCopyCompact]}>
              <View style={[styles.aiBadge, compactHero && styles.aiBadgeCompact, { backgroundColor: `${globalColors.primary}18` }]}>
                <View style={[styles.onlineDot, { backgroundColor: globalColors.primary }]} />
                <Text style={[styles.aiBadgeText, { color: globalColors.primary }]}>IA NUTRICIONAL</Text>
              </View>
              <Text style={[styles.heroTitle, compactHero && styles.centeredText, { color: colors.textMain }]}>Oi, eu sou o Q!</Text>
              <Text style={[styles.heroSubtitle, compactHero && styles.centeredText, { color: colors.textLight }]}>Seu parceiro para entender melhor refeições, calorias e nutrientes.</Text>
            </View>
          </Animated.View>

          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubbleWrapper,
                  isBot ? styles.alignLeft : styles.alignRight,
                ]}
              >
                {isBot && (
                  <View style={[styles.messageAvatar, { backgroundColor: `${globalColors.primary}18` }]}>
                    <Image source={MASCOT_IMAGE} style={styles.messageAvatarImage} contentFit="contain" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isBot && styles.botMessageBubble,
                    isBot
                      ? [styles.botBubble, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]
                      : [styles.userBubble, { backgroundColor: globalColors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isBot ? { color: colors.textMain } : { color: '#FFFFFF' },
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isBot ? { color: colors.textLight } : { color: 'rgba(255, 255, 255, 0.7)' },
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View style={[styles.messageBubbleWrapper, styles.alignLeft]}>
              <View style={[styles.messageAvatar, { backgroundColor: `${globalColors.primary}18` }]}>
                <Image source={MASCOT_IMAGE} style={styles.messageAvatarImage} contentFit="contain" />
              </View>
              <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, flexDirection: 'row', gap: 4 }]}>
                {typingDots.map((dot, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.typingDot,
                      {
                        backgroundColor: colors.textLight,
                        opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] }),
                        transform: [
                          { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [1, -7] }) },
                          { scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.3] }) },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input panel */}
        <View style={[styles.inputPanel, { backgroundColor: colors.bgCard, borderTopColor: colors.borderColor }]}>
          <TextInput
            value={inputVal}
            onChangeText={setInputVal}
            placeholder="Pergunte algo sobre sua dieta..."
            placeholderTextColor={colors.textLight}
            style={[styles.textInput, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={isTyping}
            style={[styles.sendBtn, { backgroundColor: globalColors.primary }]}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 0,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerMascot: {
    width: 42,
    height: 42,
  },
  botName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  heroCard: {
    width: '100%',
    minHeight: 176,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCardCompact: {
    minHeight: 250,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 18,
  },
  heroMascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascotGlow: {
    position: 'absolute',
    width: '78%',
    height: '78%',
    borderRadius: 999,
  },
  heroMascot: {
    width: '100%',
    height: '100%',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 8,
  },
  heroCopyCompact: {
    alignItems: 'center',
    paddingLeft: 0,
    marginTop: -4,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  aiBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aiBadgeCompact: {
    alignSelf: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  messageBubbleWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  alignLeft: {
    justifyContent: 'flex-start',
  },
  alignRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '88%',
    minWidth: 72,
    flexShrink: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  botMessageBubble: {
    maxWidth: '80%',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
  },
  botBubble: {
    borderWidth: 1,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 0,
  },
  messageTime: {
    minWidth: 36,
    flexShrink: 0,
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    width: '100%',
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
