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

const SERVICE_URL = 'https://iliavsevolodov.github.io/1000net/';
const TELEGRAM_URL = 'https://t.me/ilya_mlm';
const PROGRESS_STORAGE_KEY = 'one-thousand-no-progress';
const REWARD_BADGE_READY_KEY = 'one-thousand-no-reward-badge-ready';
const REWARD_BADGE_SEEN_KEY = 'one-thousand-no-reward-badge-seen';
const REWARD_BADGE_UNREAD_KEY = 'one-thousand-no-reward-badge-unread';
const LEVEL_CELEBRATION_PENDING_KEY = 'one-thousand-no-level-celebration-pending';

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

function getCurrentNoCount() {
  try {
    const stored = readLocalStorage(PROGRESS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return typeof parsed?.noCount === 'number' ? parsed.noCount : 0;
  } catch {
    return 0;
  }
}

function getUnlockedLevels(noCount: number) {
  return LEVEL_REWARDS.filter((level) => noCount >= level.threshold);
}

function findLevelReward(id: string | null): LevelReward | null {
  if (!id) return null;
  return LEVEL_REWARDS.find((level) => level.id === id) ?? null;
}

function hasBlockingOverlay() {
  return Boolean(document.querySelector('.quote-overlay, .library-overlay, .onboarding-overlay, .level-celebration-overlay'));
}

function RewardBadgeWatcher() {
  const [hasUnreadReward, setHasUnreadReward] = useState(() => readLocalStorage(REWARD_BADGE_UNREAD_KEY) === 'true');
  const [showHint, setShowHint] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<LevelReward | null>(() => findLevelReward(readLocalStorage(LEVEL_CELEBRATION_PENDING_KEY)));
  const [activeLevel, setActiveLevel] = useState<LevelReward | null>(null);

  useEffect(() => {
    const checkRewards = () => {
      const unlockedLevels = getUnlockedLevels(getCurrentNoCount());
      const unlockedIds = unlockedLevels.map((level) => level.id);
      const ready = readLocalStorage(REWARD_BADGE_READY_KEY) === 'true';
      const seenIds = (readLocalStorage(REWARD_BADGE_SEEN_KEY) ?? '').split(',').filter(Boolean);

      if (!ready) {
        writeLocalStorage(REWARD_BADGE_READY_KEY, 'true');
        writeLocalStorage(REWARD_BADGE_SEEN_KEY, unlockedIds.join(','));
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'false');
        removeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY);
        setHasUnreadReward(false);
        setPendingLevel(null);
        return;
      }

      const newIds = unlockedIds.filter((id) => !seenIds.includes(id));
      if (newIds.length > 0) {
        const latestNewId = newIds[newIds.length - 1];
        const latestLevel = findLevelReward(latestNewId);

        writeLocalStorage(REWARD_BADGE_SEEN_KEY, [...seenIds, ...newIds].join(','));
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'true');
        setHasUnreadReward(true);

        if (latestLevel && !readLocalStorage(LEVEL_CELEBRATION_PENDING_KEY)) {
          writeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY, latestLevel.id);
          setPendingLevel(latestLevel);
        }
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

  function closeLevelCelebration() {
    setActiveLevel(null);
    setPendingLevel(null);
    removeLocalStorage(LEVEL_CELEBRATION_PENDING_KEY);
  }

  return (
    <>
      {showHint && <div className="profile-reward-hint">Новая награда находится тут</div>}

      {activeLevel && !hasBlockingOverlay() && (
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
