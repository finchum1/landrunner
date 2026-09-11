import logoFull from '../assets/logo-full.png';
import logoBadge from '../assets/logo-badge.png';

// Real brand assets (derrick + "R" badge, "Landrunner" wordmark) provided by
// Terrence -- replaces the earlier hand-drawn placeholder mark. `iconOnly`
// swaps to just the badge (no wordmark) for tight spaces.
export default function Logo({
  iconOnly = false,
  height = 28,
  className = '',
}: {
  iconOnly?: boolean;
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={iconOnly ? logoBadge : logoFull}
      alt="Landrunner"
      style={{ height }}
      className={className}
    />
  );
}
