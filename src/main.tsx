import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './library.css';
import './spacing-fixes.css';
import './shell-features.css';
import './profile-carousel.css';
import './palette-system.css';

const SERVICE_URL = 'https://iliavsevolodov.github.io/1000net/';
const TELEGRAM_URL = 'https://t.me/ilya_mlm';

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
      <SupportFooter />
      <LoadingScreen />
    </React.StrictMode>
  );
}

void removeOldPwaCache();

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
