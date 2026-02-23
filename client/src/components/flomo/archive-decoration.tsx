import React from "react";

/** Wavy ribbon decoration shown below the sidebar header in archive mode */
export const SidebarArchiveWave = React.memo(() => (
  <div className="px-2" aria-hidden="true">
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className="h-3 w-full"
    >
      <path
        d="M0 7 C 8 2, 18 2, 28 7 C 38 12, 46 12, 55 7 C 64 2, 74 3, 82 7 C 90 11, 100 12, 110 7 C 120 2, 128 2, 138 7 C 148 12, 156 11, 165 7 C 174 3, 184 2, 192 7 C 196 9, 198 9, 200 8"
        className="stroke-amber-600/60 dark:stroke-amber-500/40"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M0 9 C 12 4, 24 3, 38 8 C 52 13, 62 12, 75 7 C 88 2, 100 3, 112 8 C 124 13, 136 12, 150 7 C 164 2, 176 4, 188 9 C 194 11, 198 10, 200 9"
        className="stroke-yellow-700/40 dark:stroke-yellow-600/30"
        fill="none"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  </div>
));

SidebarArchiveWave.displayName = "SidebarArchiveWave";

/** Wavy line decoration at the bottom edge of the card header in archive mode */
export const HeaderArchiveWave = React.memo(() => (
  <div
    className="absolute right-0 bottom-0 left-0 h-2 overflow-hidden"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 400 10"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <path
        d="M0 5 C 16 1, 32 1, 50 5 C 68 9, 82 9, 100 5 C 118 1, 136 2, 150 5 C 164 8, 182 9, 200 5 C 218 1, 232 1, 250 5 C 268 9, 282 9, 300 5 C 318 1, 336 2, 350 5 C 364 8, 382 9, 400 5"
        className="stroke-amber-600/50 dark:stroke-amber-500/30"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  </div>
));

HeaderArchiveWave.displayName = "HeaderArchiveWave";
