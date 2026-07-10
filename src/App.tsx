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

type DailyLog = {
  date: string;
  count: number;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: 'medal' | 'trophy';
};

type AppTab = 'home' | 'profile' | 'analytics' | 'settings';

const STORAGE_KEY = 'one-thousand-no-progress';
const SAVED_QUOTES_KEY = 'one-thousand-no-saved-quotes';
const ONBOARDING_KEY = 'one-thousand-no-onboarding-complete';
const DAILY_LOGS_KEY = 'one-thousand-no-daily-logs';

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
  const starters = Array.isArray(source.starters) ? source.starters : [];
  const endings = Array.isArray(source.endings) ? source.endings : [];

  starters.forEach((starter) => {
    endings.forEach((ending) => {
      result.push({ id: result.length + 1, text: `${starter} — ${ending}` });
    });
  });

  return result.length > 0 ? result.slice(0, 1000) : [{ id: 1, text: 'Каждый отказ продвигает тебя к новому уровню.' }];
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDateIsoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
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
    const parsed = stored ? JSON.parse(stored) : fallback;

    return {
      noCount: typeof parsed.noCount === 'number' ? Math.min(1000, Math.max(0, parsed.noCount)) : fallback.noCount,
      themeId: typeof parsed.themeId === 'string' ? parsed.themeId : fallback.themeId,
      darkMode: Boolean(parsed.darkMode),
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : fallback.startDate,
    };
  } catch {
    return fallback;
  }
}

function getStoredSavedQuotes(): string[] {
  try {
    const stored = safeRead(SAVED_QUOTES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getStoredDailyLogs(): DailyLog[] {
  try {
    const stored = safeRead(DAILY_LOGS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.date === 'string' && typeof item?.count === 'number')
      .map((item) => ({ date: item.date, count: Math.max(0, item.count) }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 120);
  } catch {
    return [];
  }
}

function getStoredOnboardingComplete(): boolean {
  return safeRead(ONBOARDING_KEY) === 'true';
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

function updateDailyLog(logs: DailyLog[], date: string, delta: number): DailyLog[] {
  const existing = logs.find((item) => item.date === date);
  const nextCount = Math.max(0, (existing?.count ?? 0) + delta);
  const withoutDate = logs.filter((item) => item.date !== date);
  const nextLogs = nextCount > 0 ? [{ date, count: nextCount }, ...withoutDate] : withoutDate;

  return nextLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 120);
}

function getCountForDate(logs: DailyLog[], date: string): number {
  return logs.find((item) => item.date === date)?.count ?? 0;
}

function getCurrentStreak(logs: DailyLog[]): number {
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    const date = getDateIsoDaysAgo(index);
    const count = getCountForDate(logs, date);
    if (count <= 0) break;
    streak += 1;
  }

  return streak;
}

function getBestDay(logs: DailyLog[]): DailyLog | null {
  if (logs.length === 0) return null;
  return logs.reduce((best, current) => (current.count > best.count ? current : best), logs[0]);
}

function getHistoryDays(logs: DailyLog[], days = 7): DailyLog[] {
  return Array.from({ length: days }, (_, index) => {
    const date = getDateIsoDaysAgo(index);
    return { date, count: getCountForDate(logs, date) };
  });
}

function formatHistoryDate(date: string, index: number): string {
  if (index === 0) return 'Сегодня';
  if (index === 1) return 'Вчера';
  const [, month, day] = date.split('-');
  return `${day}.${month}`;
}

function getDayWord(value: number): string {
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

function getAchievements(params: {
  noCount: number;
  streak: number;
  activeDays: number;
  bestDayCount: number;
  savedQuotesCount: number;
}): Achievement[] {
  const { noCount, streak, activeDays, bestDayCount, savedQuotesCount } = params;

  return [
    { id: 'first-no', title: 'Первое НЕТ', description: 'Ты сделал первый шаг и зафиксировал первый отказ.', unlocked: noCount >= 1, icon: 'medal' },
    { id: 'ten-no', title: 'Разогрев', description: '10 НЕТ собраны. Страх уже начинает слабеть.', unlocked: noCount >= 10, icon: 'medal' },
    { id: 'fifty-no', title: 'Уже не страшно', description: '50 НЕТ — ты вошёл в рабочий темп.', unlocked: noCount >= 50, icon: 'medal' },
    { id: 'hundred-no', title: 'Первая сотня', description: '100 НЕТ — первый большой психологический рубеж.', unlocked: noCount >= 100, icon: 'trophy' },
    { id: 'three-streak', title: '3 дня подряд', description: 'Ты держишь темп несколько дней без паузы.', unlocked: streak >= 3, icon: 'medal' },
    { id: 'seven-streak', title: 'Неделя действий', description: '7 дней подряд — это уже дисциплина.', unlocked: streak >= 7, icon: 'trophy' },
    { id: 'best-day-ten', title: 'Сильный день', description: '10 НЕТ за один день. Хороший рабочий рывок.', unlocked: bestDayCount >= 10, icon: 'medal' },
    { id: 'quote-saver', title: 'Коллекционер мыслей', description: 'Ты сохранил первую цитату в библиотеку.', unlocked: savedQuotesCount >= 1, icon: 'medal' },
    { id: 'active-month', title: '30 активных дней', description: '30 дней с действиями — это уже система.', unlocked: activeDays >= 30, icon: 'trophy' },
    { id: 'five-hundred', title: 'Железная психика', description: '500 НЕТ собраны. Отказы больше не управляют тобой.', unlocked: noCount >= 500, icon: 'trophy' },
    { id: 'legend', title: 'Легенда отказов', description: '1000 НЕТ пройдены. Большинство даже не начинает этот путь.', unlocked: noCount >= 1000, icon: 'trophy' },
  ];
}

function App() {
  const [state, setState] = useState<ProgressState>(getStoredState);
  const [toast, setToast] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [modalQuote, setModalQuote] = useState<Quote | null>(null);
  const [lastQuoteId, setLastQuoteId] = useState<number | undefined>();
  const [copied, setCopied] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<string[]>(getStoredSavedQuotes);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(getStoredDailyLogs);
  const [quoteLibraryOpen, setQuoteLibraryOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !getStoredOnboardingComplete());
  const [onboardingStep, setOnboardingStep] = useState(0);
  const quotes = useMemo(() => createQuotes(quotesSource), []);

  const theme = THEMES.find((item) => item.id === state.themeId) ?? THEMES[0];
  const currentLevel = getCurrentLevel(state.noCount);
  const nextLevel = getNextLevel(state.noCount);
  const daysFromStart = getDaysFromStart(state.startDate);
  const progressPercent = Math.round((state.noCount / 1000) * 100);
  const dailyQuote = getDailyQuote(quotes);
  const todayCount = getCountForDate(dailyLogs, getTodayIso());
  const currentStreak = getCurrentStreak(dailyLogs);
  const bestDay = getBestDay(dailyLogs);
  const historyDays = getHistoryDays(dailyLogs, 7);
  const activeDays = dailyLogs.filter((item) => item.count > 0).length;
  const achievements = getAchievements({
    noCount: state.noCount,
    streak: currentStreak,
    activeDays,
    bestDayCount: bestDay?.count ?? 0,
    savedQuotesCount: savedQuotes.length,
  });
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  useEffect(() => {
    safeWrite(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    safeWrite(SAVED_QUOTES_KEY, JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  useEffect(() => {
    safeWrite(DAILY_LOGS_KEY, JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const shouldLock = Boolean(modalQuote) || quoteLibraryOpen || showOnboarding;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = shouldLock ? 'hidden' : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalQuote, quoteLibraryOpen, showOnboarding]);

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
    if (state.noCount >= 1000) return;
    setDailyLogs((current) => updateDailyLog(current, getTodayIso(), 1));
    updateNoCount(state.noCount + 1, { showQuote: true, celebrate: true });
  }

  function handleUndo() {
    if (state.noCount <= 0) return;
    setDailyLogs((current) => updateDailyLog(current, getTodayIso(), -1));
    updateNoCount(state.noCount - 1);
  }

  function handleReset() {
    const confirmed = window.confirm('Сбросить весь прогресс и начать заново?');
    if (!confirmed) return;

    setState((current) => ({ ...current, noCount: 0, startDate: getTodayIso() }));
    setDailyLogs([]);
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

  function finishOnboarding() {
    safeWrite(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    setOnboardingStep(0);
  }

  return (
    <main
      className={state.darkMode ? 'app app--dark app--with-tabs' : 'app app--with-tabs'}
      style={{ '--accent': theme.color, '--accent-contrast': theme.contrast } as CSSProperties}
    >
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <div className="ambient ambient--three" />

      {activeTab === 'home' && (
        <>
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
        </>
      )}

      {activeTab === 'profile' && (
        <>
          <section className="hero glass-card glass-card--hero profile-hero">
            <div>
              <p className="eyebrow">профиль действия</p>
              <h1>{state.noCount} НЕТ</h1>
              <p className="hero__text">Твой путь, уровни, история и достижения в одном месте.</p>
            </div>
          </section>

          <section className="rhythm-section glass-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ритм действий</p>
                <h2>Статистика</h2>
              </div>
              <p>Здесь видно не только количество НЕТ, но и твою стабильность.</p>
            </div>

            <div className="rhythm-grid">
              <article className="rhythm-card rhythm-card--accent">
                <span>Сегодня</span>
                <strong>{todayCount}</strong>
                <p>НЕТ за день</p>
              </article>
              <article className="rhythm-card">
                <span>Серия</span>
                <strong>{currentStreak}</strong>
                <p>{getDayWord(currentStreak)} подряд</p>
              </article>
              <article className="rhythm-card">
                <span>Лучший день</span>
                <strong>{bestDay?.count ?? 0}</strong>
                <p>{bestDay ? bestDay.date.split('-').reverse().slice(0, 2).join('.') : 'пока нет данных'}</p>
              </article>
            </div>
          </section>

          <section className="history-section glass-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">история</p>
                <h2>По дням</h2>
              </div>
              <p>Последние 7 дней. Пустой день — это не провал, а сигнал вернуться в действие.</p>
            </div>

            <div className="history-list">
              {historyDays.map((item, index) => {
                const maxValue = Math.max(1, ...historyDays.map((day) => day.count));
                const width = Math.max(4, Math.round((item.count / maxValue) * 100));

                return (
                  <article className="history-row" key={item.date}>
                    <div>
                      <strong>{formatHistoryDate(item.date, index)}</strong>
                      <span>{item.date.split('-').reverse().slice(0, 2).join('.')}</span>
                    </div>
                    <div className="history-bar" aria-label={`${item.count} НЕТ`}>
                      <span style={{ width: `${item.count > 0 ? width : 0}%` }} />
                    </div>
                    <b>{item.count}</b>
                  </article>
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

          <section className="achievements-section glass-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">достижения</p>
                <h2>{unlockedAchievements}/{achievements.length}</h2>
              </div>
              <p>Достижения открываются за количество НЕТ, стабильность, сильные дни и сохранённые цитаты.</p>
            </div>

            <div className="achievement-list">
              {achievements.map((achievement) => (
                <article key={achievement.id} className={achievement.unlocked ? 'achievement achievement--unlocked' : 'achievement achievement--locked'}>
                  <div className="achievement__icon">
                    {achievement.unlocked ? (achievement.icon === 'trophy' ? <Trophy size={24} /> : <Medal size={24} />) : <LockKeyhole size={22} />}
                  </div>
                  <div>
                    <strong>{achievement.title}</strong>
                    <p>{achievement.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'analytics' && (
        <section className="analytics-placeholder glass-card">
          <p className="eyebrow">аналитика</p>
          <h2>Скоро здесь будет аналитика</h2>
          <p>Позже добавим графики, цели на день, средний темп, прогноз до 1000 НЕТ и аналитику по неделям/месяцам.</p>
          <div className="analytics-preview-grid">
            <article>
              <span>Неделя</span>
              <strong>{historyDays.reduce((sum, item) => sum + item.count, 0)}</strong>
              <p>НЕТ за 7 дней</p>
            </article>
            <article>
              <span>Средний темп</span>
              <strong>{Math.round(state.noCount / Math.max(1, daysFromStart))}</strong>
              <p>НЕТ в день</p>
            </article>
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="settings-page glass-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">оформление</p>
              <h2>Настройки</h2>
            </div>
            <p>Шестерёнку убрали. Теперь настройки живут здесь — как в обычном приложении.</p>
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

          <div className="settings-group install-settings">
            <div className="settings-label">
              <BookOpen size={18} />
              <span>Онбординг</span>
            </div>
            <button
              className="premium-mini-button"
              onClick={() => {
                setShowOnboarding(true);
                setOnboardingStep(0);
              }}
            >
              <BookOpen size={17} />
              Показать инструкцию
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
        </section>
      )}

      <footer className="footer glass-card app-footer">
        <div>
          <strong>1000 НЕТ</strong>
          <p>Каждый отказ — это шаг к спокойствию, опыту и внутренней силе.</p>
        </div>
        <span>Сделано для людей действия ⚡️</span>
      </footer>

      <nav className="bottom-tabs" aria-label="Нижнее меню приложения">
        <button className={activeTab === 'home' ? 'bottom-tab bottom-tab--active' : 'bottom-tab'} onClick={() => setActiveTab('home')}>
          <Sparkles size={19} />
          <span>Главная</span>
        </button>
        <button className={activeTab === 'profile' ? 'bottom-tab bottom-tab--active' : 'bottom-tab'} onClick={() => setActiveTab('profile')}>
          <Medal size={19} />
          <span>Профиль</span>
        </button>
        <button className={activeTab === 'analytics' ? 'bottom-tab bottom-tab--active' : 'bottom-tab'} onClick={() => setActiveTab('analytics')}>
          <CalendarDays size={19} />
          <span>Аналитика</span>
        </button>
        <button className={activeTab === 'settings' ? 'bottom-tab bottom-tab--active' : 'bottom-tab'} onClick={() => setActiveTab('settings')}>
          <Settings size={19} />
          <span>Настройки</span>
        </button>
      </nav>

      <div className="sticky-add sticky-add--with-tabs">
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

      {showOnboarding && (
        <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Онбординг 1000 НЕТ">
          <div className="onboarding-card">
            <button className="onboarding-close" onClick={finishOnboarding} aria-label="Закрыть онбординг">
              <X size={22} />
            </button>

            <div className="onboarding-progress">
              <span style={{ width: `${((onboardingStep + 1) / 4) * 100}%` }} />
            </div>

            {onboardingStep === 0 && (
              <div className="onboarding-screen">
                <div className="onboarding-icon"><Sparkles size={34} /></div>
                <p className="eyebrow">шаг 1 из 4</p>
                <h2>1000 НЕТ — это игра на смелость</h2>
                <p>Здесь не считаются продажи, регистрации и «да». Здесь считается навык продолжать действовать после отказа.</p>
                <button className="onboarding-next" onClick={() => setOnboardingStep(1)}>Дальше</button>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="onboarding-screen">
                <div className="onboarding-icon"><Zap size={34} /></div>
                <p className="eyebrow">шаг 2 из 4</p>
                <h2>Нажимай +1 НЕТ после каждого отказа</h2>
                <p>Карта отказов будет заполняться, уровни открываться, а после каждого действия появится цитата, которую можно сохранить в библиотеку.</p>
                <button className="onboarding-next" onClick={() => setOnboardingStep(2)}>Дальше</button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="onboarding-screen">
                <div className="onboarding-icon"><Trophy size={34} /></div>
                <p className="eyebrow">шаг 3 из 4</p>
                <h2>Твоя цель — не избежать отказов, а пройти их</h2>
                <p>Каждые 100 НЕТ теперь видны на карте. Чем больше заполнено клеток, тем спокойнее ты относишься к отказам.</p>
                <button className="onboarding-next" onClick={() => setOnboardingStep(3)}>Дальше</button>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="onboarding-screen">
                <div className="onboarding-icon"><BookOpen size={34} /></div>
                <p className="eyebrow">шаг 4 из 4</p>
                <h2>Поставь сервис на экран Домой</h2>
                <p>Так 1000 НЕТ будет открываться как отдельное приложение — быстро, удобно и всегда под рукой.</p>

                <div className="install-instruction-grid">
                  <article>
                    <strong>iPhone / Safari</strong>
                    <p>Открой сайт в Safari → нажми кнопку «Поделиться» → выбери «На экран Домой» → нажми «Добавить».</p>
                  </article>
                  <article>
                    <strong>Android / Chrome</strong>
                    <p>Открой меню ⋮ → выбери «Установить приложение» или «Добавить на главный экран» → подтверди установку.</p>
                  </article>
                </div>

                <button className="onboarding-next" onClick={finishOnboarding}>Начать путь</button>
              </div>
            )}
          </div>
        </div>
      )}

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
