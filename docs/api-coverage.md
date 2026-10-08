# GitHub API coverage

The API explorer indexes the declared public GitHub.com REST and GraphQL schemas. This is schema coverage, not a claim that every GitHub feature is available to every account or that every endpoint has been exercised against a live service.

| Inventory | Exact count |
| --- | ---: |
| REST operations | 1,232 |
| REST paths | 816 |
| REST categories | 44 |
| GraphQL named types, excluding introspection types | 1,829 |
| GraphQL object/interface fields plus input fields | 8,419 |
| GraphQL Query root fields | 31 |
| GraphQL Mutation root fields | 278 |

## Official source pins

The REST source is [github/rest-api-description](https://github.com/github/rest-api-description/blob/2eba8c3ba02f022011539cf01efc43e0251502f8/descriptions/api.github.com/api.github.com.json), commit `2eba8c3ba02f022011539cf01efc43e0251502f8`, SHA-256 `ba5ddc1eeeede9f3858abd96325359891f38a2bd8e20fd111abf4230741db194`. Its upstream license is MIT.

The GraphQL source is the official free/pro/team [github/docs SDL](https://github.com/github/docs/blob/7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d/src/graphql/data/fpt/schema.docs.graphql), commit `7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d`, SHA-256 `4b11889444f390414dbce052da9f09771e0eb155c1981e2d22c012d73cdfe768`. GitHub Docs uses CC-BY-4.0 for documentation and MIT for code. These are public documentation sources, not authenticated user introspection or account data.

Run `node scripts/build-api-catalog.mjs` to regenerate the catalogue and SDL. Run the same command with `--check` to download the fixed commit URLs, verify both source hashes, recompute all counts, and compare the checked-in files byte for byte. It requires `curl` and the pinned `graphql` 16.11.0 runtime dependency. Upstream source changes never update the catalogue silently; maintainers must review and change the pins and digests deliberately.

`data/github-api-catalog.json` is 8,875,022 bytes and includes normalized operations, their parameter/request/response schemas, shared components, and GraphQL type metadata. Vendor extension keys are omitted. Local schema references remain intact. `data/github-graphql-schema.graphql` is the unmodified 1,562,049-byte official SDL used by the GraphQL validator. Both files stay in the main process. Catalogue pages contain summaries, default to 25 records and allow at most 100. REST descriptions include referenced schemas up to 200 references and 1 MiB, with an explicit truncation flag.

## Request and result behavior

The main process runs `gh api` with an argument array, `shell:false`, a fixed GitHub.com host, and structured stdin bodies. It validates operation IDs, required parameters, JSON types, enums, object properties, array item schemas, unions, and common length/range constraints. Unknown path/query parameters and undeclared headers are rejected. Authorization, cookies, host overrides, raw shell input, and arbitrary URLs are unavailable. Authentication comes from GitHub CLI.

JSON request bodies preserve arrays, booleans, numbers, nested objects, and explicit null values. `markdown/raw` supports its official text request media types. The sole alternate server in this pin is `repos/upload-release-asset` at `uploads.github.com`; its URL is constructed only from that operation's pinned server and validated path/query values. Binary upload requires a native file-picker grant resolved in the main process, with a 64 MiB limit. Renderer-supplied paths are never read directly.

REST methods other than GET, HEAD, and OPTIONS require explicit confirmation in the main process. GraphQL mutations require the same confirmation. GraphQL documents are generated from typed selection/argument trees and validated against the pinned official SDL with the GraphQL reference implementation. Fragments support interface and union selections. Unknown fields, invalid arguments, missing required arguments, and invalid selection sets fail before execution. The API accepts no arbitrary GraphQL document or introspection query.

Responses include actual HTTP status, filtered headers, structured JSON or text, success state, and truncation state. Errors retain HTTP status even when GitHub CLI exits unsuccessfully. Credential-shaped keys, recognized token values, authorization headers, and response cookies are redacted. Responses are limited to 4 MiB; process time is limited to 60 seconds. Larger responses fail with an explicit limit error. Downloads return their actual bytes through the native save callback, with export/cancellation state; they are never represented as fabricated JSON. A native export callback must be wired by the application.

GraphQL responses with a nonempty `errors` array report `ok:false` even when their HTTP status is 200. The complete sanitized response envelope retains both `errors` and any returned `data`. `partial:true` indicates that an error response also includes non-null data; `partial:false` indicates an error response without usable data. An HTTP 200 response with no GraphQL errors remains successful. Required-only branches inside REST `oneOf` and `anyOf` constraints are checked independently, so alternative item identifiers and reviewer lists follow their declared schema requirements.

REST pagination is manual. Only a returned next Link from the same GitHub API origin and exact operation path can be followed, and only for a read operation. No mutation is automatically repeated. GraphQL connections expose schema-declared cursor arguments and `pageInfo` fields; users build the next request explicitly.

## Limits

GitHub previews, permissions, scopes, rate limits, application-only endpoints, organization policy, enterprise features, and API version changes can affect availability. GitHub.com free/pro/team SDL does not represent every GitHub Enterprise Cloud or Enterprise Server schema. Some REST schema keywords, such as format and regular-expression pattern constraints, remain visible metadata rather than complete client-side validation. GitHub remains authoritative for those constraints and reports its actual error response.

Response downloads and uploads have the explicit size bounds above. The explorer does not provide automatic cross-page aggregation, unbounded streaming downloads, arbitrary custom hosts, raw authentication editing, introspection, webhook delivery execution, or a guarantee of success for endpoints the selected account cannot access. Catalogue generation and local validation never mutate a GitHub resource.
