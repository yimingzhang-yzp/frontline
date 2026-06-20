/**
 * FRONTLINE — フォーム → Google スプレッドシート転記用 Apps Script
 *
 * 人材登録フォーム（register.html）と企業相談フォーム（for-companies.html）の
 * 全項目を、それぞれ別シートに「日本語の見出し付き」で1行ずつ追記します。
 * 受信データの type（'talent' / 'company'）で振り分けます。
 *
 * ▼ 導入手順（初回）
 *  1. https://script.google.com/ で「新しいプロジェクト」を作成
 *  2. このファイルの内容をすべて貼り付けて保存
 *  3. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *       - 実行ユーザー：自分
 *       - アクセスできるユーザー：全員
 *  4. 発行された「ウェブアプリ URL」を pages.js の SHEET_WEBAPP_URL に貼り付け
 *
 * ▼ このファイルを編集したあとに反映する手順（重要）
 *    内容を変更したら、必ず「デプロイ」→「デプロイを管理」→ 既存デプロイの鉛筆(編集)
 *    →「バージョン」を「新バージョン」にして「デプロイ」を押してください。
 *    （保存だけでは公開中のウェブアプリには反映されません。URL は変わりません）
 */

// 人材登録（register.html）の転記先
var TALENT_SHEET_ID  = '1TrnngXXiWFzNCF6t58lXLRik6MIMiOS0_5Ks7DM-YzM';
// 企業相談（for-companies.html）の転記先
var COMPANY_SHEET_ID = '1bFGk1dVsPngnTrhvMDjQqrHtoPGiSpt1pIaGVmSXUE4';
// お問い合わせ（contact.html）の転記先
var CONTACT_SHEET_ID = '1cetUDyN0n8osYS6jALcplRdQzzz5Bd1Hujp6HIVi-1g';

/**
 * フォーム種別ごとの「列の見出し」と「対応するフォーム項目名」。
 * headers と keys は同じ並び順で1対1に対応します。
 */
function getConfig(type){
  if (type === 'company') {
    return {
      sheetId: COMPANY_SHEET_ID,
      headers: ['送信日時','会社名','ご担当者名','メールアドレス','電話番号','お探しの人材','想定予算（月額）','開始希望時期','解きたい課題','同意','送信元ページ'],
      keys:    ['submittedAt','company','cname','cemail','phone','need','budget','timing','challenge','consent','source']
    };
  }
  if (type === 'contact') {
    return {
      sheetId: CONTACT_SHEET_ID,
      headers: ['送信日時','お問い合わせの種類','お名前','メールアドレス','会社名・組織名','お問い合わせ内容','同意','送信元ページ'],
      keys:    ['submittedAt','topic','name','email','company','message','consent','source']
    };
  }
  // 既定（人材登録）
  return {
    sheetId: TALENT_SHEET_ID,
    headers: ['送信日時','お名前','メールアドレス','現在の職種','強みのある領域','得意なドメイン・業界','希望する働き方','参画可能時期','これまで解いてきた課題','ポートフォリオ / GitHub / LinkedIn','同意','送信元ページ'],
    keys:    ['submittedAt','name','email','role','skill','domain','work','start','exp','portfolio','consent','source']
  };
}

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var type = p.type || 'talent';
    var conf = getConfig(type);

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = SpreadsheetApp.openById(conf.sheetId).getSheets()[0];
      ensureHeaders(sheet, conf.headers);
      var row = conf.keys.map(function (k) { return (p[k] != null) ? p[k] : ''; });
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 1行目を常に正しい見出しに保つ（空なら作成、違っていれば上書き） */
function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var same = true;
  for (var i = 0; i < headers.length; i++) {
    if (String(current[i]) !== headers[i]) { same = false; break; }
  }
  if (!same) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 動作確認用（ブラウザで URL を開いたときの応答）
function doGet() {
  return ContentService
    .createTextOutput('FRONTLINE form endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
