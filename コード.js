// スプレッドシートID（自動取得）
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// OpenWeatherMap APIキー（スクリプトプロパティから取得）
// セットアップ: スクリプトエディタで「プロジェクトの設定」→「スクリプト プロパティ」→「OPENWEATHER_API_KEY」を追加
function getWeatherApiKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENWEATHER_API_KEY');
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
        result = {
          drones: getDrones(),
          pilots: getPilots(),
          flightLogs: getFlightLogs(),
          maintenanceLogs: getMaintenanceLogs(),
          flightPurposes: getFlightPurposes(),
          maintenanceContents: getMaintenanceContents(),
          technicians: getTechnicians(),
          maintenanceLocations: getMaintenanceLocations()
        };
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

// ─── 機体 ────────────────────────────────────────────────────────────────────

function getDrones() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('機体');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function addDrone(drone) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('機体');
  if (!sheet) {
    sheet = ss.insertSheet('機体');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('機体');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(drone.id)) {
      headers.forEach((h, c) => {
        if (drone[h] !== undefined) sheet.getRange(r + 1, c + 1).setValue(drone[h]);
      });
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deleteDrone(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('機体');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('操縦者');
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

function addPilot(pilot) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('操縦者');
  if (!sheet) {
    sheet = ss.insertSheet('操縦者');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('操縦者');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(pilot.id)) {
      headers.forEach((h, c) => {
        if (pilot[h] !== undefined) {
          const val = h === 'limitations' && typeof pilot[h] === 'object'
            ? JSON.stringify(pilot[h])
            : pilot[h];
          sheet.getRange(r + 1, c + 1).setValue(val);
        }
      });
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deletePilot(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('操縦者');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('飛行記録');
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

function addFlightLog(log) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('飛行記録');
  if (!sheet) {
    sheet = ss.insertSheet('飛行記録');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('飛行記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const JSON_FIELDS = ['preflightChecks','postflightChecks','sessions'];
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(log.id)) {
      headers.forEach((h, c) => {
        if (log[h] !== undefined) {
          const val = JSON_FIELDS.includes(h) && typeof log[h] === 'object'
            ? JSON.stringify(log[h])
            : log[h];
          sheet.getRange(r + 1, c + 1).setValue(val);
        }
      });
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

// ─── 整備記録 ────────────────────────────────────────────────────────────────

function getMaintenanceLogs() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('整備記録');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).reverse();
}

function addMaintenanceLog(log) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('整備記録');
  if (!sheet) {
    sheet = ss.insertSheet('整備記録');
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

function deleteFlightLog(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('飛行記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(data.id)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function updateMaintenanceLog(log) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('整備記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(log.id)) {
      headers.forEach((h, c) => {
        if (log[h] !== undefined) sheet.getRange(r + 1, c + 1).setValue(log[h]);
      });
      return { success: true };
    }
  }
  return { error: 'レコードが見つかりません' };
}

function deleteMaintenanceLog(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('整備記録');
  if (!sheet) return { error: 'シートが見つかりません' };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
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
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('飛行目的');
  if (!sheet) {
    sheet = ss.insertSheet('飛行目的');
    sheet.appendRow(['purpose']);
    ['空撮','測量','点検','農薬散布','配送','訓練','趣味'].forEach(p => sheet.appendRow([p]));
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ['空撮','測量','点検','農薬散布','配送','訓練','趣味'];
  return data.slice(1).map(row => row[0]).filter(p => p);
}

function addFlightPurpose(purpose) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('飛行目的');
  if (!sheet) { sheet = ss.insertSheet('飛行目的'); sheet.appendRow(['purpose']); }
  if (!getFlightPurposes().includes(purpose)) {
    sheet.appendRow([purpose]);
  }
  return { success: true };
}

function getMaintenanceContents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('整備内容');
  if (!sheet) return ['定期点検実施（異常なし）','機体全体の目視点検','プロペラの点検・清掃','バッテリーの点検・充電確認','センサー類の動作確認','モーターの点検','フレームの点検・清掃','部品交換'];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => row[0]).filter(c => c);
}

function addMaintenanceContent(content) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('整備内容');
  if (!sheet) {
    sheet = ss.insertSheet('整備内容');
    sheet.appendRow(['content']);
    ['定期点検実施（異常なし）','機体全体の目視点検','プロペラの点検・清掃','バッテリーの点検・充電確認','センサー類の動作確認','モーターの点検','フレームの点検・清掃','部品交換'].forEach(c => sheet.appendRow([c]));
  }
  if (!getMaintenanceContents().includes(content)) {
    sheet.appendRow([content]);
  }
  return { success: true };
}

function getTechnicians() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('作業者');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => row[0]).filter(t => t);
}

function addTechnician(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('作業者');
  if (!sheet) { sheet = ss.insertSheet('作業者'); sheet.appendRow(['name']); }
  if (!getTechnicians().includes(name)) { sheet.appendRow([name]); }
  return { success: true };
}

function getMaintenanceLocations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('整備場所');
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1).map(r => r[0]).filter(v => v);
}

function addMaintenanceLocation(loc) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('整備場所');
  if (!sheet) { sheet = ss.insertSheet('整備場所'); sheet.appendRow(['location']); }
  if (!getMaintenanceLocations().includes(loc)) { sheet.appendRow([loc]); }
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
