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
const LEVEL_THRESHOLDS = [10, 50, 100, 250, 500, 750, 1000];

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

function getCurrentNoCount() {
  try {
    const stored = readLocalStorage(PROGRESS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return typeof parsed?.noCount === 'number' ? parsed.noCount : 0;
  } catch {
    return 0;
  }
}

function getUnlockedLevelIds(noCount: number) {
  return LEVEL_THRESHOLDS.filter((threshold) => noCount >= threshold).map((threshold) => `level:${threshold}`);
}

function RewardBadgeWatcher() {
  const [hasUnreadReward, setHasUnreadReward] = useState(() => readLocalStorage(REWARD_BADGE_UNREAD_KEY) === 'true');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const checkRewards = () => {
      const unlockedIds = getUnlockedLevelIds(getCurrentNoCount());
      const ready = readLocalStorage(REWARD_BADGE_READY_KEY) === 'true';
      const seenIds = (readLocalStorage(REWARD_BADGE_SEEN_KEY) ?? '').split(',').filter(Boolean);

      if (!ready) {
        writeLocalStorage(REWARD_BADGE_READY_KEY, 'true');
        writeLocalStorage(REWARD_BADGE_SEEN_KEY, unlockedIds.join(','));
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'false');
        setHasUnreadReward(false);
        return;
      }

      const newIds = unlockedIds.filter((id) => !seenIds.includes(id));
      if (newIds.length > 0) {
        writeLocalStorage(REWARD_BADGE_SEEN_KEY, [...seenIds, ...newIds].join(','));
        writeLocalStorage(REWARD_BADGE_UNREAD_KEY, 'true');
        setHasUnreadReward(true);
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

  return showHint ? <div className="profile-reward-hint">Новая награда находится тут</div> : null;
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
