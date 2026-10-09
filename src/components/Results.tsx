import { useState, type ReactNode } from "react";

type ResultsProps = {
  ans: string;
};

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

/* CommonMark treats a backslash before punctuation as an escape. Those characters are
 * swapped for placeholders before any markdown is matched, so an escaped `\**` cannot be
 * mistaken for emphasis, then put back as plain text afterwards. */
// Private-use code points: never produced by a model, never confused with markdown.
const OPEN = "\uE000";
const CLOSE = "\uE001";

const protect = (text: string) =>
  text.replace(
    /\\([\\`*_{}[\]()#+\-.!>|~])/g,
    (_, char: string) => `${OPEN}${char.charCodeAt(0).toString(16)}${CLOSE}`,
  );

const reveal = (text: string, keepBackslash = false) =>
  text.replace(
    new RegExp(`${OPEN}([0-9a-f]+)${CLOSE}`, "g"),
    (_, hex: string) =>
      `${keepBackslash ? "\\" : ""}${String.fromCharCode(parseInt(hex, 16))}`,
  );

const renderInline = (text: string): ReactNode[] =>
  protect(text)
    .split(INLINE_PATTERN)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        // Inside code, a backslash is literal rather than an escape.
        return (
          <code key={index} className="rounded bg-black/20 px-1 py-0.5 font-mono text-[0.9em]">
            {reveal(part.slice(1, -1), true)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
        return <strong key={index}>{reveal(part.slice(2, -2))}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={index}>{reveal(part.slice(1, -1))}</em>;
      }
      return reveal(part);
    });

const CodeBlock = ({ block }: { block: string }) => {
  const [copied, setCopied] = useState(false);
  const newline = block.indexOf("\n");
  const firstLine = newline === -1 ? block : block.slice(0, newline);
  const hasLanguage = /^[a-zA-Z0-9+#-]*$/.test(firstLine.trim()) && newline !== -1;
  const language = hasLanguage ? firstLine.trim() : "";
  const code = (hasLanguage ? block.slice(newline + 1) : block).replace(/\n$/, "");

  const copy = () => {
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-1 pb-1 text-xs opacity-70">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Copy code"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
};

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; text: string };

/** Groups consecutive lines into headings, lists and paragraphs. */
const parseProse = (prose: string): Block[] => {
  const blocks: Block[] = [];

  for (const rawLine of prose.split("\n")) {
    const line = rawLine.trim();
    const last = blocks[blocks.length - 1];

    if (!line) {
      if (last?.kind === "paragraph") {
        blocks.push({ kind: "paragraph", text: "" });
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const item = (bullet ?? numbered)![1];
      const ordered = Boolean(numbered);
      if (last?.kind === "list" && last.ordered === ordered) {
        last.items.push(item);
      } else {
        blocks.push({ kind: "list", ordered, items: [item] });
      }
      continue;
    }

    if (last?.kind === "paragraph" && last.text) {
      last.text = `${last.text}\n${line}`;
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }

  return blocks.filter((block) => block.kind !== "paragraph" || block.text !== "");
};

const HEADING_SIZES = ["text-xl", "text-lg", "text-base"];

const renderProse = (prose: string, offset: number): ReactNode[] =>
  parseProse(prose).map((block, index) => {
    const key = `${offset}-${index}`;
    if (block.kind === "heading") {
      const Tag = `h${Math.min(block.level + 2, 6)}` as "h3";
      return (
        <Tag
          key={key}
          className={`font-semibold ${HEADING_SIZES[Math.min(block.level, 3) - 1] ?? "text-base"}`}
        >
          {renderInline(block.text)}
        </Tag>
      );
    }
    if (block.kind === "list") {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          key={key}
          className={`ml-5 space-y-1 ${block.ordered ? "list-decimal" : "list-disc"}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    return (
      <p key={key} className="whitespace-pre-wrap wrap-break-word">
        {renderInline(block.text)}
      </p>
    );
  });

/** Minimal Markdown: fenced code, headings, lists, inline code, bold and italic. */
const Results = ({ ans }: ResultsProps) => (
  <div className="space-y-3">
    {ans.split(/```/).map((block, index) =>
      index % 2 === 1 ? (
        <CodeBlock key={index} block={block} />
      ) : (
        renderProse(block, index)
      ),
    )}
  </div>
);

export default Results;
