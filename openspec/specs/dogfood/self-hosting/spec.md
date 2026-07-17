# Helix Self-hosting

## Purpose
Define the normative behavior for helix self-hosting.

## Requirements

### Requirement: Helix reads its own specs
The system MUST implement helix reads its own specs with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: Helix creates bounded plans
The system MUST implement helix creates bounded plans with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: Claude executes approved changes
The system MUST implement claude executes approved changes with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: review evidence is captured
The system MUST implement review evidence is captured with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: manual override remains possible
The system MUST implement manual override remains possible with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

## Non-goals
- Vendor-specific shortcuts in platform-neutral packages.
- Hidden mutable global state.
- Success results that conceal partial failure.
