// スプレッドシートID（自動取得）
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// OpenWeatherMap APIキー（スクリプトプロパティから取得）
function getWeatherApiKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENWEATHER_API_KEY');
}

// ─── スプレッドシートキャッシュ（1リクエスト内で1回だけ openById する）────────
let _ss_ = null;
function ss_() {
  if (!_ss_) _ss_ = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ss_;
}

// CORS対応
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    let result;

    switch(action) {
      case 'getDrones':
        result = getDrones();
        break;
      case 'addDrone':
        result = addDrone(params.data);
        break;
      case 'updateDrone':
        result = updateDrone(params.data);
        break;
      case 'getPilots':
        result = getPilots();
        break;
      case 'addPilot':
        result = addPilot(params.data);
        break;
      case 'updatePilot':
        result = updatePilot(params.data);
        break;
      case 'getFlightLogs':
        result = getFlightLogs();
        break;
      case 'addFlightLog':
        result = addFlightLog(params.data);
        break;
      case 'updateFlightLog':
        result = updateFlightLog(params.data);
        break;
      case 'getMaintenanceLogs':
        result = getMaintenanceLogs();
        break;
      case 'addMaintenanceLog':
        result = addMaintenanceLog(params.data);
        break;
      case 'updateMaintenanceLog':
        result = updateMaintenanceLog(params.data);
        break;
      case 'deleteFlightLog':
        result = deleteFlightLog(params.data);
        break;
      case 'deleteMaintenanceLog':
        result = deleteMaintenanceLog(params.data);
        break;
      case 'deleteDrone':
        result = deleteDrone(params.data);
        break;
      case 'deletePilot':
        result = deletePilot(params.data);
        break;
      case 'getAllData':
        result = getAllData_();
        break;
      case 'addFlightPurpose':
        result = addFlightPurpose(params.data);
        break;
      case 'addMaintenanceContent':
        result = addMaintenanceContent(params.data);
        break;
      case 'addTechnician':
        result = addTechnician(params.data);
        break;
      case 'addMaintenanceLocation':
        result = addMaintenanceLocation(params.data);
        break;
      case 'getWeather':
        result = getWeather(params.data);
        break;
      case 'getAddress':
        result = getAddress(params.data);
        break;
      default:
        result = { error: 'Invalid action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── getAllData（スプレッドシートを1回だけ開いて全シートを一括取得）────────────
function getAllData_() {
  const ss = ss_();
  // 全シートオブジェクトを一度に取得してマップ化
  const sheetMap = {};
  ss.getSheets().forEach(s => { sheetMap[s.getName()] = s; });

  return {
    drones:              readSheetAsObjects_(sheetMap['機体'],    []),
    pilots:              readPilots_(sheetMap['操縦者']),
    flightLogs:          readFlightLogs_(sheetMap['飛行記録']),
    maintenanceLogs:     readSheetAsObjects_(sheetMap['整備記録'], []).reverse(),
    flightPurposes:      readSingleColumn_(sheetMap['飛行目的'],  ['空撮','測量','点検','農薬散布','配送','訓練','趣味']),
    maintenanceContents: readSingleColumn_(sheetMap['整備内容'],  ['定期点検実施（異常なし）','機体全体の目視点検','プロペラの点検・清掃','バッテリーの点検・充電確認','センサー類の動作確認','モーターの点検','フレームの点検・清掃','部品交換']),
    technicians:         readSingleColumn_(sheetMap['作業者'],    []),
    maintenanceLocations:readSingleColumn_(sheetMap['整備場所'],  [])
  };
}

// ─── 共通読み込みヘルパー ──────────────────────────────────────────────────────

// ヘッダー行付きシートをオブジェクト配列に変換
function readSheetAsObjects_(sheet, defaultVal) {
  if (!sheet) return defaultVal;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return defaultVal;
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// 1列目のみのシートを配列に変換
function readSingleColumn_(sheet, defaultVal) {
  if (!sheet) return defaultVal;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return defaultVal;
  return data.slice(1).map(row => row[0]).filter(v => v);
}

// 操縦者（limitations列はJSONパース）
function readPilots_(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h === 'limitations' && row[i]) {
        try { obj[h] = JSON.parse(row[i]); } catch(e) { obj[h] = null; }
      } else {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

// 飛行記録（JSON列のパース＋逆順）
function readFlightLogs_(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const JSON_FIELDS = ['preflightChecks','postflightChecks','sessions'];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (JSON_FIELDS.includes(h) && row[i]) {
        try { obj[h] = JSON.parse(row[i]); } catch(e) { obj[h] = null; }
      } else {
        obj[h] = row[i];
      }
    });
    return obj;
  }).reverse();
}

// ─── 機体 ────────────────────────────────────────────────────────────────────

function getDrones() {
  const sheet = ss_().getSheetByName('機体');
  return readSheetAsObjects_(sheet, []);
}

function addDrone(drone) {
  const s = ss_();
  let sheet = s.getSheetByName('機体');
  if (!sheet) {
    sheet = s.insertSheet('機体');
    sheet.appendRow(['id','manufacturer','model','serialNumber','registrationNumber',
                     'weight','purchaseDate','appRegisteredDate','preRegistrationMins']);
  }
  const id = new Date().getTime().toString();
  sheet.appendRow([
    id,
    drone.manufacturer,
    drone.model,
    drone.serialNumber,
    drone.registrationNumber || '',
    drone.weight,
    drone.purchaseDate,
    drone.appRegisteredDate || '',
    drone.preRegistrationMins || 0
  ]);
  return { success: true, id: id };
}

function updateDrone(drone) {
  const sheet = ss_().getSheetByName('機体');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(drone.id)) {
      const newRow = headers.map((h, c) => drone[h] !== undefined ? drone[h] : data[r][c]);
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([newRow]);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deleteDrone(data) {
  const sheet = ss_().getSheetByName('機体');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const idCol = values[0].indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(data.id)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

// ─── 操縦者 ──────────────────────────────────────────────────────────────────

function getPilots() {
  const sheet = ss_().getSheetByName('操縦者');
  return readPilots_(sheet);
}

function addPilot(pilot) {
  const s = ss_();
  let sheet = s.getSheetByName('操縦者');
  if (!sheet) {
    sheet = s.insertSheet('操縦者');
    sheet.appendRow(['id','name','licenseType','licenseNumber','issueDate','expiryDate',
                     'birthDate','address','phone','email','notes','limitations']);
  }
  const id = new Date().getTime().toString();
  sheet.appendRow([
    id,
    pilot.name,
    pilot.licenseType,
    pilot.licenseNumber || '',
    pilot.issueDate || '',
    pilot.expiryDate || '',
    pilot.birthDate,
    pilot.address || '',
    pilot.phone || '',
    pilot.email || '',
    pilot.notes || '',
    pilot.limitations ? JSON.stringify(pilot.limitations) : ''
  ]);
  return { success: true, id: id };
}

function updatePilot(pilot) {
  const sheet = ss_().getSheetByName('操縦者');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(pilot.id)) {
      const newRow = headers.map((h, c) => {
        if (pilot[h] === undefined) return data[r][c];
        return (h === 'limitations' && typeof pilot[h] === 'object') ? JSON.stringify(pilot[h]) : pilot[h];
      });
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([newRow]);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deletePilot(data) {
  const sheet = ss_().getSheetByName('操縦者');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const idCol = values[0].indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(data.id)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

// ─── 飛行記録 ────────────────────────────────────────────────────────────────

function getFlightLogs() {
  const sheet = ss_().getSheetByName('飛行記録');
  return readFlightLogs_(sheet);
}

function addFlightLog(log) {
  const s = ss_();
  let sheet = s.getSheetByName('飛行記録');
  if (!sheet) {
    sheet = s.insertSheet('飛行記録');
    sheet.appendRow([
      'id','droneId','pilotId','date','startTime','endTime',
      'takeoffAddress','landingAddress','takeoffLocation','landingLocation',
      'location','purpose','flightMode','weather','notes',
      'preflightChecks','preflightNotes','postflightChecks','postflightNotes',
      'flightReport','sessions','totalFlightSecs','createdAt'
    ]);
  }
  const id = new Date().getTime().toString();
  sheet.appendRow([
    id,
    log.droneId,
    log.pilotId || '',
    log.date,
    log.startTime || '',
    log.endTime || '',
    log.takeoffAddress || '',
    log.landingAddress || '',
    log.takeoffLocation || '',
    log.landingLocation || '',
    log.location,
    log.purpose,
    log.flightMode || '',
    log.weather,
    log.notes || '',
    log.preflightChecks  ? JSON.stringify(log.preflightChecks)  : '',
    log.preflightNotes  || '',
    log.postflightChecks ? JSON.stringify(log.postflightChecks) : '',
    log.postflightNotes || '',
    log.flightReport    || '',
    log.sessions        ? JSON.stringify(log.sessions)          : '',
    log.totalFlightSecs || 0,
    new Date().toISOString()
  ]);
  return { success: true, id: id };
}

function updateFlightLog(log) {
  const sheet = ss_().getSheetByName('飛行記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const JSON_FIELDS = ['preflightChecks','postflightChecks','sessions'];
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(log.id)) {
      const newRow = headers.map((h, c) => {
        if (log[h] === undefined) return data[r][c];
        return (JSON_FIELDS.includes(h) && typeof log[h] === 'object') ? JSON.stringify(log[h]) : log[h];
      });
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([newRow]);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deleteFlightLog(data) {
  const sheet = ss_().getSheetByName('飛行記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const idCol = values[0].indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(data.id)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

// ─── 整備記録 ────────────────────────────────────────────────────────────────

function getMaintenanceLogs() {
  const sheet = ss_().getSheetByName('整備記録');
  return readSheetAsObjects_(sheet, []).reverse();
}

function addMaintenanceLog(log) {
  const s = ss_();
  let sheet = s.getSheetByName('整備記録');
  if (!sheet) {
    sheet = s.insertSheet('整備記録');
    sheet.appendRow(['id','droneId','date','type','technician','description',
                     'maintenanceLocation','nextDate','notes','createdAt']);
  }
  const id = new Date().getTime().toString();
  sheet.appendRow([
    id,
    log.droneId,
    log.date,
    log.type,
    log.technician,
    log.description,
    log.maintenanceLocation || '',
    log.nextDate || '',
    log.notes || '',
    new Date().toISOString()
  ]);
  return { success: true, id: id };
}

function updateMaintenanceLog(log) {
  const sheet = ss_().getSheetByName('整備記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(log.id)) {
      const newRow = headers.map((h, c) => log[h] !== undefined ? log[h] : data[r][c]);
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([newRow]);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deleteMaintenanceLog(data) {
  const sheet = ss_().getSheetByName('整備記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const idCol = values[0].indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(data.id)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

// ─── 飛行目的 ────────────────────────────────────────────────────────────────

function getFlightPurposes() {
  const sheet = ss_().getSheetByName('飛行目的');
  return readSingleColumn_(sheet, ['空撮','測量','点検','農薬散布','配送','訓練','趣味']);
}

function addFlightPurpose(purpose) {
  const s = ss_();
  let sheet = s.getSheetByName('飛行目的');
  if (!sheet) {
    sheet = s.insertSheet('飛行目的');
    sheet.appendRow(['purpose']);
    ['空撮','測量','点検','農薬散布','配送','訓練','趣味'].forEach(p => sheet.appendRow([p]));
  }
  // 既存値をシートから直接読んで重複チェック（getFlightPurposes()の再呼び出しを避ける）
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[0]);
  if (!existing.includes(purpose)) sheet.appendRow([purpose]);
  return { success: true };
}

// ─── 整備内容 ────────────────────────────────────────────────────────────────

function getMaintenanceContents() {
  const sheet = ss_().getSheetByName('整備内容');
  return readSingleColumn_(sheet, ['定期点検実施（異常なし）','機体全体の目視点検','プロペラの点検・清掃','バッテリーの点検・充電確認','センサー類の動作確認','モーターの点検','フレームの点検・清掃','部品交換']);
}

function addMaintenanceContent(content) {
  const s = ss_();
  let sheet = s.getSheetByName('整備内容');
  if (!sheet) {
    sheet = s.insertSheet('整備内容');
    sheet.appendRow(['content']);
    ['定期点検実施（異常なし）','機体全体の目視点検','プロペラの点検・清掃','バッテリーの点検・充電確認','センサー類の動作確認','モーターの点検','フレームの点検・清掃','部品交換'].forEach(c => sheet.appendRow([c]));
  }
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[0]);
  if (!existing.includes(content)) sheet.appendRow([content]);
  return { success: true };
}

// ─── 作業者 ──────────────────────────────────────────────────────────────────

function getTechnicians() {
  const sheet = ss_().getSheetByName('作業者');
  return readSingleColumn_(sheet, []);
}

function addTechnician(name) {
  const s = ss_();
  let sheet = s.getSheetByName('作業者');
  if (!sheet) { sheet = s.insertSheet('作業者'); sheet.appendRow(['name']); }
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[0]);
  if (!existing.includes(name)) sheet.appendRow([name]);
  return { success: true };
}

// ─── 整備場所 ────────────────────────────────────────────────────────────────

function getMaintenanceLocations() {
  const sheet = ss_().getSheetByName('整備場所');
  return readSingleColumn_(sheet, []);
}

function addMaintenanceLocation(loc) {
  const s = ss_();
  let sheet = s.getSheetByName('整備場所');
  if (!sheet) { sheet = s.insertSheet('整備場所'); sheet.appendRow(['location']); }
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[0]);
  if (!existing.includes(loc)) sheet.appendRow([loc]);
  return { success: true };
}

// ─── 住所取得（Google Maps 逆ジオコーディング）─────────────────────────────────

function getAddress(data) {
  try {
    const geocoder = Maps.newGeocoder().setLanguage('ja');
    const result = geocoder.reverseGeocode(parseFloat(data.lat), parseFloat(data.lon));
    if (result.status !== 'OK' || !result.results || result.results.length === 0) {
      return { error: 'status=' + result.status, address: '' };
    }
    const addr = result.results[0].formatted_address
      .replace(/^日本[、,]\s*/, '')
      .replace(/〒\d{3}-\d{4}\s*/, '')
      .trim();
    return { success: true, address: addr };
  } catch(error) {
    return { error: error.toString(), address: '' };
  }
}

// ─── 気象情報 ────────────────────────────────────────────────────────────────

function getWeather(data) {
  const apiKey = getWeatherApiKey();
  if (!apiKey) {
    return { error: 'APIキーが設定されていません', text: '晴れ、北風3m/s (APIキー未設定)' };
  }
  try {
    const url = 'https://api.openweathermap.org/data/2.5/weather?lat=' + data.lat
              + '&lon=' + data.lng + '&appid=' + apiKey + '&units=metric&lang=ja';
    const response = UrlFetchApp.fetch(url);
    const w = JSON.parse(response.getContentText());
    if (w.cod !== 200) throw new Error('気象データ取得失敗');

    const desc     = w.weather[0].description;
    const speed    = w.wind.speed.toFixed(1);
    const dirs     = ['北','北北東','北東','東北東','東','東南東','南東','南南東',
                      '南','南南西','南西','西南西','西','西北西','北西','北北西'];
    const dir      = dirs[Math.round(w.wind.deg / 22.5) % 16];
    const text     = desc + '、' + dir + 'の風' + speed + 'm/s';

    return {
      success: true,
      text: text,
      raw: { temperature: w.main.temp, humidity: w.main.humidity, pressure: w.main.pressure }
    };
  } catch(error) {
    Logger.log('気象情報取得エラー: ' + error.toString());
    return { error: error.toString(), text: '晴れ、北風3m/s (取得失敗)' };
  }
}
