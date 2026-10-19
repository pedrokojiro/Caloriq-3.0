import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../hooks/useAppState';
import { refreshNotificationPlan, subscribeToNotificationTaps } from '../services/notifications';
import { buildTodayStatus } from '../utils/notification-plan';

// Mantém os lembretes dos próximos dias em dia com o que foi registrado hoje
// e abre a tela certa quando o usuário toca numa notificação.
export function NotificationPlanner() {
  const router = useRouter();
  const { user } = useAuth();
  const { state } = useAppState();
  const userId = user?.id ?? null;
  const mealTypesKey = useMemo(() => buildTodayStatus(state.meals, 0, 0).mealTypes.join('|'), [state.meals]);
  const waterReached = state.goals.water > 0 && state.waterIntake >= state.goals.water;
  const waterIntake = state.waterIntake;
  const waterGoal = state.goals.water;

  useEffect(() => subscribeToNotificationTaps(url => router.push(url as never)), [router]);

  useEffect(() => {
    if (!userId) return;
    const status = { mealTypes: mealTypesKey ? mealTypesKey.split('|') : [], waterIntake, waterGoal };
    const run = () => { void refreshNotificationPlan(userId, status).catch(error => console.warn('Não foi possível atualizar os lembretes.', error)); };
    // Espera as gravações em sequência (vários copos de água seguidos) antes de replanejar.
    const timer = setTimeout(run, 1500);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') run(); });
    return () => { clearTimeout(timer); subscription.remove(); };
    // waterIntake entra só ao cruzar a meta, para não replanejar a cada copo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mealTypesKey, waterReached, waterGoal]);

  return null;
}
