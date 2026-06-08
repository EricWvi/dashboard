use std::path::{Path, PathBuf};

/// Returns the two-level sharded path for a cached object:
/// `objects_dir/{uuid[0..2]}/{uuid[2..4]}/{uuid}`
pub fn cache_file_path(objects_dir: &Path, uuid: &str) -> PathBuf {
    objects_dir.join(&uuid[..2]).join(&uuid[2..4]).join(uuid)
}

/// Writes bytes atomically by staging to a `.tmp` sibling file and renaming.
pub fn write_bytes_atomically(file_path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create cache dirs: {e}"))?;
    }
    let mut tmp_name = file_path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_os_string();
    tmp_name.push(".tmp");
    let tmp_path = file_path.with_file_name(tmp_name);
    std::fs::write(&tmp_path, bytes).map_err(|e| format!("Failed to write tmp file: {e}"))?;
    std::fs::rename(&tmp_path, file_path).map_err(|e| format!("Failed to rename tmp file: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use pretty_assertions::assert_eq;

    use super::{cache_file_path, write_bytes_atomically};

    #[test]
    fn cache_file_path_produces_two_level_structure() {
        let dir = PathBuf::from("/objects");
        let path = cache_file_path(&dir, "abcdef1234567890");
        assert_eq!(path, Path::new("/objects/ab/cd/abcdef1234567890"));
    }

    #[test]
    fn write_bytes_atomically_creates_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("a").join("b").join("file.bin");
        write_bytes_atomically(&path, b"hello").unwrap();
        assert!(path.exists());
    }

    #[test]
    fn write_bytes_atomically_writes_exact_bytes() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("data.bin");
        write_bytes_atomically(&path, b"exact content").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"exact content");
    }

    #[test]
    fn write_bytes_atomically_leaves_no_tmp_file() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("file.bin");
        write_bytes_atomically(&path, b"data").unwrap();
        assert!(!tmp.path().join("file.bin.tmp").exists());
    }
}
