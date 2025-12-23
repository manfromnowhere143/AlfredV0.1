// Paste into prompts.ts - replace renderTemplate function

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;

  // Simple variable replacement - replace with value or empty string
  result = result.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '');

  // Handle conditionals
  result = result.replace(
    /{{#if (\w+)}}([\s\S]*?){{\/if}}/g,
    (_, key, content) => (variables[key] ? content : '')
  );

  return result.trim();
}

export function suggestMode(userMessage: string): AlfredMode | null {
  const lower = userMessage.toLowerCase();

  // Check reviewer first (more specific)
  const reviewerKeywords = ['review', 'check', 'analyze', 'feedback', 'improve', 'issues'];
  if (reviewerKeywords.some(k => lower.includes(k))) {
    return 'reviewer';
  }

  // Mentor signals
  const mentorKeywords = ['explain', 'why', 'how does', 'what is', 'teach', 'learn', 'understand'];
  if (mentorKeywords.some(k => lower.includes(k))) {
    return 'mentor';
  }

  // Builder signals (last - most general)
  const builderKeywords = ['build', 'create', 'implement', 'write', 'add', 'make', 'fix'];
  if (builderKeywords.some(k => lower.includes(k))) {
    return 'builder';
  }

  return null;
}
