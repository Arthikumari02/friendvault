export function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-3 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      {label}
    </div>
  );
}
