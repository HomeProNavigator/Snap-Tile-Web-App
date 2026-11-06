export function MascotFace({ id, className = "", cut = false }: { id: string; className?: string; cut?: boolean }) {
  const base = import.meta.env.BASE_URL;
  const src =
    id === "cub"
      ? `${base}mascots/cub.webp`
      : cut
        ? `${base}map/pals/${id}.webp`
        : `${base}badges/${id}.jpg?v=3`;
  return <img className={`snap-mascot-face ${className}`.trim()} src={src} alt="" />;
}