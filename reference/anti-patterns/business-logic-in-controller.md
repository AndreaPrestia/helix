# Anti-Pattern — Business Logic in Controllers

## Detection

Controllers calculate domain outcomes, mutate aggregates directly or contain
branching business rules.

## Why it is prohibited

It couples behaviour to transport, weakens tests and prevents reuse.

## Correction

Move behaviour to domain or application services and keep the controller as a
validation and presentation adapter.
