export interface CameraRequest{owner:number;frame:number;url:string;isMainFrame:boolean;permission:string;mediaTypes?:readonly string[]}
/** One short-lived native permit. Checks never create a persistent browser permission. */
export class CameraPermission {
 private permit?:{owner:number;frame:number;url:string;expiresAt:number};
 constructor(private now=()=>Date.now()){}
 arm(owner:number,frame:number,url:string){this.permit={owner,frame,url,expiresAt:this.now()+10000};return true;}
 clear(){this.permit=undefined;}
 request(input:CameraRequest):boolean{const permit=this.permit;if(!permit)return false;if(this.now()>permit.expiresAt){this.clear();return false;}if(input.permission!=='media'||input.owner!==permit.owner||input.frame!==permit.frame||input.url!==permit.url||!input.isMainFrame||input.mediaTypes?.length!==1||input.mediaTypes[0]!=='video')return false;this.clear();return true;}
}
