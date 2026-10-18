# Build and review ignore rules

Open a local repository, then open **Ignore file builder** for that working tree. The builder edits its root `.gitignore`. Already tracked files remain tracked; this workflow never removes files or updates the index.

1. Search the bundled templates and select one to append its visible rules. Templates are editable examples, not a complete catalogue of every framework.
2. Build a filename, extension, directory or Git glob rule. **Reinclude with !** makes an exception; **Root only** anchors it at the repository root.
3. Search, edit, move or remove individual rules and comments. Order matters. A later exception cannot reinclude a file whose parent directory is excluded; include the parent first.
4. Enter up to 200 relative sample paths. The initial samples come from native Git and include tracked, untracked and ignored paths. The displayed sample count states the limit. End a hypothetical directory sample with `/`.
5. Select **Preview exact changes and matches**. Compare the complete current and proposed files, then inspect the native Git match, source and line for each sample. The preview includes relevant nested `.gitignore` files, repository excludes and global excludes. A match on a tracked file is explanatory only.
6. Select **Save reviewed .gitignore**. The review expires after five minutes and can be used once. A changed file, exclude source, sample kind or index requires another preview. **Refresh source, keep draft** loads current source state while retaining your proposed edits for comparison.

Each template, rule and match collection has an independent search field and adjacent regular-expression workbench. Plain text is the default. Invalid expressions report an error instead of selecting unexpected entries.

Existing comments, unchanged line endings, blank lines and a missing final newline survive an unchanged edit. Appended rules use the existing CRLF convention when consistent, otherwise LF. Moving a final line into the middle necessarily inserts a separator. Only valid UTF-8 files up to 256 KiB and 4000 proposed lines are supported. The preview reads at most 400 relevant ignore sources and 2 MiB of combined ignore text. Larger inputs remain unchanged.

The native service accepts an opaque working-tree grant, never a renderer-supplied filesystem root. Symbolic-link targets and sample ancestor escapes are rejected. Preview copies are temporary and do not change the working file. Save writes an exclusive temporary file beside the target, flushes it, revalidates the sources, atomically renames it and verifies the result. The application host serializes this save with its other repository mutations.

The component integration test exercises the real renderer and native Git through an isolated local fixture. Application IPC, tab ownership, Windows filesystem behavior and installer acceptance require separate built-application evidence.
