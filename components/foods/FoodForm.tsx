"use client";
import { useMemo, useState } from "react";
import { Copy, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { FoodRecord } from "@/lib/types";
import { createCustomFood, deleteCustomFood, duplicateFood, getOriginalFood, resetOverride, saveOverride, updateCustomFood } from "@/lib/foods";
import { ACCENT_BTN, fmtMacro } from "@/components/format";
import { ICON } from "@/components/icons";
import {
  addAliases, diffAgainstOriginal, macroKcal, macroMismatch, parseFoodForm, parseNum, valuesFromFood,
  type FoodFormErrors, type FoodFormValues,
} from "./foodFormLogic";

const INPUT = "h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700";
const CHIP = "rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium dark:bg-white/10";

function NumField({ id, label, value, onChange, error, required }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-orange-600"> *</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${INPUT} ${error ? "border-red-500 dark:border-red-500" : ""}`}
      />
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Create or edit a food. No `food` creates a custom food; a custom food edits in place;
 * a built-in dish saves an override (hawker.json is never changed).
 */
export default function FoodForm({
  food,
  initialName = "",
  onSaved,
  onCancel,
  onOpenFood,
}: {
  food?: FoodRecord;
  initialName?: string;
  /** Called after save, delete or reset. */
  onSaved: (saved?: FoodRecord) => void;
  onCancel: () => void;
  /** After Duplicate: open the new copy. */
  onOpenFood?: (f: FoodRecord) => void;
}) {
  const builtin = food?.origin === "builtin";
  const original = useMemo(() => (builtin && food ? getOriginalFood(food.id) : undefined), [builtin, food]);
  const [v, setV] = useState<FoodFormValues>(() => valuesFromFood(food, initialName));
  const [aliasDraft, setAliasDraft] = useState("");
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const set = (k: keyof FoodFormValues) => (val: string) => setV((x) => ({ ...x, [k]: val }));

  const p = parseNum(v.protein);
  const c = parseNum(v.carbs);
  const f = parseNum(v.fat);
  const k = parseNum(v.kcal);
  const macrosKnown = [p, c, f].every((n) => n !== null && !Number.isNaN(n));
  const calc = macrosKnown ? macroKcal(p ?? 0, c ?? 0, f ?? 0) : null;
  const mismatch = calc !== null && k !== null && !Number.isNaN(k) && macroMismatch(k, calc);

  const gramsNum = parseNum(v.grams);
  const per100 = gramsNum && gramsNum > 0 && k !== null && !Number.isNaN(k) ? Math.round((k / gramsNum) * 100) : null;

  function commitAlias(extra = "") {
    const raw = extra || aliasDraft;
    if (raw.trim()) setV((x) => ({ ...x, aliases: addAliases(x.aliases, raw) }));
    setAliasDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const withDraft: FoodFormValues = { ...v, aliases: addAliases(v.aliases, aliasDraft) };
    const parsed = parseFoodForm(withDraft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    setFailed(null);
    try {
      if (!food) {
        onSaved(await createCustomFood(parsed.input));
      } else if (food.origin === "custom") {
        onSaved((await updateCustomFood(food.id, parsed.input)) ?? undefined);
      } else if (original) {
        const changes = diffAgainstOriginal(parsed.input, original);
        if (Object.keys(changes).length === 0) await resetOverride(food.id);
        else await saveOverride(food.id, changes);
        onSaved();
      }
    } catch {
      setFailed("Couldn't save. Your browser may be blocking storage. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!food) return;
    setBusy(true);
    try {
      await resetOverride(food.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!food) return;
    setBusy(true);
    try {
      await deleteCustomFood(food.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  async function duplicate() {
    if (!food) return;
    const copy = await duplicateFood(food.id);
    if (copy) onOpenFood?.(copy);
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-md space-y-4 px-4 pb-4 pt-4">
      {food && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {food.origin === "custom" && <span className={`${CHIP} text-orange-700 dark:text-orange-300`}>Your food</span>}
          {builtin && <span className={`${CHIP} text-neutral-600 dark:text-neutral-300`}>Built-in</span>}
          {food.edited && <span className={`${CHIP} bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300`}>Edited by you</span>}
          <span className="text-neutral-500 dark:text-neutral-400">Source: {food.source.name}</span>
        </div>
      )}

      <div>
        <label htmlFor="ff-name" className="mb-1 block text-sm font-medium">Name <span aria-hidden className="text-orange-600">*</span></label>
        <input id="ff-name" value={v.name} onChange={(e) => set("name")(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "ff-name-err" : undefined} className={`${INPUT} ${errors.name ? "border-red-500 dark:border-red-500" : ""}`} autoComplete="off" />
        {errors.name && <p id="ff-name-err" className="mt-1 text-xs text-red-700 dark:text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="ff-alias" className="mb-1 block text-sm font-medium">Other names (any language)</label>
        {v.aliases.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {v.aliases.map((a) => (
              <li key={a} className="flex items-center rounded-full bg-neutral-100 pl-3 text-sm dark:bg-white/10">
                {a}
                <button type="button" onClick={() => setV((x) => ({ ...x, aliases: x.aliases.filter((y) => y !== a) }))} aria-label={`Remove ${a}`} className="flex h-11 w-11 items-center justify-center rounded-full">
                  <X size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            id="ff-alias"
            value={aliasDraft}
            onChange={(e) => setAliasDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitAlias();
              }
            }}
            onBlur={() => commitAlias()}
            placeholder="Type a name, press Enter"
            className={INPUT}
            autoComplete="off"
          />
          <button type="button" onClick={() => commitAlias()} aria-label="Add name" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-700">
            <Plus {...ICON} aria-hidden />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ff-serving" className="mb-1 block text-sm font-medium">Serving</label>
          <input id="ff-serving" value={v.servingLabel} onChange={(e) => set("servingLabel")(e.target.value)} placeholder="1 plate" className={INPUT} autoComplete="off" />
        </div>
        <NumField id="ff-grams" label="Serving weight (g)" value={v.grams} onChange={set("grams")} error={errors.grams} />
      </div>
      {per100 !== null && <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">About {per100} kcal per 100 g, so you can log by grams.</p>}

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">Nutrition per serving</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumField id="ff-kcal" label="Calories (kcal)" required value={v.kcal} onChange={set("kcal")} error={errors.kcal} />
          <NumField id="ff-protein" label="Protein (g)" required value={v.protein} onChange={set("protein")} error={errors.protein} />
          <NumField id="ff-carbs" label="Carbs (g)" required value={v.carbs} onChange={set("carbs")} error={errors.carbs} />
          <NumField id="ff-fat" label="Fat (g)" required value={v.fat} onChange={set("fat")} error={errors.fat} />
        </div>
        {calc !== null && (
          <p role="status" className={`rounded-xl px-3 py-2 text-sm ${mismatch ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"}`}>
            Macros add up to ≈ {calc} kcal{k !== null && !Number.isNaN(k) ? ` (you entered ${fmtMacro(k)})` : ""}.
            {mismatch && " That's more than 15% apart. Worth a quick check, but you can save as it is."}
          </p>
        )}
        <details className="rounded-xl border border-neutral-200 dark:border-neutral-800" open={!!(v.sodium || v.fibre || v.satfat)}>
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">More nutrients (optional)</summary>
          <div className="grid grid-cols-2 gap-3 p-3 pt-0">
            <NumField id="ff-sodium" label="Sodium (mg)" value={v.sodium} onChange={set("sodium")} error={errors.sodium} />
            <NumField id="ff-fibre" label="Fibre (g)" value={v.fibre} onChange={set("fibre")} error={errors.fibre} />
            <NumField id="ff-satfat" label="Saturated fat (g)" value={v.satfat} onChange={set("satfat")} error={errors.satfat} />
          </div>
        </details>
      </fieldset>

      <div>
        <label htmlFor="ff-notes" className="mb-1 block text-sm font-medium">Notes</label>
        <textarea id="ff-notes" value={v.notes} onChange={(e) => set("notes")(e.target.value)} rows={2} className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 text-base dark:border-neutral-700" />
      </div>

      {original && food?.edited && (
        <div className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="font-semibold">Original values</p>
          <p className="text-neutral-600 dark:text-neutral-300">{original.name} · {original.serving.label}{original.serving.grams ? ` (${original.serving.grams} g)` : ""}</p>
          <p className="tabular-nums text-neutral-600 dark:text-neutral-300">
            {Math.round(original.per_serving.kcal)} kcal · P {fmtMacro(original.per_serving.protein_g)} g · C {fmtMacro(original.per_serving.carbs_g)} g · F {fmtMacro(original.per_serving.fat_g)} g
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Source: {original.source.name}</p>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">Edits apply to future logs. Meals you have already logged keep their logged values.</p>
      {failed && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{failed}</p>}

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-black/5 bg-page/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10">
        <button type="submit" disabled={busy} className={`h-12 w-full rounded-xl font-semibold ${ACCENT_BTN}`}>
          {!food ? "Save food" : builtin ? "Save my version" : "Save changes"}
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl border border-neutral-300 px-3 text-sm font-medium dark:border-neutral-700">Cancel</button>
          {food && (
            <button type="button" onClick={duplicate} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-sm font-medium dark:border-neutral-700">
              <Copy size={16} strokeWidth={1.75} aria-hidden /> Duplicate
            </button>
          )}
          {food?.edited && (
            <button type="button" onClick={reset} disabled={busy} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-orange-400 px-3 text-sm font-medium text-orange-700 dark:border-orange-700 dark:text-orange-300">
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden /> Reset to original
            </button>
          )}
          {food?.origin === "custom" && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 px-3 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400">
              <Trash2 size={16} strokeWidth={1.75} aria-hidden /> Delete
            </button>
          )}
        </div>
        {confirmDelete && (
          <div role="alertdialog" aria-label="Confirm delete" className="rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm font-medium">Delete “{food?.name}”?</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">Meals you have already logged keep their values.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 flex-1 rounded-xl border border-neutral-300 text-sm font-medium dark:border-neutral-700">Keep it</button>
              <button type="button" onClick={remove} disabled={busy} className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white disabled:opacity-50">Delete</button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
