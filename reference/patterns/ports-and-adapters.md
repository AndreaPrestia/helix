# Pattern — Ports and Adapters

Business and domain code depend on explicit ports. Infrastructure implements
those ports. This keeps core logic testable and prevents delivery frameworks
from leaking into the domain.
