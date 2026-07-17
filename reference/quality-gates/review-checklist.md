# Pull Request Review Checklist

## Specification

- [ ] Approved OpenSpec identified.
- [ ] Requirement IDs linked.
- [ ] Task scope is atomic.
- [ ] No undocumented behaviour introduced.

## Architecture

- [ ] Package boundaries respected.
- [ ] No forbidden dependency introduced.
- [ ] ADR added for architectural decisions.

## Security

- [ ] No secrets or sensitive plaintext committed.
- [ ] Authentication and authorization cases reviewed.
- [ ] Cryptographic operations use approved providers and algorithms.

## Testing

- [ ] Acceptance criteria mapped to tests.
- [ ] Negative cases included.
- [ ] Integration or golden tests added where required.

## Delivery

- [ ] Documentation updated.
- [ ] Migrations are safe.
- [ ] Release and rollback implications documented.
