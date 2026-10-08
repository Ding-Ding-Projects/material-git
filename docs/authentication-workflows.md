# Authentication and Git transport

Accounts offers actual HTTPS and SSH Git transport choices during device sign-in. This setting belongs to the selected approved host and affects its GitHub CLI accounts. Browser authorization stays interactive in the browser; the desktop does not open terminal prompts.

SSH key setup is skipped by default. Unchecking that choice offers a separate public-key upload after the effective account is verified. It does not generate a key. A native file picker selects an existing OpenSSH public key; private-key contents, bundles, symbolic links and oversized files are rejected. The review displays the exact host, account, title, algorithm, SHA-256 fingerprint and expiry. Two acknowledgments are required before upload.

The native one-use receipt binds the selected file's identity and bytes and the effective provider account ID. Apply rereads both, checks native authorization immediately before the upload, and sends the public key through private process stdin. Renderer requests, operation history and exported authentication state contain neither the native path nor key contents. Cancellation and failed or unverifiable responses report failure or uncertainty, rather than success. GitHub may refuse duplicate keys or insufficient permissions. Uploading a key does not verify local Git connectivity.

Connect Git authentication reviews the active account before configuring the global helper and reads the installed helper back. Configure Git for this host before sign-in instead reviews the exact approved hostname and uses the native force option without inventing an account. That option permits an unauthenticated host; it does not sign in, supply a credential, or change the helper's overwrite policy. Repository Git configuration can override the global helper.

The pinned CLI's token-file login can fall back to plaintext credential storage when its OS vault fails. This workflow therefore does not expose token-file sign-in until a secure-only native adapter is available. No test signs a real account in or uploads a real key.

Evidence: native file/account/lock/replay/cancellation fixtures, an actual bounded native stdin process, compiled Accounts controls driving the native service, and the pinned CLI configuring an unsigned approved host in isolated temporary Git and CLI configuration. These checks do not establish live provider permissions, Windows vault availability, or private Git transport credentials.
