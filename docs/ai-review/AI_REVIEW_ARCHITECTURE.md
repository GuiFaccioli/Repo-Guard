# AI Review Architecture

## 1. Purpose
RepoGuard already performs deterministic repository checks and produces safe findings.  
The AI Review layer is planned to transform those findings into a clearer educational explanation so users can quickly understand what matters and what to review first.

Core direction:
- Scanner finds evidence.
- Agent explains evidence.
- User understands what matters.

## 2. Architecture Overview
```text
GitHub Repository
-> RepoGuard Scanner
-> Safe Evidence Packet
-> AI Review Agent
-> Educational Report
```

Design boundary:
- Scanner remains deterministic and safety-first.
- Agent receives only sanitized evidence, never raw sensitive data.

## 3. Scanner Responsibility
The scanner should:
- inspect repository files using safe GitHub API access;
- detect deterministic patterns;
- collect safe evidence for each finding;
- mask secrets before evidence is returned;
- avoid returning full files;
- avoid executing code;
- avoid cloning repositories.

Current deterministic checks include:
- repository health checks;
- hardcoded secret detection;
- committed `.env` detection;
- SQL string concatenation detection;
- eval usage detection;
- permissive CORS detection.

## 4. AI Review Agent Responsibility
The future AI Review agent should:
- receive only the Safe Evidence Packet;
- explain findings in calm, practical language;
- group related findings by topic;
- suggest review priority;
- generate educational guidance;
- suggest concrete next steps;
- avoid inventing findings without evidence.

## 5. Safe Evidence Packet Contract
Example shape:

```json
{
  "repository": {
    "owner": "GuiFaccioli",
    "name": "FlowLogin",
    "defaultBranch": "main"
  },
  "scan": {
    "scanType": "green",
    "createdAt": "ISO_DATE"
  },
  "findings": [
    {
      "checkId": "permissive-cors",
      "category": "code-safety",
      "status": "fail",
      "title": "Permissive CORS configuration",
      "filePath": "backend/src/main.ts",
      "lineNumber": 23,
      "safeExcerpt": "app.use(cors({ origin: \"*\" }));",
      "githubFileUrl": "https://github.com/owner/repo/blob/main/backend/src/main.ts#L23",
      "recommendationKey": "explicit-cors-origins"
    }
  ]
}
```

Contract expectations:
- include only bounded, safe excerpts;
- include source navigation URL when safe and available;
- keep values deterministic and traceable to scanner evidence.

## 6. Data That Must Never Be Sent To The Agent
Never send:
- raw OAuth tokens;
- GitHub access tokens;
- client secrets;
- session secrets;
- full `.env` contents;
- unmasked hardcoded secrets;
- entire files;
- private payloads;
- auth headers;
- cookies.

## 7. AI Review Output Contract
Example shape:

```json
{
  "summary": "RepoGuard found 2 code safety signals that should be reviewed before production.",
  "topics": [
    {
      "title": "Review CORS configuration",
      "priority": "review before production",
      "evidenceCheckIds": ["permissive-cors"],
      "explanation": "...",
      "recommendedDirection": "...",
      "nextSteps": ["..."]
    }
  ]
}
```

Output expectations:
- every topic must reference evidence check IDs;
- explanations should be educational and non-alarmist;
- recommendations should be practical and actionable.

## 8. Safety Rules
The AI Review layer must enforce:
- no exploit payloads;
- no fearmongering;
- no offensive testing;
- no automatic code changes;
- no hallucinated findings;
- no raw secret display.

## 9. Future MCP Direction
MCP can later expose controlled tools such as:
- read safe scan result;
- read safe evidence packet;
- lookup internal check documentation;
- generate educational report.

MCP tools must not expose:
- GitHub token;
- raw repository files;
- `.env` contents;
- secrets.

## 10. Implementation Phases
Phase 1:
- document architecture and contracts.

Phase 2:
- add Safe Evidence Packet builder inside backend.

Phase 3:
- add AI Review service abstraction without real provider call.

Phase 4:
- add MCP/server tool layer or agent integration.

Phase 5:
- render AI Review report in frontend.

Phase 2 status (May 26, 2026):
- Safe Evidence Packet builder implemented in backend.
- AI Review Agent is still not implemented.
- MCP integration is still not implemented.

## 11. Open Questions
- Should AI Review be generated on every scan or only on demand?
- Should AI Review be cached?
- Should users be able to regenerate the report?
- Should reports be persisted later?
- Which model/provider should be used?
