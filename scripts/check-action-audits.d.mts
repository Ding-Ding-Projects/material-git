export interface InventoryVerdict {
 inventoryComplete: true;
 functionalityCertified: false;
}
export function checkGithubAudit(
 map: Record<string, unknown>,
 catalog: Record<string, unknown>,
 reference: Record<string, unknown>,
 api: Record<string, unknown>,
): InventoryVerdict;
export function checkGitAudit(map: Record<string, unknown>): InventoryVerdict;
export function checkActionAudits(root: string): Promise<{github: InventoryVerdict; git: InventoryVerdict}>;
