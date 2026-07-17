import type { DashboardSnapshot } from './model.js';

/**
 * A read-only source of daemon state for the dashboard. Decouples the dashboard
 * from any concrete daemon: the composition root adapts a live daemon (or a
 * persisted snapshot) to this port. The dashboard never mutates the source.
 */
export interface DashboardSource {
  snapshot(): DashboardSnapshot;
}
