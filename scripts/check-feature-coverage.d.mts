export interface FeatureCoverageResult {inventoryComplete:true;featureCount:104;functionalCompleteness:boolean;unresolved:string[]}
export const requiredFeatureIds:readonly string[];
export function validateFeatureInventory(inventory:Record<string,unknown>,root:string,options?:{requireComplete?:boolean}):Promise<FeatureCoverageResult>;
export function checkFeatureCoverage(root:string,options?:{requireComplete?:boolean}):Promise<FeatureCoverageResult>;
