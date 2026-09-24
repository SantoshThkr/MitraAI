import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMessages, uploadDocument } from "./api";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("fetchMessages", () => {
  it("keeps persisted citations from conversation history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          {
            id: "m1",
            role: "assistant",
            content: "Grounded answer",
            sources: [{ filename: "manual.pdf", page: 7 }],
          },
        ]),
      ),
    );

    const [message] = await fetchMessages("c1");

    expect(message.text).toBe("Grounded answer");
    expect(message.sources).toEqual([{ filename: "manual.pdf", page: 7 }]);
  });

  it("treats a message without sources as having none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([{ id: "m1", role: "user", content: "hi", sources: null }]),
      ),
    );

    const [message] = await fetchMessages("c1");

    expect(message.sources).toEqual([]);
  });
});

describe("uploadDocument", () => {
  it("surfaces the server's reason when a file cannot be indexed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ detail: "No readable text was found in this file." }, 422),
      ),
    );

    await expect(uploadDocument(new File(["   "], "blank.txt"))).rejects.toThrow(
      "No readable text was found in this file.",
    );
  });

  it("returns the stored document with its processing status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ id: "d1", filename: "manual.pdf", status: "ready" }, 201),
      ),
    );

    await expect(uploadDocument(new File(["text"], "manual.pdf"))).resolves.toEqual({
      id: "d1",
      filename: "manual.pdf",
      status: "ready",
    });
  });
});
