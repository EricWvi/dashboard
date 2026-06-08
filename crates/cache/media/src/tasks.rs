use std::collections::HashSet;
use std::sync::{Mutex, PoisonError};

/// Tracks which UUIDs are currently being downloaded so concurrent requests
/// for the same file wait instead of issuing duplicate backend requests.
pub struct DownloadingTasks {
    inner: Mutex<HashSet<String>>,
}

impl Default for DownloadingTasks {
    fn default() -> Self {
        Self::new()
    }
}

impl DownloadingTasks {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(HashSet::new()),
        }
    }

    /// Acquires a download slot for `uuid`. Returns `true` if this caller won
    /// the slot (uuid was not already in the set), `false` otherwise.
    pub fn try_insert(&self, uuid: &str) -> bool {
        self.inner
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(uuid.to_string())
    }

    pub fn remove(&self, uuid: &str) {
        self.inner
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .remove(uuid);
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::DownloadingTasks;

    #[test]
    fn first_insert_succeeds() {
        assert!(DownloadingTasks::new().try_insert("u1"));
    }

    #[test]
    fn duplicate_insert_returns_false() {
        let t = DownloadingTasks::new();
        t.try_insert("u1");
        assert!(!t.try_insert("u1"));
    }

    #[test]
    fn reinsertion_after_removal_succeeds() {
        let t = DownloadingTasks::new();
        t.try_insert("u1");
        t.remove("u1");
        assert!(t.try_insert("u1"));
    }

    #[test]
    fn concurrent_inserts_exactly_one_wins() {
        let tasks = Arc::new(DownloadingTasks::new());
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let t = Arc::clone(&tasks);
                std::thread::spawn(move || t.try_insert("shared"))
            })
            .collect();
        let wins: usize = handles
            .into_iter()
            .map(|h| h.join().unwrap())
            .filter(|&won| won)
            .count();
        assert_eq!(wins, 1);
    }
}
