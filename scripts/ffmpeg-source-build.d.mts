export interface SourceBuildProof {
 schema: number;
 platform: string;
 version: string;
 sourceManifest: string;
 sources: Record<string,string>;
 files: string[];
}
export interface SourceBuildManifest {
 schema: number;
 version: string;
 sourceDateEpoch: number;
 builderImage: string;
 debianSnapshot: string;
 recipe: Record<string,string>;
 outputHashes: Record<string,Record<string,string>>;
 sources: Array<{name:string;version:string;asset:string;url:string;license:string;sha256:string}>;
}
export const ffmpegSourceManifest: SourceBuildManifest;
export function sourceHash(file:string): Promise<string>;
export function verifyFFmpegSourcePayload(directory:string,platform:string,manifest:{files:Record<string,Record<string,string>>}): Promise<SourceBuildProof>;
export function sealFFmpegSourcePayload(output:string,platform:string,sources:string,recipe:string): Promise<string[]>;
export function buildFFmpegSourcePayload(platform?:string,root?:string,bootstrap?:boolean): Promise<string>;
