(() => {
  const PROGRESS_KEY = 'one-thousand-no-progress';
  const SAVED_QUOTES_KEY = 'one-thousand-no-saved-quotes';
  const DAILY_LOGS_KEY = 'one-thousand-no-daily-logs';

  const levels = [
    { threshold: 10, title: 'Первые шаги', description: 'Ты начал путь и сделал первые действия.', emoji: '🏁' },
    { threshold: 50, title: 'Уже не страшно', description: 'Отказы больше не выглядят как катастрофа.', emoji: '⚡️' },
    { threshold: 100, title: 'Вышел из ступора', description: 'Ты перестал откладывать и начал действовать стабильно.', emoji: '💯' },
    { threshold: 250, title: 'Стабильный игрок', description: 'Ты уже не ждёшь настроения, ты работаешь по системе.', emoji: '🔥' },
    { threshold: 500, title: 'Железная психика', description: 'Отказы больше не сбивают тебя с маршрута.', emoji: '🛡️' },
    { threshold: 750, title: 'Машина действий', description: 'Ты стал человеком темпа и дисциплины.', emoji: '🚀' },
    { threshold: 1000, title: 'Легенда отказов', description: 'Ты прошёл путь, который большинство даже не начинает.', emoji: '👑' },
  ];

  const achievements = [
    { id: 'first-no', title: 'Первое НЕТ', description: 'Ты сделал первый шаг и зафиксировал первый отказ.', emoji: '🥇', test: (s) => s.noCount >= 1 },
    { id: 'ten-no', title: 'Разогрев', description: '10 НЕТ собраны. Страх уже начинает слабеть.', emoji: '⚡️', test: (s) => s.noCount >= 10 },
    { id: 'fifty-no', title: 'Уже не страшно', description: '50 НЕТ — ты вошёл в рабочий темп.', emoji: '🔥', test: (s) => s.noCount >= 50 },
    { id: 'hundred-no', title: 'Первая сотня', description: '100 НЕТ — первый большой психологический рубеж.', emoji: '💯', test: (s) => s.noCount >= 100 },
    { id: 'three-streak', title: '3 дня подряд', description: 'Ты держишь темп несколько дней без паузы.', emoji: '📈', test: (s) => s.streak >= 3 },
    { id: 'seven-streak', title: 'Неделя действий', description: '7 дней подряд — это уже дисциплина.', emoji: '🏆', test: (s) => s.streak >= 7 },
    { id: 'best-day-ten', title: 'Сильный день', description: '10 НЕТ за один день. Хороший рабочий рывок.', emoji: '🚀', test: (s) => s.bestDayCount >= 10 },
    { id: 'quote-saver', title: 'Коллекционер мыслей', description: 'Ты сохранил первую цитату в библиотеку.', emoji: '💎', test: (s) => s.savedQuotesCount >= 1 },
    { id: 'active-month', title: '30 активных дней', description: '30 дней с действиями — это уже система.', emoji: '🗓️', test: (s) => s.activeDays >= 30 },
    { id: 'five-hundred', title: 'Железная психика', description: '500 НЕТ собраны. Отказы больше не управляют тобой.', emoji: '🛡️', test: (s) => s.noCount >= 500 },
    { id: 'legend', title: 'Легенда отказов', description: '1000 НЕТ пройдены. Большинство даже не начинает этот путь.', emoji: '👑', test: (s) => s.noCount >= 1000 },
  ];

  function readJson(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function getNoCount() {
    const progress = readJson(PROGRESS_KEY, { noCount: 0 });
    return typeof progress.noCount === 'number' ? Math.max(0, Math.min(1000, progress.noCount)) : 0;
  }

  function getDateIsoDaysAgo(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().slice(0, 10);
  }

  function getCountForDate(logs, date) {
    const item = logs.find((entry) => entry && entry.date === date);
    return typeof item?.count === 'number' ? item.count : 0;
  }

  function getStats() {
    const noCount = getNoCount();
    const savedQuotes = readJson(SAVED_QUOTES_KEY, []);
    const logs = readJson(DAILY_LOGS_KEY, []).filter((item) => typeof item?.date === 'string' && typeof item?.count === 'number');
    let streak = 0;

    for (let index = 0; index < 365; index += 1) {
      if (getCountForDate(logs, getDateIsoDaysAgo(index)) <= 0) break;
      streak += 1;
    }

    return {
      noCount,
      streak,
      activeDays: logs.filter((item) => item.count > 0).length,
      bestDayCount: logs.reduce((best, item) => Math.max(best, item.count), 0),
      savedQuotesCount: Array.isArray(savedQuotes) ? savedQuotes.length : 0,
    };
  }

  function cardHtml(item, unlocked, type) {
    return `
      <article class="profile-reward-card ${unlocked ? 'profile-reward-card--open' : 'profile-reward-card--locked'}">
        <div class="profile-reward-card__icon">${unlocked ? item.emoji : '🔒'}</div>
        <span>${type}</span>
        <strong>${item.title}</strong>
        <p>${unlocked ? item.description : 'Откроется по мере движения к 1000 НЕТ.'}</p>
      </article>
    `;
  }

  function renderPanel() {
    const profileAnchor = document.querySelector('.achievements-section') || document.querySelector('.profile-hero');
    const existing = document.querySelector('.profile-rewards-panel');

    if (!profileAnchor) {
      existing?.remove();
      return;
    }

    const stats = getStats();
    const unlockedLevels = levels.filter((item) => stats.noCount >= item.threshold);
    const unlockedAchievements = achievements.filter((item) => item.test(stats));
    const levelCards = levels.map((item) => cardHtml(item, stats.noCount >= item.threshold, `уровень ${item.threshold}`)).join('');
    const achievementCards = achievements.map((item) => cardHtml(item, item.test(stats), 'достижение')).join('');
    const panel = existing || document.createElement('section');

    panel.className = 'profile-rewards-panel glass-card';
    panel.innerHTML = `
      <div class="profile-rewards-head">
        <div>
          <p class="eyebrow">коллекция наград</p>
          <h2>Мои награды</h2>
          <p>Здесь собраны уровни и достижения, которые открываются по мере движения к 1000 НЕТ.</p>
        </div>
        <div class="profile-rewards-score">
          <strong>${unlockedLevels.length + unlockedAchievements.length}</strong>
          <span>открыто</span>
        </div>
      </div>
      <div class="profile-rewards-summary">
        <article><strong>${unlockedLevels.length}/${levels.length}</strong><span>уровней</span></article>
        <article><strong>${unlockedAchievements.length}/${achievements.length}</strong><span>достижений</span></article>
      </div>
      <div class="profile-rewards-block">
        <div class="profile-rewards-subhead"><strong>Уровни</strong><span>листай →</span></div>
        <div class="profile-rewards-row">${levelCards}</div>
      </div>
      <div class="profile-rewards-block">
        <div class="profile-rewards-subhead"><strong>Достижения</strong><span>листай →</span></div>
        <div class="profile-rewards-row">${achievementCards}</div>
      </div>
    `;

    if (!existing) {
      profileAnchor.insertAdjacentElement('afterend', panel);
    }
  }

  window.setInterval(renderPanel, 900);
  window.addEventListener('storage', renderPanel);
  window.addEventListener('click', () => window.setTimeout(renderPanel, 120));
  window.setTimeout(renderPanel, 600);
})();
