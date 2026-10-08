# Website factual narration

Website narration is off by default. Preferences and Find anything (`Ctrl+Shift+F`) expose narration language, English and Hong Kong Cantonese voice choices, rate, pitch, Quiet narration, and Yield to a screen reader. These are live Material controls and persist in browser-local preferences and history.

The site owns a separate instance of the shared event narrator. Every event carries its category and separate English and Cantonese facts until speech is formatted. Ordinary categories debounce for 180 ms and have a 4-second cooldown. A queued ordinary line of the same category is superseded by the latest one. Errors bypass both limits and retain FIFO order. One utterance speaks at a time; Both finishes English before Cantonese. Playfulness styles each language without changing the error or recovery facts.

Voice choices come from the browser's actual speech-synthesis list and use stable `voiceURI` identities. Choose automatically is the default, preferring an installed local voice. Late `voiceschanged` enumeration refreshes the list. Beneath each picker, status identifies the voice in effect, an unavailable saved choice with its retained identity and fallback, missing matching voices, and network voices that cannot speak offline. Cantonese needs a Hong Kong locale; Mandarin is not a fallback. An unavailable voice leaves the written facts visible.

Browsers cannot reliably detect an active screen reader. **Yield to a screen reader** is an explicit persisted choice that cancels narration. **Quiet narration** independently pauses speech and cancels queued lines. These choices retain written messages. Disabling the narrator or removing the site component also cancels and releases its instance. The site does not claim to control an operating-system speech service.

Preference validation, local storage failures, vocabulary and appearance validation, presentation-unlock errors, schedule/external-source failures, and release checks report their factual failure with a next step where available. Error and warning messages remain visible until dismissed or replaced by the next message. A durable message collection is still unfinished.

Visitor-state JSON transfer now exports version 2: settings plus validated schedule, navigation, appearance, presentation, and attention records. Version 1 settings-only imports remain accepted. Version 2 restoration uses the existing presentation-unlock guard and adds a history snapshot; it does not import credentials, uploaded logo bytes, or vocabulary mappings. Other general export formats remain unfinished.

Checks distinguish real browser controls and actual voice-availability status from a controlled speech-synthesis adapter used to verify serialization, categories, failure facts, and late enumeration. Adapter results do not prove installed platform voices, audible quality, or screen-reader detection.
