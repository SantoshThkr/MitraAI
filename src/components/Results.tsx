import type { ReactNode } from "react";

type ResultsProps = {
  ans: string;
};

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

const renderInline = (text: string): ReactNode[] =>
  text.split(INLINE_PATTERN).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={index}
          className="rounded bg-black/20 px-1 py-0.5 font-mono text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });

/** Minimal markdown: fenced code blocks, inline code and bold. */
const Results = ({ ans }: ResultsProps) => (
  <div className="space-y-3">
    {ans.split(/```/).map((block, index) =>
      index % 2 === 1 ? (
        <pre
          key={index}
          className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm"
        >
          <code className="font-mono">{block.replace(/^[a-zA-Z]*\n/, "")}</code>
        </pre>
      ) : (
        block && (
          <p key={index} className="whitespace-pre-wrap wrap-break-word">
            {renderInline(block)}
          </p>
        )
      ),
    )}
  </div>
);

export default Results;
