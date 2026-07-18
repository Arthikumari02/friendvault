import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  error?: string;
};

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

export function Input(props: InputProps | TextareaProps) {
  const { label, error, className = "", multiline, ...fieldProps } = props;
  const id =
    fieldProps.id ??
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const fieldClasses = `mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 ${className}`;

  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      {multiline ? (
        <textarea
          className={`${fieldClasses} min-h-32 resize-y`}
          id={id}
          {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={fieldClasses}
          id={id}
          {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
