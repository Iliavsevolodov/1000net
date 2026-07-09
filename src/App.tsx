import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import quoteParts from './data/quotes.json';

type Quote = {
  id: number;
  text: string;
};

type QuoteParts = {
  starters: string[];
  endings: string[];
};

type Theme = {
  id: string;
  title: string;
  color: string;
};

type ProgressState = {
  noCount: number;
  themeId: string;
  darkMode: boolean;
  startDate: string;
};

type Level = {
  threshold: number;
  title: string;
  description: string;
};

const STORAGE_KEY = 'one-thousand-no-progress';

const LEVELS: Level[] = [
  {
    threshold: 10,
    title: 'Первые шаги',
    description: 'Ты начал путь и сделал первые действия.',
  },
  {
    threshold: 50,
    title: 'Уже не страшно',
    description: 'Отказы больше не выглядят как катастрофа.',
  },
  {
    threshold: 100,
    title: 'Вышел из ступора',
    description: 'Ты перестал откладывать и начал действовать стабильно.',
  },
  {
    threshold: 250,
    title: 'Стабильный игрок',
    description: 'Ты уже не ждёшь настроения, ты работаешь по системе.',
  },
  {
    threshold: 500,
    title: 'Железная психика',
    description: 'Отказы больше не сбивают тебя с маршрута.',
  },
  {
    threshold: 750,
    title: 'Машина действий',
    description: 'Ты стал человеком темпа и дисциплины.',
  },
  {
    threshold: 1000,
    title: 'Легенда отказов',
    description: 'Ты прошёл путь, который большинство даже не начинает.',
  },
];

const THEMES: Theme[] = [
  { id: 'yellow-energy', title: 'Жёлтая энергия', color: '#FFD21F' },
  { id: 'greenway-green', title: 'Greenway Green', color: '#21B573' },
  { id: 'deep-indigo', title: 'Глубокий индиго', color: '#3030A3' },
  { id: 'electric-blue', title: 'Электрик blue', color: '#2563EB' },
  { id: 'red-drive', title: 'Красный драйв', color: '#EF4444' },
  { id: 'orange-pulse', title: 'Оранжевый импульс', color: '#F97316' },
  { id: 'violet-focus', title: 'Фиолетовый фокус', color: '#7C3AED' },
  { id: 'pink-neon', title: 'Розовый неон', color: '#EC4899' },
  { id: 'turquoise-flow', title: 'Бирюзовый поток', color: '#06B6D4' },
  { id: 'gold-status', title: 'Золотой статус', color: '#D6A21E' },
  { id: 'graphite-minimal', title: 'Графитовый минимализм', color: '#374151' },
  { id: 'mint-fresh', title: 'Мятная свежесть', color: '#2DD4BF' },
];

const quotesSource = quoteParts as QuoteParts;

function createQuotes(source: QuoteParts): Quote[] {
  const result: Quote[] = [];

  source.starters.forEach((starter) => {
    source.endings.forEach((ending) => {
      result.push({
        id: result.length + 1,
        text: `${starter} — ${ending}`,
      });
    });
  });

  return result.slice(0, 1000);
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStoredState(): ProgressState {
  const fallback: ProgressState = {
    noCount: 0,
    themeId: 'yellow-energy',
    darkMode: false,
    startDate: getTodayIso(),
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return fallback;
    }

    return {
      ...fallback,
      ...JSON.parse(stored),
    };
  } catch {
    return fallback;
  }
}

function clampProgress(value: number): number {
  return Math.min(1000, Math.max(0, value));
}

function getDaysFromStart(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date(`${getTodayIso()}T00:00:00`);
  const diff = today.getTime() - start.getTime();

  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

function getCurrentLevel(noCount: number): Level {
  const reachedLevels = LEVELS.filter((level) => noCount >= level.threshold);
  const reached = reachedLevels[reachedLevels.length - 1];

  return (
    reached ?? {
      threshold: 0,
      title: 'Старт',
      description: 'Нажми +1 НЕТ и начни проходить страх отказов.',
    }
  );
}

function getNextLevel(noCount: number): Level | null {
  return LEVELS.find((level) => noCount < level.threshold) ?? null;
}

function getDailyQuote(quotes: Quote[]): Quote {
  const daySeed = Number(getTodayIso().split('-').join(''));
  return quotes[daySeed % quotes.length];
}

function getClickQuote(noCount: number, quotes: Quote[]): Quote {
  return quotes[Math.max(0, noCount - 1) % quotes.length];
}

function App() {
  const [state, setState] = useState<ProgressState>(getStoredState);
  const [toast, setToast] = useState<string>('');
  const quotes = useMemo(() => createQuotes(quotesSource), []);

  const theme = THEMES.find((item) => item.id === state.themeId) ?? THEMES[0];
  const currentLevel = getCurrentLevel(state.noCount);
  const nextLevel = getNextLevel(state.noCount);
  const daysFromStart = getDaysFromStart(state.startDate);
  const progressPercent = Math.round((state.noCount / 1000) * 100);
  const dailyQuote = getDailyQuote(quotes);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(''), 2800);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function updateNoCount(nextValue: number) {
    const nextNoCount = clampProgress(nextValue);
    const newLevel = LEVELS.find((level) => level.threshold === nextNoCount);

    setState((current) => ({
      ...current,
      noCount: nextNoCount,
    }));

    if (newLevel) {
      setToast(`Новый уровень: ${newLevel.title}! ${newLevel.description}`);
      return;
    }

    if (nextNoCount >= 1000) {
      setToast('1000 НЕТ пройдены. Ты стал легендой отказов.');
      return;
    }

    setToast(getClickQuote(nextNoCount, quotes).text);
  }

  function handleAddNo() {
    updateNoCount(state.noCount + 1);
  }

  function handleUndo() {
    updateNoCount(state.noCount - 1);
  }

  function handleCellClick(index: number) {
    updateNoCount(index + 1);
  }

  function handleReset() {
    const confirmed = window.confirm('Сбросить весь прогресс и начать заново?');
    if (!confirmed) {
      return;
    }

    setState((current) => ({
      ...current,
      noCount: 0,
      startDate: getTodayIso(),
    }));
    setToast('Прогресс сброшен. Новый путь начинается с первого действия.');
  }

  return (
    <main
      className={state.darkMode ? 'app app--dark' : 'app'}
      style={{ '--accent': theme.color } as CSSProperties}
    >
      <section className="hero">
        <div>
          <p className="eyebrow">трекер отказов для сетевиков</p>
          <h1>1000 НЕТ</h1>
          <p className="hero__text">
            Каждый отказ закрашивает ячейку и продвигает тебя к новому уровню.
            Не считаем «да». Считаем смелость продолжать.
          </p>
        </div>

        <div className="hero__progress">
          <span>{progressPercent}%</span>
          <p>{state.noCount}/1000</p>
        </div>
      </section>

      <section className="dashboard" aria-label="Дашборд прогресса">
        <article className="card card--accent">
          <span>Уровень</span>
          <strong>{currentLevel.title}</strong>
          <p>{currentLevel.description}</p>
        </article>

        <article className="card">
          <span>Сколько НЕТ</span>
          <strong>{state.noCount}/1000</strong>
          <p>
            {nextLevel
              ? `До уровня «${nextLevel.title}» осталось ${nextLevel.threshold - state.noCount}`
              : 'Все уровни пройдены.'}
          </p>
        </article>

        <article className="card">
          <span>День отказов</span>
          <strong>{daysFromStart} день</strong>
          <p>Путь начался {new Date(state.startDate).toLocaleDateString('ru-RU')}.</p>
        </article>

        <article className="card card--quote">
          <span>Фраза дня</span>
          <strong>{dailyQuote.text}</strong>
        </article>
      </section>

      <section className="actions" aria-label="Основные действия">
        <button className="primary-button" onClick={handleAddNo} disabled={state.noCount >= 1000}>
          +1 НЕТ
        </button>
        <button className="ghost-button" onClick={handleUndo} disabled={state.noCount <= 0}>
          Отменить последнее
        </button>
        <button className="ghost-button" onClick={handleReset}>
          Сбросить
        </button>
      </section>

      <section className="grid-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">1000 ячеек</p>
            <h2>Карта отказов</h2>
          </div>
          <p>40 колонок × 25 рядов. Нажми на любую ячейку, чтобы быстро выставить прогресс.</p>
        </div>

        <div className="no-grid" aria-label="Таблица из 1000 отказов">
          {Array.from({ length: 1000 }, (_, index) => {
            const isFilled = index < state.noCount;
            const isCurrent = index === state.noCount - 1;

            return (
              <button
                key={index}
                className={[
                  'no-cell',
                  isFilled ? 'no-cell--filled' : '',
                  isCurrent ? 'no-cell--current' : '',
                ].join(' ')}
                onClick={() => handleCellClick(index)}
                title={`${index + 1} НЕТ`}
                aria-label={`${index + 1} НЕТ`}
              />
            );
          })}
        </div>
      </section>

      <section className="settings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">оформление</p>
            <h2>Цветовая тема</h2>
          </div>
          <button
            className="mode-toggle"
            onClick={() => setState((current) => ({ ...current, darkMode: !current.darkMode }))}
          >
            {state.darkMode ? 'Светлая версия' : 'Тёмная версия'}
          </button>
        </div>

        <div className="theme-list">
          {THEMES.map((item) => (
            <button
              key={item.id}
              className={item.id === state.themeId ? 'theme-chip theme-chip--active' : 'theme-chip'}
              onClick={() => setState((current) => ({ ...current, themeId: item.id }))}
            >
              <span style={{ backgroundColor: item.color }} />
              {item.title}
            </button>
          ))}
        </div>
      </section>

      <section className="levels">
        <div className="section-heading">
          <div>
            <p className="eyebrow">маршрут</p>
            <h2>Уровни</h2>
          </div>
        </div>

        <div className="level-list">
          {LEVELS.map((level) => {
            const isReached = state.noCount >= level.threshold;

            return (
              <article key={level.threshold} className={isReached ? 'level level--reached' : 'level'}>
                <span>{level.threshold} НЕТ</span>
                <strong>{level.title}</strong>
                <p>{level.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
