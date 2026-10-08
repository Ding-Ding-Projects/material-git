import type {WorkspaceNotification,NotificationCategory} from './workspace';
/** Credential-like content is never copied into ordinary notification history or speech. */
export function safeNoticeFacts(facts:{en:string;yue:string}):{en:string;yue:string}{
 const clean=(text:string,language:'en'|'yue')=>{if(/gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_|Bearer\s|(?:password|token|secret|authorization)\s*[:=]/i.test(text))return language==='en'?'A task reported a message containing sensitive data. Open the task to review it.':'工作訊息包含敏感資料，請開啟相應工作查看。';return text.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,512);};
 return {en:clean(facts.en,'en'),yue:clean(facts.yue,'yue')};
}
export function noticeKind(category:NotificationCategory):WorkspaceNotification['kind']{return category==='error'?'error':['warning','security','destructive','financial'].includes(category)?'warning':'info';}
