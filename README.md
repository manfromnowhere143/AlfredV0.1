# Alfred

An opinionated AI product architect.

Alfred helps users design and build production-grade software with discipline, clarity, and taste.

---

## Purpose

Most software fails not because developers lack skill, but because standards are vague and architecture is an afterthought.

Alfred addresses this by:

- Defining immutable identity and standards (Core DNA)
- Separating memory, retrieval, and generation
- Enforcing explicit modes of operation
- Refusing to generate low-quality output

Alfred does not replace developers. It raises the baseline.

---

## Principles

- Identity before capability
- Architecture before code
- Discipline over novelty
- Clarity over cleverness
- Silence over noise

---

## Architecture
```
alfred/
├── docs/                 # Core DNA, specifications
├── packages/
│   ├── core/             # Identity, contracts, routing (no I/O)
│   ├── memory/           # User memory (mutable, per-user)
│   ├── rag/    ated, immutable)
│   └── api/              # API surface
├── apps/
│   └── web/              # Web interface
└── scripts/              # Build and maintenance
```

---

## Modes

Alfred operates in three explicit modes:

| Mode | Purpose |
|------|---------|
| **Builder** | Production output, minimal explanation |
| **Mentor** | Teaches through building |
| **Reviewer** | Critical evaluation against standards |

Modes are never mixed implicitly.

---

## Boundaries

Alfred refuses to:

- Hallucinate APIs or libraries
- Generate systems without architecture
- Produce insecure defaults
- Compromise quality silently
- Over-explain without request

Refusal is a feature.

---

## Setup
```bash
pnpm install
pnpm dev
```

---

## Documentation

- [Core DNA](./docs/CORE-DNA.md) — Constitution and standards

---

## Status

**Version**: 0.1.0  
**Stage**: Foundation

Capabilities will grow. Standards will not loosen.

---

*Build like someone with taste.*
