# Maintainability lint report

The additional rules are enabled as errors for all linted JavaScript and TypeScript files, including tests and configuration. Thresholds and official ESLint documentation are listed in README.md. Line limits exclude blank lines and comment-only lines.

Adding these limits exposes existing structural issues. Application behavior and public signatures were preserved; no structural refactor or rule suppression was used to conceal violations. The spacing rule was extracted into eslint-function-spacing.mjs so the configuration itself meets the file-length limit.

The current lint run reports **67 errors across 27 files**. Both ESLint configuration modules pass the new rules. Whole-project Prettier verification passes. Boundary checks cover all seven added rules and verify the extracted spacing rule. Production builds and commits touching affected files will fail linting until the reported issues are addressed.

| Rule                   | Existing violations |
| ---------------------- | ------------------: |
| max-lines              |                  24 |
| max-params             |                   4 |
| max-lines-per-function |                  19 |
| max-depth              |                   9 |
| complexity             |                  11 |
| max-nested-callbacks   |                   0 |
| no-else-return         |                   0 |

## Current violations

| File and line                                        | Rule                   | Finding                                                                                 |
| ---------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| **tests**/integration/chat.test.ts:106               | max-lines              | File has too many lines (206). Maximum allowed is 100.                                  |
| **tests**/integration/transcribe.test.ts:108         | max-lines              | File has too many lines (118). Maximum allowed is 100.                                  |
| **tests**/unit/api-client.test.ts:110                | max-lines              | File has too many lines (116). Maximum allowed is 100.                                  |
| **tests**/unit/correct.test.ts:5                     | max-lines-per-function | Arrow function has too many lines (53). Maximum allowed is 50.                          |
| **tests**/unit/page.test.tsx:108                     | max-lines              | File has too many lines (257). Maximum allowed is 100.                                  |
| **tests**/unit/recorded-recognition.test.ts:112      | max-lines              | File has too many lines (290). Maximum allowed is 100.                                  |
| **tests**/unit/refactor-characterization.test.ts:110 | max-lines              | File has too many lines (227). Maximum allowed is 100.                                  |
| **tests**/unit/voice-call.test.tsx:114               | max-lines              | File has too many lines (318). Maximum allowed is 100.                                  |
| eval/run.ts:34                                       | max-lines-per-function | Async function 'main' has too many lines (162). Maximum allowed is 50.                  |
| eval/run.ts:34                                       | complexity             | Async function 'main' has a complexity of 20. Maximum allowed is 10.                    |
| eval/run.ts:84                                       | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| eval/run.ts:96                                       | max-depth              | Blocks are nested too deeply (4). Maximum allowed is 2.                                 |
| eval/run.ts:105                                      | max-lines              | File has too many lines (197). Maximum allowed is 100.                                  |
| src/app/page.tsx:43                                  | max-lines-per-function | Function 'Page' has too many lines (422). Maximum allowed is 50.                        |
| src/app/page.tsx:114                                 | max-lines              | File has too many lines (460). Maximum allowed is 100.                                  |
| src/app/page.tsx:328                                 | complexity             | Async function 'sendMessage' has a complexity of 16. Maximum allowed is 10.             |
| src/app/page.tsx:383                                 | max-lines-per-function | Function 'renderChatContent' has too many lines (71). Maximum allowed is 50.            |
| src/components/ui/chat/ChatHeader.tsx:12             | max-lines-per-function | Function 'ChatHeader' has too many lines (67). Maximum allowed is 50.                   |
| src/components/ui/chat/ChatInput.tsx:15              | max-lines-per-function | Function 'ChatInput' has too many lines (103). Maximum allowed is 50.                   |
| src/components/ui/chat/ChatInput.tsx:107             | max-lines              | File has too many lines (115). Maximum allowed is 100.                                  |
| src/components/ui/chat/ConversationWelcome.tsx:28    | max-lines-per-function | Function 'ConversationWelcome' has too many lines (52). Maximum allowed is 50.          |
| src/components/ui/chat/Message.tsx:17                | max-lines-per-function | Function 'Message' has too many lines (194). Maximum allowed is 50.                     |
| src/components/ui/chat/Message.tsx:17                | complexity             | Function 'Message' has a complexity of 21. Maximum allowed is 10.                       |
| src/components/ui/chat/Message.tsx:114               | max-lines              | File has too many lines (208). Maximum allowed is 100.                                  |
| src/components/ui/panels/PracticePanel.tsx:21        | max-lines-per-function | Function 'PracticePanel' has too many lines (254). Maximum allowed is 50.               |
| src/components/ui/panels/PracticePanel.tsx:21        | complexity             | Function 'PracticePanel' has a complexity of 23. Maximum allowed is 10.                 |
| src/components/ui/panels/PracticePanel.tsx:63        | complexity             | Async function 'submit' has a complexity of 11. Maximum allowed is 10.                  |
| src/components/ui/panels/PracticePanel.tsx:109       | max-lines              | File has too many lines (271). Maximum allowed is 100.                                  |
| src/components/ui/panels/ReviewDialog.tsx:24         | max-lines-per-function | Function 'ReviewCard' has too many lines (103). Maximum allowed is 50.                  |
| src/components/ui/panels/ReviewDialog.tsx:24         | complexity             | Function 'ReviewCard' has a complexity of 15. Maximum allowed is 10.                    |
| src/components/ui/panels/ReviewDialog.tsx:107        | max-lines              | File has too many lines (215). Maximum allowed is 100.                                  |
| src/components/ui/panels/ReviewDialog.tsx:130        | max-lines-per-function | Function 'ReviewDialog' has too many lines (93). Maximum allowed is 50.                 |
| src/components/ui/states/EmptyState.tsx:11           | max-lines-per-function | Function 'EmptyState' has too many lines (102). Maximum allowed is 50.                  |
| src/components/ui/states/EmptyState.tsx:108          | max-lines              | File has too many lines (110). Maximum allowed is 100.                                  |
| src/components/ui/voice/VoiceCall.tsx:111            | max-lines              | File has too many lines (749). Maximum allowed is 100.                                  |
| src/components/ui/voice/VoiceCall.tsx:119            | max-lines-per-function | Function 'VoiceCall' has too many lines (642). Maximum allowed is 50.                   |
| src/components/ui/voice/VoiceCall.tsx:119            | complexity             | Function 'VoiceCall' has a complexity of 17. Maximum allowed is 10.                     |
| src/components/ui/voice/VoiceCall.tsx:244            | max-lines-per-function | Arrow function has too many lines (97). Maximum allowed is 50.                          |
| src/components/ui/voice/VoiceCall.tsx:361            | max-lines-per-function | Arrow function has too many lines (59). Maximum allowed is 50.                          |
| src/components/ui/voice/VoiceCall.tsx:361            | complexity             | Arrow function has a complexity of 11. Maximum allowed is 10.                           |
| src/components/ui/voice/VoiceCall.tsx:714            | max-lines-per-function | Arrow function has too many lines (61). Maximum allowed is 50.                          |
| src/components/ui/voice/VoiceCall.tsx:714            | complexity             | Arrow function has a complexity of 12. Maximum allowed is 10.                           |
| src/lib/chat/conversation.ts:122                     | max-lines              | File has too many lines (126). Maximum allowed is 100.                                  |
| src/lib/diff.ts:108                                  | max-lines              | File has too many lines (152). Maximum allowed is 100.                                  |
| src/lib/learning.ts:43                               | max-params             | Function 'createCard' has too many parameters (5). Maximum allowed is 4.                |
| src/lib/learning.ts:112                              | max-lines              | File has too many lines (103). Maximum allowed is 100.                                  |
| src/lib/review.ts:95                                 | max-params             | Function 'createVocabularyCards' has too many parameters (5). Maximum allowed is 4.     |
| src/lib/review.ts:114                                | max-lines              | File has too many lines (116). Maximum allowed is 100.                                  |
| src/lib/server/http.ts:57                            | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/http.ts:60                            | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/http.ts:64                            | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/http.ts:96                            | max-lines-per-function | Function 'guardedRoute' has too many lines (51). Maximum allowed is 50.                 |
| src/lib/server/http.ts:108                           | max-lines              | File has too many lines (151). Maximum allowed is 100.                                  |
| src/lib/server/limits.ts:68                          | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/limits.ts:110                         | max-lines              | File has too many lines (103). Maximum allowed is 100.                                  |
| src/lib/server/mistral.ts:55                         | max-params             | Async function 'complete' has too many parameters (5). Maximum allowed is 4.            |
| src/lib/server/mistral.ts:73                         | max-params             | Async function 'completeWithMetrics' has too many parameters (5). Maximum allowed is 4. |
| src/lib/server/mistral.ts:73                         | max-lines-per-function | Async function 'completeWithMetrics' has too many lines (79). Maximum allowed is 50.    |
| src/lib/server/mistral.ts:73                         | complexity             | Async function 'completeWithMetrics' has a complexity of 12. Maximum allowed is 10.     |
| src/lib/server/mistral.ts:114                        | max-lines              | File has too many lines (142). Maximum allowed is 100.                                  |
| src/lib/server/mistral.ts:123                        | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/mistral.ts:131                        | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/transcription.ts:23                   | max-lines-per-function | Async function 'transcribeRecording' has too many lines (88). Maximum allowed is 50.    |
| src/lib/server/transcription.ts:23                   | complexity             | Async function 'transcribeRecording' has a complexity of 12. Maximum allowed is 10.     |
| src/lib/server/transcription.ts:78                   | max-depth              | Blocks are nested too deeply (3). Maximum allowed is 2.                                 |
| src/lib/server/transcription.ts:110                  | max-lines              | File has too many lines (107). Maximum allowed is 100.                                  |
| src/lib/voice/recognition.ts:112                     | max-lines              | File has too many lines (264). Maximum allowed is 100.                                  |

Regenerate the diagnostics with `pnpm exec eslint . --format json`; use `pnpm lint` for a readable listing. The four max-params violations involve existing public functions with five parameters, so resolving them requires a separate API-preserving design decision.
