use only_logging::clock;

use crate::{CommandError, JournalCommands};

/// A single day's entry count within the current-year activity heatmap.
#[derive(Debug, PartialEq)]
pub struct DailyCount {
    /// Calendar date in `YYYY-MM-DD` format.
    pub date: String,
    pub count: i32,
}

/// One month within an annual date hierarchy.
#[derive(Debug, PartialEq)]
pub struct EntryMonthEntry {
    pub month: i32,
    /// Distinct days within this month, ordered descending.
    pub days: Vec<i32>,
}

/// One year within the entry date hierarchy.
#[derive(Debug, PartialEq)]
pub struct EntryYearEntry {
    pub year: i32,
    /// Months within this year, ordered descending.
    pub months: Vec<EntryMonthEntry>,
}

impl JournalCommands {
    /// Returns the total word count across all non-deleted entries.
    pub fn count_words(&self) -> Result<i64, CommandError> {
        Ok(self.db.entries().count_words()?)
    }

    /// Returns the count of all non-deleted entries.
    pub fn count_entries(&self) -> Result<i64, CommandError> {
        Ok(self.db.entries().count_all()?)
    }

    /// Returns the count of non-deleted entries created in the given year.
    pub fn count_entries_by_year(&self, year: i32) -> Result<i64, CommandError> {
        Ok(self.db.entries().count_by_year(year)?)
    }

    /// Returns per-day entry counts for the current calendar year, padded to always include
    /// the year-start (`YYYY-01-01`) and today, and the total count for the year.
    ///
    /// Matching the application handler contract: callers can rely on the list being non-empty
    /// even when there are no entries this year.
    pub fn get_current_year(&self) -> Result<(Vec<DailyCount>, i32), CommandError> {
        let mut counts = self.db.entries().count_current_year()?;

        let now = clock::now_local();
        let today_str = format!(
            "{:04}-{:02}-{:02}",
            now.year(),
            now.month() as u8,
            now.day()
        );
        let year_start_str = format!("{:04}-01-01", now.year());

        if counts.last().map(|(d, _)| d.as_str()) != Some(today_str.as_str()) {
            counts.push((today_str, 0));
        }
        if counts.first().map(|(d, _)| d.as_str()) != Some(year_start_str.as_str()) {
            counts.insert(0, (year_start_str, 0));
        }

        let total: i32 = counts.iter().map(|(_, c)| c).sum();
        let activity = counts
            .into_iter()
            .map(|(date, count)| DailyCount { date, count })
            .collect();
        Ok((activity, total))
    }

    /// Returns the hierarchical `(year → month → days)` structure for all non-deleted entries,
    /// along with the total count of distinct dates.
    pub fn get_entry_dates(&self) -> Result<(Vec<EntryYearEntry>, i32), CommandError> {
        let parts = self.db.entries().list_date_parts()?;
        let total = parts.len() as i32;
        let entry_dates = group_date_parts(parts);
        Ok((entry_dates, total))
    }
}

/// Groups flat `(year, month, day)` tuples (ordered DESC) into nested year/month/day hierarchy.
fn group_date_parts(parts: Vec<(i32, i32, i32)>) -> Vec<EntryYearEntry> {
    let mut result: Vec<EntryYearEntry> = Vec::new();
    for (year, month, day) in parts {
        if result.last().map(|y| y.year) != Some(year) {
            result.push(EntryYearEntry {
                year,
                months: Vec::new(),
            });
        }
        let year_idx = result.len() - 1;
        if result[year_idx].months.last().map(|m| m.month) != Some(month) {
            result[year_idx].months.push(EntryMonthEntry {
                month,
                days: Vec::new(),
            });
        }
        let month_idx = result[year_idx].months.len() - 1;
        result[year_idx].months[month_idx].days.push(day);
    }
    result
}
