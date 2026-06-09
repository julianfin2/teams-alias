# Teams 别名插件

给 Microsoft Teams 好友的名称添加别名。

别名数据从绑定 Google Sheet 的 Apps Script Web App 同步。插件会用“账号ID”匹配 Teams 用户，并显示对应的“最终输出”。

## 数据源

在 Google Sheet 中维护别名数据，并部署 `apps-script/Code.gs` 作为 Web App。

脚本需要配置：

- `SECRET_TOKEN`：插件请求时携带的校验 token。
- `SHEET_NAME`：数据所在的工作表名称。
- `START_ROW` / `END_ROW`：读取的行范围。
- `ID_COLUMN`：账号 ID 所在列。
- `ALIAS_COLUMN`：别名所在列。

Google Sheet 不需要公开共享。Web App 以部署者身份读取绑定表格，插件通过 URL 和 token 请求数据。

## 使用方式

1. 在 Google Sheet 中打开“扩展程序” -> “Apps Script”，部署 `apps-script/Code.gs`。
2. 部署类型选择 Web App，执行身份选择“我”，访问权限选择“任何人”或“知道链接的任何人”。
3. 在插件弹窗中填写 Apps Script URL 和 Token，并保存同步设置。
4. 点击“立即同步”获取最新别名数据。

手动同步成功后会刷新同步时间。插件后台会定期检查，如果距离上次成功同步超过 24 小时，会自动同步一次。
