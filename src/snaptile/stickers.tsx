export const STICKER_NAMES = ["star", "heart", "sun", "moon", "flower", "cloud", "apple", "boat", "house", "fish", "balloon", "crown"] as const;

type StickerName = (typeof STICKER_NAMES)[number];

function stickerFor(puzzleId: number): StickerName {
  return STICKER_NAMES[(puzzleId - 1) % STICKER_NAMES.length]!;
}

export function StickerArt({ puzzleId }: { puzzleId: number }) {
  const name = stickerFor(puzzleId);
  return <img className="snap-sticker" data-sticker={name} src={`${import.meta.env.BASE_URL}celebrate/stickers/${name}.webp`} alt="" />;
}
