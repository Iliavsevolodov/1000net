import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './library.css';

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

void removeOldPwaCache();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
