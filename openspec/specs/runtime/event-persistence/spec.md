# Event Persistence

## Purpose
Define the normative behavior for event persistence.

## Requirements

### Requirement: event store port
The system MUST implement event store port with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: optimistic concurrency
The system MUST implement optimistic concurrency with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: atomic multi-stream append
The system MUST implement atomic multi-stream append with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: JSONL adapter
The system MUST implement jsonl adapter with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: recovery and corruption handling
The system MUST implement recovery and corruption handling with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

## Non-goals
- Vendor-specific shortcuts in platform-neutral packages.
- Hidden mutable global state.
- Success results that conceal partial failure.
