'use client';

/**
 * SEO Issues List Component
 *
 * Displays SEO issues organized by category/severity.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Wand2,
  ExternalLink,
} from 'lucide-react';
import { getSeverityColor, getCategoryDisplayName, getSeverityDisplayName } from '@/lib/seo';
import type { SEOIssue, SEOCategory, SEOSeverity } from '@/lib/seo/types';

interface SEOIssuesListProps {
  issues: SEOIssue[];
  groupBy?: 'category' | 'severity';
  showAutoFix?: boolean;
  onAutoFix?: (issue: SEOIssue) => void;
  maxItems?: number;
  collapsible?: boolean;
}

export function SEOIssuesList({
  issues,
  groupBy = 'severity',
  showAutoFix = true,
  onAutoFix,
  maxItems,
  collapsible = true,
}: SEOIssuesListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['critical', 'warning']));

  // Group issues
  const groupedIssues = groupBy === 'category'
    ? groupByCategory(issues)
    : groupBySeverity(issues);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedIssues).map(([groupKey, groupIssues]) => {
        if (groupIssues.length === 0) return null;

        const isExpanded = !collapsible || expandedGroups.has(groupKey);
        const displayIssues = maxItems ? groupIssues.slice(0, maxItems) : groupIssues;
        const hasMore = maxItems && groupIssues.length > maxItems;

        return (
          <div key={groupKey} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => collapsible && toggleGroup(groupKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={!collapsible}
            >
              <div className="flex items-center gap-3">
                <IssueIcon severity={groupBy === 'severity' ? groupKey as SEOSeverity : 'warning'} />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {groupBy === 'category'
                    ? getCategoryDisplayName(groupKey)
                    : getSeverityDisplayName(groupKey)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({groupIssues.length})
                </span>
              </div>
              {collapsible && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              )}
            </button>

            {/* Issues */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {displayIssues.map((issue, index) => (
                      <IssueItem
                        key={`${issue.ruleId}-${index}`}
                        issue={issue}
                        showAutoFix={showAutoFix}
                        onAutoFix={onAutoFix}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30">
                      +{groupIssues.length - maxItems} more issues
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {issues.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">No issues found!</p>
          <p className="text-sm">Your page is well optimized.</p>
        </div>
      )}
    </div>
  );
}

interface IssueItemProps {
  issue: SEOIssue;
  showAutoFix?: boolean;
  onAutoFix?: (issue: SEOIssue) => void;
}

function IssueItem({ issue, showAutoFix, onAutoFix }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = getSeverityColor(issue.severity);

  return (
    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <IssueIcon severity={issue.severity} size="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-left flex-1"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {issue.message}
              </p>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {showAutoFix && issue.isAutoFixable && onAutoFix && (
                <button
                  onClick={() => onAutoFix(issue)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Auto-fix
                </button>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${severityColor}15`, color: severityColor }}
            >
              {issue.severity}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
              {getCategoryDisplayName(issue.category)}
            </span>
            {issue.scoreImpact > 0 && (
              <span className="text-gray-400">
                -{issue.scoreImpact}% impact
              </span>
            )}
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-2 text-sm"
              >
                {issue.description && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {issue.description}
                  </p>
                )}

                {issue.suggestion && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{issue.suggestion}</p>
                  </div>
                )}

                {(issue.currentValue || issue.expectedValue) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {issue.currentValue && (
                      <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded">
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Current:</p>
                        <code className="text-gray-700 dark:text-gray-300 break-all">
                          {issue.currentValue}
                        </code>
                      </div>
                    )}
                    {issue.expectedValue && (
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <p className="text-green-600 dark:text-green-400 mb-1">Expected:</p>
                        <code className="text-green-700 dark:text-green-300 break-all">
                          {issue.expectedValue}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {issue.learnMoreUrl && (
                  <a
                    href={issue.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Learn more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface IssueIconProps {
  severity: SEOSeverity;
  size?: 'sm' | 'md';
}

function IssueIcon({ severity, size = 'md' }: IssueIconProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const color = getSeverityColor(severity);

  switch (severity) {
    case 'critical':
      return <AlertCircle className={sizeClass} style={{ color }} />;
    case 'warning':
      return <AlertTriangle className={sizeClass} style={{ color }} />;
    case 'info':
      return <Info className={sizeClass} style={{ color }} />;
    case 'success':
      return <CheckCircle className={sizeClass} style={{ color }} />;
    default:
      return <Info className={sizeClass} style={{ color }} />;
  }
}

// Helper functions
function groupBySeverity(issues: SEOIssue[]): Record<SEOSeverity, SEOIssue[]> {
  return {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
    success: issues.filter(i => i.severity === 'success'),
  };
}

function groupByCategory(issues: SEOIssue[]): Record<SEOCategory, SEOIssue[]> {
  return {
    technical: issues.filter(i => i.category === 'technical'),
    content: issues.filter(i => i.category === 'content'),
    on_page: issues.filter(i => i.category === 'on_page'),
    ux: issues.filter(i => i.category === 'ux'),
    schema: issues.filter(i => i.category === 'schema'),
  };
}

export default SEOIssuesList;
