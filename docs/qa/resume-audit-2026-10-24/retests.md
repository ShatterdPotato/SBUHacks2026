# Focused manual post-fix retests

All retests used the local visible UI in a separate hidden audit tab. The local provider key was an explicit dummy key. The expected rejection is configuration test data, not a claimed live outage. No paid/media/device access was attempted. Baseline ledger remains unchanged.

| ID | Related finding | Action | Observed | Status |
| --- | --- | --- | --- | --- |
| RT01 | E036 | Open help and inspect dialog heading reference | aria-labelledby=how-it-works-title; name=Your interview, rehearsed. | PASS |
| RT02 | E095 | Build with whitespace-only role | Studio displays General interview · Internship | PASS |
| RT03 | E110 | Submit five spaced CJK tokens and inspect report/export | Editor=5 words, report=5 words, JSON metrics.words=5 | PASS |
| RT04 | E109 | Enter emoji-only transcript | Editor now says 0 words, consistent with rubric | PASS |
| RT05 | Cosmetic labels | Inspect one-word editor/report | Both use 1 word | PASS |
| RT06 | E095 export | Download report after whitespace-role session | Exported role=General interview | PASS |
| RT07 | Cosmetic labels | Upload one-character TXT | Read successfully · 1 character | PASS |
| RT08 | Target role priority | Use Software Engineering Intern with ML-heavy resume | Broad role Software engineering while PyTorch experience tags remain | PASS |
| RT09 | Source consent | Switch from resume to Describe interview | Cloud consent reset=false | PASS |
| RT10 | E112 | Inspect prompt-only profile after switching source | Only Circuits tag; no hidden ML resume tags | PASS |
| RT11 | Binary TXT validation | Upload binary.txt after valid.txt | Actionable binary-character error; valid.txt and 4212 chars retained | PASS |
| RT12 | AI failure diagnosis | Build with explicit dummy-key local opt-in | Actionable provider-settings (400) banner; says resume was read successfully; upload valid.txt retained | PASS |
| RT13 | AI failure recovery | Click Use curated questions | Curated Practice mode studio opens for Software Engineering Intern, 01/03 | PASS |
| RT14 | Fallback state retention | Finish curated session then start fresh | valid.txt still present with 4212 read characters | PASS |

## Final follow-up availability

The browser surface became unavailable when the child agent resumed for two additional retests. These are blocked/unexecuted cases, not application failures or passing checks. The earlier 14 passing retests remain valid. No native Firefox window or user draft was touched.

| ID | Related finding | Action | Observed | Status |
| --- | --- | --- | --- | --- |
| RT15 | Context target-role priority | Empty Role; context Software engineering internship; upload valid ML-heavy TXT in resume mode; enable generic profile | NOT EXECUTED: prior IAB browser 2 unavailable; fresh browser inventory empty; fresh IAB tab creation unavailable. Expected broad role Software engineering. Parent may complete in its active browser. | BLOCKED |
| RT16 | Idempotent source selection | Enable generic cloud consent on a selected source, then click the same already-selected source tab | NOT EXECUTED for same unavailable browser surface. Expected consent to remain checked. Parent may complete in its active browser. | BLOCKED |
