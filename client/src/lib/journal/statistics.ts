import type { Statistic } from "./model";

const STATISTIC_KEY_WORDS_COUNT = "wordsCount";
const STATISTIC_KEY_CURRENT_YEAR = "currentYear";
const STATISTIC_KEY_ENTRY_DATE = "entryDate";
const STATISTIC_KEY_ALL_DATES = "allDates";

export interface JournalStatisticsDatabase {
  getStatistic(key: string): Promise<Statistic | undefined>;
  setStatistic(key: string, value: unknown): Promise<void>;
}

export interface JournalStatisticsStore {
  getWordsCount(): Promise<number>;
  getCurrentYear(): Promise<Record<string, number>>;
  getEntryDate(): Promise<Record<string, Record<string, number[]>>>;
  getAllDates(): Promise<number>;
  onEntryCreate(createdAt: number, wordCount: number): Promise<void>;
  onEntryDelete(createdAt: number, wordCount: number): Promise<void>;
  onEntryUpdate(oldWordCount: number, newWordCount: number): Promise<void>;
}

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYearMonthDay(timestamp: number): {
  year: string;
  month: string;
  day: number;
} {
  const date = new Date(timestamp);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
    day: date.getDate(),
  };
}

export function createJournalStatisticsStore(
  db: JournalStatisticsDatabase,
): JournalStatisticsStore {
  async function getWordsCount(): Promise<number> {
    const stat = await db.getStatistic(STATISTIC_KEY_WORDS_COUNT);
    return (stat?.stValue as number) ?? 0;
  }

  async function setWordsCount(count: number): Promise<void> {
    await db.setStatistic(STATISTIC_KEY_WORDS_COUNT, count);
  }

  async function getCurrentYear(): Promise<Record<string, number>> {
    const stat = await db.getStatistic(STATISTIC_KEY_CURRENT_YEAR);
    return (stat?.stValue as Record<string, number>) ?? {};
  }

  async function setCurrentYear(map: Record<string, number>): Promise<void> {
    await db.setStatistic(STATISTIC_KEY_CURRENT_YEAR, map);
  }

  async function getEntryDate(): Promise<
    Record<string, Record<string, number[]>>
  > {
    const stat = await db.getStatistic(STATISTIC_KEY_ENTRY_DATE);
    return (stat?.stValue as Record<string, Record<string, number[]>>) ?? {};
  }

  async function setEntryDate(
    map: Record<string, Record<string, number[]>>,
  ): Promise<void> {
    await db.setStatistic(STATISTIC_KEY_ENTRY_DATE, map);
  }

  async function getAllDates(): Promise<number> {
    const stat = await db.getStatistic(STATISTIC_KEY_ALL_DATES);
    return (stat?.stValue as number) ?? 0;
  }

  async function setAllDates(count: number): Promise<void> {
    await db.setStatistic(STATISTIC_KEY_ALL_DATES, count);
  }

  async function updateEntryDateForCreate(createdAt: number): Promise<void> {
    const { year, month, day } = getYearMonthDay(createdAt);
    const entryDate = await getEntryDate();

    if (!entryDate[year]) {
      entryDate[year] = {};
    }
    if (!entryDate[year][month]) {
      entryDate[year][month] = [];
    }

    // Check if this day already exists
    const days = entryDate[year][month];
    if (!days.includes(day)) {
      days.push(day);
      // Sort days in descending order
      days.sort((a, b) => b - a);
      await setEntryDate(entryDate);

      // Update all dates count
      const currentAllDates = await getAllDates();
      await setAllDates(currentAllDates + 1);
    } else {
      await setEntryDate(entryDate);
    }
  }

  async function onEntryCreate(
    createdAt: number,
    wordCount: number,
  ): Promise<void> {
    // Update words count
    const currentWordsCount = await getWordsCount();
    await setWordsCount(currentWordsCount + wordCount);

    // Update current year
    const dateKey = getDateKey(createdAt);
    const currentYear = await getCurrentYear();
    currentYear[dateKey] = (currentYear[dateKey] ?? 0) + 1;
    await setCurrentYear(currentYear);

    await updateEntryDateForCreate(createdAt);
  }

  async function onEntryDelete(
    createdAt: number,
    wordCount: number,
  ): Promise<void> {
    const currentWordsCount = await getWordsCount();
    await setWordsCount(Math.max(0, currentWordsCount - wordCount));

    const dateKey = getDateKey(createdAt);
    const currentYear = await getCurrentYear();
    const newCount = (currentYear[dateKey] ?? 0) - 1;
    if (newCount <= 0) {
      delete currentYear[dateKey];
    } else {
      currentYear[dateKey] = newCount;
    }
    await setCurrentYear(currentYear);

    // do not update entry date and all dates count
  }

  async function onEntryUpdate(
    oldWordCount: number,
    newWordCount: number,
  ): Promise<void> {
    if (oldWordCount === newWordCount) {
      return;
    }

    const currentWordsCount = await getWordsCount();
    await setWordsCount(currentWordsCount + newWordCount - oldWordCount);
  }

  return {
    getWordsCount,
    getCurrentYear,
    getEntryDate,
    getAllDates,
    onEntryCreate,
    onEntryDelete,
    onEntryUpdate,
  };
}

let defaultDatabase: JournalStatisticsDatabase | null = null;

export function setJournalStatisticsDatabase(
  db: JournalStatisticsDatabase,
): void {
  defaultDatabase = db;
}

function getDefaultStore(): JournalStatisticsStore {
  if (!defaultDatabase) {
    throw new Error("Journal statistics database has not been configured");
  }
  return createJournalStatisticsStore(defaultDatabase);
}

export async function getWordsCount(): Promise<number> {
  return getDefaultStore().getWordsCount();
}

export async function getCurrentYear(): Promise<Record<string, number>> {
  return getDefaultStore().getCurrentYear();
}

export async function getEntryDate(): Promise<
  Record<string, Record<string, number[]>>
> {
  return getDefaultStore().getEntryDate();
}

export async function getAllDates(): Promise<number> {
  return getDefaultStore().getAllDates();
}

export async function onEntryCreate(
  createdAt: number,
  wordCount: number,
): Promise<void> {
  return getDefaultStore().onEntryCreate(createdAt, wordCount);
}

export async function onEntryDelete(
  createdAt: number,
  wordCount: number,
): Promise<void> {
  return getDefaultStore().onEntryDelete(createdAt, wordCount);
}

export async function onEntryUpdate(
  oldWordCount: number,
  newWordCount: number,
): Promise<void> {
  return getDefaultStore().onEntryUpdate(oldWordCount, newWordCount);
}
