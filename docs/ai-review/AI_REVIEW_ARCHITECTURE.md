# AI Review and Didactic Evaluation Architecture

## Purpose

Describe the current deterministic explanation pipeline and its boundaries.

## Current implemented state

RepoGuard currently uses deterministic processing for both:
- repository scan didactic output (`didacticChecks` in OAuth repository flow), and
- URL-based safe evidence + deterministic AI-review-shaped topics.

No external LLM/provider call is required in the current implementation.

## Implemented pipeline

```text
Repository signals
-> deterministic checks
-> context inference
-> didactic classification (green/yellow/red)
-> evidence/source attachment
-> frontend educational report
```

For URL-based scan service:

```text
Repository URL
-> deterministic checklist scan
-> safe evidence packet (sanitized)
-> deterministic topic synthesis (aiReview)
```

## Safety boundaries

- No raw token/secret exposure.
- No full-file raw dumps in safe evidence output.
- Secret-like values are masked.
- No exploit generation.
- No offensive guidance.

## Contracts in use

### OAuth repository scan (`POST /repositories/:id/scans`)

Key fields:
- `scanType: "general"`
- `summary` (green/yellow/red counts)
- `context`
- `checks`
- `didacticChecks`
- `recommendations`

### URL scan (`POST /scans`)

Key fields:
- `selectedChecklists`
- `results`
- `evidencePacket`
- `aiReview` (deterministic)

## Open technical follow-ups

1. Improve contextual inference coverage for more repository archetypes.
2. Increase objective measurement of source density per argument.
3. Consider future provider integration only if it preserves current safety contract.
