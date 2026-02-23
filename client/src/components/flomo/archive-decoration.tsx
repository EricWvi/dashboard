import React from "react";

/**
 * Full-viewport frame overlay for archive mode.
 * Uses the box-shadow cutout technique: an inner div with rounded corners
 * casts a massive outward box-shadow that fills the gap between the rounded
 * rect and the viewport edges, creating a colored frame with inner rounded
 * corners and straight outer edges (clipped by viewport).
 */
export const ArchiveFrame = React.memo(() => (
  <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
    <div
      className="absolute inset-2 rounded-xl"
      style={{ boxShadow: "0 0 0 9999px var(--archive-frame)" }}
    />
  </div>
));

ArchiveFrame.displayName = "ArchiveFrame";
