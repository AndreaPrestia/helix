import { createHash } from 'node:crypto';
import { type Result, err, ok } from '@helix/core';
import { PlanValidationError } from './errors.js';
import {
  type Plan,
  type PlanInput,
  type PlannedStep,
  type RiskLevel,
  isRiskLevel,
  riskSeverity,
} from './model.js';

/**
 * Builds a validated, deterministic execution plan from decomposed tasks. It
 * validates the dependency graph (acyclic, known references), matches steps to
 * available capabilities, annotates risk, orders steps by a deterministic
 * topological sort, and derives a stable content id (Constitution Article 3).
 * Every validation problem is reported together (Article 7).
 */
export class ExecutionPlanner {
  plan(input: PlanInput): Result<Plan, PlanValidationError> {
    const issues: string[] = [];

    if (input.goal.trim() === '') {
      issues.push('goal must be a non-empty string');
    }

    const byId = new Map<string, PlanStepView>();
    for (const step of input.steps) {
      if (byId.has(step.id)) {
        issues.push(`duplicate step id: ${step.id}`);
        continue;
      }
      if (step.description.trim() === '') {
        issues.push(`step ${step.id} description must be non-empty`);
      }
      if (step.requiredCapability.trim() === '') {
        issues.push(`step ${step.id} requiredCapability must be non-empty`);
      }
      if (!isRiskLevel(step.risk)) {
        issues.push(`step ${step.id} has invalid risk: ${String(step.risk)}`);
      }
      byId.set(step.id, {
        id: step.id,
        description: step.description,
        dependsOn: [...step.dependsOn],
        requiredCapability: step.requiredCapability,
        risk: step.risk,
      });
    }

    for (const step of byId.values()) {
      for (const dependency of step.dependsOn) {
        if (!byId.has(dependency)) {
          issues.push(`step ${step.id} depends on unknown step: ${dependency}`);
        }
      }
    }

    if (input.availableCapabilities !== undefined) {
      const available = new Set(input.availableCapabilities);
      for (const step of byId.values()) {
        if (step.requiredCapability.trim() !== '' && !available.has(step.requiredCapability)) {
          issues.push(`no capability match for step ${step.id}: ${step.requiredCapability}`);
        }
      }
    }

    if (issues.length > 0) {
      return err(new PlanValidationError(issues));
    }

    const order = topologicalOrder(byId);
    if (order === null) {
      return err(new PlanValidationError(['dependency cycle detected']));
    }

    const steps: PlannedStep[] = order.map((id) => {
      const step = byId.get(id);
      if (step === undefined) {
        throw new Error(`invariant: missing step ${id}`);
      }
      return step;
    });

    const requiredCapabilities = [...new Set(steps.map((s) => s.requiredCapability))].sort((a, b) =>
      a.localeCompare(b),
    );
    const overallRisk = highestRisk(steps.map((s) => s.risk));
    const id = planId(input.goal, steps);

    return ok({ id, goal: input.goal, steps, order, requiredCapabilities, overallRisk });
  }
}

interface PlanStepView extends PlannedStep {
  readonly dependsOn: readonly string[];
}

/** Deterministic Kahn topological sort: ties are broken by ascending id. */
function topologicalOrder(byId: Map<string, PlanStepView>): string[] | null {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const id of byId.keys()) {
    inDegree.set(id, 0);
  }
  for (const step of byId.values()) {
    for (const dependency of step.dependsOn) {
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
      const list = dependents.get(dependency) ?? [];
      list.push(step.id);
      dependents.set(dependency, list);
    }
  }

  const order: string[] = [];
  const available = [...byId.keys()].filter((id) => (inDegree.get(id) ?? 0) === 0).sort();

  while (available.length > 0) {
    const current = available.shift();
    if (current === undefined) {
      break;
    }
    order.push(current);
    for (const dependent of (dependents.get(current) ?? []).sort()) {
      const next = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, next);
      if (next === 0) {
        available.push(dependent);
        available.sort();
      }
    }
  }

  return order.length === byId.size ? order : null;
}

function highestRisk(risks: readonly RiskLevel[]): RiskLevel {
  let highest: RiskLevel = 'low';
  for (const risk of risks) {
    if (riskSeverity(risk) > riskSeverity(highest)) {
      highest = risk;
    }
  }
  return highest;
}

function planId(goal: string, steps: readonly PlannedStep[]): string {
  const canonical = JSON.stringify({
    goal,
    steps: steps.map((step) => ({
      id: step.id,
      description: step.description,
      dependsOn: step.dependsOn,
      requiredCapability: step.requiredCapability,
      risk: step.risk,
    })),
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
