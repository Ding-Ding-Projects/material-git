# Merge three local text files

In **Source control → Patches → Merge three files**, select the current, base and incoming files through the native file picker. The desktop runs Git's three-file merge on temporary copies, shows an editable result, and offers a separate reviewed save to a fresh file. This workflow does not merge a branch or stage the result automatically.

## Pick and inspect the inputs

1. Open the local repository through **Open repository**.
2. Open **Patches**, then **Merge three files**.
3. Use **Pick current file**, **Pick base file** and **Pick incoming file**. Current is your version, base is the common starting version, and incoming is the version to combine with it.
4. Use **Inspect input** to read each selected file before previewing.

Each input must be a regular UTF-8 text file, at most 2 MiB, without NUL bytes or recognized credentials. The interface receives a native grant and a filename rather than a renderer-supplied filesystem path. The native service hashes the original content and rejects a changed or expired selection. Pick the file again if that happens.

Previewing creates owned temporary copies and removes them afterward. The original inputs, repository HEAD, index and existing working files remain unchanged by the preview. User file contents are not persisted as ordinary history snapshots.

## Choose the conflict presentation

| Control | Choices and effect |
| --- | --- |
| Conflict style | **Merge markers** uses `merge`; **Include base** uses `diff3`; **Compact base context** uses `zdiff3`. |
| Conflict policy | **Keep conflicts** leaves unresolved sections; **Prefer current**, **Prefer incoming** or **Combine both** select Git's `ours`, `theirs` or `union` policy. Inspect the result even when a policy removes the markers. |
| Difference algorithm | Histogram, Myers, Minimal or Patience. Histogram is the default. |
| Marker length | An integer from 3 to 64; the default is 7. |

Press **Preview file merge** after choosing the options. Git's actual conflict count is displayed; `127+` means the reported count reached Git's cap. A conflict result is a valid preview, not a completed resolution. Edit **Merged result** to resolve it, or discard the result. After changing options, run the preview again to obtain a result for those options.

The result is limited to 2 MiB and expires after five minutes. Binary, invalid UTF-8 or recognized credential content requires a suitable protected editor instead of this workflow.

## Review and save a new file

1. Edit the preview and inspect the complete result.
2. Select **Review saving a new file**. The structured form carries the preview identifier, edited content and a suggested fresh filename.
3. Choose a new output filename. If conflict markers remain, resolve them or explicitly select **Allow saving unresolved conflict markers**. Removing markers alone does not establish that the content is correct.
4. Press **Review operation** and choose the output directory with the native folder picker.
5. Check the reviewed operation, then press **Apply reviewed operation**.

An existing destination is never overwritten. The native service checks the source hashes, repository snapshot and output parent again, and creates the new file with exclusive creation. A destination occupied after review, changed source, stale repository state, changed output directory or expired preview requires another review or preview. Git metadata directories are not valid destinations.

A review is single-use, and a successful save consumes its preview. Saving preserves the three originals, HEAD and index. If you choose an output folder inside the working tree, the new file can appear as an untracked change; saving does not add or commit it. Choose an external folder when you want a standalone result. A completed save clears the result's unsaved state in the desktop.

## Verification and platform limits

The source implementation was introduced in `55bfbd0`. `tests/git-advanced.test.ts` uses actual native Git in isolated temporary repositories. It verifies clean and conflicted Unicode previews, preservation of independent staged and unstaged content, rejection of renderer paths and invalid options, destination collisions, changed sources, successful edited output and single-use saving.

`tests/git-workspace-render.test.ts` bundles the actual registered Material workspace and connects it to the native service. Its fixture supplies isolated picker destinations. The browser interaction picks three files, previews, edits the result, opens review, applies the fresh-file save and verifies the output, original inputs, HEAD and index. This is compiled-component interaction with real native fixture files; it is not a live Windows file-picker or installer test.

The website publishes this guide and its Cantonese counterpart. It does not embed the merge runtime or operate on desktop files. The existing gallery remains tied to source `e464ff70`; those images predate this workflow and are not its verification evidence. The recorded Windows installer baseline remains version 0.16.1, independently of newer source work. Native Windows merge execution, installation and full interaction/capture coverage remain open.

Suggested articles: [repository comparisons](git-comparison.md) · [local Git workflows](git-workflows.md) · [security and permissions](security.md) · [Cantonese guide](git-file-merge.yue.md).
