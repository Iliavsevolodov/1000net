import PocketBase from 'pocketbase';

export type CloudProgressState = {
  noCount: number;
  themeId: string;
  darkMode: boolean;
  startDate: string;
};

export type CloudDailyLog = {
  date: string;
  count: number;
};

export type CloudUserData = {
  progress: CloudProgressState;
  savedQuotes: string[];
  dailyLogs: CloudDailyLog[];
};

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL;

export function isPocketBaseEnabled() {
  return Boolean(pocketBaseUrl);
}

export const pb = pocketBaseUrl ? new PocketBase(pocketBaseUrl) : null;

export function getCurrentPocketBaseUserId() {
  return pb?.authStore.model?.id ?? null;
}

export async function registerPocketBaseUser(email: string, password: string) {
  if (!pb) throw new Error('PocketBase URL is not configured.');

  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
  });

  return pb.collection('users').authWithPassword(email, password);
}

export async function loginPocketBaseUser(email: string, password: string) {
  if (!pb) throw new Error('PocketBase URL is not configured.');
  return pb.collection('users').authWithPassword(email, password);
}

export function logoutPocketBaseUser() {
  pb?.authStore.clear();
}

export async function loadPocketBaseUserData(): Promise<CloudUserData | null> {
  if (!pb || !pb.authStore.model?.id) return null;

  const userId = pb.authStore.model.id;

  const [progress, dailyLogs, savedQuotes] = await Promise.all([
    pb.collection('progress').getFirstListItem(`user = "${userId}"`).catch(() => null),
    pb.collection('daily_logs').getFullList({ filter: `user = "${userId}"`, sort: '-date' }).catch(() => []),
    pb.collection('saved_quotes').getFullList({ filter: `user = "${userId}"`, sort: '-created' }).catch(() => []),
  ]);

  if (!progress) return null;

  return {
    progress: {
      noCount: progress.noCount ?? 0,
      themeId: progress.themeId ?? 'yellow-energy',
      darkMode: Boolean(progress.darkMode),
      startDate: progress.startDate ?? new Date().toISOString().slice(0, 10),
    },
    dailyLogs: dailyLogs.map((item) => ({ date: item.date, count: item.count ?? 0 })),
    savedQuotes: savedQuotes.map((item) => item.quoteText).filter(Boolean),
  };
}

export async function savePocketBaseUserData(data: CloudUserData) {
  if (!pb || !pb.authStore.model?.id) return;

  const userId = pb.authStore.model.id;

  const existingProgress = await pb.collection('progress').getFirstListItem(`user = "${userId}"`).catch(() => null);
  const progressPayload = { user: userId, ...data.progress };

  if (existingProgress) {
    await pb.collection('progress').update(existingProgress.id, progressPayload);
  } else {
    await pb.collection('progress').create(progressPayload);
  }

  const existingLogs = await pb.collection('daily_logs').getFullList({ filter: `user = "${userId}"` }).catch(() => []);
  await Promise.all(existingLogs.map((item) => pb.collection('daily_logs').delete(item.id)));
  await Promise.all(
    data.dailyLogs.map((item) =>
      pb.collection('daily_logs').create({
        user: userId,
        date: item.date,
        count: item.count,
      }),
    ),
  );

  const existingQuotes = await pb.collection('saved_quotes').getFullList({ filter: `user = "${userId}"` }).catch(() => []);
  await Promise.all(existingQuotes.map((item) => pb.collection('saved_quotes').delete(item.id)));
  await Promise.all(
    data.savedQuotes.map((quoteText) =>
      pb.collection('saved_quotes').create({
        user: userId,
        quoteText,
      }),
    ),
  );
}
