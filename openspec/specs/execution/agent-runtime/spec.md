# Agent Runtime

## Purpose
Define the normative behavior for agent runtime.

## Requirements

### Requirement: execution sessions
The system MUST implement execution sessions with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: tool permissions
The system MUST implement tool permissions with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: checkpointing
The system MUST implement checkpointing with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: cancellation
The system MUST implement cancellation with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: artifact capture
The system MUST implement artifact capture with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

## Non-goals
- Vendor-specific shortcuts in platform-neutral packages.
- Hidden mutable global state.
- Success results that conceal partial failure.
