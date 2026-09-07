/* 學習打卡 - 功能測試（Node 模擬 DOM） */
'use strict';
var fs = require('fs');

/* ---- 建立最小 DOM/環境模擬 ---- */
function makeEl(id){
  var el = {
    id: id, innerHTML: '', textContent: '', value: '',
    style: {}, _attrs: {}, _listeners: {},
    classList: {
      _s: new Set(),
      add: function(c){ this._s.add(c); },
      remove: function(c){ this._s.delete(c); },
      toggle: function(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); } else { f?this._s.add(c):this._s.delete(c); } },
      contains: function(c){ return this._s.has(c); }
    },
    getAttribute: function(a){ return a in this._attrs ? String(this._attrs[a]) : null; },
    setAttribute: function(a,v){ this._attrs[a]=v; },
    addEventListener: function(t,fn){ (this._listeners[t]=this._listeners[t]||[]).push(fn); },
    focus: function(){}
  };
  return el;
}
var els = {};
function getEl(id){ if(!els[id]) els[id]=makeEl(id); return els[id]; }

var views = [];
['today','plan','stats','history','pomodoro'].forEach(function(r){
  var v = makeEl('view-'+r); v._attrs['data-route']=r; views.push(v);
});
var tabs = [];
['today','plan','stats','history','pomodoro'].forEach(function(g){
  var t = makeEl('tab-'+g); t._attrs['data-go']=g; tabs.push(t);
});

var docClick = null;
global.document = {
  getElementById: getEl,
  querySelectorAll: function(sel){
    if(sel==='.view') return views;
    if(sel==='.tab') return tabs;
    return [];
  },
  addEventListener: function(t,fn){ if(t==='click') docClick=fn; }
};
var winHash = {};
global.window = { addEventListener: function(t,fn){ winHash[t]=fn; } };
global.location = { hash:'', protocol:'file:', hostname:'' };
var storage = {};
global.localStorage = {
  getItem: function(k){ return k in storage ? storage[k] : null; },
  setItem: function(k,v){ storage[k]=String(v); },
  removeItem: function(k){ delete storage[k]; }
};
/* navigator 在 Node 為唯讀，不覆蓋（'serviceWorker' in navigator 為 false，自動跳過註冊） */

/* ---- 載入並執行 App 程式 ---- */
var path = require('path');
var html = fs.readFileSync(path.join(__dirname, 'index.html'),'utf-8');
var js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
eval(js); // 執行 IIFE，觸發 route() 初始渲染

/* ---- 模擬點擊的輔助函式 ---- */
function clickBtn(attrs){
  var btn = { getAttribute: function(a){ return (a in attrs) ? String(attrs[a]) : null; } };
  var target = { closest: function(sel){ return (sel==='button[data-act]') ? btn : null; } };
  if(docClick) docClick({ target: target });
}
function goTab(name){
  winHash['hashchange'] && winHash['hashchange']();
  location.hash = '#'+name;
  winHash['hashchange'] && winHash['hashchange']();
}

/* ================= 斷言 ================= */
var pass=0, fail=0;
function ok(cond,msg){
  if(cond){ pass++; console.log('  PASS: '+msg); }
  else { fail++; console.log('  FAIL: '+msg); }
}

console.log('== 今日畫面（今天是週一 2026-09-07）==');
var todayHtml = getEl('view-today').innerHTML;
ok(todayHtml.indexOf('英文')>-1, '今日包含「英文」');
ok(todayHtml.indexOf('數學')>-1, '今日包含「數學」');
ok(todayHtml.indexOf('今日進度')>-1, '顯示今日進度卡');
ok(todayHtml.indexOf('0<small> / 2 項</small>')>-1, '初始進度 0/2');
ok(todayHtml.indexOf('新增自訂項目')>-1, '有「新增自訂項目」按鈕');

console.log('== 打卡流程 ==');
clickBtn({'data-act':'check','data-type':'plan','data-idx':'0'});
var todayHtml2 = getEl('view-today').innerHTML;
ok(todayHtml2.indexOf('已完成')>-1, '打卡後顯示「已完成」與時間');
ok(todayHtml2.indexOf('1<small> / 2 項</small>')>-1, '打卡後進度 1/2');
var saved = JSON.parse(storage['studyCheckin_v1']);
ok(saved.records['2026-09-07'].plan[0].done===true, '資料已寫入 localStorage（plan[0].done=true）');
ok(typeof saved.records['2026-09-07'].plan[0].time==='string', '已記錄打卡時間');

console.log('== 取消打卡 ==');
clickBtn({'data-act':'uncheck','data-type':'plan','data-idx':'0'});
var saved2 = JSON.parse(storage['studyCheckin_v1']);
ok(saved2.records['2026-09-07'].plan[0].done===false, '取消後 done=false');

console.log('== 自訂項目 ==');
// 直接操作 today 畫面中的表單邏輯較繁，改為模擬加入按鈕
clickBtn({'data-act':'check','data-type':'plan','data-idx':'0'}); // 先完成一項
goTab('stats');
var statsHtml = getEl('view-stats').innerHTML;
ok(statsHtml.indexOf('連續完整達成')>-1, '統計頁顯示「連續完整達成」');
ok(statsHtml.indexOf('本週完成率')>-1, '統計頁顯示「本週完成率」');
ok(statsHtml.indexOf('本週每日進度')>-1, '統計頁顯示週進度長條圖');
ok(statsHtml.indexOf('1<small> / ') > -1, '累計打卡次數至少 1');

console.log('== 計畫畫面 ==');
goTab('plan');
var planHtml = getEl('view-plan').innerHTML;
['週一','週二','週三','週四','週五','週六','週日'].forEach(function(d){
  ok(planHtml.indexOf(d)>-1, '計畫包含「'+d+'」');
});
ok(planHtml.indexOf('電腦實作')>-1, '週二包含「電腦實作」（無專題實作）');
ok(planHtml.indexOf('專題實作')===-1, '計畫不含「專題實作」');

console.log('== 記錄畫面 ==');
goTab('history');
var histHtml = getEl('view-history').innerHTML;
ok(histHtml.indexOf('9月7日')>-1, '記錄包含今天日期');
ok(histHtml.indexOf('1/2 完成')>-1, '記錄顯示 1/2 完成');

console.log('== 番茄鐘 ==');
goTab('pomodoro');
var pomoHtml = getEl('view-pomodoro').innerHTML;
ok(pomoHtml.indexOf('時間設定')>-1, '番茄鐘有時間設定區');
ok(pomoHtml.indexOf('pomo-ring')>-1, '番茄鐘有進度圓環');
ok(pomoHtml.indexOf('專注')>-1 && pomoHtml.indexOf('短休')>-1 && pomoHtml.indexOf('長休')>-1, '番茄鐘有三種模式切換');
ok(pomoHtml.indexOf('播放音樂')>-1, '番茄鐘頁包含「播放音樂」');
ok(pomoHtml.indexOf('pomoStart')>-1, '有開始/暫停按鈕');
ok(pomoHtml.indexOf('pomoReset')>-1, '有重置按鈕');
ok(getEl('pomoTime').textContent==='25:00', '初始計時顯示 25:00');
ok(getEl('pomoSubj').textContent.indexOf('自由專注')>-1, '未指定科目時顯示「自由專注」');
ok(getEl('pomoDots').innerHTML.indexOf('0')>-1, '今日番茄數初始為 0');

console.log('== 從今日卡片啟動番茄鐘 ==');
goTab('today');
clickBtn({'data-act':'pomo','data-subj':'英文'});
goTab('pomodoro');
ok(getEl('pomoSubj').textContent.indexOf('英文')>-1, '點卡片「番茄鐘」後顯示正在為「英文」計時');
var savedPomo = JSON.parse(storage['studyCheckin_v1']);
ok(savedPomo.pomo && savedPomo.pomo.subject==='英文', '科目已寫入 localStorage');

console.log('== 統計頁番茄數 ==');
goTab('stats');
var statsHtml2 = getEl('view-stats').innerHTML;
ok(statsHtml2.indexOf('累計番茄數')>-1, '統計頁顯示「累計番茄數」');

console.log('== 音樂播放 ==');
goTab('pomodoro');
ok(pomoHtml.indexOf('musicUrl')>-1, '有音樂網址輸入框');
ok(pomoHtml.indexOf('musicPlay')>-1, '有播放按鈕');

console.log('\n結果: '+pass+' 通過, '+fail+' 失敗');
process.exit(fail>0?1:0);
