export function MascotFace({ id, className = "" }: { id: string; className?: string }) {
  const src = id === "cub" ? `${import.meta.env.BASE_URL}mascots/cub.svg` : `${import.meta.env.BASE_URL}badges/${id}.jpg?v=3`;
  return <img className={`snap-mascot-face ${className}`.trim()} src={src} alt="" />;
}