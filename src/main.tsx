import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './library.css';
import './spacing-fixes.css';
import './shell-features.css';
import './profile-carousel.css';
import './palette-system.css';
import './library-layout-fix.css';
import './reward-badge.css';
import './reward-modal-backdrop.css';

const SERVICE_URL = 'https://iliavsevolodov.github.io/1000net/';
const TELEGRAM_URL = 'https://t.me/ilya_mlm';
const PROGRESS_STORAGE_KEY = 'one-thousand-no-progress';
const SAVED_QUOTES_STORAGE_KEY = 'one-thousand-no-saved-quotes';
const DAILY_LOGS_STORAGE_KEY = 'one-thousand-no-daily-logs';
const REWARD_BADGE_READY_KEY = 'one-thousand-no-reward-badge-ready';
const REWARD_BADGE_SEEN_KEY = 'one-thousand-no-reward-badge-seen';
const REWARD_BADGE_UNREAD_KEY = 'one-thousand-no-reward-badge-unread';
const LEVEL_CELEBRATION_PENDING_KEY = 'one-thousand-no-level-celebration-pending';
const ACHIEVEMENT_BADGE_READY_KEY = 'one-thousand-no-achievement-badge-ready';
const ACHIEVEMENT_BADGE_SEEN_KEY = 'one-thousand-no-achievement-badge-seen';
const ACHIEVEMENT_CELEBRATION_QUEUE_KEY = 'one-thousand-no-achievement-celebration-queue';

const LEVEL_REWARDS = [
  { threshold: 10, id: 'level:10', title: 'Первые шаги', description: 'Ты начал путь и сделал первые действия.' },
  { threshold: 50, id: 'level:50', title: 'Уже не страшно', description: 'Отказы больше не выглядят как катастрофа.' },
  { threshold: 100, id: 'level:100', title: 'Вышел из ступора', description: 'Ты перестал откладывать и начал действовать стабильно.' },
  { threshold: 250, id: 'level:250', title: 'Стабильный игрок', description: 'Ты уже не ждёшь настроения, ты работаешь по системе.' },
  { threshold: 500, id: 'level:500', title: 'Железная психика', description: 'Отказы больше не сбивают тебя с маршрута.' },
  { threshold: 750, id: 'level:750', title: 'Машина действий', description: 'Ты стал человеком темпа и дисциплины.' },
  { threshold: 1000, id: 'level:1000', title: 'Легенда отказов', description: 'Ты прошёл путь, который большинство даже не начинает.' },
];

type LevelReward = (typeof LEVEL_REWARDS)[number];

type DailyLog = {
  date: string;
  count: number;
};

type AchievementStats = {
  noCount: number;
  streak: number;
  activeDays: number;
  bestDayCount: number;
  savedQuotesCount: number;
};

type AchievementReward = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  isUnlocked: (stats: AchievementStats) => boolean;
};

const ACHIEVEMENT_REWARDS: AchievementReward[] = [
  { id: 'achievement:first-no', title: 'Первое НЕТ', description: 'Ты сделал первый шаг и зафиксировал первый отказ.', emoji: '🥇', isUnlocked: ({ noCount }) => noCount >= 1 },
  { id: 'achievement:ten-no', title: 'Разогрев', description: '10 НЕТ собраны. Страх уже начинает слабеть.', emoji: '⚡️', isUnlocked: ({ noCount }) => noCount >= 10 },
  { id: 'achievement:fifty-no', title: 'Уже не страшно', description: '50 НЕТ — ты вошёл в рабочий темп.', emoji: '🔥', isUnlocked: ({ noCount }) => noCount >= 50 },
  { id: 'achievement:hundred-no', title: 'Первая сотня', description: '100 НЕТ — первый большой психологический рубеж.', emoji: '💯', isUnlocked: ({ noCount }) => noCount >= 100 },
  { id: 'achievement:three-streak', title: '3 дня подряд', description: 'Ты держишь темп несколько дней без паузы.', emoji: '📈', isUnlocked: ({ streak }) => streak >= 3 },
  { id: 'achievement:seven-streak', title: 'Неделя действий', description: '7 дней подряд — это уже дисциплина.', emoji: '🏆', isUnlocked: ({ streak }) => streak >= 7 },
  { id: 'achievement:best-day-ten', title: 'Сильный день', description: '10 НЕТ за один день. Хороший рабочий рывок.', emoji: '🚀', isUnlocked: ({ bestDayCount }) => bestDayCount >= 10 },
  { id: 'achievement:quote-saver', title: 'Коллекционер мыслей', description: 'Ты сохранил первую цитату в библиотеку.', emoji: '💎', isUnlocked: ({ savedQuotesCount }) => savedQuotesCount >= 1 },
  { id: 'achievement:active-month', title: '30 активных дней', description: '30 дней с действиями — это уже система.', emoji: '🗓️', isUnlocked: ({ activeDays }) => activeDays >= 30 },
  { id: 'achievement:five-hundred', title: 'Железная психика', description: '500 НЕТ собраны. Отказы больше не управляют тобой.', emoji: '🛡️', isUnlocked: ({ noCount }) => noCount >= 500 },
  { id: 'achievement:legend', title: 'Легенда отказов', description: '1000 НЕТ пройдены. Большинство даже не начинает этот путь.', emoji: '👑', isUnlocked: ({ noCount }) => noCount >= 1000 },
];

async function removeOldPwaCache() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Сайт должен открываться даже если Safari не дал доступ к service worker.
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Кэш не критичен для запуска приложения.
  }
}

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Не мешаем работе приложения.
  }
}

function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Не мешаем работе приложения.
  }
}

function readStringList(key: string): string[] {
  return (readLocalStorage(key) ?? '').split(',').filter(Boolean);
}

function writeStringList(key: string, value: string[]) {
  writeLocalStorage(key, Array.from(new Set(value)).join(','));
}

function getCurrentNoCount() {
  try {
    const stored = readLocalStorage(PROGRESS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return typeof parsed?.noCount === 'number' ? parsed.noCount : 0;
  } catch {
    return 0;
  }
}

function getSavedQuotesCount() {
  try {
    const stored = readLocalStorage(SAVED_QUOTES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function getDailyLogs(): DailyLog[] {
  try {
    const stored = readLocalStorage(DAILY_LOGS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.date === 'string' && typeof item?.count === 'number')
      .map((item) => ({ date: item.date, count: Math.max(0, item.count) }));
  } catch {
    return [];
  }
}

function getDateIsoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getCountForDate(logs: DailyLog[], date: string): number {
  return logs.find((item) => item.date === date)?.count ?? 0;
}

function getCurrentStreak(logs: DailyLog[]) {
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    if (getCountForDate(logs, getDateIsoDaysAgo(index)) <= 0) break;
    streak += 1;
  }

  return streak;
}

function getBestDayCount(logs: DailyLog[]) {
  return logs.reduce((best, item) => (item.count > best ? item.count : best), 0);
}

function getUnlockedLevels(noCount: number) {
  return LEVEL_REWARDS.filter((level) => noCount >= level.threshold);
}

function getUnlockedAchievements(noCount: number) {
  const logs = getDailyLogs();
  const stats: AchievementStats = {
    noCount,
    streak: getCurrentStreak(logs),
    activeDays: logs.filter((item) => item.count > 0).length,
    bestDayCount: getBestDayCount(logs),
    savedQuotesCount: getSavedQuotesCount(),
  };

  return ACHIEVEMENT_REWARDS.filter((achievement) => achievement.isUnlocked(stats));
}

function findLevelReward(id: string | null): LevelReward | null {
  if (!id) return null;
  return LEVEL_REWARDS.find((level) => level.id === id) ?? null;
}

function findAchievementReward(id: string | null): AchievementReward | null {
  if (!id) return null;
  return ACHIEVEMENT_REWARDS.find((achievement) => achievement.id === id) ?? null;
}

function hasBlockingOverlay() {
  return Boolean(document.querySelector('.quote-overlay, .library-overlay, .onboarding-overlay, .level-celebration-overlay, .achievement-celebration-overlay'));
}

function RewardBadgeWatcher() {
  const [hasUnreadReward, setHasUnreadReward] = useState(() => readLocalStorage(REWARD_BADGE_UNREAD_KEY) === 'true');
  const [showHint, setShowHint] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<LevelReward | null>(() => findLevelReward(readLocalStorage(LEVEL_CELEBRATION_PENDING_KEY)));
  const [pendingAchievementIds, setPendingAchievementIds] = useState<string[]>(() => readStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY));
  const [activeLevel, setActiveLevel] = useState<LevelReward | null>(null);
  const [activeAchievement, setActiveAchievement] = useState<AchievementReward | null>(null);

  useEffect(() => {
    const checkRewards = () => {
      const noCount = getCurrentNoCount();
      const unlockedLevels = getUnlockedLevels(noCount);
      const unlockedLevelIds = unlockedLevels.map((level) => level.id);
      const levelReady = readLocalStorage(REWARD_BADGE_READY_KEY) === 'true';
      const seenLevelIds = readStringList(REWARD_BADGE_SEEN_KEY);

      if (!levelReady) {
        writeLocalStorage(REWARD_BADGE_READY_KEY, 'true');
        writeStringList(REWARD_BADGE_SEEN_KEY, unlockedLevelIds);
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'false');
        removeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY);
        setHasUnreadReward(false);
        setPendingLevel(null);
      } else {
        const newLevelIds = unlockedLevelIds.filter((id) => !seenLevelIds.includes(id));
        if (newLevelIds.length > 0) {
          const latestNewId = newLevelIds[newLevelIds.length - 1];
          const latestLevel = findLevelReward(latestNewId);

          writeStringList(REWARD_BADGE_SEEN_KEY, [...seenLevelIds, ...newLevelIds]);
          writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'true');
          setHasUnreadReward(true);

          if (latestLevel && !readLocalStorage(LEVEL_CELEBRATION_PENDING_KEY)) {
            writeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY, latestLevel.id);
            setPendingLevel(latestLevel);
          }
        }
      }

      const unlockedAchievements = getUnlockedAchievements(noCount);
      const unlockedAchievementIds = unlockedAchievements.map((achievement) => achievement.id);
      const achievementReady = readLocalStorage(ACHIEVEMENT_BADGE_READY_KEY) === 'true';
      const seenAchievementIds = readStringList(ACHIEVEMENT_BADGE_SEEN_KEY);

      if (!achievementReady) {
        writeLocalStorage(ACHIEVEMENT_BADGE_READY_KEY, 'true');
        writeStringList(ACHIEVEMENT_BADGE_SEEN_KEY, unlockedAchievementIds);
        writeStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY, []);
        setPendingAchievementIds([]);
        return;
      }

      const newAchievementIds = unlockedAchievementIds.filter((id) => !seenAchievementIds.includes(id));
      if (newAchievementIds.length > 0) {
        const currentQueue = readStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY);
        const nextQueue = Array.from(new Set([...currentQueue, ...newAchievementIds]));

        writeStringList(ACHIEVEMENT_BADGE_SEEN_KEY, [...seenAchievementIds, ...newAchievementIds]);
        writeStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY, nextQueue);
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'true');
        setHasUnreadReward(true);
        setPendingAchievementIds(nextQueue);
      }
    };

    checkRewards();
    const intervalId = window.setInterval(checkRewards, 900);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('has-profile-reward-dot', hasUnreadReward);
    return () => document.body.classList.remove('has-profile-reward-dot');
  }, [hasUnreadReward]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const profileButton = target?.closest('.bottom-tabs .bottom-tab:nth-child(2)');
      if (!profileButton || !hasUnreadReward) return;

      writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'false');
      setHasUnreadReward(false);
      setShowHint(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [hasUnreadReward]);

  useEffect(() => {
    if (!showHint) return;
    const timeoutId = window.setTimeout(() => setShowHint(false), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [showHint]);

  useEffect(() => {
    if (!pendingLevel || activeLevel) return;

    const intervalId = window.setInterval(() => {
      if (!hasBlockingOverlay()) {
        setActiveLevel(pendingLevel);
      }
    }, 350);

    return () => window.clearInterval(intervalId);
  }, [pendingLevel, activeLevel]);

  useEffect(() => {
    if (pendingLevel || activeLevel || activeAchievement || pendingAchievementIds.length === 0) return;

    const intervalId = window.setInterval(() => {
      if (!hasBlockingOverlay()) {
        const nextAchievement = findAchievementReward(pendingAchievementIds[0]);
        if (nextAchievement) {
          setActiveAchievement(nextAchievement);
        } else {
          const nextQueue = pendingAchievementIds.slice(1);
          writeStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY, nextQueue);
          setPendingAchievementIds(nextQueue);
        }
      }
    }, 350);

    return () => window.clearInterval(intervalId);
  }, [pendingLevel, activeLevel, activeAchievement, pendingAchievementIds]);

  function closeLevelCelebration() {
    setActiveLevel(null);
    setPendingLevel(null);
    removeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY);
  }

  function closeAchievementCelebration() {
    const nextQueue = pendingAchievementIds.slice(1);
    setActiveAchievement(null);
    setPendingAchievementIds(nextQueue);
    writeStringList(ACHIEVEMENT_CELEBRATION_QUEUE_KEY, nextQueue);
  }

  return (
    <>
      {showHint && <div className="profile-reward-hint">Новая награда находится тут</div>}

      {activeLevel && (
        <div className="level-celebration-overlay" role="dialog" aria-modal="true" aria-label="Поздравление с новым уровнем">
          <div className="level-celebration-card">
            <button className="level-celebration-close" type="button" onClick={closeLevelCelebration} aria-label="Закрыть поздравление">
              ×
            </button>
            <div className="level-celebration-badge">новый уровень</div>
            <div className="level-celebration-icon">🏆</div>
            <p>Поздравляем</p>
            <h2>{activeLevel.title}</h2>
            <span>{activeLevel.description}</span>
            <button className="level-celebration-action" type="button" onClick={closeLevelCelebration}>
              Забрать награду
            </button>
          </div>
        </div>
      )}

      {activeAchievement && (
        <div className="achievement-celebration-overlay" role="dialog" aria-modal="true" aria-label="Поздравление с новым достижением">
          <div className="level-celebration-card level-celebration-card--achievement">
            <button className="level-celebration-close" type="button" onClick={closeAchievementCelebration} aria-label="Закрыть поздравление">
              ×
            </button>
            <div className="level-celebration-badge">новое достижение</div>
            <div className="level-celebration-icon">{activeAchievement.emoji}</div>
            <p>Вау, награда</p>
            <h2>{activeAchievement.title}</h2>
            <span>{activeAchievement.description}</span>
            <button className="level-celebration-action" type="button" onClick={closeAchievementCelebration}>
              Забрать достижение
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(false), 1250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  return (
    <div className="loading-screen" aria-label="Загрузка сервиса 1000 НЕТ">
      <div className="loading-screen__panel">
        <p>загрузка сервиса</p>
        <div className="loading-word" aria-hidden="true">
          <span>Н</span>
          <span>Е</span>
          <span>Т</span>
        </div>
        <small>Каждый отказ — шаг к спокойствию</small>
      </div>
    </div>
  );
}

function SupportFooter() {
  const [copied, setCopied] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    const checkSettingsPage = () => {
      setSettingsVisible(Boolean(document.querySelector('.settings-page')));
    };

    checkSettingsPage();

    const observer = new MutationObserver(checkSettingsPage);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  async function copyServiceLink() {
    const text = `Крутой сервис для отказов в сетевом ${SERVICE_URL}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      window.prompt('Скопируй текст:', text);
    }
  }

  if (!settingsVisible) return null;

  return (
    <section className="support-footer support-footer--settings" aria-label="Связь и поделиться сервисом">
      <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        Задать вопрос
      </a>
      <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        Предложить идею
      </a>
      <button type="button" onClick={copyServiceLink}>
        {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
      </button>
    </section>
  );
}

function Root() {
  return (
    <React.StrictMode>
      <App />
      <RewardBadgeWatcher />
      <SupportFooter />
      <LoadingScreen />
    </React.StrictMode>
  );
}

void removeOldPwaCache();

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
