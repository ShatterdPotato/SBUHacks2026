# Manual browser edge-case audit (subagent)

Date: October 24, 2026. Baseline source: Cadence after handoff main 6acc2d1, before root agent fixes.

125 distinct UI checks recorded. These are edge-case checks across testing families, not 125 independent testing methodologies.

Results: {"PASS":118,"LIMITATION":3,"FAIL":4}. IDs are unique: true.

The first defaults checks used the existing deployed Site; the remainder used http://127.0.0.1:5173/ in my dedicated hidden tab. All inputs were fictional. No camera/microphone permissions were granted. One intentional dummy-key provider failure was checked and is not an application defect. No HTTP/API scripts, injected state mutations, or headless test harnesses were used. Read-only DOM inspections supported visible UI actions.

## Confirmed baseline findings

- E036: Help dialog lacks aria-label/aria-labelledby, leaving it unnamed for assistive technology.
- E095: A whitespace-only Role produces a blank studio/report subtitle instead of General interview; exported role also needs normalization.
- E110 (related E109): Editor word counter uses whitespace chunks while rubric counts ASCII words. Five spaced CJK tokens display as five words, then report as zero and unscored. This is counter consistency/i18n behavior, not a claim that semantic Chinese evaluation is supported.
- E112: Hidden resume remains active after selecting Describe your interview. It contributes 24 ML/software topic tags and an AI/ML broad role despite a visible prompt about circuits only. No remove-file control is visible, and prior cloud consent remains true. The test did not send personal data or invoke cloud generation. Root should inspect full fictional-text routing for the same invisible-source problem.
- Cosmetic note observed in E115/E079: labels use 1 characters and 1 words.

## Qualified checks

E014: CUA fill() can bypass native maxlength; E018 separately verified actual keyboard enforcement, and E016 verified safe application rejection. E039: last-control Tab wrapping was not determined because browser-chrome focus returned a null label. E109: emoji-only input was correctly unscored, but its editor/rubric counters differ.

## Case ledger

| ID | Area | Action | Expected | Observed | Status |
| --- | --- | --- | --- | --- | --- |
| E001 | Defaults | Open setup | Setup renders | Heading and build control visible | PASS |
| E002 | Defaults | Inspect session mode | Personal selected | My real experience aria-pressed=true | PASS |
| E003 | Consent | Inspect initial cloud checkbox | Opt-in unchecked | Unchecked | PASS |
| E004 | Defaults | Inspect role | Empty | Empty | PASS |
| E005 | Defaults | Inspect context | Empty | Empty | PASS |
| E006 | Defaults | Inspect level | Internship | Internship | PASS |
| E007 | Defaults | Inspect count | 4 | 4 | PASS |
| E008 | Defaults | Inspect focus | Mixed only selected | Mixed true; others false | PASS |
| E009 | Navigation | Inspect studio navigation | Disabled before questions | Disabled | PASS |
| E010 | Navigation | Inspect report navigation | Disabled before answers | Disabled | PASS |
| E011 | Optional inputs | Inspect build without resume | Allowed | Build enabled | PASS |
| E012 | Error state | Inspect initial alerts | None | 0 alerts | PASS |
| E013 | Role boundary | Enter one-character role | Retain P | value=P, length=1 | PASS |
| E014 | Role boundary | Fill 161 characters | UI/logic must handle overlimit safely | fill() can bypass maxlength; native behavior to be checked | LIMITATION |
| E015 | Injection | Enter script-looking role | Literal input; no execution | Literal value displayed, no dialog | PASS |
| E016 | Defensive validation | Fill 161-character role then Build | Safe explicit error | Role must be text of at most 160 characters.; no navigation | PASS |
| E017 | Recovery | Dismiss role validation error | Alert clears | 0 alerts | PASS |
| E018 | Native boundary | Type y after a 160-character role | Native maxlength blocks extra character | 160 characters, no trailing y | PASS |
| E019 | Unicode | Enter accented/Greek/emoji role | Preserve text | Exact Unicode text retained | PASS |
| E020 | Input normalization | Paste newline into single-line role | No multiline control state | AIML retained without newline | PASS |
| E021 | Context input | Enter blank lines in context | Preserve paragraph breaks | Exact multiline value retained | PASS |
| E022 | Native boundary | Type after 18,000 context characters | Block extra character | 18000 chars; no trailing y | PASS |
| E023 | Select controls | Choose Entry level | Selected Entry level | Entry level | PASS |
| E024 | Select controls | Choose Experienced | Selected Experienced | Experienced | PASS |
| E025 | Select controls | Return to Internship | Selected Internship | Internship | PASS |
| E026 | Session length | Choose 3 | Selected 3 | 3 | PASS |
| E027 | Session length | Choose 5 | Selected 5 | 5 | PASS |
| E028 | Session length | Choose 6 | Selected 6 | 6 | PASS |
| E029 | Session length | Return to 4 | Selected 4 | 4 in unchanged AX state | PASS |
| E030 | Focus selection | Choose Behavioral | Only Behavioral selected | Behavioral true; Mixed and Technical false | PASS |
| E031 | Focus selection | Choose Technical | Only Technical selected | Technical true; others false | PASS |
| E032 | Focus selection | Return to Mixed | Only Mixed selected | Mixed true; others false | PASS |
| E033 | Draft state | Switch prompt to resume with text entered | Retain role and context | AI/ML Intern and fictional draft retained | PASS |
| E034 | Draft state | Return resume tab to prompt | Retain context | Fictional draft: Python PyTorch SQL. retained | PASS |
| E035 | Help | Open See how it works | Modal visible | Help modal opened | PASS |
| E036 | Accessibility | Inspect help dialog accessible name | Dialog named by heading | No aria-label or aria-labelledby; unnamed AX container | FAIL |
| E037 | Accessibility | Inspect initial modal focus | Focus close control | Close explanation focused | PASS |
| E038 | Keyboard | Tab from modal close | Focus primary modal action | Let’s practice focused | PASS |
| E039 | Keyboard | Tab from last modal action | Focus remains/traps in modal | Active element label null; browser-chrome focus behavior not determined | LIMITATION |
| E040 | Help recovery | Close via close control | Close and restore trigger focus | Modal false; See how it works focused | PASS |
| E041 | Help recovery | Open How it works then Escape | Close and restore trigger focus | How it works focused after Escape | PASS |
| E042 | Consent preview | Enable personal cloud opt-in | Show only generic role/topics and clear disclosure | AI/ML engineering; Python SQL PyTorch; no personal-text promise | PASS |
| E043 | Topic controls | Exclude SQL | SQL aria-pressed=false | false | PASS |
| E044 | Topic controls | Reinclude SQL | SQL aria-pressed=true | true | PASS |
| E045 | Privacy UI | Add fictional contact/employer text | Do not expose those strings in shared topic list | Only Python SQL PyTorch displayed | PASS |
| E046 | Topic boundary | Exclude every detected skill | Show empty-topic fallback | No skill tags selected message visible | PASS |
| E047 | Empty profile | Clear role and context with preview open | General role and no tags | General interview; empty-topic message | PASS |
| E048 | Role taxonomy | Enter electrical/embedded context | Electrical role and fixed electrical topics | Electrical engineering; Circuits, Embedded systems | PASS |
| E049 | Consent reset | Switch personal to fictional after opt-in | Reset cloud consent and explain full-text route | Unchecked; fictional full-text disclosure | PASS |
| E050 | Consent UI | Enable fictional full-text opt-in | Checked fictional consent; no generic preview | Checked=true, generic preview absent | PASS |
| E051 | Consent reset | Switch fictional to personal | Reset consent false | false | PASS |
| E052 | Keyboard | Space on cloud checkbox | Toggle consent | true | PASS |
| E053 | Provider recovery | Build with explicit dummy-key local opt-in | Safe upstream error, no invented AI questions | The AI service could not process this request; stayed setup | PASS |
| E054 | Provider recovery | Inspect draft after upstream error | Retain role/context | Electrical engineering intern and fictional electrical context retained | PASS |
| E055 | Provider recovery | Inspect busy state after rejection | Build enabled again | Build enabled | PASS |
| E056 | Fallback | Disable AI after error and Build | Local studio opens | Practice mode studio opened | PASS |
| E057 | Recovery | Inspect error after successful retry | Prior alert cleared | No alert in studio | PASS |
| E058 | Configured session | Build three Technical EE questions | Count/focus and role-relevant question | 01/03 Technical; circuit question | PASS |
| E059 | Privacy wording | Inspect personal local transcript notice | Identify browser rubric, no AI analysis | Explicit browser rubric notice | PASS |
| E060 | Media safety | Inspect initial media state | Off and consent unchecked | Camera & mic off; unchecked; enable disabled | PASS |
| E061 | Navigation guard | Inspect New practice in studio | Disabled during active session | Disabled | PASS |
| E062 | Navigation guard | Inspect report in studio | Disabled until report | Disabled | PASS |
| E063 | Media consent | Check recording consent without enabling device | Enable button becomes available only | Enabled; no hardware access requested | PASS |
| E064 | Media consent | Withdraw recording consent | Disable enable button | Disabled | PASS |
| E065 | Text mode | Choose text answers | Show writing UI and keep devices off | Text UI visible; devices off | PASS |
| E066 | Answer boundary | Enter whitespace-only transcript | Save disabled; skip enabled | Save false, skip true | PASS |
| E067 | Short answer | Enter one-character transcript | Can save as insufficient evidence; cannot skip populated answer | Save true, skip false | PASS |
| E068 | Answer state | Save one-character first answer | Advance and clear transcript | Advanced to Q2; empty transcript | PASS |
| E069 | Native boundary | Type after 20,000 transcript chars | Block extra character | 20000 chars; no trailing z | PASS |
| E070 | Long-answer recovery | Save 20,000-char local answer | Advance without failure | Advanced to Q3; transcript cleared | PASS |
| E071 | Injection | Submit script/img-looking answer | Render literal; no script execution | No JS dialog; 0 script/img nodes in report | PASS |
| E072 | Insufficient evidence | Inspect saved one-char answer | Unscored | Q1 shows —/100 | PASS |
| E073 | Missing evidence | Inspect text-only confidence | Unavailable | Confidence unavailable | PASS |
| E074 | Missing recordings | Inspect text-only clip panels | No fabricated best/worst video | Both empty-state instructions | PASS |
| E075 | Session integrity | Finish 3-question session | Three answer entries | 3 answers and three details | PASS |
| E076 | Score safety | Inspect local aggregate scores | Finite numbers; no NaN | Overall 52, content 60, comprehension 43 | PASS |
| E077 | Scoring limits | Inspect rubric disclosure | Clearly heuristic | Cannot establish correctness/comprehension disclaimer | PASS |
| E078 | Navigation recovery | Inspect report navigation | New practice enabled; studio disabled | Observed enabled/disabled states | PASS |
| E079 | Details | Expand short-answer entry | Explain missing evidence | Not enough transcript evidence; P transcript retained | PASS |
| E080 | Report security | Expand markup-like answer | Escaped literal transcript/evidence | Script/img syntax shown as text | PASS |
| E081 | Metric correctness | Inspect five filler phrases | Count um, uh, you know, kind of, sort of | 5 filler phrases | PASS |
| E082 | Metric limits | Inspect text-only pace | Unavailable | Pace unavailable | PASS |
| E083 | Long text integrity | Expand 20,000-char answer | Retain complete transcript | DOM text length 20000 | PASS |
| E084 | Details independence | Open three answer details | Independent expansion | 3 details open | PASS |
| E085 | Keyboard details | Press Enter on expanded first summary | Collapse detail | open attribute null | PASS |
| E086 | Pointer details | Click expanded long/markup summaries | Collapse without altering report | Both details collapsed | PASS |
| E087 | Download | Click Download report | Actual JSON file downloaded | cadence-interview-report (1).json saved | PASS |
| E088 | Export schema | Open downloaded JSON | Valid Cadence demo report | JSON parsed; product Cadence, mode demo, six top-level fields | PASS |
| E089 | Export integrity | Inspect answer lengths | Preserve all transcripts | 1, 20000, 144 characters; 3 answers | PASS |
| E090 | Export privacy | Inspect answer URL fields | Exclude transient Blob URLs | No answer has url field | PASS |
| E091 | Export nulls | Inspect missing confidence | Preserve nulls, not invented scores | All confidence values null | PASS |
| E092 | Export clips | Inspect absent clip indices | Best and worst null | Both null | PASS |
| E093 | Reset safety | Start fresh after report | Clear report/session and cloud consent | Setup, report disabled, cloud false | PASS |
| E094 | Reset settings | Inspect setup after reset | Preserve visible reusable settings | Role/context/count/focus retained visibly | PASS |
| E095 | Whitespace role | Build with three spaces as role | Show General interview fallback | Studio subtitle is spaces + dot Internship | FAIL |
| E096 | Maximum session | Build six-question session | Progress denominator 06 | 01 / 06 | PASS |
| E097 | Configured focus | Build Behavioral-only session | Behavioral question category | Behavioral at Q1 | PASS |
| E098 | Skip progression | Skip first of six | Advance once | 02/06 | PASS |
| E099 | Skip progression | Skip through middle questions | Maintain progress | 05/06 | PASS |
| E100 | Final boundary | Reach last of six | Last progress and configured category correct | 06/06 Behavioral | PASS |
| E101 | Question uniqueness | Collect six prompts through UI | Six distinct prompts | Set size=6 | PASS |
| E102 | All missing scores | Skip all six answers | Overall and dimensions unavailable, never NaN | All unavailable; Not enough answer evidence | PASS |
| E103 | All-skipped session | Inspect report answer count | Six unscored entries | 6 answers, every summary —/100 | PASS |
| E104 | Skipped details | Expand a skipped answer | Explicit no-transcript placeholder | Question skipped. No transcript submitted. | PASS |
| E105 | Empty role | Build with genuinely empty role | General interview display fallback | General interview · Internship | PASS |
| E106 | Four-question configuration | Build Mixed with four questions | 01/04 and mixed route | 01/04; behavioral first, technical later | PASS |
| E107 | Minimum evidence | Submit exactly four Latin words | Unscored below five-word threshold | Q1 —/100 | PASS |
| E108 | Minimum evidence | Submit exactly five Latin words | Local rubric can score | Q2 36/100 | PASS |
| E109 | Emoji input | Submit three emoji tokens | No invented answer evidence | Unscored; editor says 3 words while rubric says 0 | LIMITATION |
| E110 | Word count consistency | Submit five spaced CJK tokens | Editor/report use a consistent word definition | Editor 5 words; report 0 words and unscored | FAIL |
| E111 | TXT upload | Upload valid fictional TXT | Read and show editable text | valid.txt accepted, 4212 characters | PASS |
| E112 | Active source | Switch loaded resume to Describe interview and enter only circuits | Ignore or clearly disclose inactive resume source | Hidden resume still supplies 24 unrelated ML tags; no remove control; consent true | FAIL |
| E113 | TXT validation | Upload empty.txt | Reject with actionable error | This file is empty | PASS |
| E114 | TXT validation | Upload whitespace.txt | Reject whitespace-only content | This file is empty | PASS |
| E115 | TXT lower boundary | Upload one-character TXT | Accept non-empty text without crash | Accepted; 1 characters label (cosmetic plural issue) | PASS |
| E116 | TXT upper boundary | Upload exactly 18000 chars | Accept exact limit | 18000 read successfully | PASS |
| E117 | TXT overflow/recovery | Upload 18001 chars after valid file | Reject; retain prior valid resume visibly | Limit error; exact-18000.txt retained | PASS |
| E118 | Extension case | Upload UPPER.TXT after error | Case-insensitive accept and clear error | UPPER.TXT accepted | PASS |
| E119 | Text encoding | Upload Unicode TXT | Preserve accented/Greek/CJK/emoji text | Exact fictional text retained | PASS |
| E120 | Text encoding | Upload UTF-16 fixture | Readable text or actionable rejection | Decoded readable Jordan/Python text | PASS |
| E121 | Text encoding | Upload UTF-8 BOM fixture | No leading BOM in editable text | First code point 70 (F), readable text | PASS |
| E122 | TXT injection safety | Upload script/img-looking TXT and open preview | Literal editable text, no code execution | No JS dialog; no injected script/img nodes | PASS |
| E123 | Filename layout | Upload 189-character filename | No document horizontal overflow | viewport1280; document1265; upload451.9px | PASS |
| E124 | Preview editing | Edit extracted resume after opting in | Retain edit and withdraw cloud consent | Text changed to fictional Python/SQL; consent=false; maxlength18000 | PASS |
| E125 | Resume removal | Remove selected resume | Clear file/preview and withdraw consent | Drop zone restored, preview count0, consent=false | PASS |

## Artifacts

edge-case-ledger.json contains the machine-readable ledger. sample-export.json is an actual UI-downloaded report with fictional transcripts. fixtures/ contains generated fictional files; only the files named in executed cases were tested by this subagent. PDF boundary files were handed to the root agent and are not counted as my completed checks. All fixes and post-fix retests are owned by the root agent.
