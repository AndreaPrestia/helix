# Domain State Machines

- Specification: `draft → review → approved → implemented → superseded → archived`
- Requirement: `proposed → approved → implemented → verified → deprecated`
- Task: `draft → ready → in_progress → blocked → review → completed`
- Project: `draft → active → maintenance → archived`
- Context Manifest: `draft → validated → active → deprecated`

Transitions are explicit domain operations. Direct state mutation is prohibited.
