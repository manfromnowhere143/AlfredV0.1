/**
 * Artifact Parser
 *
 * Parses single-file artifacts to extract:
 * - Component type (React, HTML, etc.)
 * - Dependencies used
 * - Import/export statements
 * - Framework features (hooks, Tailwind, etc.)
 */

import type {
    Artifact,
    ParsedArtifact,
    ArtifactType,
    ArtifactLanguage,
    ImportStatement,
    ExportStatement,
    DependencyInfo,
  } from '../types';
  
  // ============================================================================
  // REGEX PATTERNS
  // ============================================================================
  
  const PATTERNS = {
    importDefault: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    importNamed: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
    importNamespace: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    importSideEffect: /import\s+['"]([^'"]+)['"]/g,
    importCombined: /import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
  
    exportDefault: /export\s+default\s+(?:function\s+)?(\w+)?/g,
    exportNamed: /export\s+(?:const|let|var|function|class)\s+(\w+)/g,
    exportFrom: /export\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
    exportAll: /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
  
    reactHooks: /use[A-Z]\w+/g,
    jsxElement: /<[A-Z]\w+|<[a-z]+[^>]*>/,
    reactImport: /from\s+['"]react['"]/,
  
    functionComponent: /(?:export\s+default\s+)?function\s+(\w+)/,
    arrowComponent: /(?:export\s+default\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/,
    classComponent: /class\s+(\w+)\s+extends\s+(?:React\.)?Component/,
  
    tailwindClasses: /className\s*=\s*["'`][^"'`]*(?:flex|grid|p-|m-|w-|h-|bg-|text-|border-)/,
    typeAnnotation: /:\s*(?:string|number|boolean|React\.|FC|Props|any|void|null|undefined)/,
  };
  
  // ============================================================================
  // PARSER
  // ============================================================================
  
  export function parseArtifact(artifact: Artifact): ParsedArtifact {
    const { code, language } = artifact;
  
    const imports = parseImports(code);
    const exports = parseExports(code);
    const type = detectArtifactType(code, language, imports);
    const componentName = extractComponentName(code, artifact.title);
    const dependencies = detectDependencies(imports, code);
  
    return {
      type,
      language,
      code,
      componentName,
      dependencies,
      imports,
      exports,
      hasDefaultExport: exports.some((e) => e.type === 'default'),
      usesHooks: detectHooksUsage(code),
      usesTailwind: detectTailwindUsage(code),
      usesTypeScript: language === 'tsx' || detectTypeScriptUsage(code),
    };
  }
  
  // ============================================================================
  // IMPORT PARSING
  // ============================================================================
  
  function parseImports(code: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const lines = code.split('\n');
  
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import')) continue;
  
      const parsed = parseImportLine(trimmed);
      if (parsed) {
        imports.push(parsed);
      }
    }
  
    return imports;
  }
  
  function parseImportLine(line: string): ImportStatement | null {
    // Combined: import React, { useState } from 'react'
    const combinedMatch = line.match(
      /import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/
    );
    if (combinedMatch) {
      return {
        source: combinedMatch[3],
        defaultImport: combinedMatch[1],
        namedImports: combinedMatch[2].split(',').map((s) => s.trim()),
        isRelative: combinedMatch[3].startsWith('.'),
      };
    }
  
    // Namespace: import * as React from 'react'
    const namespaceMatch = line.match(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/
    );
    if (namespaceMatch) {
      return {
        source: namespaceMatch[2],
        namespaceImport: namespaceMatch[1],
        namedImports: [],
        isRelative: namespaceMatch[2].startsWith('.'),
      };
    }
  
    // Named: import { useState, useEffect } from 'react'
    const namedMatch = line.match(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/
    );
    if (namedMatch) {
      return {
        source: namedMatch[2],
        namedImports: namedMatch[1].split(',').map((s) => s.trim()),
        isRelative: namedMatch[2].startsWith('.'),
      };
    }
  
    // Default: import React from 'react'
    const defaultMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultMatch) {
      return {
        source: defaultMatch[2],
        defaultImport: defaultMatch[1],
        namedImports: [],
        isRelative: defaultMatch[2].startsWith('.'),
      };
    }
  
    // Side effect: import 'styles.css'
    const sideEffectMatch = line.match(/import\s+['"]([^'"]+)['"]/);
    if (sideEffectMatch) {
      return {
        source: sideEffectMatch[1],
        namedImports: [],
        isRelative: sideEffectMatch[1].startsWith('.'),
      };
    }
  
    return null;
  }
  
  // ============================================================================
  // EXPORT PARSING
  // ============================================================================
  
  function parseExports(code: string): ExportStatement[] {
    const exports: ExportStatement[] = [];
  
    const defaultMatches = code.matchAll(
      /export\s+default\s+(?:function\s+)?(\w+)?/g
    );
    for (const match of defaultMatches) {
      exports.push({
        type: 'default',
        name: match[1] || undefined,
      });
    }
  
    const namedMatches = code.matchAll(
      /export\s+(?:const|let|var|function|class)\s+(\w+)/g
    );
    for (const match of namedMatches) {
      exports.push({
        type: 'named',
        name: match[1],
      });
    }
  
    const reExportMatches = code.matchAll(
      /export\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g
    );
    for (const match of reExportMatches) {
      exports.push({
        type: 'named',
        name: match[1],
        source: match[2],
      });
    }
  
    const exportAllMatches = code.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of exportAllMatches) {
      exports.push({
        type: 'all',
        source: match[1],
      });
    }
  
    return exports;
  }
  
  // ============================================================================
  // TYPE DETECTION
  // ============================================================================
  
  function detectArtifactType(
    code: string,
    language: ArtifactLanguage,
    imports: ImportStatement[]
  ): ArtifactType {
    if (language === 'html') return 'html';
    if (language === 'vue') return 'vue';
    if (language === 'svelte') return 'svelte';
  
    const hasReactImport = imports.some(
      (i) => i.source === 'react' || i.source === 'react-dom'
    );
    const hasVueImport = imports.some((i) => i.source === 'vue');
    const hasSvelteImport = imports.some((i) => i.source === 'svelte');
  
    if (hasVueImport) return 'vue';
    if (hasSvelteImport) return 'svelte';
    if (hasReactImport) return 'react';
  
    if (PATTERNS.jsxElement.test(code)) return 'react';
    if (PATTERNS.reactHooks.test(code)) return 'react';
  
    if (language === 'jsx' || language === 'tsx') return 'react';
  
    return 'html';
  }
  
  // ============================================================================
  // COMPONENT NAME EXTRACTION
  // ============================================================================
  
  function extractComponentName(code: string, fallbackTitle: string): string {
    const funcMatch = code.match(PATTERNS.functionComponent);
    if (funcMatch?.[1]) return funcMatch[1];
  
    const arrowMatch = code.match(PATTERNS.arrowComponent);
    if (arrowMatch?.[1]) return arrowMatch[1];
  
    const classMatch = code.match(PATTERNS.classComponent);
    if (classMatch?.[1]) return classMatch[1];
  
    return sanitizeComponentName(fallbackTitle);
  }
  
  function sanitizeComponentName(name: string): string {
    const sanitized = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  
    if (!/^[A-Z]/.test(sanitized)) {
      return 'Component' + sanitized;
    }
  
    return sanitized || 'Component';
  }
  
  // ============================================================================
  // DEPENDENCY DETECTION
  // ============================================================================
  
  const DEPENDENCY_VERSIONS: Record<string, string> = {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    'lucide-react': '^0.263.1',
    recharts: '^2.12.0',
    'framer-motion': '^11.0.0',
    '@radix-ui/react-slot': '^1.0.2',
    'class-variance-authority': '^0.7.0',
    clsx: '^2.1.0',
    'tailwind-merge': '^2.2.0',
    three: '^0.162.0',
    '@react-three/fiber': '^8.15.0',
    '@react-three/drei': '^9.92.0',
    d3: '^7.8.5',
    lodash: '^4.17.21',
    axios: '^1.6.0',
    zustand: '^4.5.0',
    '@tanstack/react-query': '^5.17.0',
    mathjs: '^12.2.0',
    'date-fns': '^3.3.0',
  };
  
  const DEV_DEPENDENCY_VERSIONS: Record<string, string> = {
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
    '@types/three': '^0.162.0',
    '@types/lodash': '^4.14.202',
    '@types/d3': '^7.4.3',
    typescript: '^5.3.0',
    tailwindcss: '^3.4.0',
    autoprefixer: '^10.4.17',
    postcss: '^8.4.33',
  };
  
  function detectDependencies(
    imports: ImportStatement[],
    code: string
  ): DependencyInfo[] {
    const deps = new Map<string, DependencyInfo>();
  
    deps.set('react', {
      name: 'react',
      version: DEPENDENCY_VERSIONS['react'],
      isDev: false,
    });
    deps.set('react-dom', {
      name: 'react-dom',
      version: DEPENDENCY_VERSIONS['react-dom'],
      isDev: false,
    });
  
    for (const imp of imports) {
      if (imp.isRelative) continue;
  
      const pkgName = getPackageName(imp.source);
      if (pkgName && !deps.has(pkgName)) {
        const version = DEPENDENCY_VERSIONS[pkgName] || 'latest';
        deps.set(pkgName, {
          name: pkgName,
          version,
          isDev: false,
        });
      }
    }
  
    for (const [name] of deps) {
      const typesName = `@types/${name}`;
      if (DEV_DEPENDENCY_VERSIONS[typesName] && !deps.has(typesName)) {
        deps.set(typesName, {
          name: typesName,
          version: DEV_DEPENDENCY_VERSIONS[typesName],
          isDev: true,
        });
      }
    }
  
    if (detectTailwindUsage(code)) {
      deps.set('tailwindcss', {
        name: 'tailwindcss',
        version: DEV_DEPENDENCY_VERSIONS['tailwindcss'],
        isDev: true,
      });
      deps.set('autoprefixer', {
        name: 'autoprefixer',
        version: DEV_DEPENDENCY_VERSIONS['autoprefixer'],
        isDev: true,
      });
      deps.set('postcss', {
        name: 'postcss',
        version: DEV_DEPENDENCY_VERSIONS['postcss'],
        isDev: true,
      });
    }
  
    return Array.from(deps.values());
  }
  
  function getPackageName(source: string): string | null {
    if (source.startsWith('.') || source.startsWith('/')) {
      return null;
    }
  
    if (source.startsWith('@')) {
      const parts = source.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
  
    return source.split('/')[0];
  }
  
  // ============================================================================
  // FEATURE DETECTION
  // ============================================================================
  
  function detectHooksUsage(code: string): boolean {
    const hooks = code.match(PATTERNS.reactHooks);
    return hooks !== null && hooks.length > 0;
  }
  
  function detectTailwindUsage(code: string): boolean {
    return PATTERNS.tailwindClasses.test(code);
  }
  
  function detectTypeScriptUsage(code: string): boolean {
    return PATTERNS.typeAnnotation.test(code);
  }
  
  // ============================================================================
  // EXPORTS
  // ============================================================================
  
  export {
    parseImports,
    parseExports,
    detectArtifactType,
    extractComponentName,
    detectDependencies,
    detectHooksUsage,
    detectTailwindUsage,
    detectTypeScriptUsage,
  };