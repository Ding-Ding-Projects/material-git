import type {CommandOption,CommandArgument} from './types';
export interface NativeGitHubTask {action:string;title:string;commandId:string;mutation:boolean;destructive:boolean;description:string;options:CommandOption[];arguments:CommandArgument[];initialOptions?:Record<string,unknown>;initialArguments?:Record<string,unknown>}
export const nativeGitHubTaskRoutes=[
 {action:'actions.dispatch-with-options',title:'Dispatch with structured inputs or input files',commandId:'workflow run',mutation:true},
 {action:'repositories.create-with-options',title:'Create from a repository template',commandId:'repo create',mutation:true},
 {action:'repositories.fork-with-options',title:'Fork into your account or organization',commandId:'repo fork',mutation:true},

 {action:'pulls.merge-with-options',title:'Configure merge and automatic merging',commandId:'pr merge',mutation:true},
 {action:'releases.create-with-options',title:'Prepare release notes and assets',commandId:'release create',mutation:true},
 {action:'repositories.default-context',title:'Set the default CLI repository',commandId:'repo set-default',mutation:true},
 {action:'repositories.account-status',title:'My GitHub work',commandId:'status',mutation:false},
 {action:'repositories.license-notices',title:'Application license notices',commandId:'licenses',mutation:false},
 {action:'repositories.clear-cli-cache',title:'Clear cached CLI configuration',commandId:'config clear-cache',mutation:true},
 {action:'actions.watch',title:'Follow run progress',commandId:'run watch',mutation:false},

 {
  "action": "codespaces.configure",
  "title": "Configure cloud workspace",
  "commandId": "codespace edit",
  "mutation": true
 },
 {
  "action": "codespaces.logs",
  "title": "Inspect workspace logs",
  "commandId": "codespace logs",
  "mutation": false
 },
 {
  "action": "codespaces.rebuild",
  "title": "Rebuild workspace",
  "commandId": "codespace rebuild",
  "mutation": true
 },
 {
  "action": "discussions.edit",
  "title": "Edit discussion",
  "commandId": "discussion edit",
  "mutation": true
 },
 {
  "action": "gists.rename-file",
  "title": "Rename gist file",
  "commandId": "gist rename",
  "mutation": true
 },
 {
  "action": "gists.inspect",
  "title": "Inspect gist file",
  "commandId": "gist view",
  "mutation": false
 },
 {
  "action": "issues.create-with-properties",
  "title": "Create issue with relationships and attachments",
  "commandId": "issue create",
  "mutation": true
 },
 {
  "action": "issues.status",
  "title": "My issue work",
  "commandId": "issue status",
  "mutation": false
 },
 {
  "action": "issues.delete",
  "title": "Delete issue",
  "commandId": "issue delete",
  "mutation": true
 },
 {
  "action": "issues.configure",
  "title": "Configure issue properties",
  "commandId": "issue edit",
  "mutation": true
 },
 {
  "action": "issues.lock",
  "title": "Lock conversation",
  "commandId": "issue lock",
  "mutation": true
 },
 {
  "action": "issues.pin",
  "title": "Pin issue",
  "commandId": "issue pin",
  "mutation": true
 },
 {
  "action": "issues.transfer",
  "title": "Transfer issue",
  "commandId": "issue transfer",
  "mutation": true
 },
 {
  "action": "issues.unlock",
  "title": "Unlock conversation",
  "commandId": "issue unlock",
  "mutation": true
 },
 {
  "action": "issues.unpin",
  "title": "Unpin issue",
  "commandId": "issue unpin",
  "mutation": true
 },
 {
  "action": "pulls.create-with-properties",
  "title": "Create pull request with properties and attachments",
  "commandId": "pr create",
  "mutation": true
 },
 {
  "action": "pulls.status",
  "title": "My pull request work",
  "commandId": "pr status",
  "mutation": false
 },
 {
  "action": "pulls.checks",
  "title": "Inspect checks",
  "commandId": "pr checks",
  "mutation": false
 },
 {
  "action": "pulls.diff",
  "title": "Inspect changed lines",
  "commandId": "pr diff",
  "mutation": false
 },
 {
  "action": "pulls.configure",
  "title": "Configure pull request properties",
  "commandId": "pr edit",
  "mutation": true
 },
 {
  "action": "pulls.lock",
  "title": "Lock pull request conversation",
  "commandId": "pr lock",
  "mutation": true
 },
 {
  "action": "pulls.ready",
  "title": "Mark ready for review",
  "commandId": "pr ready",
  "mutation": true
 },
 {
  "action": "pulls.unlock",
  "title": "Unlock pull request conversation",
  "commandId": "pr unlock",
  "mutation": true
 },
 {
  "action": "pulls.update-branch",
  "title": "Update pull request branch",
  "commandId": "pr update-branch",
  "mutation": true
 },
 {
  "action": "projects.close",
  "title": "Close project",
  "commandId": "project close",
  "mutation": true
 },
 {
  "action": "projects.copy",
  "title": "Copy project",
  "commandId": "project copy",
  "mutation": true
 },
 {
  "action": "projects.field-create",
  "title": "Create project field",
  "commandId": "project field-create",
  "mutation": true
 },
 {
  "action": "projects.field-delete",
  "title": "Delete project field",
  "commandId": "project field-delete",
  "mutation": true
 },
 {
  "action": "projects.field-list",
  "title": "Browse project fields",
  "commandId": "project field-list",
  "mutation": false
 },
 {
  "action": "projects.item-add",
  "title": "Add project item",
  "commandId": "project item-add",
  "mutation": true
 },
 {
  "action": "projects.item-archive",
  "title": "Archive project item",
  "commandId": "project item-archive",
  "mutation": true
 },
 {
  "action": "projects.item-create",
  "title": "Create draft project item",
  "commandId": "project item-create",
  "mutation": true
 },
 {
  "action": "projects.item-delete",
  "title": "Delete project item",
  "commandId": "project item-delete",
  "mutation": true
 },
 {
  "action": "projects.item-edit",
  "title": "Edit project field values",
  "commandId": "project item-edit",
  "mutation": true
 },
 {
  "action": "projects.item-list",
  "title": "Browse project items",
  "commandId": "project item-list",
  "mutation": false
 },
 {
  "action": "projects.link",
  "title": "Link repository to project",
  "commandId": "project link",
  "mutation": true
 },
 {
  "action": "projects.mark-template",
  "title": "Use project as template",
  "commandId": "project mark-template",
  "mutation": true
 },
 {
  "action": "projects.unlink",
  "title": "Unlink repository from project",
  "commandId": "project unlink",
  "mutation": true
 },
 {
  "action": "releases.delete-asset",
  "title": "Delete release asset",
  "commandId": "release delete-asset",
  "mutation": true
 },
 {
  "action": "releases.verify",
  "title": "Verify release attestation",
  "commandId": "release verify",
  "mutation": false
 },
 {
  "action": "releases.verify-asset",
  "title": "Verify release asset",
  "commandId": "release verify-asset",
  "mutation": false
 },
 {
  "action": "repositories.archive",
  "title": "Archive repository",
  "commandId": "repo archive",
  "mutation": true
 },
 {
  "action": "repositories.autolink-create",
  "title": "Create automatic link",
  "commandId": "repo autolink create",
  "mutation": true
 },
 {
  "action": "repositories.autolink-delete",
  "title": "Delete automatic link",
  "commandId": "repo autolink delete",
  "mutation": true
 },
 {
  "action": "repositories.autolink-list",
  "title": "Browse automatic link",
  "commandId": "repo autolink list",
  "mutation": false
 },
 {
  "action": "repositories.autolink-view",
  "title": "Inspect automatic link",
  "commandId": "repo autolink view",
  "mutation": false
 },
 {
  "action": "repositories.deploy-key-add",
  "title": "Add deployment key",
  "commandId": "repo deploy-key add",
  "mutation": true
 },
 {
  "action": "repositories.deploy-key-delete",
  "title": "Delete deployment key",
  "commandId": "repo deploy-key delete",
  "mutation": true
 },
 {
  "action": "repositories.deploy-key-list",
  "title": "Browse deployment key",
  "commandId": "repo deploy-key list",
  "mutation": false
 },
 {
  "action": "repositories.configure",
  "title": "Configure repository properties",
  "commandId": "repo edit",
  "mutation": true
 },
 {
  "action": "repositories.gitignore-list",
  "title": "Browse ignore template",
  "commandId": "repo gitignore list",
  "mutation": false
 },
 {
  "action": "repositories.gitignore-view",
  "title": "Inspect ignore template",
  "commandId": "repo gitignore view",
  "mutation": false
 },
 {
  "action": "repositories.license-list",
  "title": "Browse license template",
  "commandId": "repo license list",
  "mutation": false
 },
 {
  "action": "repositories.license-view",
  "title": "Inspect license template",
  "commandId": "repo license view",
  "mutation": false
 },
 {
  "action": "repositories.read-directory",
  "title": "Browse repository directory",
  "commandId": "repo read-dir",
  "mutation": false
 },
 {
  "action": "repositories.read-file",
  "title": "Read repository file",
  "commandId": "repo read-file",
  "mutation": false
 },
 {
  "action": "repositories.rename",
  "title": "Rename repository",
  "commandId": "repo rename",
  "mutation": true
 },
 {
  "action": "repositories.unarchive",
  "title": "Restore archived repository",
  "commandId": "repo unarchive",
  "mutation": true
 },
 {
  "action": "repositories.skill-install",
  "title": "Install agent skill",
  "commandId": "skill install",
  "mutation": true
 },
 {
  "action": "repositories.skill-list",
  "title": "Browse agent skills",
  "commandId": "skill list",
  "mutation": false
 },
 {
  "action": "repositories.skill-preview",
  "title": "Preview agent skill",
  "commandId": "skill preview",
  "mutation": false
 },
 {
  "action": "repositories.skill-publish",
  "title": "Publish agent skill",
  "commandId": "skill publish",
  "mutation": true
 },
 {
  "action": "repositories.skill-search",
  "title": "Search agent skills",
  "commandId": "skill search",
  "mutation": false
 },
 {
  "action": "repositories.skill-update",
  "title": "Update agent skill",
  "commandId": "skill update",
  "mutation": true
 },
 {
  "action": "actions.cache-delete",
  "title": "Delete cache",
  "commandId": "cache delete",
  "mutation": true
 },
 {
  "action": "actions.cache-list",
  "title": "Browse caches",
  "commandId": "cache list",
  "mutation": false
 },
 {
  "action": "repositories.agent-create",
  "title": "Create agent task",
  "commandId": "agent-task create",
  "mutation": true
 },
 {
  "action": "repositories.agent-list",
  "title": "Browse agent tasks",
  "commandId": "agent-task list",
  "mutation": false
 },
 {
  "action": "repositories.agent-view",
  "title": "Inspect agent task",
  "commandId": "agent-task view",
  "mutation": false
 },
 {
  "action": "security.attestation-download",
  "title": "Download attestation",
  "commandId": "attestation download",
  "mutation": true
 },
 {
  "action": "security.attestation-trusted-root",
  "title": "Inspect trust roots attestation",
  "commandId": "attestation trusted-root",
  "mutation": false
 },
 {
  "action": "security.attestation-verify",
  "title": "Verify attestation",
  "commandId": "attestation verify",
  "mutation": false
 },
 {
  "action": "organizations.gpg-key-add",
  "title": "Add GPG key",
  "commandId": "gpg-key add",
  "mutation": true
 },
 {
  "action": "organizations.gpg-key-delete",
  "title": "Delete GPG key",
  "commandId": "gpg-key delete",
  "mutation": true
 },
 {
  "action": "organizations.gpg-key-list",
  "title": "Browse GPG keys",
  "commandId": "gpg-key list",
  "mutation": false
 },
 {
  "action": "repositories.label-clone",
  "title": "Copy label",
  "commandId": "label clone",
  "mutation": true
 },
 {
  "action": "repositories.label-create",
  "title": "Create label",
  "commandId": "label create",
  "mutation": true
 },
 {
  "action": "repositories.label-delete",
  "title": "Delete label",
  "commandId": "label delete",
  "mutation": true
 },
 {
  "action": "repositories.label-edit",
  "title": "Edit label",
  "commandId": "label edit",
  "mutation": true
 },
 {
  "action": "repositories.label-list",
  "title": "Browse labels",
  "commandId": "label list",
  "mutation": false
 },
 {
  "action": "security.ruleset-check",
  "title": "Check ruleset",
  "commandId": "ruleset check",
  "mutation": false
 },
 {
  "action": "security.ruleset-list",
  "title": "Browse rulesets",
  "commandId": "ruleset list",
  "mutation": false
 },
 {
  "action": "security.ruleset-view",
  "title": "Inspect ruleset",
  "commandId": "ruleset view",
  "mutation": false
 },
 {
  "action": "repositories.secret-delete",
  "title": "Delete secret",
  "commandId": "secret delete",
  "mutation": true
 },
 {
  "action": "repositories.secret-list",
  "title": "Browse secrets",
  "commandId": "secret list",
  "mutation": false
 },
 {
  "action": "repositories.secret-set",
  "title": "Set secret",
  "commandId": "secret set",
  "mutation": true
 },
 {
  "action": "organizations.ssh-key-add",
  "title": "Add SSH key",
  "commandId": "ssh-key add",
  "mutation": true
 },
 {
  "action": "organizations.ssh-key-delete",
  "title": "Delete SSH key",
  "commandId": "ssh-key delete",
  "mutation": true
 },
 {
  "action": "organizations.ssh-key-list",
  "title": "Browse SSH keys",
  "commandId": "ssh-key list",
  "mutation": false
 },
 {
  "action": "repositories.variable-delete",
  "title": "Delete variable",
  "commandId": "variable delete",
  "mutation": true
 },
 {
  "action": "repositories.variable-get",
  "title": "Read variable",
  "commandId": "variable get",
  "mutation": false
 },
 {
  "action": "repositories.variable-list",
  "title": "Browse variables",
  "commandId": "variable list",
  "mutation": false
 },
 {
  "action": "repositories.variable-set",
  "title": "Set variable",
  "commandId": "variable set",
  "mutation": true
 }
] as const;
export type NativeGitHubAction=typeof nativeGitHubTaskRoutes[number]['action'];
export const nativeGitHubTaskActions=new Set<string>(nativeGitHubTaskRoutes.map(task=>task.action));
