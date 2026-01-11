/**
 * Artifacts Utility Tests
 *
 * Tests for code extraction from LLM responses.
 */

import { describe, it, expect } from 'vitest';
import { extractCodeFromResponse } from './artifacts';

describe('extractCodeFromResponse', () => {
  it('extracts JSX code blocks', () => {
    const content = `Here's a component:

\`\`\`jsx
export default function Button() {
  return <button>Click me</button>;
}
\`\`\`

That's it!`;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('jsx');
    expect(result?.code).toContain('export default function Button');
    expect(result?.title).toBe('Button');
  });

  it('extracts TSX code blocks', () => {
    const content = `\`\`\`tsx
const MyComponent = () => {
  return <div>Hello</div>;
}
export default MyComponent;
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('tsx');
    expect(result?.title).toBe('MyComponent');
  });

  it('extracts HTML code blocks', () => {
    const content = `\`\`\`html
<!DOCTYPE html>
<html>
<body>Hello</body>
</html>
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('html');
  });

  it('extracts CSS code blocks', () => {
    const content = `\`\`\`css
.button {
  color: red;
}
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('css');
  });

  it('extracts JavaScript code blocks', () => {
    const content = `\`\`\`javascript
function calculateSum(a, b) {
  return a + b;
}
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('javascript');
    expect(result?.title).toBe('calculateSum');
  });

  it('extracts TypeScript code blocks', () => {
    const content = `\`\`\`typescript
export const API_URL = 'https://api.example.com';
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.language).toBe('typescript');
    expect(result?.title).toBe('API_URL');
  });

  it('returns null when no code block found', () => {
    const content = 'This is just plain text without any code.';
    const result = extractCodeFromResponse(content);
    expect(result).toBeNull();
  });

  it('returns null for unsupported languages', () => {
    const content = `\`\`\`python
def hello():
    print("Hello")
\`\`\``;

    const result = extractCodeFromResponse(content);
    expect(result).toBeNull();
  });

  it('uses "Artifact" as default title when no function found', () => {
    const content = `\`\`\`jsx
<div>Just some JSX without a function</div>
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Artifact');
  });

  it('extracts first code block when multiple exist', () => {
    const content = `\`\`\`jsx
function First() { return <div>First</div>; }
\`\`\`

\`\`\`tsx
function Second() { return <div>Second</div>; }
\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.title).toBe('First');
  });

  it('trims whitespace from extracted code', () => {
    const content = `\`\`\`jsx

function Padded() {
  return <div>Padded</div>;
}

\`\`\``;

    const result = extractCodeFromResponse(content);

    expect(result).not.toBeNull();
    expect(result?.code.startsWith('function')).toBe(true);
    expect(result?.code.endsWith('}')).toBe(true);
  });
});
