export function verifiedDownload(item:{asset:string;url:string;sha256:string},directory:string,options?:{maxBytes?:number;deadlineMs?:number;attempts?:number;allowLoopback?:boolean}):Promise<string>;
