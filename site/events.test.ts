import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportSiteEvent} from '../src/site-shared/events';
import type {ApplicationMessage} from '../src/renderer/localization';
test('site events retain exact bilingual failure facts independently of presentation',()=>{
 const target=new EventTarget(),events:ApplicationMessage[]=[];
 target.addEventListener('application-message',event=>events.push((event as CustomEvent<ApplicationMessage>).detail));
 assert.equal(reportSiteEvent(target,(_en,yue)=>yue,'error','Source failed: HTTP 403. Retry after checking access.','來源失敗：HTTP 403。請檢查權限後重試。'),'來源失敗：HTTP 403。請檢查權限後重試。');
 reportSiteEvent(target,en=>en,'error','Invalid appearance file. Previous styles remain active.','外觀檔案無效，已保留原有樣式。');
 assert.deepEqual(events.map(event=>event.category),['error','error']);
 assert.match(events[0].facts.en,/HTTP 403/);assert.match(events[0].facts.yue,/HTTP 403/);
 assert.match(events[1].facts.en,/Previous styles remain active/);assert.match(events[1].facts.yue,/保留原有/);
});
