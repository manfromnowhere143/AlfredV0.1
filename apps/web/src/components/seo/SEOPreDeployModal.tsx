'use client';

/**
 * SEO Pre-Deploy Modal
 *
 * Appears before deployment to show SEO analysis and auto-fix options.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Wand2,
  Rocket,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SEOScoreCard, SEOScoreBadge } from './SEOScoreCard';
import { SEOIssuesList } from './SEOIssuesList';
import {
  analyzeSEO,
  getAutoFixableIssues,
  calculatePotentialScore,
  getCategoryDisplayName,
  getGradeColor,
} from '@/lib/seo';
import type { SEOAnalysisResult, SEOIssue, SEOConfigInput, SEOGrade } from '@/lib/seo/types';

interface SEOPreDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (files: Array<{ path: string; content: string }>) => void;
  files: Array<{ path: string; content: string }>;
  projectName: string;
  deployUrl?: string;
  seoConfig?: SEOConfigInput;
}

export function SEOPreDeployModal({
  isOpen,
  onClose,
  onDeploy,
  files,
  projectName,
  deployUrl,
  seoConfig,
}: SEOPreDeployModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SEOAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [modifiedFiles, setModifiedFiles] = useState<Array<{ path: string; content: string }>>(files);
  const [showDetails, setShowDetails] = useState(false);

  // Run analysis when modal opens
  useEffect(() => {
    if (isOpen && !result && !analyzing) {
      runAnalysis();
    }
  }, [isOpen]);

  // Reset when files change
  useEffect(() => {
    setModifiedFiles(files);
    setResult(null);
    setAppliedFixes(new Set());
  }, [files]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzeSEO(modifiedFiles, {
        projectName,
        deployUrl,
        seoConfig,
      });
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoFixAll = async () => {
    if (!result) return;

    setApplying(true);

    try {
      const autoFixableIssues = getAutoFixableIssues(result);
      let updatedFiles = [...modifiedFiles];
      const newAppliedFixes = new Set(appliedFixes);

      for (const issue of autoFixableIssues) {
        if (issue.autoFix && !appliedFixes.has(issue.ruleId)) {
          const fix = issue.autoFix;

          // Find the file to modify
          const fileIndex = updatedFiles.findIndex(f => f.path === fix.filePath || f.path === `/${fix.filePath}`);
          if (fileIndex === -1) continue;

          let content = updatedFiles[fileIndex].content;

          switch (fix.type) {
            case 'replace':
              if (fix.oldValue) {
                content = content.replace(fix.oldValue, fix.newValue);
              }
              break;
            case 'insert':
              if (fix.target === 'head') {
                const headMatch = content.match(/<head[^>]*>/i);
                if (headMatch) {
                  const insertPos = content.indexOf(headMatch[0]) + headMatch[0].length;
                  content = content.slice(0, insertPos) + '\n    ' + fix.newValue + content.slice(insertPos);
                }
              }
              break;
            case 'attribute':
              if (fix.target) {
                const tagRegex = new RegExp(`<${fix.target}([^>]*)>`, 'i');
                content = content.replace(tagRegex, `<${fix.target}$1 ${fix.newValue}>`);
              }
              break;
          }

          updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content };
          newAppliedFixes.add(issue.ruleId);
        }
      }

      setModifiedFiles(updatedFiles);
      setAppliedFixes(newAppliedFixes);

      // Re-run analysis
      const newResult = await analyzeSEO(updatedFiles, {
        projectName,
        deployUrl,
        seoConfig,
      });
      setResult(newResult);
    } catch (err) {
      console.error('[SEO] Auto-fix error:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleSingleFix = async (issue: SEOIssue) => {
    if (!issue.autoFix || appliedFixes.has(issue.ruleId)) return;

    const fix = issue.autoFix;
    const fileIndex = modifiedFiles.findIndex(f => f.path === fix.filePath || f.path === `/${fix.filePath}`);
    if (fileIndex === -1) return;

    let content = modifiedFiles[fileIndex].content;

    switch (fix.type) {
      case 'replace':
        if (fix.oldValue) {
          content = content.replace(fix.oldValue, fix.newValue);
        }
        break;
      case 'insert':
        if (fix.target === 'head') {
          const headMatch = content.match(/<head[^>]*>/i);
          if (headMatch) {
            const insertPos = content.indexOf(headMatch[0]) + headMatch[0].length;
            content = content.slice(0, insertPos) + '\n    ' + fix.newValue + content.slice(insertPos);
          }
        }
        break;
    }

    const updatedFiles = [...modifiedFiles];
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content };

    setModifiedFiles(updatedFiles);
    setAppliedFixes(new Set([...appliedFixes, issue.ruleId]));

    // Re-run analysis
    const newResult = await analyzeSEO(updatedFiles, {
      projectName,
      deployUrl,
      seoConfig,
    });
    setResult(newResult);
  };

  const handleDeploy = () => {
    onDeploy(modifiedFiles);
    onClose();
  };

  if (!isOpen) return null;

  const autoFixableCount = result ? getAutoFixableIssues(result).filter(i => !appliedFixes.has(i.ruleId)).length : 0;
  const potentialScore = result ? calculatePotentialScore(result) : 0;
  const hasAppliedFixes = appliedFixes.size > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              SEO Analysis
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Analyzing SEO...</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Running 54 checks across 5 categories
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-600 dark:text-red-400 font-medium">Analysis Failed</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
                <button
                  onClick={runAnalysis}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : result ? (
              <div className="p-6 space-y-6">
                {/* Score Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <SEOScoreCard score={result.score} grade={result.grade} size="lg" />

                  <div className="flex-1 space-y-4">
                    {/* Category Scores */}
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(result.categoryScores).map(([category, score]) => (
                        <div key={category} className="text-center">
                          <div
                            className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold"
                            style={{
                              backgroundColor: `${getGradeColor(getGradeFromScore(score))}20`,
                              color: getGradeColor(getGradeFromScore(score)),
                            }}
                          >
                            {score}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {getCategoryDisplayName(category).split(' ')[0]}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {result.passedChecks} passed
                        </span>
                      </div>
                      {result.criticalCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400">
                            {result.criticalCount} critical
                          </span>
                        </div>
                      )}
                      {result.warningCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-600 dark:text-orange-400">
                            {result.warningCount} warnings
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Auto-fix Banner */}
                    {autoFixableCount > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            {autoFixableCount} issues can be auto-fixed
                            {potentialScore > result.score && (
                              <span className="ml-1 font-medium">
                                (+{potentialScore - result.score} points)
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={handleAutoFixAll}
                          disabled={applying}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                        >
                          {applying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          Fix All
                        </button>
                      </div>
                    )}

                    {hasAppliedFixes && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        {appliedFixes.size} fixes applied
                      </div>
                    )}
                  </div>
                </div>

                {/* Issues Toggle */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {showDetails ? 'Hide' : 'Show'} Details ({result.issues.length} issues)
                  </span>
                  {showDetails ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Issues List */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SEOIssuesList
                        issues={result.issues.filter(i => !appliedFixes.has(i.ruleId))}
                        showAutoFix={true}
                        onAutoFix={handleSingleFix}
                        maxItems={5}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {result && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {result.score >= 75
                  ? 'Good to deploy!'
                  : result.score >= 50
                    ? 'Consider fixing critical issues before deploying'
                    : 'Many issues found - review before deploying'}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  <Rocket className="w-4 h-4" />
                  Deploy Anyway
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getGradeFromScore(score: number): SEOGrade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export default SEOPreDeployModal;
