import { type Result, err, ok } from '@helix/core';
import { TrustDeniedError } from './errors.js';

/** Plugin trust levels, from least to most trusted. */
export const trustLevels = ['untrusted', 'community', 'verified', 'first_party'] as const;
export type TrustLevel = (typeof trustLevels)[number];

function trustRank(level: TrustLevel): number {
  return trustLevels.indexOf(level);
}

/** A plugin presented for a trust evaluation (structurally decoupled from the SDK). */
export interface PluginDescriptor {
  readonly id: string;
  readonly trust: TrustLevel;
  readonly requestedPermissions: readonly string[];
}

/** A trust policy: the minimum acceptable trust and the permissions each level may hold. */
export interface TrustPolicy {
  readonly minimumTrust: TrustLevel;
  /** Permissions granted at each trust level (a level also inherits lower levels). */
  readonly permissionsByLevel: Readonly<Record<TrustLevel, readonly string[]>>;
}

/** The outcome of a successful trust evaluation. */
export interface GrantedTrust {
  readonly pluginId: string;
  readonly trust: TrustLevel;
  /** The subset of requested permissions granted at this trust level, sorted. */
  readonly grantedPermissions: readonly string[];
}

/**
 * Evaluates plugin trust deny-by-default: a plugin below the policy's minimum
 * trust is rejected outright, and any requested permission not allowed at the
 * plugin's trust level (including inherited lower levels) is denied. Nothing is
 * granted implicitly (Constitution Article 8).
 */
export class PluginTrustEvaluator {
  readonly #policy: TrustPolicy;

  constructor(policy: TrustPolicy) {
    this.#policy = policy;
  }

  #allowedAt(level: TrustLevel): ReadonlySet<string> {
    const allowed = new Set<string>();
    for (const candidate of trustLevels) {
      if (trustRank(candidate) <= trustRank(level)) {
        for (const permission of this.#policy.permissionsByLevel[candidate]) {
          allowed.add(permission);
        }
      }
    }
    return allowed;
  }

  evaluate(descriptor: PluginDescriptor): Result<GrantedTrust, TrustDeniedError> {
    const reasons: string[] = [];
    if (trustRank(descriptor.trust) < trustRank(this.#policy.minimumTrust)) {
      reasons.push(
        `trust "${descriptor.trust}" is below the minimum "${this.#policy.minimumTrust}"`,
      );
    }

    const allowed = this.#allowedAt(descriptor.trust);
    const denied = descriptor.requestedPermissions.filter((permission) => !allowed.has(permission));
    if (denied.length > 0) {
      reasons.push(
        `permissions not allowed at "${descriptor.trust}": ${[...denied].sort().join(', ')}`,
      );
    }

    if (reasons.length > 0) {
      return err(new TrustDeniedError(descriptor.id, reasons));
    }

    return ok({
      pluginId: descriptor.id,
      trust: descriptor.trust,
      grantedPermissions: [...descriptor.requestedPermissions].sort((a, b) => a.localeCompare(b)),
    });
  }
}
