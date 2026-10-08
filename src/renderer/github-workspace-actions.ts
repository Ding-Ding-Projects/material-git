import type {Domain} from './github-workspace-model';
/** Product destinations and contextual actions, independent of command-family navigation. */
export interface NativeArea {id:string;label:string;yue:string;icon:string;actions:string[];initial?:string;selected?:boolean;selection?:'run'|'workflow'}
export const nativeAreas:Partial<Record<Domain,NativeArea[]>>={
 repositories:[
 {id:'create',label:'Create or fork',yue:'建立或分叉',icon:'repo',actions:['repositories.create-with-options','repositories.fork-with-options'],initial:'repositories.create-with-options'},
 {id:'files',label:'Files',yue:'檔案',icon:'folder',actions:['repositories.read-directory','repositories.read-file','repositories.gitignore-list','repositories.gitignore-view','repositories.license-list','repositories.license-view'],initial:'repositories.read-directory'},
 {id:'labels',label:'Labels',yue:'標籤',icon:'tag',actions:['repositories.label-list','repositories.label-create','repositories.label-edit','repositories.label-clone','repositories.label-delete'],initial:'repositories.label-list'},
 {id:'automation',label:'Agents & skills',yue:'代理同技能',icon:'extension',actions:['repositories.agent-list','repositories.agent-create','repositories.agent-view','repositories.skill-list','repositories.skill-search','repositories.skill-preview','repositories.skill-install','repositories.skill-update','repositories.skill-publish'],initial:'repositories.agent-list'},
 {id:'access',label:'Access & configuration',yue:'存取同設定',icon:'shield',actions:['repositories.deploy-key-list','repositories.deploy-key-add','repositories.deploy-key-delete','repositories.secret-list','repositories.secret-set','repositories.secret-delete','repositories.variable-list','repositories.variable-get','repositories.variable-set','repositories.variable-delete'],initial:'repositories.secret-list'},
 {id:'environment',label:'Tool environment',yue:'工具環境',icon:'settings',actions:['repositories.default-context','repositories.account-status','repositories.license-notices','repositories.clear-cli-cache'],initial:'repositories.account-status'},
 {id:'settings',label:'Repository settings',yue:'儲存庫設定',icon:'settings',actions:['repositories.configure','repositories.rename','repositories.archive','repositories.unarchive','repositories.autolink-list','repositories.autolink-view','repositories.autolink-create','repositories.autolink-delete'],initial:'repositories.configure'}
 ],
 issues:[
 {id:'my-work',label:'My work & new issues',yue:'我嘅工作同新增議題',icon:'issue',actions:['issues.status','issues.create-with-properties'],initial:'issues.status'},
 {id:'manage',label:'Manage issue',yue:'管理議題',icon:'settings',selected:true,actions:['issues.configure','issues.lock','issues.unlock','issues.pin','issues.unpin','issues.transfer','issues.delete'],initial:'issues.configure'}
 ],
 'pull-requests':[
 {id:'my-work',label:'My work & new requests',yue:'我嘅工作同新增要求',icon:'pull',actions:['pulls.status','pulls.create-with-properties'],initial:'pulls.status'},
 {id:'review-tools',label:'Review tools',yue:'審核工具',icon:'check',selected:true,actions:['pulls.checks','pulls.diff','pulls.ready','pulls.update-branch','pulls.configure','pulls.lock','pulls.unlock','pulls.merge-with-options'],initial:'pulls.checks'}
 ],
 actions:[{id:'dispatch',label:'Workflow inputs',yue:'工作流程輸入',icon:'check',selected:true,selection:'workflow',actions:['actions.dispatch-with-options'],initial:'actions.dispatch-with-options'},{id:'monitor',label:'Run progress',yue:'執行進度',icon:'check',selected:true,selection:'run',actions:['actions.watch'],initial:'actions.watch'},{id:'caches',label:'Caches',yue:'快取',icon:'folder',actions:['actions.cache-list','actions.cache-delete'],initial:'actions.cache-list'}],
 releases:[{id:'prepare',label:'Prepare release',yue:'準備版本',icon:'release',actions:['releases.create-with-options'],initial:'releases.create-with-options'},{id:'verification',label:'Verify release',yue:'驗證版本',icon:'shield',selected:true,actions:['releases.verify','releases.verify-asset','releases.delete-asset'],initial:'releases.verify'}],
 projects:[
 {id:'items',label:'Manage items',yue:'管理項目',icon:'board',selected:true,actions:['projects.item-list','projects.item-add','projects.item-create','projects.item-edit','projects.item-archive','projects.item-delete'],initial:'projects.item-list'},
 {id:'fields',label:'Manage fields',yue:'管理欄位',icon:'settings',selected:true,actions:['projects.field-list','projects.field-create','projects.field-delete'],initial:'projects.field-list'},
 {id:'settings',label:'Project settings',yue:'專案設定',icon:'settings',selected:true,actions:['projects.link','projects.unlink','projects.copy','projects.mark-template','projects.close'],initial:'projects.link'}
 ],
 discussions:[{id:'edit',label:'Edit discussion',yue:'編輯討論',icon:'comment',selected:true,actions:['discussions.edit'],initial:'discussions.edit'}],
 gists:[{id:'files',label:'Manage files',yue:'管理檔案',icon:'file',selected:true,actions:['gists.inspect','gists.rename-file'],initial:'gists.inspect'}],
 codespaces:[{id:'manage',label:'Workspace settings',yue:'工作空間設定',icon:'cloud',selected:true,actions:['codespaces.configure','codespaces.logs','codespaces.rebuild'],initial:'codespaces.configure'}],
 'repository-security':[
 {id:'rulesets',label:'Rulesets',yue:'規則集',icon:'shield',actions:['security.ruleset-list','security.ruleset-view','security.ruleset-check'],initial:'security.ruleset-list'},
 {id:'attestations',label:'Attestations',yue:'證明',icon:'check',actions:['security.attestation-verify','security.attestation-download','security.attestation-trusted-root'],initial:'security.attestation-verify'}
 ],
 organizations:[
 {id:'ssh-keys',label:'Account SSH keys',yue:'帳戶 SSH 金鑰',icon:'shield',actions:['organizations.ssh-key-list','organizations.ssh-key-add','organizations.ssh-key-delete'],initial:'organizations.ssh-key-list'},
 {id:'gpg-keys',label:'Account GPG keys',yue:'帳戶 GPG 金鑰',icon:'shield',actions:['organizations.gpg-key-list','organizations.gpg-key-add','organizations.gpg-key-delete'],initial:'organizations.gpg-key-list'}
 ]
};
export const taskLabels:Record<string,string>={
 'dispatch-with-options':'輸入欄位同輸入檔案','fork-with-options':'分叉至帳戶或機構',
 'merge-with-options':'合併策略同自動合併','create-with-options':'完整建立選項','default-context':'預設儲存庫','account-status':'我嘅 GitHub 工作','license-notices':'應用程式授權聲明','clear-cli-cache':'清除設定快取',watch:'追蹤執行進度',
 'read-directory':'瀏覽目錄','read-file':'讀取檔案','gitignore-list':'忽略範本','gitignore-view':'查看忽略範本','license-list':'授權範本','license-view':'查看授權範本',
 'label-list':'瀏覽標籤','label-create':'新增標籤','label-edit':'編輯標籤','label-clone':'複製標籤','label-delete':'刪除標籤',
 'agent-list':'代理工作','agent-create':'新增代理工作','agent-view':'查看代理工作','skill-list':'技能','skill-search':'搜尋技能','skill-preview':'預覽技能','skill-install':'安裝技能','skill-update':'更新技能','skill-publish':'發佈技能',
 'deploy-key-list':'部署金鑰','deploy-key-add':'新增部署金鑰','deploy-key-delete':'刪除部署金鑰','secret-list':'機密值','secret-set':'設定機密值','secret-delete':'刪除機密值','variable-list':'變數','variable-get':'讀取變數','variable-set':'設定變數','variable-delete':'刪除變數',
 configure:'編輯屬性',rename:'重新命名',archive:'封存',unarchive:'取消封存','autolink-list':'自動連結','autolink-view':'查看自動連結','autolink-create':'新增自動連結','autolink-delete':'刪除自動連結',
 status:'我嘅工作','create-with-properties':'新增並設定屬性',lock:'鎖定對話',unlock:'解除對話鎖定',pin:'置頂',unpin:'取消置頂',transfer:'轉移',delete:'刪除',checks:'檢查結果',diff:'檔案差異',ready:'準備好審核','update-branch':'更新分支',
 'cache-list':'瀏覽快取','cache-delete':'刪除快取',verify:'驗證版本','verify-asset':'驗證資產','delete-asset':'刪除資產','item-list':'瀏覽項目','item-add':'加入項目','item-create':'新增草稿項目','item-edit':'編輯欄位值','item-archive':'封存項目','item-delete':'刪除項目','field-list':'瀏覽欄位','field-create':'新增欄位','field-delete':'刪除欄位',link:'連結儲存庫',unlink:'取消連結',copy:'複製專案','mark-template':'設為範本',close:'關閉',edit:'編輯',inspect:'查看檔案','rename-file':'重新命名檔案',logs:'工作空間記錄',rebuild:'重建工作空間',
 'ruleset-list':'瀏覽規則集','ruleset-view':'查看規則集','ruleset-check':'檢查規則集','attestation-verify':'驗證證明','attestation-download':'下載證明','attestation-trusted-root':'信任根','ssh-key-list':'瀏覽 SSH 金鑰','ssh-key-add':'新增 SSH 金鑰','ssh-key-delete':'刪除 SSH 金鑰','gpg-key-list':'瀏覽 GPG 金鑰','gpg-key-add':'新增 GPG 金鑰','gpg-key-delete':'刪除 GPG 金鑰'
};

/** Run monitoring is unavailable for workflow-definition selections. */
export function nativeAreaEligible(area:NativeArea,listMode:string):boolean{return area.selection==='run'?listMode!=='workflows':area.selection==='workflow'?listMode==='workflows':true;}
