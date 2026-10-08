export type TotpAlgorithm='SHA1'|'SHA256'|'SHA512';
export interface TotpParameters{secret:string;algorithm:TotpAlgorithm;digits:6|7|8;period:number;issuer:string;account:string}
export interface SecurityStatus{available:boolean;vaultAvailable:boolean;watching:boolean;error?:string;recoveryDirectory:string;schoolMode:{displayName:string;active:boolean;revision:number;updatedAt:string|null};credentialSet:boolean}
export interface AuthenticatorSummary{id:string;issuer:string;account:string;algorithm:TotpAlgorithm;digits:6|7|8;period:number}
export interface SecurityBridge{security(action:string,payload?:Record<string,unknown>):Promise<unknown>;onSecurity?(callback:(status:SecurityStatus)=>void):()=>void}
export function validateTotpParameters(input:unknown):TotpParameters{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid authenticator parameters');
 const value=input as Record<string,unknown>;
 if(Object.keys(value).some(k=>!['secret','algorithm','digits','period','issuer','account'].includes(k)))throw new Error('Unexpected authenticator parameter');
 const {secret,algorithm='SHA1',digits=6,period=30,issuer='',account=''}=value;
 if(typeof secret!=='string'||!secret.length||secret.length>256||!/^[A-Z2-7]+={0,6}$/i.test(secret)||!['SHA1','SHA256','SHA512'].includes(String(algorithm))||![6,7,8].includes(Number(digits))||typeof digits!=='number'||typeof period!=='number'||!Number.isInteger(period)||period<1||period>86400||typeof issuer!=='string'||issuer.length>128||typeof account!=='string'||!account.length||account.length>256||/[\u0000-\u001f]/.test(issuer+account))throw new Error('Invalid authenticator parameters');
 return {secret:secret.toUpperCase().replace(/=+$/,''),algorithm:algorithm as TotpAlgorithm,digits:digits as 6|7|8,period,issuer,account};
}
export function parseOtpAuth(uri:string):TotpParameters{
 if(uri.length>4096)throw new Error('Authenticator URI is too long');let url:URL;try{url=new URL(uri);}catch{throw new Error('Invalid authenticator URI');}
 if(url.protocol!=='otpauth:'||url.hostname!=='totp'||url.username||url.password||url.hash)throw new Error('Only local standard TOTP enrollment is supported');
 const seen=new Set<string>();for(const key of url.searchParams.keys()){if(!['secret','issuer','algorithm','digits','period'].includes(key)||seen.has(key))throw new Error('Unexpected or duplicate authenticator parameter');seen.add(key);}
 let label:string;try{label=decodeURIComponent(url.pathname.slice(1));}catch{throw new Error('Invalid authenticator label');}const colon=label.indexOf(':');const labelIssuer=colon<0?'':label.slice(0,colon),account=colon<0?label:label.slice(colon+1);const issuer=url.searchParams.get('issuer')??labelIssuer;if(labelIssuer&&issuer!==labelIssuer)throw new Error('Conflicting authenticator issuer');
 return validateTotpParameters({secret:url.searchParams.get('secret'),issuer,account,algorithm:(url.searchParams.get('algorithm')??'SHA1').toUpperCase(),digits:Number(url.searchParams.get('digits')??6),period:Number(url.searchParams.get('period')??30)});
}
export function otpAuthUri(parameters:TotpParameters):string{const value=validateTotpParameters(parameters);const label=value.issuer?`${value.issuer}:${value.account}`:value.account;const query=new URLSearchParams({secret:value.secret,issuer:value.issuer,algorithm:value.algorithm,digits:String(value.digits),period:String(value.period)});return `otpauth://totp/${encodeURIComponent(label)}?${query}`;}
