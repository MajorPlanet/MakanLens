"use client";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { FoodRecord } from "@/lib/types";
import { createCustomFood, deleteCustomFood, duplicateFood, getOriginalFood, getReferenceMeta, resetOverride, saveOverride, updateCustomFood } from "@/lib/foods";
import { fmtKcal, fmtMacro } from "@/components/format";
import { MACRO_COLOURS } from "@/components/dashboard/colours";
import { Chip, FIELD } from "@/components/ui/Controls";
import { SG_SITE, SG_LICENCE } from "@/lib/sgfoodid";
import { SG_DATA_LABEL, SG_NO_ENDORSEMENT, sgCategory } from "./sgDisplay";
import { Row, Section } from "@/components/ui/List";
import { InfoRow, InputRow } from "./FormRows";
import {
  addAliases, diffAgainstOriginal, macroKcal, macroMismatch, parseFoodForm, parseNum, valuesFromFood,
  type FoodFormErrors, type FoodFormValues,
} from "./foodFormLogic";

/** Big-number nutrition summary shown at the top of a food's detail sheet. */
export function FoodSummary({ food }: { food: FoodRecord }) {
  const n = food.per_serving;
  return (
    <div className="surface mt-2 p-4 text-center">
      <p className="num text-[44px] font-bold leading-none">
        {fmtKcal(n.kcal)}
        <span className="ml-1 text-label-2 type-headline font-medium">kcal</span>
      </p>
      <p className="mt-1 text-label-2 type-subhead">
        {food.serving.label}
        {food.serving.grams ? ` · ${food.serving.grams} g` : ""}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {([["Protein", n.protein_g, MACRO_COLOURS.protein], ["Carbs", n.carbs_g, MACRO_COLOURS.carbs], ["Fat", n.fat_g, MACRO_COLOURS.fat]] as const).map(([l, g, c]) => (
          <div key={l} className="rounded-[10px] bg-surface-2 py-2">
            <dt className="type-caption text-label-2">{l}</dt>
            <dd className="num type-headline" style={{ color: c }}>{fmtMacro(g)} g</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {food.origin === "custom" && <Chip tone="accent">Your food</Chip>}
        {food.origin === "builtin" && <Chip>Hawker</Chip>}
        {food.origin === "sgfoodid" && <Chip>HPB</Chip>}
        {food.edited && <Chip tone="accent">Edited by you</Chip>}
        <span className="text-label-2 type-caption">{food.origin === "sgfoodid" ? SG_DATA_LABEL : `Source: ${food.source.name}`}</span>
      </div>
    </div>
  );
}

/**
 * Create or edit a food, as grouped form sections. No `food` creates a custom food; a custom food edits in place;
 * a built-in dish saves an override (hawker.json is never changed). Submit with a `<button form={formId}>` in the sheet header.
 */
export default function FoodForm({
  formId,
  food,
  initialName = "",
  onSaved,
  onOpenFood,
}: {
  formId: string;
  food?: FoodRecord;
  initialName?: string;
  /** Called after save, delete or reset. */
  onSaved: (saved?: FoodRecord) => void;
  /** After Duplicate: open the new copy. */
  onOpenFood?: (f: FoodRecord) => void;
}) {
  const sg = food?.origin === "sgfoodid";
  const builtin = !!food && food.origin !== "custom"; // built-in dishes and SG FoodID items save overrides
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
  const kOk = k !== null && !Number.isNaN(k);
  const mismatch = calc !== null && kOk && macroMismatch(k, calc);

  const gramsNum = parseNum(v.grams);
  const per100 = gramsNum && gramsNum > 0 && kOk ? Math.round((k / gramsNum) * 100) : null;

  function commitAlias() {
    if (aliasDraft.trim()) setV((x) => ({ ...x, aliases: addAliases(x.aliases, aliasDraft) }));
    setAliasDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
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

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="px-4 pb-4">
      {food && <FoodSummary food={food} />}
      {failed && <p role="alert" className="mt-4 rounded-xl bg-ios-red/15 p-3 text-ios-red type-subhead">{failed}</p>}

      <Section header="Name">
        <InputRow id="ff-name" stacked label="Name" required value={v.name} onChange={set("name")} error={errors.name} placeholder="e.g. Kaya toast set" />
      </Section>

      <Section header="Other names" footer="Any language. These help search find the food.">
        {v.aliases.length > 0 && (
          <ul className="flex flex-wrap gap-2 border-b border-separator p-3">
            {v.aliases.map((a) => (
              <li key={a} className="flex items-center rounded-full bg-fill pl-3 type-subhead">
                {a}
                <button type="button" onClick={() => setV((x) => ({ ...x, aliases: x.aliases.filter((y) => y !== a) }))} aria-label={`Remove ${a}`} className="pressable flex h-11 w-9 items-center justify-center text-label-2">
                  <X size={16} strokeWidth={2.25} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center pr-1">
          <label htmlFor="ff-alias" className="sr-only">Add another name</label>
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
            onBlur={commitAlias}
            placeholder="Add a name"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent px-4 type-body text-label placeholder:text-label-3 outline-none"
          />
          <button type="button" onClick={commitAlias} aria-label="Add name" className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-accent-text">
            <Plus size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </Section>

      <Section header="Serving" footer={per100 !== null ? `About ${per100} kcal per 100 g, so you can log by grams.` : "Add a weight to log this food by grams."}>
        <InputRow id="ff-serving" label="Serving" value={v.servingLabel} onChange={set("servingLabel")} placeholder="1 plate" />
        <InputRow id="ff-grams" label="Weight" numeric unit="g" value={v.grams} onChange={set("grams")} error={errors.grams} placeholder="Optional" />
      </Section>

      <Section
        header="Nutrition per serving"
        footer={
          calc !== null ? (
            <span role="status" className={mismatch ? "text-ios-yellow" : undefined}>
              Macros add up to about {calc} kcal{kOk ? ` (you entered ${fmtMacro(k)})` : ""}.
              {mismatch && " That's more than 15% apart. Worth a quick check, but you can save as it is."}
            </span>
          ) : (
            "Calories should roughly equal 4 × protein + 4 × carbs + 9 × fat."
          )
        }
      >
        <InputRow id="ff-kcal" label="Calories" required numeric unit="kcal" value={v.kcal} onChange={set("kcal")} error={errors.kcal} placeholder="0" />
        <InputRow id="ff-protein" label="Protein" required numeric unit="g" value={v.protein} onChange={set("protein")} error={errors.protein} placeholder="0" />
        <InputRow id="ff-carbs" label="Carbs" required numeric unit="g" value={v.carbs} onChange={set("carbs")} error={errors.carbs} placeholder="0" />
        <InputRow id="ff-fat" label="Fat" required numeric unit="g" value={v.fat} onChange={set("fat")} error={errors.fat} placeholder="0" />
      </Section>

      <Section header="More nutrients (optional)">
        <InputRow id="ff-sodium" label="Sodium" numeric unit="mg" value={v.sodium} onChange={set("sodium")} error={errors.sodium} placeholder="Optional" />
        <InputRow id="ff-fibre" label="Fibre" numeric unit="g" value={v.fibre} onChange={set("fibre")} error={errors.fibre} placeholder="Optional" />
        <InputRow id="ff-satfat" label="Saturated fat" numeric unit="g" value={v.satfat} onChange={set("satfat")} error={errors.satfat} placeholder="Optional" />
      </Section>

      {sg && food ? (
        <>
          <Section header="HPB data" footer={`${SG_NO_ENDORSEMENT}${getReferenceMeta()?.basis ? ` Basis: ${getReferenceMeta()?.basis}.` : ""}`}>
            {sgCategory(food) && <InfoRow label="Category">{food.category}</InfoRow>}
            {food.per_100g && (
              <>
                <InfoRow label="Per 100 g">{fmtKcal(food.per_100g.kcal)} kcal</InfoRow>
                <InfoRow label="P · C · F per 100 g">{fmtMacro(food.per_100g.protein_g)} · {fmtMacro(food.per_100g.carbs_g)} · {fmtMacro(food.per_100g.fat_g)} g</InfoRow>
              </>
            )}
            <Row title={SG_DATA_LABEL} onClick={() => window.open(SG_SITE, "_blank", "noopener,noreferrer")} chevron ariaLabel={`${SG_DATA_LABEL} (opens in a new tab)`} />
            <Row title="Licence and terms of use" onClick={() => window.open(SG_LICENCE, "_blank", "noopener,noreferrer")} chevron ariaLabel="SG FoodID licence (opens in a new tab)" />
          </Section>
          {food.notes && (
            <Section header="HPB description">
              <p className="p-4 text-label-2 type-subhead">{food.notes}</p>
            </Section>
          )}
        </>
      ) : (
        <Section header="Notes">
          <label htmlFor="ff-notes" className="sr-only">Notes</label>
          <textarea id="ff-notes" value={v.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} placeholder="Optional" className={`${FIELD} resize-none rounded-none bg-transparent py-2.5`} />
        </Section>
      )}

      {original && food?.edited && (
        <Section header="Original values" footer={sg ? SG_DATA_LABEL : `Source: ${original.source.name}`}>
          <InfoRow label="Dish">{original.name}</InfoRow>
          <InfoRow label="Serving">{original.serving.label}{original.serving.grams ? ` (${original.serving.grams} g)` : ""}</InfoRow>
          <InfoRow label="Calories">{Math.round(original.per_serving.kcal)} kcal</InfoRow>
          <InfoRow label="P · C · F">{fmtMacro(original.per_serving.protein_g)} · {fmtMacro(original.per_serving.carbs_g)} · {fmtMacro(original.per_serving.fat_g)} g</InfoRow>
        </Section>
      )}

      {food && (
        <Section footer="Edits apply to future logs. Meals you have already logged keep their logged values.">
          <Row
            action
            title="Duplicate"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const copy = await duplicateFood(food.id);
                if (copy) onOpenFood?.(copy);
              })
            }
          />
          {food.edited && (
            <Row action title="Reset to original" disabled={busy} onClick={() => void run(async () => { await resetOverride(food.id); onSaved(); })} />
          )}
          {food.origin === "custom" && !confirmDelete && <Row destructive title="Delete food" onClick={() => setConfirmDelete(true)} />}
          {food.origin === "custom" && confirmDelete && (
            <div role="alertdialog" aria-label="Confirm delete">
              <p className="border-t border-separator px-4 py-3 text-label-2 type-subhead">Delete “{food.name}”? Meals you have already logged keep their values.</p>
              <Row destructive title="Delete" disabled={busy} onClick={() => void run(async () => { await deleteCustomFood(food.id); onSaved(); })} />
              <Row action title="Keep it" onClick={() => setConfirmDelete(false)} />
            </div>
          )}
        </Section>
      )}
      {!food && <p className="mt-6 px-4 text-label-2 type-footnote">Your food is saved on this device only.</p>}
    </form>
  );
}
