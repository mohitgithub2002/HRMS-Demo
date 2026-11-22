import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "block w-full rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink shadow-[inset_0_1px_2px_rgb(22_24_39/0.04)] transition-[border-color,box-shadow] placeholder:text-faint hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted";

export function controlClass(invalid?: boolean, className?: string) {
  return cn(controlBase, invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-line", className);
}

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

/** Label + control + hint + error, wired up for screen readers. */
export function Field({ label, hint, error, required, optionalLabel, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[0.8125rem] font-medium text-ink-2">
          <span>
            {label}
            {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
          </span>
          {!required && optionalLabel && <span className="text-xs font-normal text-faint">{optionalLabel}</span>}
        </label>
      )}
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label?: React.ReactNode; hint?: React.ReactNode; error?: string; optionalLabel?: string; containerClassName?: string };

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Common & { leading?: React.ReactNode; trailing?: React.ReactNode }>(function Input(
  { label, hint, error, required, optionalLabel, leading, trailing, className, containerClassName, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={containerClassName}>
      {(id, describedBy) => (
        <div className="relative">
          {leading && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-faint [&_svg]:size-4">{leading}</span>}
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={controlClass(Boolean(error), cn("h-11", leading ? "pl-10" : undefined, trailing ? "pr-11" : undefined, className))}
            {...rest}
          />
          {trailing && <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>}
        </div>
      )}
    </Field>
  );
});

const chevron =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%239497a5%22><path d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%22/></svg>')] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & Common>(function Select(
  { label, hint, error, required, optionalLabel, className, containerClassName, children, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={containerClassName}>
      {(id, describedBy) => (
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass(Boolean(error), cn("h-11 appearance-none pr-10", chevron, className))}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea(
  { label, hint, error, required, optionalLabel, className, containerClassName, rows = 3, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={containerClassName}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClass(Boolean(error), cn("py-2.5 leading-relaxed", className))}
          {...rest}
        />
      )}
    </Field>
  );
});

/** A checkbox with its label and an optional hint underneath. */
export function Checkbox({ label, hint, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("group flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm", rest.disabled && "cursor-not-allowed opacity-60", className)}>
      <input id={id} type="checkbox" className="peer mt-0.5 size-[1.05rem] shrink-0 cursor-pointer rounded-[0.3rem] border-line-strong accent-brand-600" {...rest} />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** An on/off switch (role="switch"). */
export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-brand-600" : "bg-line-strong",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
