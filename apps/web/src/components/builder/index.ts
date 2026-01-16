/**
 * Builder Components — State of the Art
 *
 * The UI layer for Alfred's browser IDE.
 */

export { FileExplorer } from './FileExplorer';
export type { FileExplorerProps, ContextAction } from './FileExplorer';

export { BuilderPreview } from './BuilderPreview';
export type { BuilderPreviewProps } from './BuilderPreview';

export { BuilderLayout } from './BuilderLayout';
export type { BuilderLayoutProps } from './BuilderLayout';

// MonacoEditor is dynamically imported in consumer files
// to avoid SSR issues with browser APIs
// Types are imported directly from the file when needed

export { StreamingCodeDisplay } from './StreamingCodeDisplay';
export type { StreamingCodeDisplayProps } from './StreamingCodeDisplay';

export { ProjectsSidebar } from './ProjectsSidebar';
export type { ProjectsSidebarProps } from './ProjectsSidebar';

export { MermaidRenderer } from './MermaidRenderer';
export type { MermaidRendererProps } from './MermaidRenderer';

export { MarkdownRenderer } from './MarkdownRenderer';
export type { MarkdownRendererProps } from './MarkdownRenderer';

// MobileBuilderLayout is dynamically imported in the builder page
// to avoid SSR issues with window/document access
export type { MobileTab } from './MobileBuilderLayout';
