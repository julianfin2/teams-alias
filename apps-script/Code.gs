/*
部署步骤：
1. 在存放别名数据的 Google Sheet 中打开“扩展程序” -> “Apps Script”，把本文件内容粘贴进去。
2. 修改下方 SECRET_TOKEN、SHEET_NAME、START_ROW、END_ROW、ID_COLUMN、ALIAS_COLUMN。
3. 点击“部署” -> “新建部署”，类型选择“Web 应用”。
4. “执行身份”选择“我”，“谁可以访问”选择“任何人”或“知道链接的任何人”。
5. 完成部署后复制 Web App URL，填到插件 popup 的 Apps Script URL 输入框。
6. 将 SECRET_TOKEN 的值填到插件 popup 的 Token 输入框，保存后即可手动同步；之后插件会在距离上次成功同步超过 24 小时时自动同步。
*/

const SECRET_TOKEN = 'CHANGE_ME';
const SHEET_NAME = 'Sheet1';
const START_ROW = 2;
const END_ROW = null;
const ID_COLUMN = 1;
const ALIAS_COLUMN = 2;

function doGet(e) {
  const token = e.parameter.token || '';

  if (token !== SECRET_TOKEN) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return jsonResponse({ error: 'sheet_not_found' }, 404);
  }

  const lastRow = END_ROW || sheet.getLastRow();
  const rowCount = Math.max(lastRow - START_ROW + 1, 0);
  const maxColumn = Math.max(ID_COLUMN, ALIAS_COLUMN);
  const aliases = {};

  if (rowCount > 0) {
    const rows = sheet.getRange(START_ROW, 1, rowCount, maxColumn).getValues();

    rows.forEach(row => {
      const id = String(row[ID_COLUMN - 1] || '').trim();
      const alias = String(row[ALIAS_COLUMN - 1] || '').trim();

      if (id && alias) {
        aliases[id] = alias;
      }
    });
  }

  return jsonResponse({
    aliases,
    updatedAt: new Date().toISOString(),
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
