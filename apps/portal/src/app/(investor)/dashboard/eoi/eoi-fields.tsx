"use client";

import { cn } from "@/lib/utils";
import { getIn } from "@/lib/form-path";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

/**
 * Form primitives for the EOI wizard.
 *
 * Every input is addressed by the dotted path Zod reports for it, so a
 * validation issue lands on the right control with no mapping table. The
 * section components below are therefore close to a transcription of the spec.
 */

type EoiFormContextValue = {
  /** The whole section payload. */
  value: Record<string, unknown>;
  set: (path: string, next: unknown) => void;
  /** Dotted path -> message. */
  errors: Record<string, string>;
  /** Read-only once the application leaves the editable statuses. */
  disabled: boolean;
  /** Path or DocumentKind -> "why this does not apply". */
  naNotes: Record<string, string>;
  setNa: (key: string, note: string | null) => void;
};

const EoiFormContext = createContext<EoiFormContextValue | null>(null);

export function EoiFormProvider({
  children,
  ...value
}: EoiFormContextValue & { children: ReactNode }) {
  return (
    <EoiFormContext.Provider value={value}>{children}</EoiFormContext.Provider>
  );
}

export function useEoiForm(): EoiFormContextValue {
  const ctx = useContext(EoiFormContext);
  if (!ctx) throw new Error("EOI field used outside EoiFormProvider");
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

/** A numbered spec clause, e.g. "1.2 Power of Attorney of the Signatory". */
export function Clause({
  number,
  title,
  intro,
  children,
}: {
  number: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white p-4 sm:p-5">
      <h3 className="text-sm font-bold text-ink-900">
        <span className="mr-2 text-brand-600">{number}</span>
        {title}
      </h3>
      {intro && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{intro}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Field shell
 * ------------------------------------------------------------------ */

type BaseFieldProps = {
  path: string;
  label: string;
  /** The spec's descriptor — shown under the label, not as placeholder text. */
  hint?: ReactNode;
  required?: boolean;
  /** Offers a "Not applicable" toggle (spec §8). */
  allowNa?: boolean;
};

function Field({
  path,
  label,
  hint,
  required,
  allowNa,
  naKey,
  children,
}: BaseFieldProps & { naKey?: string; children: (disabled: boolean) => ReactNode }) {
  const { errors, disabled, naNotes, setNa } = useEoiForm();
  const key = naKey ?? path;
  const error = errors[path];
  const note = naNotes[key];
  const isNa = typeof note === "string";

  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <label htmlFor={path} className="block text-sm font-medium text-ink-800">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
        {allowNa && !disabled && (
          <button
            type="button"
            onClick={() => setNa(key, isNa ? null : "")}
            className="shrink-0 text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
          >
            {isNa ? "This does apply" : "Not applicable"}
          </button>
        )}
      </div>
      {hint && <p className="mb-2 text-xs leading-relaxed text-ink-500">{hint}</p>}

      {isNa ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-800">
            Marked Not Applicable — explain briefly why, so the committee does not
            return this as a Request for Clarification.
          </p>
          <textarea
            id={path}
            rows={2}
            value={note}
            disabled={disabled}
            onChange={(e) => setNa(key, e.target.value)}
            placeholder="e.g. The company has no Uganda operations and therefore no registered employees."
            className="w-full resize-y rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          />
        </div>
      ) : (
        children(disabled)
      )}

      {error && !isNa && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

function errorRing(hasError: boolean): string {
  return hasError ? "border-red-400 focus-visible:ring-red-500" : "";
}

/* ------------------------------------------------------------------ *
 * Inputs
 * ------------------------------------------------------------------ */

export function TextField({
  placeholder,
  ...props
}: BaseFieldProps & { placeholder?: string }) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  return (
    <Field {...props}>
      {(disabled) => (
        <Input
          id={props.path}
          value={typeof current === "string" ? current : ""}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => set(props.path, e.target.value)}
          className={errorRing(Boolean(errors[props.path]))}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  placeholder,
  rows = 3,
  ...props
}: BaseFieldProps & { placeholder?: string; rows?: number }) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  return (
    <Field {...props}>
      {(disabled) => (
        <textarea
          id={props.path}
          rows={rows}
          value={typeof current === "string" ? current : ""}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => set(props.path, e.target.value)}
          className={cn(controlClass, "resize-y", errorRing(Boolean(errors[props.path])))}
        />
      )}
    </Field>
  );
}

export function NumberField({
  placeholder,
  suffix,
  step,
  min,
  max,
  ...props
}: BaseFieldProps & {
  placeholder?: string;
  /** Unit shown inside the control, e.g. "m³/day". */
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  return (
    <Field {...props}>
      {(disabled) => (
        <div className="relative">
          <input
            id={props.path}
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            // An empty control must clear the field, not write 0 — 0 fatalities
            // and "not answered" are very different to an evaluator.
            value={typeof current === "number" ? String(current) : ""}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              const raw = e.target.value;
              set(props.path, raw === "" ? undefined : Number(raw));
            }}
            className={cn(
              controlClass,
              suffix && "pr-16",
              errorRing(Boolean(errors[props.path])),
            )}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-400">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

export function DateField(props: BaseFieldProps) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  return (
    <Field {...props}>
      {(disabled) => (
        <input
          id={props.path}
          type="date"
          value={typeof current === "string" ? current : ""}
          disabled={disabled}
          onChange={(e) => set(props.path, e.target.value || undefined)}
          className={cn(controlClass, errorRing(Boolean(errors[props.path])))}
        />
      )}
    </Field>
  );
}

export function SelectField({
  options,
  placeholder = "Select…",
  ...props
}: BaseFieldProps & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  return (
    <Field {...props}>
      {(disabled) => (
        <select
          id={props.path}
          value={typeof current === "string" ? current : ""}
          disabled={disabled}
          onChange={(e) => set(props.path, e.target.value || undefined)}
          className={cn(controlClass, errorRing(Boolean(errors[props.path])))}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Yes/no as a checkbox — for the spec's explicit boolean confirmations. */
export function CheckboxField({
  path,
  label,
  hint,
}: {
  path: string;
  label: string;
  hint?: ReactNode;
}) {
  const { value, set, errors, disabled } = useEoiForm();
  const current = getIn(value, path) === true;
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={current}
          disabled={disabled}
          onChange={(e) => set(path, e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
        />
        <span className="text-sm text-ink-800">{label}</span>
      </label>
      {hint && <p className="mt-1 pl-7 text-xs leading-relaxed text-ink-500">{hint}</p>}
      {errors[path] && (
        <p role="alert" className="mt-1 pl-7 text-xs font-medium text-red-600">
          {errors[path]}
        </p>
      )}
    </div>
  );
}

/** Multi-select stored as an array of enum values. */
export function CheckboxGroupField({
  options,
  ...props
}: BaseFieldProps & { options: readonly { value: string; label: string }[] }) {
  const { value, set, errors } = useEoiForm();
  const current = getIn(value, props.path);
  const selected = Array.isArray(current) ? (current as string[]) : [];

  return (
    <Field {...props}>
      {(disabled) => (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  set(
                    props.path,
                    on ? selected.filter((v) => v !== o.value) : [...selected, o.value],
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                  on
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-300 text-ink-600 hover:border-brand-400",
                  errors[props.path] && !on && "border-red-300",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}

/* ------------------------------------------------------------------ *
 * Repeatable groups
 * ------------------------------------------------------------------ */

/**
 * A list of sub-records (shareholders, comparable projects, certificates).
 *
 * `children` is called with the ITEM'S path prefix, so nested fields keep using
 * absolute dotted paths and error mapping still works untouched.
 */
export function Repeatable({
  path,
  label,
  hint,
  itemNoun,
  newItem,
  min = 0,
  max,
  children,
}: {
  path: string;
  label: string;
  hint?: ReactNode;
  itemNoun: string;
  newItem: () => Record<string, unknown>;
  min?: number;
  max?: number;
  children: (itemPath: string, index: number) => ReactNode;
}) {
  const { value, set, errors, disabled } = useEoiForm();
  const current = getIn(value, path);
  const items = Array.isArray(current) ? current : [];
  const atMax = max != null && items.length >= max;

  return (
    <div>
      <p className="text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>}

      <div className="mt-3 space-y-3">
        {items.map((_, index) => (
          <div
            key={index}
            className="relative rounded-lg border border-ink-200 bg-ink-50/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-500">
                {itemNoun} {index + 1}
              </span>
              {!disabled && items.length > min && (
                <button
                  type="button"
                  onClick={() =>
                    set(
                      path,
                      items.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Remove ${itemNoun} ${index + 1}`}
                  className="text-ink-400 transition hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="space-y-4">{children(`${path}.${index}`, index)}</div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">
            No {itemNoun.toLowerCase()} added yet.
          </p>
        )}
      </div>

      {errors[path] && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {errors[path]}
        </p>
      )}

      {!disabled && !atMax && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => set(path, [...items, newItem()])}
        >
          <Plus size={14} className="mr-1.5" />
          Add {itemNoun.toLowerCase()}
        </Button>
      )}
      {atMax && (
        <p className="mt-2 text-xs text-ink-500">
          Maximum of {max} {itemNoun.toLowerCase()}s.
        </p>
      )}
    </div>
  );
}

/**
 * A fixed row per reporting year (spec §4.1, §5.1, §5.2).
 *
 * The years are seeded by the wizard rather than added by the investor — the
 * spec asks for exactly the three most recently completed calendar years, so
 * there is nothing to choose.
 */
export function YearRows({
  path,
  label,
  hint,
  children,
}: {
  path: string;
  label: string;
  hint?: ReactNode;
  children: (itemPath: string, year: number) => ReactNode;
}) {
  const { value, errors } = useEoiForm();
  const current = getIn(value, path);
  const rows = Array.isArray(current) ? current : [];

  return (
    <div>
      <p className="text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>}
      <div className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">
              {String((row as { year?: number })?.year ?? "")}
            </p>
            <div className="space-y-4">
              {children(`${path}.${index}`, (row as { year: number }).year)}
            </div>
          </div>
        ))}
      </div>
      {errors[path] && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {errors[path]}
        </p>
      )}
    </div>
  );
}
