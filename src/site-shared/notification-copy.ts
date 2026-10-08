import type {MessageCategory} from '../renderer/localization';
export const notificationNames:Record<MessageCategory,[string,string]>={status:['Status','狀態'],progress:['Progress','進度'],warning:['Warning','警告'],error:['Error','錯誤'],destructive:['Destructive action','破壞性動作'],financial:['Financial','財務'],security:['Security','安全'],accessibility:['Accessibility','無障礙']};
export const exportDisclosureYue:Record<string,string>={
 'XML uses a typed JSON-preserving schema, not a user document schema.':'XML 用保留 JSON 類型嘅結構，唔係個別文件格式嘅結構。',
 'Formula-like cells are prefixed with an apostrophe for spreadsheet safety.':'類似公式嘅儲存格會加上單引號前綴，避免試算表執行。',
 'Nested values and null are JSON cell text. Absent fields are empty. CSV/TSV cannot retain original JSON scalar types without a schema.':'巢狀數值同 null 會用 JSON 儲存格文字，缺少欄位會留空。CSV/TSV 冇結構定義時無法保留原有 JSON 純量類型。',
 'SQL uses standard quoted identifiers and string literals; select a compatible database mode before importing. It contains INSERT statements only. Nested values are JSON text; booleans are 1/0; schema creation and execution are not performed.':'SQL 用標準引號識別碼同字串，匯入之前請選擇相容資料庫模式。只包含 INSERT。巢狀數值係 JSON 文字，布林值係 1/0。唔會建立結構或執行。'
};
