import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { isFirebaseEnabled, listenToCloudUser, loadCloudUserData, saveCloudUserData, type CloudUserData } from './firebase';

const STORAGE_KEY = 'one-thousand-no-progress';
const SAVED_QUOTES_KEY = 'one-thousand-no-saved-quotes';
const DAILY_LOGS_KEY = 'one-thousand-no-daily-logs';

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage может быть недоступен в некоторых режимах браузера.
  }
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readLocalData(): Omit<CloudUserData, 'updatedAt'> {
  return {
    progress: safeParse(safeRead(STORAGE_KEY), {
      noCount: 0,
      themeId: 'yellow-energy',
      darkMode: false,
      startDate: new Date().toISOString().slice(0, 10),
    }),
    savedQuotes: safeParse(safeRead(SAVED_QUOTES_KEY), []),
    dailyLogs: safeParse(safeRead(DAILY_LOGS_KEY), []),
  };
}

function writeLocalData(data: CloudUserData) {
  safeWrite(STORAGE_KEY, JSON.stringify(data.progress));
  safeWrite(SAVED_QUOTES_KEY, JSON.stringify(data.savedQuotes ?? []));
  safeWrite(DAILY_LOGS_KEY, JSON.stringify(data.dailyLogs ?? []));
}

function shouldRestoreCloud(localData: Omit<CloudUserData, 'updatedAt'>, cloudData: CloudUserData) {
  const localNoCount = localData.progress?.noCount ?? 0;
  const cloudNoCount = cloudData.progress?.noCount ?? 0;
  const localQuotes = localData.savedQuotes?.length ?? 0;
  const cloudQuotes = cloudData.savedQuotes?.length ?? 0;
  const localLogs = localData.dailyLogs?.length ?? 0;
  const cloudLogs = cloudData.dailyLogs?.length ?? 0;

  return cloudNoCount > localNoCount || cloudQuotes > localQuotes || cloudLogs > localLogs;
}

function getSnapshotKey(data: Omit<CloudUserData, 'updatedAt'>) {
  return JSON.stringify(data);
}

export default function CloudSync() {
  const enabled = useMemo(() => isFirebaseEnabled(), []);
  const [status, setStatus] = useState<'local' | 'connecting' | 'synced' | 'error'>(enabled ? 'connecting' : 'local');
  const [userId, setUserId] = useState<string | null>(null);
  const lastSavedSnapshot = useRef<string>('');
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    return listenToCloudUser(async (user) => {
      if (!user) {
        setUserId(null);
        setStatus('error');
        return;
      }

      setUserId(user.uid);
      setStatus('connecting');

      try {
        const localData = readLocalData();
        const cloudData = await loadCloudUserData(user.uid);

        if (cloudData && shouldRestoreCloud(localData, cloudData) && !restoredRef.current) {
          restoredRef.current = true;
          writeLocalData(cloudData);
          window.location.reload();
          return;
        }

        await saveCloudUserData(user.uid, localData);
        lastSavedSnapshot.current = getSnapshotKey(localData);
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const intervalId = window.setInterval(async () => {
      const localData = readLocalData();
      const snapshot = getSnapshotKey(localData);

      if (snapshot === lastSavedSnapshot.current) return;

      try {
        setStatus('connecting');
        await saveCloudUserData(userId, localData);
        lastSavedSnapshot.current = snapshot;
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [enabled, userId]);

  if (!enabled) {
    return (
      <div className="cloud-sync cloud-sync--local" title="Firebase ещё не настроен">
        <CloudOff size={16} />
        <span>Локально</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="cloud-sync cloud-sync--connecting" title="Синхронизация с Firebase">
        <Loader2 size={16} />
        <span>Синхронизация</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="cloud-sync cloud-sync--error" title="Облако временно недоступно">
        <CloudOff size={16} />
        <span>Локально</span>
      </div>
    );
  }

  return (
    <div className="cloud-sync cloud-sync--synced" title="Данные сохранены в Firebase">
      <Cloud size={16} />
      <span>Облако</span>
      <Check size={14} />
    </div>
  );
}
