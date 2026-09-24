import type { Citation, Theme } from "../types/chat";

type CitationsProps = {
  sources: Citation[];
  theme: Theme;
};

const Citations = ({ sources, theme }: CitationsProps) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Sources">
      {sources.map((source, index) => (
        <span
          key={`${source.filename}-${source.page ?? "none"}-${index}`}
          className={`rounded-full border px-3 py-1 text-xs ${
            theme === "dark"
              ? "border-zinc-700 bg-zinc-900 text-zinc-300"
              : "border-slate-300 bg-slate-50 text-slate-600"
          }`}
          title={source.filename}
        >
          <span className="max-w-[16rem] truncate align-middle">{source.filename}</span>
          {source.page !== null && ` · p. ${source.page}`}
        </span>
      ))}
    </div>
  );
};

export default Citations;
