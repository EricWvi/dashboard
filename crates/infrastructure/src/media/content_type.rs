/// Resolves a MIME content-type string from a file extension.
///
/// Delegates to `mime_guess`, falling back to `application/octet-stream`
/// when no mapping is found.
pub fn from_extension(ext: &str) -> String {
    mime_guess::from_ext(ext).first_or_octet_stream().to_string()
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::from_extension;

    #[test]
    fn resolves_common_image_types() {
        assert_eq!(from_extension("jpg"), "image/jpeg");
        assert_eq!(from_extension("jpeg"), "image/jpeg");
        assert_eq!(from_extension("png"), "image/png");
        assert_eq!(from_extension("gif"), "image/gif");
        assert_eq!(from_extension("webp"), "image/webp");
    }

    #[test]
    fn resolves_common_video_types() {
        assert_eq!(from_extension("mp4"), "video/mp4");
        assert_eq!(from_extension("mov"), "video/quicktime");
        assert_eq!(from_extension("avi"), "video/x-msvideo");
    }

    #[test]
    fn falls_back_for_unknown_extensions() {
        assert_eq!(from_extension("unknownext99"), "application/octet-stream");
        assert_eq!(from_extension(""), "application/octet-stream");
    }
}
