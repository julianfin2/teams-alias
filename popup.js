const REQUIRED_ID_FIELD = '账号ID';
const REQUIRED_ALIAS_FIELD = '最终输出';

function setStatus(message) {
    document.getElementById('status').textContent = message;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(cell);
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(cell);
            if (row.some(value => value.trim() !== '')) rows.push(row);
            row = [];
            cell = '';
            continue;
        }

        cell += char;
    }

    row.push(cell);
    if (row.some(value => value.trim() !== '')) rows.push(row);

    return rows;
}

function normalizeHeader(value) {
    return value.replace(/^\uFEFF/, '').trim();
}

function aliasesFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length === 0) {
        throw new Error('CSV 文件为空。');
    }

    const headers = rows[0].map(normalizeHeader);
    const idIndex = headers.indexOf(REQUIRED_ID_FIELD);
    const aliasIndex = headers.indexOf(REQUIRED_ALIAS_FIELD);

    if (idIndex === -1 || aliasIndex === -1) {
        throw new Error(`CSV 必须包含“${REQUIRED_ID_FIELD}”和“${REQUIRED_ALIAS_FIELD}”两列。`);
    }

    const aliases = {};

    rows.slice(1).forEach(row => {
        const id = (row[idIndex] || '').trim();
        const alias = (row[aliasIndex] || '').trim();

        if (id && alias) {
            aliases[id] = alias;
        }
    });

    return aliases;
}

function decodeCsvBuffer(buffer, encoding) {
    return new TextDecoder(encoding).decode(buffer);
}

function readAliasesFromCsvBuffer(buffer) {
    const encodings = ['utf-8', 'gb18030', 'gbk'];
    let lastError = null;

    for (const encoding of encodings) {
        try {
            return aliasesFromCsv(decodeCsvBuffer(buffer, encoding));
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

// 导入 CSV
document.getElementById('import').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const btn = document.getElementById('import');
    const originalText = btn.textContent;
    btn.textContent = '导入中...';
    btn.disabled = true;
    setStatus('');

    try {
        const buffer = await file.arrayBuffer();
        const aliases = readAliasesFromCsvBuffer(buffer);
        await chrome.storage.local.set({ aliases, lastImport: Date.now(), sourceFileName: file.name });
        setStatus(`已导入 ${Object.keys(aliases).length} 条`);
        alert(`导入成功！共导入 ${Object.keys(aliases).length} 条数据。`);
    } catch (error) {
        setStatus('导入失败');
        alert(error.message || '导入失败，请检查 CSV 文件。');
        console.error(error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        event.target.value = '';
    }
});

// 导出数据
document.getElementById('export').addEventListener('click', async () => {
    const { aliases } = await chrome.storage.local.get('aliases');
    const blob = new Blob([JSON.stringify(aliases || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date()
        .toLocaleString('sv-SE')  // ISO-like 格式
        .replace(' ', '_')
        .replace(/:/g, '-');      // 避免非法文件名

    const a = document.createElement('a');
    a.href = url;
    a.download = `teams-alias-${timestamp}.json`;
    a.click();

    URL.revokeObjectURL(url);
});
