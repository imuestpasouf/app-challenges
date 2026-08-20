export function Wallpaper({ resurrectionActive = false }: { resurrectionActive?: boolean }) {
  return (
    <>
      <div className="wall" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
        <div className="blob b5" />
      </div>
      <div className={`vig${resurrectionActive ? ' on' : ''}`} aria-hidden="true" />
    </>
  );
}
