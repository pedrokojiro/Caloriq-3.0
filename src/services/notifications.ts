import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';

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

export type MealReminderKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type NotificationPreferences = {
  journal: boolean;
  streak: boolean;
  weeklyReport: boolean;
  aiInsights: boolean;
  water: boolean;
  mealReminders: Record<MealReminderKey, { enabled: boolean; time: string | null }>;
};

const CHANNEL_ID = 'caloriq-reminders';
const storageKey = (userId: string) => `caloriq.notification-preferences.v1.${userId}`;

export const defaultNotificationPreferences = (): NotificationPreferences => ({
  journal: false,
  streak: false,
  weeklyReport: false,
  aiInsights: false,
  water: false,
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

const dailyTrigger = (notifications: NotificationsModule, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return {
    type: notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: CHANNEL_ID,
  };
};

async function scheduleDaily(userId: string, time: string, title: string, body: string, kind: string) {
  const notifications = await loadNotifications();
  if (!notifications) throw new Error('development-build-required');
  await notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { caloriqUserId: userId, kind },
    },
    trigger: dailyTrigger(notifications, time),
  });
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  const normalized = mergePreferences(preferences);
  const needsPermission = normalized.journal || normalized.streak || normalized.weeklyReport
    || normalized.aiInsights || normalized.water
    || Object.values(normalized.mealReminders).some(item => item.enabled);

  if (needsPermission && !(await requestNotificationPermission())) {
    throw new Error('permission-denied');
  }

  await cancelUserNotifications(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  if (!needsPermission) return normalized;

  if (normalized.water) {
    const notifications = await loadNotifications();
    if (!notifications) throw new Error('development-build-required');
    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora de se hidratar 💧',
        body: 'Um copo de água agora ajuda você a manter sua meta do dia.',
        sound: 'default',
        data: { caloriqUserId: userId, kind: 'water' },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2 * 60 * 60,
        repeats: true,
        channelId: CHANNEL_ID,
      },
    });
  }

  const mealContent: Record<MealReminderKey, { title: string; body: string }> = {
    breakfast: { title: 'Café da manhã ☀️', body: 'Registre seu café da manhã e comece o dia acompanhando suas metas.' },
    lunch: { title: 'Hora do almoço 🍽️', body: 'Não esqueça de registrar sua refeição no CaloriQ.' },
    snack: { title: 'Lanche da tarde 🍎', body: 'Que tal registrar seu lanche e acompanhar os nutrientes?' },
    dinner: { title: 'Hora do jantar 🌙', body: 'Registre o jantar para completar seu diário de hoje.' },
  };

  await Promise.all((Object.keys(normalized.mealReminders) as MealReminderKey[]).map(async key => {
    const reminder = normalized.mealReminders[key];
    if (!reminder.enabled || !reminder.time) return;
    const content = mealContent[key];
    await scheduleDaily(userId, reminder.time, content.title, content.body, `meal-${key}`);
  }));

  if (normalized.journal) {
    await scheduleDaily(userId, '21:00', 'Seu diário está completo? 📝', 'Confira se todas as refeições de hoje foram registradas.', 'journal');
  }
  if (normalized.streak) {
    await scheduleDaily(userId, '21:30', 'Mantenha sua sequência 🔥', 'Abra o CaloriQ e conclua o acompanhamento de hoje.', 'streak');
  }
  if (normalized.aiInsights) {
    await scheduleDaily(userId, '10:00', 'Insight do CaloriQ IA 🤖', 'Veja como suas escolhas estão contribuindo para suas metas.', 'ai-insight');
  }
  if (normalized.weeklyReport) {
    const notifications = await loadNotifications();
    if (!notifications) throw new Error('development-build-required');
    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Seu resumo semanal está pronto 📊',
        body: 'Abra o CaloriQ para conferir calorias, macros, hidratação e evolução.',
        sound: 'default',
        data: { caloriqUserId: userId, kind: 'weekly-report' },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 18,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }
  return normalized;
}

export async function cancelNotificationSchedule(userId: string) {
  await cancelUserNotifications(userId);
}
