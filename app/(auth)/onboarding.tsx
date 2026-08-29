import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseScreen, Button, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, globalColors } = useTheme();

  const handleStart = () => {
    router.push('/(auth)/login');
  };

  return (
    <BaseScreen 
      scrollable 
      style={{ backgroundColor: '#FFFFFF' }} // Onboarding matches HTML white background
      contentContainerStyle={styles.content}
    >
      {/* Top Header - Status Bar styling & Logo */}
      <View style={styles.header}>
        <LinearGradient
          colors={[globalColors.primaryGlow, globalColors.primary, globalColors.primaryDark]}
          style={styles.logoContainer}
        >
          <Svg width={46} height={46} viewBox="0 0 46 46" fill="none">
            <Path d="M23 6C13.6 6 6 13.6 6 23s7.6 17 17 17 17-7.6 17-17S32.4 6 23 6z" fill="rgba(255,255,255,0.15)"/>
            <Path d="M23 12c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zm0 17a6 6 0 110-12 6 6 0 010 12z" fill="#fff"/>
            <Circle cx="23" cy="23" r="3.5" fill="#fff"/>
            <Path d="M23 6v5M23 35v5M6 23H1M45 23h-5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          </Svg>
        </LinearGradient>

        <View style={styles.badge}>
          <View style={[styles.aiDot, { backgroundColor: globalColors.primary }]} />
          <Text style={[styles.badgeText, { color: globalColors.primary }]}>IA NUTRICIONAL</Text>
        </View>

        <Text style={styles.title}>
          Conheça seu{'\n'}
          <Text style={{ color: globalColors.primary }}>CaloriQ</Text>
        </Text>
        
        <Text style={styles.subtitle}>
          Escaneie qualquer refeição com IA.{'\n'}Veja macros em segundos.
        </Text>
      </View>

      {/* Feature Cards Container */}
      <Card style={styles.featuresCard}>
        {/* Feature 1 */}
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { borderColor: `${globalColors.primary}25`, backgroundColor: `${globalColors.primary}10` }]}>
            <Text style={styles.featureEmoji}>📷</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Escaneie qualquer refeição</Text>
            <Text style={styles.featureDesc}>IA identifica alimentos e calcula nutrientes instantaneamente</Text>
          </View>
        </View>

        {/* Feature 2 */}
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { borderColor: `${globalColors.carbs}25`, backgroundColor: `${globalColors.carbs}10` }]}>
            <Text style={styles.featureEmoji}>📊</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Acompanhe sua evolução</Text>
            <Text style={styles.featureDesc}>Gráficos de macros, calorias e metas ao longo do tempo</Text>
          </View>
        </View>

        {/* Feature 3 */}
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { borderColor: `${globalColors.protein}25`, backgroundColor: `${globalColors.protein}10` }]}>
            <Text style={styles.featureEmoji}>🎯</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Metas personalizadas</Text>
            <Text style={styles.featureDesc}>Objetivos sob medida baseados no seu perfil e histórico</Text>
          </View>
        </View>
      </Card>

      {/* Page indicators */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.activeDot, { backgroundColor: globalColors.primary }]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        <Button 
          title="Começar agora" 
          onPress={handleStart}
          variant="primary"
          style={styles.ctaButton}
          icon={
            <Svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24">
              <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </Svg>
          }
        />
        <Button 
          title="Já tenho uma conta" 
          onPress={handleStart}
          variant="ghost"
        />
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 44,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#1AAF5D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDFBF3',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0D1117',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7585',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAEE',
    borderWidth: 1,
    padding: 20,
    marginVertical: 24,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1117',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7585',
    marginTop: 3,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E4E8',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 24,
    borderRadius: 4,
  },
  footer: {
    width: '100%',
  },
  ctaButton: {
    marginBottom: 12,
  },
});
