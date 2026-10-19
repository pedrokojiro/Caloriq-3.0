import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';

// Login com Google pelo SDK nativo do Android. Precisa de um APK (não funciona
// no Expo Go nem na web) e do Client ID "Web" do Google Cloud em EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

export const isGoogleSignInAvailable = Platform.OS === 'android' && !isExpoGo && webClientId.length > 0;

let configured = false;
async function loadSdk() {
  const sdk = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    sdk.GoogleSignin.configure({ webClientId, offlineAccess: false });
    configured = true;
  }
  return sdk;
}

// Retorna o ID token do Google, ou null se o usuário cancelar.
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await loadSdk();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) return null;
    if (!result.data.idToken) throw new Error('O Google não retornou a identificação da conta.');
    return result.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Atualize o Google Play Services para entrar com Google.');
    }
    throw error instanceof Error ? error : new Error('Não foi possível entrar com Google.');
  }
}

// Ao sair do CaloriQ, desconecta a conta Google para o seletor aparecer no próximo login.
export async function signOutFromGoogle() {
  if (!isGoogleSignInAvailable) return;
  try {
    const { GoogleSignin } = await loadSdk();
    await GoogleSignin.signOut();
  } catch { /* Sem sessão Google ativa. */ }
}
