import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import { planNotifications, type MealReminderKey, type PlanPreferences, type TodayStatus, type WaterInterval } from '../utils/notification-plan';

type NotificationsModule = typeof import('expo-notifications');

// expoGoConfig can also expose the embedded manifest in a standalone EAS build.
// appOwnership is the native flag that identifies Expo Go specifically.
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;
let notificationsModulePromise: Promise<NotificationsModule> | null = null;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;
  notificationsModulePromise ??= import('expo-notifications');
  return notificationsModulePromise;
}

export function isNotificationRuntimeAvailable() {
  return !isExpoGo;
}

export type { MealReminderKey, TodayStatus, WaterInterval };

export type NotificationPreferences = PlanPreferences;

const CHANNEL_ID = 'caloriq-reminders';
const storageKey = (userId: string) => `caloriq.notification-preferences.v1.${userId}`;

export const defaultNotificationPreferences = (): NotificationPreferences => ({
  journal: false,
  streak: false,
  weeklyReport: false,
  aiInsights: false,
  water: false,
  waterIntervalHours: 2,
  mealReminders: {
    breakfast: { enabled: false, time: null },
    lunch: { enabled: false, time: null },
    snack: { enabled: false, time: null },
    dinner: { enabled: false, time: null },
  },
});

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function normalizeTime(hour: string, minute: string) {
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) return null;
  if (!Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) return null;
  return `${String(parsedHour).padStart(2, '0')}:${String(parsedMinute).padStart(2, '0')}`;
}

function mergePreferences(value: unknown): NotificationPreferences {
  const defaults = defaultNotificationPreferences();
  if (!value || typeof value !== 'object') return defaults;
  const stored = value as Partial<NotificationPreferences>;
  const storedMeals = stored.mealReminders && typeof stored.mealReminders === 'object'
    ? stored.mealReminders
    : defaults.mealReminders;

  const meal = (key: MealReminderKey) => {
    const candidate = storedMeals[key];
    return {
      enabled: candidate?.enabled === true && isTime(candidate.time),
      time: isTime(candidate?.time) ? candidate.time : null,
    };
  };

  return {
    journal: stored.journal === true,
    streak: stored.streak === true,
    weeklyReport: stored.weeklyReport === true,
    aiInsights: stored.aiInsights === true,
    water: stored.water === true,
    waterIntervalHours: ([1, 2, 3] as WaterInterval[]).includes(stored.waterIntervalHours as WaterInterval) ? stored.waterIntervalHours as WaterInterval : 2,
    mealReminders: {
      breakfast: meal('breakfast'),
      lunch: meal('lunch'),
      snack: meal('snack'),
      dinner: meal('dinner'),
    },
  };
}

export async function readNotificationPreferences(userId: string) {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return defaultNotificationPreferences();
  try {
    return mergePreferences(JSON.parse(raw));
  } catch {
    return defaultNotificationPreferences();
  }
}

async function ensureChannel(notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes do CaloriQ',
    description: 'Refeições, hidratação e acompanhamento nutricional.',
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#20C56B',
    sound: 'default',
  });
}

export async function configureNotifications() {
  const notifications = await loadNotifications();
  if (!notifications) return false;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await ensureChannel(notifications);
  return true;
}

export async function requestNotificationPermission() {
  const notifications = await loadNotifications();
  if (!notifications) throw new Error('development-build-required');
  await ensureChannel(notifications);
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain && current.status === 'denied') return false;
  return (await notifications.requestPermissionsAsync()).granted;
}

export async function getNotificationPermission() {
  const notifications = await loadNotifications();
  if (!notifications) return false;
  return (await notifications.getPermissionsAsync()).granted;
}

export async function scheduleTestNotification() {
  const notifications = await loadNotifications();
  if (!notifications) throw new Error('development-build-required');
  if (!(await requestNotificationPermission())) throw new Error('permission-denied');
  await notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste do CaloriQ ✅',
      body: 'As notificações estão funcionando corretamente neste celular.',
      sound: 'default',
      data: { kind: 'notification-test' },
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

async function cancelUserNotifications(userId: string) {
  const notifications = await loadNotifications();
  if (!notifications) return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(item => item.content.data?.caloriqUserId === userId)
      .map(item => notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

const hasAnyReminder = (prefs: NotificationPreferences) => prefs.journal || prefs.streak || prefs.weeklyReport
  || prefs.aiInsights || prefs.water || Object.values(prefs.mealReminders).some(item => item.enabled);

// Os replanejamentos são serializados para que dois pedidos seguidos não dupliquem lembretes.
let planQueue: Promise<unknown> = Promise.resolve();

async function schedulePlan(userId: string, prefs: NotificationPreferences, today: TodayStatus | null) {
  const notifications = await loadNotifications();
  if (!notifications) throw new Error('development-build-required');
  await cancelUserNotifications(userId);
  if (!hasAnyReminder(prefs)) return;
  for (const item of planNotifications(prefs, new Date(), today)) {
    await notifications.scheduleNotificationAsync({
      content: { title: item.title, body: item.body, sound: 'default', data: { caloriqUserId: userId, kind: item.kind, url: item.url } },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: CHANNEL_ID },
    });
  }
}

const enqueue = <T>(task: () => Promise<T>) => {
  const run = planQueue.then(task, task);
  planQueue = run.catch(() => undefined);
  return run;
};

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences, today: TodayStatus | null = null) {
  const normalized = mergePreferences(preferences);
  if (hasAnyReminder(normalized) && !(await requestNotificationPermission())) {
    throw new Error('permission-denied');
  }
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  await enqueue(() => schedulePlan(userId, normalized, today));
  return normalized;
}

// Chamado quando o app abre ou algo é registrado: refaz os próximos 7 dias
// sem pedir permissão de novo.
export async function refreshNotificationPlan(userId: string, today: TodayStatus | null) {
  if (!(await getNotificationPermission())) return;
  const prefs = await readNotificationPreferences(userId);
  if (!hasAnyReminder(prefs)) return;
  await enqueue(() => schedulePlan(userId, prefs, today));
}

// Abre a tela indicada na notificação tocada, inclusive quando ela abriu o app.
export function subscribeToNotificationTaps(open: (url: string) => void) {
  let subscription: { remove: () => void } | null = null;
  let cancelled = false;
  void loadNotifications().then(async notifications => {
    if (!notifications || cancelled) return;
    const handle = (response: { notification: { request: { content: { data?: Record<string, unknown> | null } } } } | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) open(url);
    };
    handle(await notifications.getLastNotificationResponseAsync());
    if (!cancelled) subscription = notifications.addNotificationResponseReceivedListener(handle);
  });
  return () => { cancelled = true; subscription?.remove(); };
}

export async function cancelNotificationSchedule(userId: string) {
  await enqueue(() => cancelUserNotifications(userId));
}
