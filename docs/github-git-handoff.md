# GitHub selections and local Git

The native provider registry prepares local sources from selected repository, gist and pull-request records. It accepts approved host and record selectors, then reads the current provider account and actual record. The renderer receives a source summary and an opaque five-minute receipt. It cannot supply a clone URL, base repository or head commit as an authority claim.

Repositories bind their database identity and canonical credential-free HTTPS clone URL. Gists bind their exact ID and `https://gist.HOST/ID.git` URL. This gist mapping follows [the pinned GitHub CLI 2.102.0 implementation](https://github.com/cli/cli/blob/v2.102.0/pkg/cmd/gist/clone/clone.go#L98-L108), read on 2026-10-08; unexpected hosts, credentials, query strings and alternative source paths fail validation. Enterprise approval does not guarantee the server enables Gists.

Pull requests bind the actual base repository identity, visible number, provider database identity and exact head commit. The native target uses `refs/pull/NUMBER/head`, with the base branch retained for review. PR search selections retain their issue-record provenance, so issue and pull-request database IDs are verified against the corresponding provider endpoint.

The native-only `GitHubService.resolveProviderTarget(id)` repeats the stored authorization check and reads current provider/account records. Changed host, account, repository, source URL or head, an expired receipt, or context invalidation prevents its use. The Git service consumes this callback at its own reviewed local boundary. This registry checkpoint establishes source preparation and revalidation; contextual Git controls and real clone/checkout outcomes need their own integrated evidence.

Provider API authentication identifies and reads the selected source. Native Git uses its configured transport credentials. Private cloning/fetching may require reviewed trust in configured credential helpers and Accounts → Set up Git authentication. The source receipt supplies no token to Git, and a successful API read does not establish that Git can fetch the repository. Credential, SSH, configuration and provider failures remain failed operations.

Tests use synthetic provider responses for canonical sources, Enterprise gist mapping, immutable identity/head drift, account/host changes, expiry, invalidation, rejected renderer claims and authorization on resolution. No live remote write, private credential read, actual Git clone/checkout, Windows launch or all-six-handoff completion is claimed by this registry-only checkpoint.
