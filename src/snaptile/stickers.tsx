const STICKERS = ["star", "heart", "sun", "moon", "flower", "cloud", "apple", "boat", "house", "fish", "balloon", "crown"] as const;

type StickerName = (typeof STICKERS)[number];

function stickerFor(puzzleId: number): StickerName {
  return STICKERS[(puzzleId - 1) % STICKERS.length]!;
}

const INK: Record<StickerName, string> = {
  star: "#ffb20a",
  heart: "#ff5c45",
  sun: "#ffb20a",
  moon: "#7d6cff",
  flower: "#ff62b3",
  cloud: "#3aa0ff",
  apple: "#ff5c45",
  boat: "#2fce78",
  house: "#3aa0ff",
  fish: "#3aa0ff",
  balloon: "#a86bff",
  crown: "#ffb20a",
};

export function StickerArt({ puzzleId }: { puzzleId: number }) {
  const name = stickerFor(puzzleId);
  const fill = INK[name];
  return (
    <svg className="snap-sticker" data-sticker={name} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#fff" />
      {name === "star" ? <polygon fill={fill} points="32,8 38,24 56,24 42,34 48,52 32,42 16,52 22,34 8,24 26,24" /> : null}
      {name === "heart" ? <path fill={fill} d="M32 52 C12 36 10 20 22 16 C28 14 32 20 32 20 C32 20 36 14 42 16 C54 20 52 36 32 52Z" /> : null}
      {name === "sun" ? <g fill={fill}><circle cx="32" cy="32" r="12" />{[0, 45, 90, 135].map((deg) => <rect key={deg} x="30" y="6" width="4" height="10" rx="2" transform={`rotate(${deg} 32 32)`} />)}</g> : null}
      {name === "moon" ? <path fill={fill} d="M36 10 A22 22 0 1 0 36 54 A16 16 0 1 1 36 10Z" /> : null}
      {name === "flower" ? <g fill={fill}><circle cx="32" cy="18" r="8" /><circle cx="18" cy="32" r="8" /><circle cx="46" cy="32" r="8" /><circle cx="32" cy="46" r="8" /><circle cx="32" cy="32" r="6" fill="#ffb20a" /></g> : null}
      {name === "cloud" ? <ellipse cx="32" cy="36" rx="18" ry="12" fill={fill} /> : null}
      {name === "apple" ? <g><circle cx="32" cy="36" r="14" fill={fill} /><rect x="30" y="16" width="3" height="8" fill="#6b3a22" /></g> : null}
      {name === "boat" ? <path fill={fill} d="M10 36 L32 18 L54 36 L46 46 L18 46Z" /> : null}
      {name === "house" ? <g><polygon fill="#ff5c45" points="12,32 32,14 52,32" /><rect x="18" y="32" width="28" height="20" fill={fill} /></g> : null}
      {name === "fish" ? <path fill={fill} d="M10 32 Q28 16 44 32 Q28 48 10 32Z M44 32 L56 22 L56 42Z" /> : null}
      {name === "balloon" ? <g><ellipse cx="32" cy="26" rx="14" ry="16" fill={fill} /><path d="M32 42 L32 54" stroke="#6b3a22" strokeWidth="2" /></g> : null}
      {name === "crown" ? <polygon fill={fill} points="10,44 16,22 32,34 48,18 54,44" /> : null}
    </svg>
  );
}