import { GEMINI_API_URL } from "../constants";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export const askGemini = async (query: string): Promise<string> => {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!rawText.trim()) {
    throw new Error("No response text returned from Gemini.");
  }

  const responseParts = rawText
    .split("* ")
    .map((item) => item.trim())
    .filter(Boolean);

  return responseParts.length ? responseParts.join("\n") : rawText.trim();
};
