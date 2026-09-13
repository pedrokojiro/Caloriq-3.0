import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'caloriq.auth.token.v1';

export const readAuthToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const saveAuthToken = (token: string) => AsyncStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => AsyncStorage.removeItem(TOKEN_KEY);
