# Website time awareness and inactivity prompts

The documentation website has its own visitor preferences. Time awareness and Momentum are independent, off by default, and searchable from Preferences and Find anything (`Ctrl+Shift+F`). They use registered Material switches and buttons. Desktop preferences remain separate.

Time awareness shows minutes on the current visit and minutes since the last page, article, or saved preference change. It updates every 30 seconds. Moving the pointer, scrolling, searching, and receiving release metadata do not reset the change timer. Reload starts a new visit while preserving the last change time. A clock moving backwards produces zero elapsed minutes until it catches up.

Momentum shows a factual, non-blocking prompt after 15 minutes without a page or preference change. It does not count completed steps, score reading, move focus, or choose a task. **Not now: pause for 1 hour** keeps the prompt quiet for one full hour, including after reload and intervening changes. **Dismiss until the next change** dismisses this inactivity episode; a later real change starts another 15-minute wait. The Current task text remains the visitor's choice.

Both modes retain their settings in browser-local storage. Pause and dismiss actions create preference-history snapshots; those snapshots can be restored and are included in the existing visitor-state JSON export/import. Changing these choices in another same-origin browser tab refreshes the local state. If storage is unavailable, a notice states that changes last only for this visit. No pointer activity, browsing score, or task text is sent to a service. The exported state continues to omit vocabulary payloads, uploaded images, and unlock credentials.

English, Cantonese, and bilingual presentation use the same timing facts. The two playfulness controls style the inactivity sentence without changing its number. The presentation lock forces English while retaining these accommodations. The website has no Kids mode. Low stimulation and reduced motion retain the factual time text and actionable inactivity prompt.

Regression checks cover timing boundaries, persistence, dismissal, malformed records, clock rollback, and real Material-control interaction at a 320 px bilingual viewport with 200% text. These browser checks do not establish native desktop or operating-system behavior.
