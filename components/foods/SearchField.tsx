"use client";
import { Search, X } from "lucide-react";

/** iOS search field: rounded fill, magnifier, clear button. Set `sticky` to pin it under the nav bar. */
export default function SearchField({
  id,
  value,
  onChange,
  placeholder = "Search",
  label,
  sticky = false,
  autoFocus = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  sticky?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className={sticky ? "sticky top-[calc(env(safe-area-inset-top)+44px)] z-20 -mx-4 bg-bg px-4 pb-2 pt-1" : "pb-2 pt-1"}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <Search size={18} strokeWidth={2.25} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-2" />
        <input
          id={id}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          className="h-11 w-full rounded-[10px] bg-fill pl-9 pr-11 type-body text-label placeholder:text-label-2 outline-none focus:ring-2 focus:ring-accent"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="pressable absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-label-2">
            <X size={18} strokeWidth={2.5} aria-hidden className="rounded-full bg-label-2 p-0.5 text-bg" />
          </button>
        )}
      </div>
    </div>
  );
}
