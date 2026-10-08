import {publishMessage,type MessageCategory} from '../renderer/localization';
/** Browser-owned events retain separate bilingual facts until presentation. */
export function reportSiteEvent(target:EventTarget,copy:(en:string,yue:string)=>string,category:MessageCategory,en:string,yue:string):string {
  publishMessage(target,category,{en,yue});
  return copy(en,yue);
}
