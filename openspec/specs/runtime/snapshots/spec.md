# Snapshot Runtime

## Purpose
Define the normative behavior for snapshot runtime.

## Requirements

### Requirement: snapshot store port
The system MUST implement snapshot store port with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: optional optimization
The system MUST implement optional optimization with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: snapshot policies
The system MUST implement snapshot policies with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: fallback to full replay
The system MUST implement fallback to full replay with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

### Requirement: repair and rebuild
The system MUST implement repair and rebuild with explicit validation and tests.

#### Scenario: Accepted behavior
- **WHEN** the capability is invoked with valid input
- **THEN** the specified behavior is deterministic and observable

## Non-goals
- Vendor-specific shortcuts in platform-neutral packages.
- Hidden mutable global state.
- Success results that conceal partial failure.
