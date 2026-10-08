export function authHelperSourceDigest():Promise<string>;
export function buildAuthHelper(options?:{goBinary?:string;platform?:string;arch?:string;vendorDirectory?:string;environment?:NodeJS.ProcessEnv;record?:boolean}):Promise<{directory:string;binary:string;sha256:string;source:string}>;
export function copyAuthHelper(destination:string,platform?:string,arch?:string,vendorDirectory?:string):Promise<string>;
