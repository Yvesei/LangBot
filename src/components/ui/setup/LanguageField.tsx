import { LANGUAGES, type LanguageCode } from '@/lib/schemas';

interface LanguageFieldProps {
  label: string;
  value: LanguageCode;
  onChange: (language: LanguageCode) => void;
}

export function LanguageField({ label, value, onChange }: LanguageFieldProps) {
  return (
    <label className="block text-xs font-medium text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
        className="setup-select"
      >
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <option
            key={code}
            value={code}
          >
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
