import OpenAI from "openai";

export class OpenAiAssistant {
  private readonly client: OpenAI;

  public constructor(
    apiKey: string,
    private readonly model: string
  ) {
    this.client = new OpenAI({ apiKey });
  }

  public async answer(question: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are AirdropGuard AI, a crypto and wallet-security assistant for Discord. Always prioritize scam prevention, wallet hygiene, and safe verification steps. Never provide financial advice, price predictions, or investment recommendations. If asked for financial advice, decline and redirect to security-first analysis. Keep answers concise and practical."
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    return content;
  }
}
