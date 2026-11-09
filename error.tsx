"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-600 mb-4">
          Your data is stored in this browser and was not changed by this error. Try again, and if it keeps happening, reload the page.
        </p>
        <button onClick={reset} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg">
          Try again
        </button>
      </div>
    </div>
  );
}
