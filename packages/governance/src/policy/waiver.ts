/**
 * An explicit, auditable waiver for a denied policy. Waivers must record who
 * approved them and why, so denials are never silently bypassed (Constitution
 * Article 8).
 */
export interface Waiver {
  readonly policyId: string;
  readonly reason: string;
  readonly approvedBy: string;
}

/** A waiver is valid only when it names an approver and a non-empty reason. */
export function isValidWaiver(waiver: Waiver): boolean {
  return waiver.reason.trim() !== '' && waiver.approvedBy.trim() !== '';
}
