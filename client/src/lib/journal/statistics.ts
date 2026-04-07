import { journalDatabase } from "./db-interface";

const STATISTIC_KEY_WORDS_COUNT = "wordsCount";
const STATISTIC_KEY_CURRENT_YEAR = "currentYear";
const STATISTIC_KEY_ENTRY_DATE = "entryDate";
const STATISTIC_KEY_ALL_DATES = "allDates";

async function getWordsCount(): Promise<number> {
  const stat = await journalDatabase.getStatistic(STATISTIC_KEY_WORDS_COUNT);
  return (stat?.stValue as number) ?? 0;
}

async function setWordsCount(count: number): Promise<void> {
  await journalDatabase.setStatistic(STATISTIC_KEY_WORDS_COUNT, count);
}

async function getCurrentYear(): Promise<Record<string, number>> {
  const stat = await journalDatabase.getStatistic(STATISTIC_KEY_CURRENT_YEAR);
  return (stat?.stValue as Record<string, number>) ?? {};
}

async function setCurrentYear(map: Record<string, number>): Promise<void> {
  await journalDatabase.setStatistic(STATISTIC_KEY_CURRENT_YEAR, map);
}

async function getEntryDate(): Promise<
  Record<string, Record<string, number[]>>
> {
  const stat = await journalDatabase.getStatistic(STATISTIC_KEY_ENTRY_DATE);
  return (stat?.stValue as Record<string, Record<string, number[]>>) ?? {};
}

async function setEntryDate(
  map: Record<string, Record<string, number[]>>,
): Promise<void> {
  await journalDatabase.setStatistic(STATISTIC_KEY_ENTRY_DATE, map);
}

async function getAllDates(): Promise<number> {
  const stat = await journalDatabase.getStatistic(STATISTIC_KEY_ALL_DATES);
  return (stat?.stValue as number) ?? 0;
}

async function setAllDates(count: number): Promise<void> {
  await journalDatabase.setStatistic(STATISTIC_KEY_ALL_DATES, count);
}

// Export getter functions for use in hooks
export { getWordsCount, getCurrentYear, getEntryDate, getAllDates };

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

// Update statistics when creating an entry
export async function onEntryCreate(
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

  // Update entry date and all dates count
  await updateEntryDateForCreate(createdAt);
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

// Update statistics when deleting an entry
export async function onEntryDelete(
  createdAt: number,
  wordCount: number,
): Promise<void> {
  // Update words count
  const currentWordsCount = await getWordsCount();
  await setWordsCount(Math.max(0, currentWordsCount - wordCount));

  // Update current year
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

// Update statistics when updating an entry
export async function onEntryUpdate(
  oldWordCount: number,
  newWordCount: number,
): Promise<void> {
  if (oldWordCount === newWordCount) {
    return;
  }

  // Update words count
  const currentWordsCount = await getWordsCount();
  await setWordsCount(currentWordsCount + newWordCount - oldWordCount);
}
