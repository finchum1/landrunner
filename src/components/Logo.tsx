import logoFull from '../assets/logo-full.png';
import logoFullDark from '../assets/logo-full-dark.png';
import logoBadge from '../assets/logo-badge.png';
import logoBadgeDark from '../assets/logo-badge-dark.png';

// Real brand assets (derrick + "R" badge, "Landrunner" wordmark) provided by
// Terrence. Each comes in two color variants -- the source art's navy ink
// reads poorly on a dark background, so a second copy has that navy swapped
// to white (gold stays gold in both). Both variants render at once and
// Tailwind's dark: classes toggle which is visible, so this needs no theme
// state/JS -- it just follows the same .dark class the rest of the app uses.
export default function Logo({
  iconOnly = false,
  height = 28,
  className = '',
}: {
  iconOnly?: boolean;
  height?: number;
  className?: string;
}) {
  const lightSrc = iconOnly ? logoBadge : logoFull;
  const darkSrc = iconOnly ? logoBadgeDark : logoFullDark;
  return (
    <>
      <img src={lightSrc} alt="Landrunner" style={{ height }} className={`dark:hidden ${className}`} />
      <img src={darkSrc} alt="Landrunner" style={{ height }} className={`hidden dark:block ${className}`} />
    </>
  );
}
