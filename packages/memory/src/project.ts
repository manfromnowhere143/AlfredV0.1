/**
 * Project Memory
 *
 * Project-specific context and decisions.
 * Linked to user. Persists across sessions.
 */

import type {
  ProjectMemory,
  ProjectContext,
  ProjectDecision,
  ProjectConstraint,
  StackDefinition,
  ArchitectureSnapshot,
} from './types';

// ============================================================================
// PROJECT CREATION
// ============================================================================

export function createProject(
  userId: string,
  name: string,
  type: ProjectContext['type'] = 'web_app'
): ProjectMemory {
  const now = new Date();
  return {
    id: generateProjectId(),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    context: {
      type,
      stack: {},
    },
    decisions: [],
    constraints: [],
  };
}

function generateProjectId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

export function updateProjectContext(
  project: ProjectMemory,
  updates: Partial<ProjectContext>
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    context: {
      ...project.context,
      ...updates,
    },
  };
}

export function setProjectStack(
  project: ProjectMemory,
  stack: Partial<StackDefinition>
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    context: {
      ...project.context,
      stack: {
        ...project.context.stack,
        ...stack,
      },
    },
  };
}

export function setArchitectureSnapshot(
  project: ProjectMemory,
  snapshot: Omit<ArchitectureSnapshot, 'capturedAt'>
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    context: {
      ...project.context,
      architecture: {
        ...snapshot,
        capturedAt: new Date(),
      },
    },
  };
}

// ============================================================================
// DECISION TRACKING
// ============================================================================

export function addDecision(
  project: ProjectMemory,
  description: string,
  rationale: string,
  alternatives: string[] = [],
  confidence: number = 0.8
): ProjectMemory {
  const decision: ProjectDecision = {
    id: `decision_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    description,
    rationale,
    alternatives,
    madeAt: new Date(),
    confidence,
  };

  return {
    ...project,
    updatedAt: new Date(),
    decisions: [...project.decisions, decision],
  };
}

export function updateDecision(
  project: ProjectMemory,
  decisionId: string,
  updates: Partial<Omit<ProjectDecision, 'id' | 'madeAt'>>
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    decisions: project.decisions.map(d =>
      d.id === decisionId ? { ...d, ...updates } : d
    ),
  };
}

export function removeDecision(
  project: ProjectMemory,
  decisionId: string
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    decisions: project.decisions.filter(d => d.id !== decisionId),
  };
}

export function getDecisionsByConfidence(
  project: ProjectMemory,
  minConfidence: number = 0.7
): ProjectDecision[] {
  return project.decisions.filter(d => d.confidence >= minConfidence);
}

// ============================================================================
// CONSTRAINT MANAGEMENT
// ============================================================================

export function addConstraint(
  project: ProjectMemory,
  type: ProjectConstraint['type'],
  description: string,
  priority: 'hard' | 'soft' = 'soft'
): ProjectMemory {
  const constraint: ProjectConstraint = {
    id: `constraint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    description,
    priority,
    addedAt: new Date(),
  };

  return {
    ...project,
    updatedAt: new Date(),
    constraints: [...project.constraints, constraint],
  };
}

export function removeConstraint(
  project: ProjectMemory,
  constraintId: string
): ProjectMemory {
  return {
    ...project,
    updatedAt: new Date(),
    constraints: project.constraints.filter(c => c.id !== constraintId),
  };
}

export function getHardConstraints(project: ProjectMemory): ProjectConstraint[] {
  return project.constraints.filter(c => c.priority === 'hard');
}

export function getConstraintsByType(
  project: ProjectMemory,
  type: ProjectConstraint['type']
): ProjectConstraint[] {
  return project.constraints.filter(c => c.type === type);
}

// ============================================================================
// QUERIES
// ============================================================================

export function hasStack(project: ProjectMemory): boolean {
  const stack = project.context.stack;
  return !!(
    stack.frontend?.length ||
    stack.backend?.length ||
    stack.database?.length ||
    stack.infrastructure?.length
  );
}

export function hasArchitecture(project: ProjectMemory): boolean {
  return !!project.context.architecture;
}

export function getRecentDecisions(
  project: ProjectMemory,
  limit: number = 5
): ProjectDecision[] {
  return [...project.decisions]
    .sort((a, b) => b.madeAt.getTime() - a.madeAt.getTime())
    .slice(0, limit);
}

// ============================================================================
// SERIALIZATION
// ============================================================================

export function summarizeProject(project: ProjectMemory): string {
  const parts: string[] = [];
  
  parts.push(`Project: ${project.name} (${project.context.type})`);
  
  if (hasStack(project)) {
    const stack = project.context.stack;
    const stackParts: string[] = [];
    if (stack.frontend?.length) stackParts.push(`Frontend: ${stack.frontend.join(', ')}`);
    if (stack.backend?.length) stackParts.push(`Backend: ${stack.backend.join(', ')}`);
    if (stack.database?.length) stackParts.push(`Database: ${stack.database.join(', ')}`);
    parts.push(`Stack: ${stackParts.join(' | ')}`);
  }
  
  if (project.decisions.length > 0) {
    parts.push(`Decisions: ${project.decisions.length} recorded`);
  }
  
  if (project.constraints.length > 0) {
    const hard = getHardConstraints(project).length;
    parts.push(`Constraints: ${project.constraints.length} (${hard} hard)`);
  }
  
  return parts.join('\n');
}
