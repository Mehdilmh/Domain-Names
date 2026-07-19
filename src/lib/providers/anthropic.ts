import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client wrapper. Behind an interface so the explanation layer
 * runs with zero API keys — no key means a deterministic local fallback.
 */
export interface LlmProvider {
  readonly enabled: boolean;
  complete(system: string, user: string): Promise<string | null>;
}

class AnthropicProvider implements LlmProvider {
  private client: Anthropic | null;
  readonly enabled: boolean;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    this.enabled = Boolean(key);
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  async complete(system: string, user: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const msg = await this.client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 350,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = msg.content.find((b) => b.type === "text");
      return block && block.type === "text" ? block.text.trim() : null;
    } catch (err) {
      console.warn("[anthropic] completion failed, using fallback:", err);
      return null;
    }
  }
}

export const llmProvider: LlmProvider = new AnthropicProvider();
