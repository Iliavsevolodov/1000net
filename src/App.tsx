import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import confetti from 'canvas-confetti';
import {
  BookmarkPlus,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  LockKeyhole,
  Medal,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
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
  contrast: '#111318' | '#ffffff';
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
const SAVED_QUOTES_KEY = 'one-thousand-no-saved-quotes';

const LEVELS: Level[] = [
  { threshold: 10, title: 'Первые шаги', description: 'Ты начал путь и сделал первые действия.' },
  { threshold: 50, title: 'Уже не страшно', description: 'Отказы больше не выглядят как катастрофа.' },
  { threshold: 100, title: 'Вышел из ступора', description: 'Ты перестал откладывать и начал действовать стабильно.' },
  { threshold: 250, title: 'Стабильный игрок', description: 'Ты уже не ждёшь настроения, ты работаешь по системе.' },
  { threshold: 500, title: 'Железная психика', description: 'Отказы больше не сбивают тебя с маршрута.' },
  { threshold: 750, title: 'Машина действий', description: 'Ты стал человеком темпа и дисциплины.' },
  { threshold: 1000, title: 'Легенда отказов', description: 'Ты прошёл путь, который большинство даже не начинает.' },
];

const THEMES: Theme[] = [
  { id: 'yellow-energy', title: 'Жёлтая энергия', color: '#FFD21F', contrast: '#111318' },
  { id: 'greenway-green', title: 'Greenway Green', color: '#21B573', contrast: '#111318' },
  { id: 'deep-indigo', title: 'Глубокий индиго', color: '#3030A3', contrast: '#ffffff' },
  { id: 'electric-blue', title: 'Электрик blue', color: '#2563EB', contrast: '#ffffff' },
  { id: 'red-drive', title: 'Красный драйв', color: '#EF4444', contrast: '#ffffff' },
  { id: 'orange-pulse', title: 'Оранжевый импульс', color: '#F97316', contrast: '#111318' },
  { id: 'violet-focus', title: 'Фиолетовый фокус', color: '#7C3AED', contrast: '#ffffff' },
  { id: 'pink-neon', title: 'Розовый неон', color: '#EC4899', contrast: '#ffffff' },
  { id: 'turquoise-flow', title: 'Бирюзовый поток', color: '#06B6D4', contrast: '#111318' },
  { id: 'gold-status', title: 'Золотой статус', color: '#D6A21E', contrast: '#111318' },
  { id: 'graphite-minimal', title: 'Графитовый минимализм', color: '#374151', contrast: '#ffffff' },
  { id: 'mint-fresh', title: 'Мятная свежесть', color: '#2DD4BF', contrast: '#111318' },
];

const quotesSource = quoteParts as QuoteParts;

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
    // Приложение работает даже если браузер временно заблокировал storage.
  }
}

function createQuotes(source: QuoteParts): Quote[] {
  const result: Quote[] = [];

  source.starters.forEach((starter) => {
    source.endings.forEach((ending) => {
      result.push({ id: result.length + 1, text: `${starter} — ${ending}` });
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
    const stored = safeRead(STORAGE_KEY);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

function getStoredSavedQuotes(): string[] {
  try {
    const stored = safeRead(SAVED_QUOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
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
  const reached = reachedLevels.length > 0 ? reachedLevels[reachedLevels.length - 1] : null;

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
  return quotes[daySeed % quotes.length] ?? { id: 0, text: 'Каждый отказ продвигает тебя к новому уровню.' };
}

function getRandomQuote(quotes: Quote[], avoidQuoteId?: number): Quote {
  if (quotes.length <= 1) {
    return quotes[0] ?? { id: 0, text: 'Продолжай движение.' };
  }

  let quote = quotes[Math.floor(Math.random() * quotes.length)];
  let attempts = 0;

  while (quote.id === avoidQuoteId && attempts < 8) {
    quote = quotes[Math.floor(Math.random() * quotes.length)];
    attempts += 1;
  }

  return quote;
}

function App() {
  const [state, setState] = useState<ProgressState>(getStoredState);
  const [toast, setToast] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalQuote, setModalQuote] = useState<Quote | null>(null);
  const [lastQuoteId, setLastQuoteId] = useState<number | undefined>();
  const [copied, setCopied] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<string[]>(getStoredSavedQuotes);
  const [quoteLibraryOpen, setQuoteLibraryOpen] = useState(false);
  const quotes = useMemo(() => createQuotes(quotesSource), []);

  const theme = THEMES.find((item) => item.id === state.themeId) ?? THEMES[0];
  const currentLevel = getCurrentLevel(state.noCount);
  const nextLevel = getNextLevel(state.noCount);
  const daysFromStart = getDaysFromStart(state.startDate);
  const progressPercent = Math.round((state.noCount / 1000) * 100);
  const dailyQuote = getDailyQuote(quotes);

  useEffect(() => {
    safeWrite(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    safeWrite(SAVED_QUOTES_KEY, JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const shouldLock = settingsOpen || Boolean(modalQuote) || quoteLibraryOpen;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = shouldLock ? 'hidden' : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen, modalQuote, quoteLibraryOpen]);

  function launchConfetti() {
    const defaults = {
      spread: 78,
      ticks: 70,
      gravity: 0.95,
      decay: 0.92,
      startVelocity: 34,
      colors: [theme.color, '#ffffff', '#111318', '#FACC15'],
      origin: { y: 0.64 },
    };

    confetti({ ...defaults, particleCount: 90, scalar: 1 });
    window.setTimeout(() => confetti({ ...defaults, particleCount: 50, scalar: 0.74, angle: 60 }), 120);
    window.setTimeout(() => confetti({ ...defaults, particleCount: 50, scalar: 0.74, angle: 120 }), 170);
  }

  function updateNoCount(nextValue: number, options?: { showQuote?: boolean; celebrate?: boolean }) {
    const nextNoCount = clampProgress(nextValue);
    const newLevel = LEVELS.find((level) => level.threshold === nextNoCount);

    setState((current) => ({ ...current, noCount: nextNoCount }));

    if (options?.celebrate && nextNoCount > 0) launchConfetti();

    if (options?.showQuote && nextNoCount > 0) {
      const nextQuote = getRandomQuote(quotes, lastQuoteId);
      setCopied(false);
      setLastQuoteId(nextQuote.id);
      setModalQuote(nextQuote);
    }

    if (newLevel) {
      setToast(`Новая награда: ${newLevel.title}!`);
      return;
    }

    if (nextNoCount >= 1000) {
      setToast('1000 НЕТ пройдены. Ты стал легендой отказов.');
    }
  }

  function handleAddNo() {
    updateNoCount(state.noCount + 1, { showQuote: true, celebrate: true });
  }

  function handleUndo() {
    updateNoCount(state.noCount - 1);
  }

  function handleReset() {
    const confirmed = window.confirm('Сбросить весь прогресс и начать заново?');
    if (!confirmed) return;

    setState((current) => ({ ...current, noCount: 0, startDate: getTodayIso() }));
    setSettingsOpen(false);
    setToast('Прогресс сброшен. Новый путь начинается с первого действия.');
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setToast('Цитата скопирована.');
    } catch {
      setToast('Не удалось скопировать цитату.');
    }
  }

  function handleSaveQuote() {
    if (!modalQuote) return;

    setSavedQuotes((current) => {
      if (current.includes(modalQuote.text)) {
        setToast('Эта цитата уже сохранена.');
        return current;
      }

      setToast('Цитата сохранена в библиотеку.');
      return [modalQuote.text, ...current];
    });
  }

  function handleRemoveSavedQuote(quote: string) {
    setSavedQuotes((current) => current.filter((item) => item !== quote));
    setToast('Цитата удалена из библиотеки.');
  }

  return (
    <main
      className={state.darkMode ? 'app app--dark' : 'app'}
      style={{ '--accent': theme.color, '--accent-contrast': theme.contrast } as CSSProperties}
    >
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <div className="ambient ambient--three" />

      <div className="settings-dock" aria-label="Панель настроек">
        <button
          className="settings-trigger"
          onClick={() => setSettingsOpen((current) => !current)}
          aria-expanded={settingsOpen}
          aria-label="Открыть настройки оформления"
        >
          <Settings size={22} />
        </button>

        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <p className="eyebrow">оформление</p>
                <h2>Настройки</h2>
              </div>
              <button className="panel-close" onClick={() => setSettingsOpen(false)} aria-label="Закрыть настройки">
                <X size={22} />
              </button>
            </div>

            <div className="settings-group">
              <div className="settings-label">
                <Palette size={18} />
                <span>Цвет темы</span>
              </div>
              <div className="color-grid" aria-label="Выбор цвета темы">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === state.themeId ? 'color-swatch color-swatch--active' : 'color-swatch'}
                    onClick={() => setState((current) => ({ ...current, themeId: item.id }))}
                    style={{ backgroundColor: item.color }}
                    title={item.title}
                    aria-label={item.title}
                  >
                    {item.id === state.themeId && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group settings-group--row">
              <div className="settings-label">
                {state.darkMode ? <Moon size={18} /> : <Sun size={18} />}
                <span>{state.darkMode ? 'Тёмная тема' : 'Светлая тема'}</span>
              </div>
              <button
                className={state.darkMode ? 'theme-switch theme-switch--dark' : 'theme-switch'}
                onClick={() => setState((current) => ({ ...current, darkMode: !current.darkMode }))}
                aria-label="Переключить светлую и тёмную тему"
              >
                <span>{state.darkMode ? <Moon size={18} /> : <Sun size={18} />}</span>
              </button>
            </div>

            <div className="settings-group settings-danger">
              <div className="settings-label">
                <Trash2 size={18} />
                <span>Сброс прогресса</span>
              </div>
              <button className="danger-settings-button" onClick={handleReset}>
                <Trash2 size={18} />
                Сбросить всё и начать заново
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="hero glass-card glass-card--hero">
        <div>
          <p className="eyebrow">трекер отказов для сетевиков</p>
          <h1>1000 НЕТ</h1>
          <p className="hero__text">Каждый отказ продвигает тебя к новому уровню.</p>
        </div>
      </section>

      <section className="dashboard" aria-label="Дашборд прогресса">
        <article className="card card--progress card--accent">
          <div className="card__icon"><Sparkles size={20} /></div>
          <span>Прогресс</span>
          <strong>{progressPercent}%</strong>
          <p>{state.noCount}/1000</p>
        </article>

        <article className="card card--accent card--level">
          <div className="card__icon"><Trophy size={20} /></div>
          <span>Уровень</span>
          <strong>{currentLevel.title}</strong>
          <p>{currentLevel.description}</p>
        </article>

        <article className="card card--day">
          <div className="card__icon"><CalendarDays size={20} /></div>
          <span>День отказов</span>
          <strong>{daysFromStart} день</strong>
          <p>{nextLevel ? `До «${nextLevel.title}» осталось ${nextLevel.threshold - state.noCount}` : 'Все награды открыты.'}</p>
        </article>

        <article className="card card--quote card--wide">
          <div className="card__icon"><Zap size={20} /></div>
          <span>Фраза дня</span>
          <strong>{dailyQuote.text}</strong>
        </article>
      </section>

      <section className="grid-section glass-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">1000 ячеек</p>
            <h2>Карта отказов</h2>
          </div>
        </div>

        <div className="no-map" aria-label="Таблица из 1000 отказов с разделением по сотням">
          {Array.from({ length: 10 }, (_, centuryIndex) => {
            const startIndex = centuryIndex * 100;
            const centuryLabel = startIndex + 100;

            return (
              <div className="no-century" key={centuryLabel}>
                <div className="no-century__grid">
                  {Array.from({ length: 100 }, (_, cellIndex) => {
                    const index = startIndex + cellIndex;
                    const isFilled = index < state.noCount;
                    const isCurrent = index === state.noCount - 1;

                    return (
                      <div
                        key={index}
                        className={['no-cell', isFilled ? 'no-cell--filled' : '', isCurrent ? 'no-cell--current' : ''].join(' ')}
                        title={`${index + 1} НЕТ`}
                      />
                    );
                  })}
                </div>
                <div className="no-century__label">{centuryLabel}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="levels glass-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">награды</p>
            <h2>Уровни</h2>
          </div>
          <p>Открывай уровни через действия. Закрытые награды ждут своего момента.</p>
        </div>

        <div className="level-list">
          {LEVELS.map((level) => {
            const isReached = state.noCount >= level.threshold;
            const isLegend = level.threshold === 1000;
            return (
              <article key={level.threshold} className={isReached ? 'level level--reached' : 'level level--locked'}>
                <div className="level__reward">
                  {isReached ? (isLegend ? <Trophy size={28} /> : <Medal size={28} />) : <LockKeyhole size={26} />}
                </div>
                <div className="level__content">
                  <span>{level.threshold} НЕТ</span>
                  <strong>{level.title}</strong>
                  <p>{level.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="quote-library-entry glass-card">
        <div>
          <p className="eyebrow">библиотека</p>
          <h2>Цитаты</h2>
          <p>{savedQuotes.length > 0 ? `Сохранено сильных фраз: ${savedQuotes.length}` : 'Сохраняй лучшие цитаты после каждого НЕТ.'}</p>
        </div>
        <button className="library-open-button" onClick={() => setQuoteLibraryOpen(true)}>
          <BookOpen size={21} />
          Открыть библиотеку
        </button>
      </section>

      <footer className="footer glass-card">
        <div>
          <strong>1000 НЕТ</strong>
          <p>Каждый отказ — это шаг к спокойствию, опыту и внутренней силе.</p>
        </div>
        <span>Сделано для людей действия ⚡️</span>
      </footer>

      <div className="sticky-add">
        <div className="sticky-add__inner">
          <button className="sticky-add__undo" onClick={handleUndo} disabled={state.noCount <= 0} aria-label="Отменить последнее действие">
            <RotateCcw size={24} />
          </button>
          <button className="sticky-add__button" onClick={handleAddNo} disabled={state.noCount >= 1000}>
            <Zap size={24} />
            +1 НЕТ
          </button>
        </div>
      </div>

      {quoteLibraryOpen && (
        <div className="library-overlay" role="dialog" aria-modal="true" aria-label="Библиотека цитат">
          <div className="library-shell">
            <div className="library-header">
              <div>
                <p className="eyebrow">твоя коллекция</p>
                <h2>Библиотека цитат</h2>
                <p>{savedQuotes.length > 0 ? `${savedQuotes.length} сохранённых фраз для внутренней опоры.` : 'Сохраняй цитаты после клика +1 НЕТ — они появятся здесь.'}</p>
              </div>
              <button className="library-close" onClick={() => setQuoteLibraryOpen(false)} aria-label="Закрыть библиотеку">
                <X size={24} />
              </button>
            </div>

            {savedQuotes.length === 0 ? (
              <div className="library-empty">
                <BookmarkPlus size={44} />
                <strong>Библиотека пока пустая</strong>
                <p>Нажми +1 НЕТ, выбери сильную цитату и сохрани её. Здесь будет твоя личная подборка фраз.</p>
              </div>
            ) : (
              <div className="library-grid">
                {savedQuotes.map((quote, index) => (
                  <article className="library-card" key={`${quote}-${index}`}>
                    <span>цитата #{savedQuotes.length - index}</span>
                    <p>{quote}</p>
                    <div className="library-card__actions">
                      <button onClick={() => copyText(quote)}>
                        <Copy size={17} />
                        Копировать
                      </button>
                      <button onClick={() => handleRemoveSavedQuote(quote)}>
                        <Trash2 size={17} />
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modalQuote && (
        <div className="quote-overlay" role="dialog" aria-modal="true" aria-label="Мотивационная цитата">
          <div className="quote-modal">
            <button className="quote-close" onClick={() => setModalQuote(null)} aria-label="Закрыть цитату">
              <X size={22} />
            </button>

            <div className="quote-badge">
              <Sparkles size={18} />
              НЕТ #{state.noCount}
            </div>

            <p className="quote-text">{modalQuote.text}</p>

            <div className="quote-actions">
              <button onClick={() => copyText(modalQuote.text)}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Скопировано' : 'Скопировать'}
              </button>
              <button onClick={handleSaveQuote}>
                <Save size={18} />
                Сохранить
              </button>
            </div>

            <div className="saved-counter">
              <BookmarkPlus size={16} />
              Сохранено цитат: {savedQuotes.length}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
