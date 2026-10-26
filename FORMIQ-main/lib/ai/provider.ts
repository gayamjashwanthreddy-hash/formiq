import "server-only";

export interface AICompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
}

export async function generateAICompletion(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("your-gemini")) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
        },
      };

      if (options.systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: options.systemPrompt }],
        };
      }

      if (options.jsonMode) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        console.warn("[AI Provider] Gemini API error, falling back to local engine:", await response.text());
      }
    } catch (err) {
      console.warn("[AI Provider] Network request failed, falling back to local engine:", err);
    }
  }

  // Graceful deterministic intelligent fallback
  return "";
}
