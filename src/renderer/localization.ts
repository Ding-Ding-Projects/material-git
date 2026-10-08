import type {AppSettings} from '../shared/types.js';
import {defaults} from '../shared/preferences.js';
const words: Record<string,[string,string]> = {
 home:['Home','首頁'],commands:['Commands','指令'],operations:['Operations','操作記錄'],history:['History','歷史'],utilities:['Utilities','工具'],overview:['Overview','總覽'],workspace:['Workspace','工作空間'],commandFamilies:['Command families','指令分類'],repositoryPicker:['Choose repository','選擇儲存庫'],openCommand:['Open command','開啟指令'],runCommand:['Run command','執行指令'],reviewChanges:['Review changes','檢查變更'],backToCatalog:['Back to catalog','返回目錄'],close:['Close','關閉'],cancel:['Cancel','取消'],previous:['Previous','上一頁'],next:['Next','下一頁'],commandPalette:['Command palette','指令面板'],accounts:['Accounts','帳戶'],updates:['Updates','更新'],
 credentialVerified:['Credential verified.','憑證已驗證。'],
 securityTitle:["Local access preferences and authenticator", "本機存取設定同驗證器"],
 currentCredential:["Current PIN or password", "目前 PIN 或密碼"],
 newCredential:["New PIN or password (4–256 characters)", "新 PIN 或密碼（4 至 256 個字元）"],
 changeCredential:["Change credential", "更改憑證"],
 setCredential:["Set credential", "設定憑證"],
 verifyCredential:["Verify credential", "驗證憑證"],
 modeName:["Mode display name", "模式顯示名稱"],
 renameMode:["Rename mode", "更改模式名稱"],
 modeCredentialNotice:["Changing the mode requires the shared credential. Prior presentation choices remain saved.", "更改模式需要共用憑證。原本嘅顯示設定會保留。"],
 totpTitle:["Local TOTP authenticator", "本機 TOTP 驗證器"],
 clockNotice:["Codes use the system clock. Clock accuracy is not verified; if an account rejects a current code, check your system date and time.", "驗證碼使用系統時間，時間準確度未經驗證。如果帳戶唔接受目前驗證碼，請檢查系統日期同時間。"],
 authenticatorSearch:["Search local authenticator entries", "搜尋本機驗證器項目"],
 noEntries:["No local authenticator entries.", "未有本機驗證器項目。"],
 newPairingAccount:["Account for a new local pairing", "新本機配對嘅帳戶"],
 generatePairing:["Generate local pairing", "產生本機配對"],
 pasteUri:["Paste an otpauth TOTP URI", "貼上 otpauth TOTP URI"],
 revealPairing:["Reveal one-time pairing QR and manual secret", "顯示一次性配對 QR 碼同手動密鑰"],
 confirmCode:["Current code to confirm pairing", "目前驗證碼，用嚟確認配對"],
 enroll:["Confirm and store enrollment", "確認並儲存登記"],
 copyCode:["Copy current code", "複製目前驗證碼"],
 removeEntry:["Remove entry", "移除項目"],
 confirmRemoval:["Confirm removal", "確認移除"],
 hidePairing:["Hide pairing", "隱藏配對"],
 loadingShared:["Loading the shared local record…", "正在載入共用本機記錄…"],
 sharedAvailable:["Shared local record available.", "共用本機記錄可用。"],
 sharedUnavailable:["Shared local record unavailable.", "共用本機記錄無法使用。"],
 watchAvailable:["Live updates active.", "即時更新已啟用。"],
 watchUnavailable:["Live updates unavailable.", "即時更新無法使用。"],
 vaultAvailable:["Operating-system encrypted storage available.", "作業系統加密儲存可用。"],
 vaultUnavailable:["Operating-system encrypted storage unavailable; secret saving is refused.", "作業系統加密儲存無法使用；唔會儲存密鑰。"],
 settings:['Settings','設定'],tools:['Local tools','本機工具'],language:['Language','語言'],theme:['Theme','主題'],density:['Density','介面密度'],seed:['Theme seed colour','主題顏色'],fontScale:['Text size','文字大小'],fontFamily:['Font family','字體'],motion:['Animations','動畫'],englishHumor:['English playfulness','英文趣味程度'],cantoneseHumor:['Cantonese playfulness','廣東話趣味程度'],emojis:['Show emojis in messages','訊息顯示表情符號'],displayName:['App name','應用程式名稱'],narrator:['Speak app events','朗讀應用程式事件'],narrationLanguage:['Narration language','朗讀語言'],englishVoice:['English voice','英文聲音'],cantoneseVoice:['Hong Kong Cantonese voice','香港廣東話聲音'],speechRate:['Speech rate','朗讀速度'],speechPitch:['Speech pitch','聲調'],focus:['Focus mode','專注模式'],lowStimulation:['Low stimulation','減少刺激'],timeAwareness:['Time awareness','時間提醒'],oneThing:['One thing at a time','一次一件事'],momentum:['Keep momentum','保持進度'],currentTask:['Current task','目前工作'],vocabulary:['Personal vocabulary','個人用語'],import:['Import or replace local JSON','匯入或更換本機 JSON'],clear:['Clear personal vocabulary','清除個人用語'],empty:['No personal vocabulary loaded','未載入個人用語'],loaded:['Personal vocabulary loaded locally','個人用語已載入本機'],automatic:['Choose automatically','自動選擇'],search:['Search settings','搜尋設定'],saved:['Settings saved','設定已儲存'],error:['The operation failed','操作失敗'],ready:['Ready','準備好'],appearance:['Appearance','外觀'],accessibility:['Accessibility','無障礙設定'],humorDisclosure:['Playfulness styles all messages, including errors and warnings. Both languages default to 5; change either at any time.','趣味程度會調整所有訊息，包括錯誤同警告。兩種語言預設都係 5，隨時可以分開調整。']
};
const en=['','All set.','Done and ready.','Ready when you are.','Ready for the next small adventure.'];
const yue=['','準備好。','搞掂，可以繼續。','搞掂，慢慢嚟。','搞掂，下一步輕鬆行。'];
let personal:Record<string,string>={};
export function setPersonalVocabulary(entries:Record<string,string>={}){personal={...entries};}
function personalize(text:string){for(const [key,value] of Object.entries(personal).sort((a,b)=>b[0].length-a[0].length)){const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');text=text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'gu'),()=>value);}return text;}
export function t(key:string,settings:AppSettings=defaults):string{
 const pair=words[key]??[key,key]; let [english,cantonese]=pair;
 if(['saved','ready','error'].includes(key)){
  const e=Math.max(1,Math.min(5,settings.englishHumor))-1,c=Math.max(1,Math.min(5,settings.cantoneseHumor))-1;
  if(e)english+=' '+(key==='error'?['','Please try again.','Let’s check the details.','Let’s untangle this step.','A small detour: check the details and try again.'][e]:en[e]);if(c)cantonese+=' '+(key==='error'?['','請再試一次。','睇清楚詳情再試。','一齊拆解呢一步。','行咗個小彎，睇清楚詳情再試。'][c]:yue[c]);
 }
 const text=settings.language==='yue'?cantonese:settings.language==='both'?`${english} · ${cantonese}`:english;
 return Object.hasOwn(words,key)?personalize(text):text;
}
/** Platform TTS queue; both tracks are serialized by speechSynthesis, never overlapped. */
export function announce(key:string,settings:AppSettings=defaults):void {
 if(!settings.narrator||!globalThis.speechSynthesis)return;
 const voices=globalThis.speechSynthesis.getVoices();
 const tracks=settings.narrationLanguage==='both'?['en','yue']:[settings.narrationLanguage];
 for(const language of tracks){
  const matching=voices.filter(v=>language==='en'?/^en(?:-|$)/i.test(v.lang):/^(yue|zh-HK)(?:-|$)/i.test(v.lang));
  // Never substitute Mandarin or an unrelated voice for an unavailable Cantonese track.
  if(language==='yue'&&!matching.length)continue;
  const chosen=language==='en'?settings.englishVoice:settings.cantoneseVoice;
  const utterance=new SpeechSynthesisUtterance(t(key,{...settings,language:language as 'en'|'yue'}));
  utterance.voice=matching.find(v=>v.voiceURI===chosen)??matching[0]??null;
  utterance.lang=language==='en'?'en-US':'zh-HK';utterance.rate=settings.speechRate;utterance.pitch=settings.speechPitch;
  globalThis.speechSynthesis.speak(utterance);
 }
}
