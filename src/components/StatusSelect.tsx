import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER, type OwnerStatus } from '../lib/types';

export default function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: OwnerStatus;
  onChange: (v: OwnerStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OwnerStatus)}
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 ${STATUS_COLORS[value]}`}
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
