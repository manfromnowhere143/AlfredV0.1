'use client';

/**
 * Monaco Editor Component
 *
 * Production-grade code editor powered by Monaco (VS Code's editor).
 * Features syntax highlighting, IntelliSense-lite, and themes.
 */

import React, { useCallback, useRef, useEffect, memo } from 'react';
import Editor, { OnMount, OnChange, loader, Monaco } from '@monaco-editor/react';

// Use Monaco's own types from the wrapper package
type IStandaloneCodeEditor = Parameters<OnMount>[0];
type IStandaloneThemeData = Parameters<Monaco['editor']['defineTheme']>[1];

// ============================================================================
// TYPES
// ============================================================================

export interface MonacoEditorProps {
  /** File content */
  value: string;

  /** Programming language for syntax highlighting */
  language: string;

  /** File path for display */
  path?: string;

  /** Callback when content changes */
  onChange?: (value: string) => void;

  /** Whether editor is read-only */
  readOnly?: boolean;

  /** Custom class name */
  className?: string;

  /** Show minimap */
  showMinimap?: boolean;

  /** Theme: 'dark' | 'light' */
  theme?: 'dark' | 'light';
}

// ============================================================================
// LANGUAGE MAP - Map file extensions to Monaco languages
// ============================================================================

const LANGUAGE_MAP: Record<string, string> = {
  tsx: 'typescript',
  ts: 'typescript',
  jsx: 'javascript',
  js: 'javascript',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  json: 'json',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'cpp',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  sh: 'shell',
  bash: 'shell',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
};

function getMonacoLanguage(language: string): string {
  return LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase() || 'plaintext';
}

// ============================================================================
// EDITOR THEME - Custom dark theme matching Alfred's design
// ============================================================================

const ALFRED_DARK_THEME: IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C084FC' },
    { token: 'string', foreground: '86EFAC' },
    { token: 'number', foreground: 'F9A8D4' },
    { token: 'type', foreground: '7DD3FC' },
    { token: 'function', foreground: 'FCD34D' },
    { token: 'variable', foreground: 'E5E7EB' },
    { token: 'tag', foreground: 'F87171' },
    { token: 'attribute.name', foreground: 'FDBA74' },
    { token: 'attribute.value', foreground: '86EFAC' },
  ],
  colors: {
    'editor.background': '#0F0F12',
    'editor.foreground': '#E5E7EB',
    'editor.lineHighlightBackground': '#1F1F25',
    'editor.selectionBackground': '#6366F140',
    'editor.inactiveSelectionBackground': '#6366F120',
    'editorCursor.foreground': '#6366F1',
    'editorWhitespace.foreground': '#2D2D35',
    'editorIndentGuide.background': '#2D2D35',
    'editorIndentGuide.activeBackground': '#4B4B55',
    'editorLineNumber.foreground': '#4B4B55',
    'editorLineNumber.activeForeground': '#9CA3AF',
    'editor.selectionHighlightBackground': '#6366F120',
    'editorBracketMatch.background': '#6366F130',
    'editorBracketMatch.border': '#6366F180',
    'scrollbarSlider.background': '#FFFFFF15',
    'scrollbarSlider.hoverBackground': '#FFFFFF25',
    'scrollbarSlider.activeBackground': '#FFFFFF35',
  },
};

// Configure Monaco loader to use CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

export const MonacoEditor = memo(function MonacoEditor({
  value,
  language,
  path,
  onChange,
  readOnly = false,
  className = '',
  showMinimap = false,
  theme = 'dark',
}: MonacoEditorProps) {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Handle editor mount
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    monaco.editor.defineTheme('alfred-dark', ALFRED_DARK_THEME);
    monaco.editor.setTheme('alfred-dark');

    // Configure TypeScript/JavaScript settings for TSX
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      skipLibCheck: true,
    });

    // Add React types for IntelliSense
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module 'react' {
        export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
        export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
        export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
        export function useMemo<T>(factory: () => T, deps: any[]): T;
        export function useRef<T>(initial: T): { current: T };
        export function memo<T>(component: T): T;
        export const Fragment: any;
        export const StrictMode: any;
      }
      declare namespace JSX {
        interface IntrinsicElements {
          [elemName: string]: any;
        }
      }
      `,
      'ts:react.d.ts'
    );

    // Focus editor
    editor.focus();
  }, []);

  // Handle content changes
  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (newValue !== undefined && onChange) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Update editor value when external value changes
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== editor.getValue()) {
      const position = editor.getPosition();
      editor.setValue(value);
      if (position) {
        editor.setPosition(position);
      }
    }
  }, [value]);

  return (
    <div className={`monaco-editor-container ${className}`}>
      {path && (
        <div className="editor-tab">
          <span className="tab-name">{path.split('/').pop()}</span>
          <span className="tab-path">{path}</span>
        </div>
      )}

      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={value}
          theme={theme === 'dark' ? 'alfred-dark' : 'light'}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: showMinimap },
            fontSize: 13,
            fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            suggest: {
              showMethods: true,
              showFunctions: true,
              showVariables: true,
              showClasses: true,
              showKeywords: true,
            },
          }}
          loading={
            <div className="editor-loading">
              <div className="loading-spinner" />
              <span>Loading editor...</span>
            </div>
          }
        />
      </div>

      <style jsx>{`
        .monaco-editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0f0f12;
        }

        .editor-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tab-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .tab-path {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Fira Code', monospace;
        }

        .editor-wrapper {
          flex: 1;
          min-height: 0;
        }

        .editor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// EXPORTS
// ============================================================================

export default MonacoEditor;
