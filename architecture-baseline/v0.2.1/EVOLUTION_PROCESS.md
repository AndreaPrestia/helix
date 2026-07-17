# Architecture Evolution Process

An ordinary implementation change cannot modify this baseline. Evolution requires:

1. an RFC explaining the problem, alternatives, consequences, compatibility, and migration;
2. one or more accepted ADRs;
3. architecture-test updates;
4. a new immutable directory such as `architecture-baseline/v0.3.0`;
5. migration changes identifying which specs move to the new baseline;
6. explicit user approval.

The agent may draft an RFC only when requested. It may never accept its own RFC or silently migrate active changes.
