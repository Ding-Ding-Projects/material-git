export const converterGroups=[['data','Structured data / spreadsheets','結構資料／試算表'],['images','Images','圖片'],['documents','Documents / PDF','文件／PDF'],['audio','Audio','音訊'],['video','Video','影片'],['archives','Archives','封存'],['code','Code / text','程式碼／文字'],['binary','Binary encodings','二進制編碼']] as const;
export const converterUnavailable=[
 ['documents','Office / PDF tools','Office／PDF 工具','Native Office engines and a validated PDF operation adapter are unavailable here.','呢度冇原生 Office 引擎，PDF 操作工具亦未完成驗證。'],
 ['audio','Audio conversion','音訊轉換','A sandboxed FFmpeg engine and verified audio codecs are unavailable in this browser surface.','呢個瀏覽器介面冇隔離 FFmpeg 引擎同已驗證音訊編碼器。'],
 ['video','Video conversion','影片轉換','A sandboxed FFmpeg engine and verified video codecs are unavailable in this browser surface.','呢個瀏覽器介面冇隔離 FFmpeg 引擎同已驗證影片編碼器。'],
 ['archives','ZIP / 7-Zip / archives','ZIP／7-Zip／封存','Browser archive admission, expansion quotas and verified multi-file publication are not implemented.','瀏覽器封存准入、解壓配額同已驗證多檔案發佈尚未實作。'],
 ['code','Code transformation / charset conversion','程式碼轉換／字元集轉換','A verified language or charset adapter is unavailable. UTF-8 structured data can export text below.','冇已驗證語言或字元集工具。UTF-8 結構資料可以匯出下面嘅文字格式。'],
 ['binary','Base64 / hex','Base64／十六進制','A validated bounded binary encoding adapter is not implemented.','已驗證、有資源限制嘅二進制編碼工具尚未實作。']
] as const;
export const conversionLosses=[
 ['Data conversion can change formatting, comments, YAML tags and original document schema. JSON-compatible values only. Typed XML uses the Material Git JSON schema.','資料轉換可能改變格式、註解、YAML 標籤同原本文件結構。只支援 JSON 相容數值。型別 XML 使用 Material Git JSON 結構。'],
 ['CSV / TSV require record arrays, lose scalar types and represent nested values as JSON cell text. Formula-like cells receive a safety apostrophe. SQL is exported text, never executed.','CSV／TSV 需要記錄陣列，會失去純量型別，巢狀數值變成 JSON 儲存格文字。公式樣式儲存格會加安全單引號。SQL 只匯出文字，唔會執行。'],
 ['Raster output keeps pixel dimensions, flattens animation to one frame and drops metadata, profiles and EXIF orientation. JPEG uses 90% quality and a white transparency background; WebP uses 90% quality.','圖片輸出保留像素尺寸，動畫壓平成一格，移除中繼資料、色彩描述同 EXIF 方向。JPEG 使用 90% 品質同白色透明背景；WebP 使用 90% 品質。'],
 ['Sources remain untouched. Results download as new browser files. This website cannot atomically publish folders or verify disk writes. Files and results stay in memory for this visit only.','來源保持不變，結果會下載成新瀏覽器檔案。網站無法以原子方式發佈資料夾或驗證磁碟寫入。檔案同結果只喺今次瀏覽嘅記憶體保留。']
] as const;
export const queueStateNames={queued:['Queued','等候'],running:['Converting','轉換中'],paused:['Paused','已暫停'],done:['Validated output','已驗證輸出'],failed:['Failed','失敗'],cancelled:['Cancelled','已取消']} as const;
