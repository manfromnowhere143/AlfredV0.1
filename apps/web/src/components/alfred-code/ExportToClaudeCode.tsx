'use client';

/**
 * Export Project Component - State of the Art
 *
 * Premium one-click export for power users who want to use the project locally.
 * Downloads project as ZIP - user can run: cd project && npm run dev
 */

import { useState } from 'react';
import JSZip from 'jszip';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ExportToClaudeCodeProps {
  files: Map<string, string>;
  projectName: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'var(--surface, rgba(255,255,255,0.04))',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary, rgba(255,255,255,0.7))',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  buttonHover: {
    background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(6,182,212,0.05))',
    borderColor: 'rgba(14,165,233,0.4)',
    color: 'var(--text, rgba(255,255,255,0.9))',
  },
  buttonExporting: {
    background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(6,182,212,0.1))',
    borderColor: 'rgba(14,165,233,0.5)',
    color: '#0ea5e9',
  },
  buttonSuccess: {
    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))',
    borderColor: 'rgba(34,197,94,0.5)',
    color: '#22c55e',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  icon: {
    width: '14px',
    height: '14px',
    flexShrink: 0,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(14,165,233,0.3)',
    borderTopColor: '#0ea5e9',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  progressBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    height: '2px',
    background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
    borderRadius: '0 0 8px 8px',
    transition: 'width 0.3s ease',
  },
  checkmark: {
    width: '14px',
    height: '14px',
    color: '#22c55e',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ExportToClaudeCode({
  files,
  projectName,
  dependencies = {},
  devDependencies = {},
  className = '',
}: ExportToClaudeCodeProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleExport = async () => {
    if (files.size === 0) {
      console.warn('[Export] No files to export');
      return;
    }

    setIsExporting(true);
    setExportComplete(false);
    setProgress(0);

    try {
      const zip = new JSZip();
      const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

      // Simulate progress for visual feedback
      setProgress(20);

      // Add all project files
      files.forEach((content, path) => {
        const filePath = path.startsWith('/') ? path.slice(1) : path;
        zip.file(filePath, content);
      });

      setProgress(50);

      // Create package.json if it doesn't exist
      if (!files.has('/package.json')) {
        const packageJson = {
          name: safeName,
          version: '0.1.0',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            ...dependencies,
          },
          devDependencies: {
            '@types/react': '^18.3.0',
            '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.2.0',
            typescript: '^5.3.0',
            vite: '^5.0.0',
            ...devDependencies,
          },
        };
        zip.file('package.json', JSON.stringify(packageJson, null, 2));
      }

      setProgress(70);

      // Add helpful README
      zip.file('README.md', `# ${projectName}

Built with Alfred Pro Builder.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Your app will be running at [http://localhost:5173](http://localhost:5173)

## Project Structure

This is a Vite + React + TypeScript project. Edit files in the \`src/\` directory.

---

*Exported from Alfred Pro Builder*
`);

      // Add .gitignore
      if (!files.has('/.gitignore')) {
        zip.file('.gitignore', `node_modules
dist
.env
.env.local
*.log
.DS_Store
`);
      }

      // Add vite.config.ts if not present
      if (!files.has('/vite.config.ts') && !files.has('/vite.config.js')) {
        zip.file('vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`);
      }

      // Add tsconfig.json if not present
      if (!files.has('/tsconfig.json')) {
        zip.file('tsconfig.json', JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
          },
          include: ['src'],
        }, null, 2));
      }

      setProgress(90);

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setExportComplete(true);
      console.log(`[Export] Downloaded ${safeName}.zip with ${files.size} files`);

      // Reset after 3 seconds
      setTimeout(() => {
        setExportComplete(false);
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error('[Export] Failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = isExporting || files.size === 0;

  const buttonStyle = {
    ...styles.button,
    ...(isHovered && !isDisabled ? styles.buttonHover : {}),
    ...(isExporting ? styles.buttonExporting : {}),
    ...(exportComplete ? styles.buttonSuccess : {}),
    ...(isDisabled && !isExporting ? styles.buttonDisabled : {}),
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={handleExport}
        disabled={isDisabled}
        style={buttonStyle}
        className={className}
        title="Download project as ZIP"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Progress bar */}
        {isExporting && (
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        )}

        {/* Icon */}
        {exportComplete ? (
          <svg style={styles.checkmark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : isExporting ? (
          <div style={styles.spinner} />
        ) : (
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}

        {/* Text */}
        <span>
          {exportComplete ? 'Downloaded!' : isExporting ? 'Exporting...' : 'Export'}
        </span>
      </button>
    </>
  );
}

export default ExportToClaudeCode;
