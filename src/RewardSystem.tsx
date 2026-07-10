import { useEffect, useMemo, useState } from 'react';
import { Medal, Sparkles, Trophy, X } from 'lucide-react';

type RewardItem = {
  id: string;
  kind: 'level' | 'achievement';
  title: string;
  description: string;
  icon: 'medal' | 'trophy';
  accentLabel: string;
};

type DailyLog = {
  date: string;
  count: number;
};

type ProgressState = {
  noCount: number;
  themeId: string;
  darkMode: boolean;
  startDate: string;
};

const STORAGE_KEY = 'one-thousand-no-progress';
const SAVED_QUOTES_KEY = 'one-thousand-no-saved-quotes';
const DAILY_LOGS_KEY = 'one-thousand-no-daily-logs';

const REWARDS_READY_KEY = 'one-thousand-no-rewards-ready';
const REWARDS_SEEN_KEY = 'one-thousand-no-rewards-seen';
const REWARDS_PENDING_KEY = 'one-thousand-no-rewards-pending';
const REWARDS_UNREAD_KEY = 'one-thousand-no-rewards-unread';

const LEVELS = [
  { threshold: 10, title: 'Первые шаги', description: 'Ты начал путь и сделал первые действия.' },
  { threshold: 50, title: 'Уже не страшно', description: 'Отказы больше не выглядят как катастрофа.' },
  { threshold: 100, title: 'Вышел из ступора', description: 'Ты перестал откладывать и начал действовать стабильно.' },
  { threshold: 250, title: 'Стабильный игрок', description: 'Ты уже не ждёшь настроения, ты работаешь по системе.' },
  { threshold: 500, title: 'Железная психика', description: 'Отказы больше не сбивают тебя с маршрута.' },
  { threshold: 750, title: 'Машина действий', description: 'Ты стал человеком темпа и дисциплины.' },
  { threshold: 1000, title: 'Легенда отказов', description: 'Ты прошёл путь, который большинство даже не начинает.' },
] as const;

const THEME_COLORS: Record<string, string> = {
  'yellow-energy': '#FFD21F',
  'greenway-green': '#21B573',
  'deep-indigo': '#3030A3',
  'electric-blue': '#2563EB',
  'red-drive': '#EF4444',
  'orange-pulse': '#F97316',
  'violet-focus': '#7C3AED',
  'pink-neon': '#EC4899',
  'turquoise-flow': '#06B6D4',
  'gold-status': '#D6A21E',
  'graphite-minimal': '#374151',
  'mint-fresh': '#2DD4BF',
};

function readString(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Не мешаем работе приложения.
  }
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateIsoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getCountForDate(logs: DailyLog[], date: string): number {
  return logs.find((item) => item.date === date)?.count ?? 0;
}

function getCurrentStreak(logs: DailyLog[]): number {
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    const count = getCountForDate(logs, getDateIsoDaysAgo(index));
    if (count <= 0) break;
    streak += 1;
  }

  return streak;
}

function getBestDayCount(logs: DailyLog[]): number {
  return logs.reduce((best, current) => (current.count > best ? current.count : best), 0);
}

function getProgressState(): ProgressState {
  return readJson<ProgressState>(STORAGE_KEY, {
    noCount: 0,
    themeId: 'yellow-energy',
    darkMode: false,
    startDate: getTodayIso(),
  });
}

function getDailyLogs(): DailyLog[] {
  return readJson<DailyLog[]>(DAILY_LOGS_KEY, []);
}

function getSavedQuotes(): string[] {
  return readJson<string[]>(SAVED_QUOTES_KEY, []);
}

function getAchievements(noCount: number, streak: number, activeDays: number, bestDayCount: number, savedQuotesCount: number): RewardItem[] {
  return [
    { id: 'achievement:first-no', kind: 'achievement', title: 'Первое НЕТ', description: 'Ты сделал первый шаг и зафиксировал первый отказ.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:ten-no', kind: 'achievement', title: 'Разогрев', description: '10 НЕТ собраны. Страх уже начинает слабеть.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:fifty-no', kind: 'achievement', title: 'Уже не страшно', description: '50 НЕТ — ты вошёл в рабочий темп.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:hundred-no', kind: 'achievement', title: 'Первая сотня', description: '100 НЕТ — первый большой психологический рубеж.', icon: 'trophy', accentLabel: 'новое достижение' },
    { id: 'achievement:three-streak', kind: 'achievement', title: '3 дня подряд', description: 'Ты держишь темп несколько дней без паузы.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:seven-streak', kind: 'achievement', title: 'Неделя действий', description: '7 дней подряд — это уже дисциплина.', icon: 'trophy', accentLabel: 'новое достижение' },
    { id: 'achievement:best-day-ten', kind: 'achievement', title: 'Сильный день', description: '10 НЕТ за один день. Хороший рабочий рывок.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:quote-saver', kind: 'achievement', title: 'Коллекционер мыслей', description: 'Ты сохранил первую цитату в библиотеку.', icon: 'medal', accentLabel: 'новое достижение' },
    { id: 'achievement:active-month', kind: 'achievement', title: '30 активных дней', description: '30 дней с действиями — это уже система.', icon: 'trophy', accentLabel: 'новое достижение' },
    { id: 'achievement:five-hundred', kind: 'achievement', title: 'Железная психика', description: '500 НЕТ собраны. Отказы больше не управляют тобой.', icon: 'trophy', accentLabel: 'новое достижение' },
    { id: 'achievement:legend', kind: 'achievement', title: 'Легенда отказов', description: '1000 НЕТ пройдены. Большинство даже не начинает этот путь.', icon: 'trophy', accentLabel: 'новое достижение' },
  ].filter((item) => {
    switch (item.id) {
      case 'achievement:first-no':
        return noCount >= 1;
      case 'achievement:ten-no':
        return noCount >= 10;
      case 'achievement:fifty-no':
        return noCount >= 50;
      case 'achievement:hundred-no':
        return noCount >= 100;
      case 'achievement:three-streak':
        return streak >= 3;
      case 'achievement:seven-streak':
        return streak >= 7;
      case 'achievement:best-day-ten':
        return bestDayCount >= 10;
      case 'achievement:quote-saver':
        return savedQuotesCount >= 1;
      case 'achievement:active-month':
        return activeDays >= 30;
      case 'achievement:five-hundred':
        return noCount >= 500;
      case 'achievement:legend':
        return noCount >= 1000;
      default:
        return false;
    }
  });
}

function getUnlockedRewards(): { rewards: RewardItem[]; themeId: string } {
  const progress = getProgressState();
  const logs = getDailyLogs();
  const savedQuotes = getSavedQuotes();
  const streak = getCurrentStreak(logs);
  const activeDays = logs.filter((item) => item.count > 0).length;
  const bestDayCount = getBestDayCount(logs);

  const levelRewards: RewardItem[] = LEVELS.filter((level) => progress.noCount >= level.threshold).map((level) => ({
    id: `level:${level.threshold}`,
    kind: 'level',
    title: level.title,
    description: level.description,
    icon: level.threshold >= 100 ? 'trophy' : 'medal',
    accentLabel: `уровень ${level.threshold}`,
  }));

  const achievementRewards = getAchievements(progress.noCount, streak, activeDays, bestDayCount, savedQuotes.length);

  return {
    rewards: [...levelRewards, ...achievementRewards],
    themeId: progress.themeId,
  };
}

function isBlockedByAnotherOverlay() {
  return Boolean(document.querySelector('.quote-overlay, .library-overlay, .onboarding-overlay'));
}

function uniqueRewards(items: RewardItem[]) {
  const map = new Map<string, RewardItem>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export default function RewardSystem() {
  const initialPending = useMemo(() => readJson<RewardItem[]>(REWARDS_PENDING_KEY, []), []);
  const initialUnread = useMemo(() => readJson<string[]>(REWARDS_UNREAD_KEY, []), []);

  const [queue, setQueue] = useState<RewardItem[]>(initialPending);
  const [activeReward, setActiveReward] = useState<RewardItem | null>(null);
  const [unreadIds, setUnreadIds] = useState<string[]>(initialUnread);
  const [showProfileHint, setShowProfileHint] = useState(false);
  const [themeColor, setThemeColor] = useState('#FFD21F');

  useEffect(() => {
    writeJson(REWARDS_PENDING_KEY, queue);
  }, [queue]);

  useEffect(() => {
    writeJson(REWARDS_UNREAD_KEY, unreadIds);
    document.body.classList.toggle('has-profile-reward-dot', unreadIds.length > 0);
    return () => document.body.classList.remove('has-profile-reward-dot');
  }, [unreadIds]);

  useEffect(() => {
    const runSync = () => {
      const { rewards, themeId } = getUnlockedRewards();
      setThemeColor(THEME_COLORS[themeId] ?? '#FFD21F');

      const rewardIds = rewards.map((item) => item.id);
      const ready = readString(REWARDS_READY_KEY) === 'true';
      const seenIds = readJson<string[]>(REWARDS_SEEN_KEY, []);

      if (!ready) {
        writeJson(REWARDS_SEEN_KEY, rewardIds);
        writeJson(REWARDS_PENDING_KEY, []);
        writeJson(REWARDS_UNREAD_KEY, []);
        window.localStorage.setItem(REWARDS_READY_KEY, 'true');
        setQueue([]);
        setUnreadIds([]);
        return;
      }

      const newRewards = rewards.filter((item) => !seenIds.includes(item.id));
      if (newRewards.length > 0) {
        const nextSeen = [...seenIds, ...newRewards.map((item) => item.id)];
        const currentPending = readJson<RewardItem[]>(REWARDS_PENDING_KEY, []);
        const nextPending = uniqueRewards([...currentPending, ...newRewards]);
        const nextUnread = Array.from(new Set([...readJson<string[]>(REWARDS_UNREAD_KEY, []), ...newRewards.map((item) => item.id)]));

        writeJson(REWARDS_SEEN_KEY, nextSeen);
        writeJson(REWARDS_PENDING_KEY, nextPending);
        writeJson(REWARDS_UNREAD_KEY, nextUnread);
        setQueue(nextPending);
        setUnreadIds(nextUnread);
      } else {
        setQueue(readJson<RewardItem[]>(REWARDS_PENDING_KEY, []));
        setUnreadIds(readJson<string[]>(REWARDS_UNREAD_KEY, []));
      }
    };

    runSync();
    const intervalId = window.setInterval(runSync, 900);
    window.addEventListener('storage', runSync);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', runSync);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!activeReward && queue.length > 0 && !isBlockedByAnotherOverlay()) {
        setActiveReward(queue[0]);
      }
    }, 240);

    return () => window.clearInterval(intervalId);
  }, [activeReward, queue]);

  useEffect(() => {
    const profileButton = document.querySelector('.bottom-tabs .bottom-tab:nth-child(2)') as HTMLButtonElement | null;
    if (!profileButton) return;

    const handleProfileClick = () => {
      if (unreadIds.length === 0) return;
      setShowProfileHint(true);
      setUnreadIds([]);
    };

    profileButton.addEventListener('click', handleProfileClick);
    return () => profileButton.removeEventListener('click', handleProfileClick);
  }, [unreadIds]);

  useEffect(() => {
    if (!showProfileHint) return;
    const timeoutId = window.setTimeout(() => setShowProfileHint(false), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [showProfileHint]);

  function closeRewardCard() {
    setActiveReward(null);
    setQueue((current) => current.slice(1));
  }

  const Icon = activeReward?.icon === 'trophy' ? Trophy : Medal;

  return (
    <>
      {showProfileHint && (
        <div className="profile-reward-hint" role="status" aria-live="polite">
          <Sparkles size={16} />
          Новая награда находится тут
        </div>
      )}

      {activeReward && !isBlockedByAnotherOverlay() && (
        <div className="reward-overlay" role="dialog" aria-modal="true" aria-label="Поздравляем с новой наградой">
          <div className="reward-card" style={{ ['--reward-accent' as '--reward-accent']: themeColor }}>
            <button className="reward-close" type="button" onClick={closeRewardCard} aria-label="Закрыть поздравление">
              <X size={20} />
            </button>

            <div className="reward-card__sparkles" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <div className="reward-card__badge">
              <Sparkles size={16} />
              {activeReward.accentLabel}
            </div>

            <div className="reward-card__icon">
              <Icon size={34} />
            </div>

            <p className="reward-card__eyebrow">поздравляем</p>
            <h3>{activeReward.title}</h3>
            <p className="reward-card__text">{activeReward.description}</p>

            <div className="reward-card__footer">
              <span>{activeReward.kind === 'level' ? 'Открыт новый уровень' : 'Открыто новое достижение'}</span>
              <button type="button" onClick={closeRewardCard}>Забрать награду</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
