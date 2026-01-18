'use client';

/**
 * SEO Score Card Component
 *
 * Displays circular score visualization with grade.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { getGradeColor, getScoreDescription } from '@/lib/seo';
import type { SEOGrade } from '@/lib/seo/types';

interface SEOScoreCardProps {
  score: number;
  grade: SEOGrade;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  animated?: boolean;
}

export function SEOScoreCard({
  score,
  grade,
  size = 'md',
  showDescription = true,
  animated = true,
}: SEOScoreCardProps) {
  const gradeColor = getGradeColor(grade);
  const description = getScoreDescription(score);

  // Size configurations
  const sizes = {
    sm: { outer: 80, inner: 60, stroke: 6, fontSize: 'text-lg', gradeSize: 'text-xs' },
    md: { outer: 120, inner: 90, stroke: 8, fontSize: 'text-2xl', gradeSize: 'text-sm' },
    lg: { outer: 160, inner: 120, stroke: 10, fontSize: 'text-4xl', gradeSize: 'text-base' },
  };

  const config = sizes[size];
  const radius = (config.outer - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ScoreCircle = () => (
    <svg
      width={config.outer}
      height={config.outer}
      className="transform -rotate-90"
    >
      {/* Background circle */}
      <circle
        cx={config.outer / 2}
        cy={config.outer / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={config.stroke}
        fill="none"
        className="text-gray-200 dark:text-gray-700"
      />

      {/* Score circle */}
      <motion.circle
        cx={config.outer / 2}
        cy={config.outer / 2}
        r={radius}
        stroke={gradeColor}
        strokeWidth={config.stroke}
        fill="none"
        strokeLinecap="round"
        initial={animated ? { strokeDashoffset: circumference } : undefined}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          strokeDasharray: circumference,
        }}
      />
    </svg>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <ScoreCircle />

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold ${config.fontSize}`}
            style={{ color: gradeColor }}
            initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {score}
          </motion.span>
          <motion.span
            className={`font-medium ${config.gradeSize} text-gray-500 dark:text-gray-400`}
            initial={animated ? { opacity: 0 } : undefined}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            Grade: {grade}
          </motion.span>
        </div>
      </div>

      {showDescription && (
        <motion.p
          className="text-sm text-center text-gray-600 dark:text-gray-400 max-w-[200px]"
          initial={animated ? { opacity: 0, y: 10 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

interface SEOScoreBadgeProps {
  score: number;
  grade: SEOGrade;
}

export function SEOScoreBadge({ score, grade }: SEOScoreBadgeProps) {
  const gradeColor = getGradeColor(grade);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium"
      style={{
        backgroundColor: `${gradeColor}20`,
        color: gradeColor,
      }}
    >
      <span className="font-bold">{score}</span>
      <span className="text-xs opacity-80">({grade})</span>
    </div>
  );
}

interface SEOScoreMiniProps {
  score: number;
  grade: SEOGrade;
  label?: string;
}

export function SEOScoreMini({ score, grade, label }: SEOScoreMiniProps) {
  const gradeColor = getGradeColor(grade);

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          backgroundColor: `${gradeColor}20`,
          color: gradeColor,
        }}
      >
        {score}
      </div>
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
}

export default SEOScoreCard;
