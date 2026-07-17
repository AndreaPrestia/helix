# Context Engine

## Purpose
Define the normative behavior for context engine.

## Requirements

### Requirement: context manifests
The system MUST implement context manifests with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: deterministic selection
The system MUST implement deterministic selection with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: token budgeting
The system MUST implement token budgeting with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: priority and exclusion rules
The system MUST implement priority and exclusion rules with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: provenance
The system MUST implement provenance with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

## Non-goals
- Vendor-specific shortcuts in platform-neutral packages.
- Hidden mutable global state.
- Success results that conceal partial failure.
