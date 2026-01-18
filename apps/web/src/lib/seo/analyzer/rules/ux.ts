/**
 * SEO Analyzer - UX Rules (8 checks)
 *
 * Validates user experience factors that affect SEO.
 */

import type { SEORule, SEOAnalysisContext, SEORuleResult } from '../../types';
import { RULE_IDS, LEARN_MORE_URLS } from '../../constants';

/**
 * Check mobile viewport configuration
 */
const mobileViewportRule: SEORule = {
  id: RULE_IDS.UX_MOBILE_VIEWPORT,
  name: 'Mobile Viewport',
  category: 'ux',
  description: 'Validates mobile-friendly viewport settings',
  weight: 0.20,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const html = context.indexHtml?.content || '';
    const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*content=["']([^"']+)["']/i);

    if (!viewportMatch) {
      return {
        passed: false,
        severity: 'critical',
        message: 'Missing viewport meta tag',
        description: 'Without a viewport, mobile devices render at desktop width.',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        learnMoreUrl: LEARN_MORE_URLS.MOBILE_FRIENDLY,
      };
    }

    const content = viewportMatch[1].toLowerCase();
    const issues: string[] = [];

    // Check for proper width setting
    if (!content.includes('width=device-width')) {
      issues.push('Missing "width=device-width"');
    }

    // Check initial-scale
    if (!content.includes('initial-scale=1')) {
      issues.push('Missing or incorrect "initial-scale"');
    }

    // Check for user-scalable=no (bad for accessibility)
    if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
      issues.push('Zoom is disabled (accessibility issue)');
    }

    if (issues.length === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'Mobile viewport is properly configured',
        currentValue: viewportMatch[1],
      };
    }

    return {
      passed: issues.some(i => i.includes('accessibility')),
      severity: issues.some(i => i.includes('accessibility')) ? 'warning' : 'critical',
      message: `Viewport issues: ${issues.join(', ')}`,
      suggestion: 'Use "width=device-width, initial-scale=1.0" and allow zooming',
      currentValue: viewportMatch[1],
      learnMoreUrl: LEARN_MORE_URLS.MOBILE_FRIENDLY,
    };
  },
};

/**
 * Check for appropriately sized touch targets
 */
const touchTargetsRule: SEORule = {
  id: RULE_IDS.UX_TOUCH_TARGETS,
  name: 'Touch Targets',
  category: 'ux',
  description: 'Checks for appropriately sized interactive elements',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    // Check CSS files for button/link sizing
    const cssFiles = context.files.filter(f => f.type === 'css' || f.path.endsWith('.css'));
    const allCss = cssFiles.map(f => f.content).join('\n');

    // Look for common touch-friendly patterns
    const hasMinHeight = /min-height:\s*(4[0-9]|[5-9][0-9]|[1-9][0-9]{2})px/i.test(allCss);
    const hasMinWidth = /min-width:\s*(4[0-9]|[5-9][0-9]|[1-9][0-9]{2})px/i.test(allCss);
    const hasPadding = /padding:\s*\d+/i.test(allCss);

    // Check for Tailwind touch-friendly classes
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const hasTailwindPadding = /p-[3-9]|px-[3-9]|py-[3-9]|p-\d{2}/i.test(allHtml);

    if (hasMinHeight || hasMinWidth || hasTailwindPadding) {
      return {
        passed: true,
        severity: 'success',
        message: 'Touch-friendly sizing patterns detected',
      };
    }

    if (hasPadding) {
      return {
        passed: true,
        severity: 'info',
        message: 'Some padding detected - verify touch targets are 44x44px minimum',
      };
    }

    // For React apps, this is often handled by component libraries
    const usesComponentLibrary = context.files.some(f =>
      f.content.includes('@radix-ui') ||
      f.content.includes('shadcn') ||
      f.content.includes('@headlessui') ||
      f.content.includes('material-ui') ||
      f.content.includes('@mui')
    );

    if (usesComponentLibrary) {
      return {
        passed: true,
        severity: 'success',
        message: 'Using UI component library with touch-friendly defaults',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'Unable to verify touch target sizes',
      description: 'Ensure interactive elements are at least 44x44 pixels.',
      suggestion: 'Use min-height/min-width of 44px for buttons and links',
    };
  },
};

/**
 * Check font size for readability
 */
const fontSizeRule: SEORule = {
  id: RULE_IDS.UX_FONT_SIZE,
  name: 'Font Size',
  category: 'ux',
  description: 'Checks for readable font sizes',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const cssFiles = context.files.filter(f => f.type === 'css' || f.path.endsWith('.css'));
    const allCss = cssFiles.map(f => f.content).join('\n');
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Look for small font sizes (less than 12px)
    const smallFontMatches = allCss.match(/font-size:\s*([0-9]+)px/gi) || [];
    const tooSmall = smallFontMatches.filter(m => {
      const size = parseInt(m.match(/([0-9]+)/)?.[1] || '16', 10);
      return size < 12;
    });

    // Check for Tailwind text size classes
    const usesTailwind = allHtml.includes('text-');
    const hasSmallTailwind = /text-\[?[0-9]px\]?|text-xs/.test(allHtml);

    // Check for body font-size
    const hasBodyFontSize = /body\s*\{[^}]*font-size/i.test(allCss);
    const hasRootFontSize = /:root\s*\{[^}]*font-size/i.test(allCss);
    const hasHtmlFontSize = /html\s*\{[^}]*font-size/i.test(allCss);

    if (tooSmall.length > 0) {
      return {
        passed: false,
        severity: 'warning',
        message: `${tooSmall.length} elements have font-size < 12px`,
        description: 'Very small text is hard to read on mobile devices.',
        suggestion: 'Use font-size of at least 12px, preferably 14-16px for body text',
        currentValue: `Found: ${tooSmall.slice(0, 3).join(', ')}`,
      };
    }

    if (hasBodyFontSize || hasRootFontSize || hasHtmlFontSize) {
      return {
        passed: true,
        severity: 'success',
        message: 'Base font size is configured',
      };
    }

    if (usesTailwind && !hasSmallTailwind) {
      return {
        passed: true,
        severity: 'success',
        message: 'Using Tailwind with appropriate text sizes',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'Font sizes appear acceptable',
      description: 'Ensure body text is at least 14-16px for readability.',
    };
  },
};

/**
 * Check color contrast (basic check)
 */
const contrastRule: SEORule = {
  id: RULE_IDS.UX_CONTRAST,
  name: 'Color Contrast',
  category: 'ux',
  description: 'Basic check for color contrast considerations',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const cssFiles = context.files.filter(f => f.type === 'css' || f.path.endsWith('.css'));
    const allCss = cssFiles.map(f => f.content).join('\n');

    // Look for very light text colors that might have contrast issues
    const lightColors = /#[fF]{3,6}|#[eE]{3,6}|rgb\s*\(\s*2[4-5]\d\s*,\s*2[4-5]\d\s*,\s*2[4-5]\d/g;
    const hasLightText = lightColors.test(allCss);

    // Check for dark mode support (good practice)
    const hasDarkMode = allCss.includes('@media (prefers-color-scheme:') ||
                        allCss.includes('dark:') ||
                        allCss.includes('.dark');

    // Check for Tailwind dark mode
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');
    const hasTailwindDark = allHtml.includes('dark:');

    if (hasDarkMode || hasTailwindDark) {
      return {
        passed: true,
        severity: 'success',
        message: 'Dark mode support detected (good for accessibility)',
      };
    }

    if (hasLightText) {
      return {
        passed: true,
        severity: 'info',
        message: 'Light colors detected - ensure sufficient contrast',
        description: 'WCAG requires 4.5:1 contrast ratio for normal text.',
        suggestion: 'Test color contrast with a tool like WebAIM Contrast Checker',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'Unable to verify color contrast automatically',
      description: 'Manual testing recommended for WCAG compliance.',
      suggestion: 'Use a contrast checker to verify 4.5:1 ratio for text',
    };
  },
};

/**
 * Check for horizontal scrolling issues
 */
const noHorizontalScrollRule: SEORule = {
  id: RULE_IDS.UX_NO_HORIZONTAL_SCROLL,
  name: 'No Horizontal Scroll',
  category: 'ux',
  description: 'Checks for potential horizontal scrolling issues',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const cssFiles = context.files.filter(f => f.type === 'css' || f.path.endsWith('.css'));
    const allCss = cssFiles.map(f => f.content).join('\n');
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Check for overflow-x: hidden on body/html (common fix)
    const hasOverflowHidden = /(?:body|html|:root)\s*\{[^}]*overflow-x:\s*hidden/i.test(allCss);

    // Check for problematic fixed widths
    const hasFixedWidth = /width:\s*\d{4,}px/i.test(allCss);

    // Check for max-width: 100% (good practice)
    const hasMaxWidth100 = /max-width:\s*100%/i.test(allCss);

    // Tailwind checks
    const hasTailwindOverflow = allHtml.includes('overflow-x-hidden') ||
                                 allHtml.includes('overflow-hidden');
    const hasTailwindMaxWidth = allHtml.includes('max-w-full') ||
                                 allHtml.includes('max-w-screen');

    if (hasOverflowHidden || hasTailwindOverflow) {
      return {
        passed: true,
        severity: 'success',
        message: 'Horizontal overflow is controlled',
      };
    }

    if (hasFixedWidth && !hasMaxWidth100 && !hasTailwindMaxWidth) {
      return {
        passed: false,
        severity: 'warning',
        message: 'Large fixed widths detected - may cause horizontal scroll',
        description: 'Fixed widths can cause horizontal scrolling on mobile.',
        suggestion: 'Use max-width: 100% or responsive units',
      };
    }

    if (hasMaxWidth100 || hasTailwindMaxWidth) {
      return {
        passed: true,
        severity: 'success',
        message: 'Responsive width patterns detected',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'Unable to verify horizontal scroll - test on mobile',
      suggestion: 'Add overflow-x: hidden to body if horizontal scroll occurs',
    };
  },
};

/**
 * Check for accessible names on interactive elements
 */
const accessibleNamesRule: SEORule = {
  id: RULE_IDS.UX_ACCESSIBLE_NAMES,
  name: 'Accessible Names',
  category: 'ux',
  description: 'Checks if interactive elements have accessible labels',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Check for icon-only buttons without aria-label
    const buttonMatches = Array.from(allHtml.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi));

    let iconOnlyWithoutLabel = 0;

    for (const match of buttonMatches) {
      const buttonTag = match[0];
      const buttonContent = match[1].trim();

      // Check if button only contains an icon (SVG or icon component)
      const hasOnlyIcon = /<svg|Icon|<i\s/i.test(buttonContent) &&
                          !buttonContent.replace(/<[^>]+>/g, '').trim();

      const hasAriaLabel = /aria-label=/i.test(buttonTag);
      const hasTitle = /title=/i.test(buttonTag);

      if (hasOnlyIcon && !hasAriaLabel && !hasTitle) {
        iconOnlyWithoutLabel++;
      }
    }

    // Check for images used as buttons
    const imgButtons = allHtml.match(/<button[^>]*>\s*<img[^>]*>\s*<\/button>/gi) || [];
    const imgButtonsWithoutAlt = imgButtons.filter(b =>
      !(/alt=["'][^"']+["']/.test(b) || /aria-label=/.test(b))
    );

    const issues = iconOnlyWithoutLabel + imgButtonsWithoutAlt.length;

    if (issues === 0) {
      return {
        passed: true,
        severity: 'success',
        message: 'Interactive elements have accessible names',
      };
    }

    return {
      passed: false,
      severity: 'warning',
      message: `${issues} interactive elements may lack accessible names`,
      description: 'Screen reader users need accessible names to understand button purposes.',
      suggestion: 'Add aria-label to icon-only buttons',
      currentValue: `${issues} elements`,
    };
  },
};

/**
 * Check for focus visibility
 */
const focusVisibleRule: SEORule = {
  id: RULE_IDS.UX_FOCUS_VISIBLE,
  name: 'Focus Visibility',
  category: 'ux',
  description: 'Checks if focus states are visible',
  weight: 0.12,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const cssFiles = context.files.filter(f => f.type === 'css' || f.path.endsWith('.css'));
    const allCss = cssFiles.map(f => f.content).join('\n');
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Check for focus styles
    const hasFocusStyles = /:focus\s*\{/.test(allCss) ||
                           /:focus-visible\s*\{/.test(allCss);

    // Check for outline: none without replacement (bad practice)
    const hasOutlineNone = /outline:\s*none|outline:\s*0/i.test(allCss);
    const hasFocusReplacement = /:focus[^{]*\{[^}]*(?:box-shadow|border|outline)/i.test(allCss);

    // Tailwind focus classes
    const hasTailwindFocus = allHtml.includes('focus:') ||
                              allHtml.includes('focus-visible:');

    if (hasTailwindFocus) {
      return {
        passed: true,
        severity: 'success',
        message: 'Tailwind focus utilities detected',
      };
    }

    if (hasOutlineNone && !hasFocusReplacement) {
      return {
        passed: false,
        severity: 'warning',
        message: 'outline: none used without focus replacement',
        description: 'Removing focus outlines makes keyboard navigation difficult.',
        suggestion: 'If removing outlines, add alternative focus indicators',
      };
    }

    if (hasFocusStyles) {
      return {
        passed: true,
        severity: 'success',
        message: 'Focus styles are defined',
      };
    }

    return {
      passed: true,
      severity: 'info',
      message: 'Using browser default focus styles',
      description: 'Default focus styles are acceptable but custom styles may improve UX.',
    };
  },
};

/**
 * Check for skip links
 */
const skipLinksRule: SEORule = {
  id: RULE_IDS.UX_SKIP_LINKS,
  name: 'Skip Links',
  category: 'ux',
  description: 'Checks for skip navigation links',
  weight: 0.10,
  check: (context: SEOAnalysisContext): SEORuleResult => {
    const allHtml = context.htmlFiles.map(f => f.content).join('\n');

    // Common skip link patterns
    const hasSkipLink = /skip[- ]?(?:to[- ]?)?(?:main|content|navigation)/i.test(allHtml) ||
                        /<a[^>]*href=["']#(?:main|content|skip)[^"']*["'][^>]*>/i.test(allHtml);

    // Check for main landmark
    const hasMainLandmark = /<main[^>]*>/i.test(allHtml) ||
                            /role=["']main["']/i.test(allHtml);

    // Check for header/nav landmarks
    const hasNav = /<nav[^>]*>/i.test(allHtml) ||
                   /role=["']navigation["']/i.test(allHtml);

    if (hasSkipLink) {
      return {
        passed: true,
        severity: 'success',
        message: 'Skip link detected for keyboard navigation',
      };
    }

    // For simple pages without much navigation, skip links aren't critical
    if (!hasNav) {
      return {
        passed: true,
        severity: 'info',
        message: 'No navigation found - skip link not required',
      };
    }

    if (hasMainLandmark) {
      return {
        passed: true,
        severity: 'info',
        message: 'Main landmark present - consider adding skip link for accessibility',
        suggestion: 'Add a "Skip to main content" link for keyboard users',
      };
    }

    return {
      passed: false,
      severity: 'info',
      message: 'No skip link or main landmark found',
      description: 'Skip links help keyboard users bypass repetitive navigation.',
      suggestion: 'Add <a href="#main">Skip to main content</a> and <main id="main">',
    };
  },
};

export const uxRules: SEORule[] = [
  mobileViewportRule,
  touchTargetsRule,
  fontSizeRule,
  contrastRule,
  noHorizontalScrollRule,
  accessibleNamesRule,
  focusVisibleRule,
  skipLinksRule,
];
