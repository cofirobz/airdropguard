export type CopilotOpenDetail = {
  prompt?: string | null;
  context?: string | null;
};

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function openCopilotWithPrompt(prompt: string, context?: string | null): void {
  const safePrompt = cleanText(prompt);
  const safeContext = cleanText(context ?? null);

  if (safeContext) {
    window.dispatchEvent(new CustomEvent('ag:copilot-context', {
      detail: { context: safeContext },
    }));
  }

  window.dispatchEvent(new CustomEvent<CopilotOpenDetail>('ag:copilot-open', {
    detail: {
      prompt: safePrompt,
      context: safeContext,
    },
  }));
}

export function openCopilot(context?: string | null): void {
  const safeContext = cleanText(context ?? null);

  if (safeContext) {
    window.dispatchEvent(new CustomEvent('ag:copilot-context', {
      detail: { context: safeContext },
    }));
  }

  window.dispatchEvent(new CustomEvent<CopilotOpenDetail>('ag:copilot-open', {
    detail: { context: safeContext },
  }));
}
