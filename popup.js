function setStatus(message) {
    document.getElementById('status').textContent = message;
}

function formatTime(timestamp) {
    if (!timestamp) return '';

    return new Date(timestamp).toLocaleString('sv-SE').replace('T', ' ');
}

async function loadSyncSettings() {
    const { syncUrl, syncToken, lastSyncAt } = await chrome.storage.local.get([
        'syncUrl',
        'syncToken',
        'lastSyncAt',
    ]);

    document.getElementById('syncUrl').value = syncUrl || '';
    document.getElementById('syncToken').value = syncToken || '';

    if (lastSyncAt) {
        setStatus(`上次同步：${formatTime(lastSyncAt)}`);
    }
}

async function saveSyncSettings() {
    const syncUrl = document.getElementById('syncUrl').value.trim();
    const syncToken = document.getElementById('syncToken').value.trim();

    await chrome.storage.local.set({ syncUrl, syncToken });

    return { syncUrl, syncToken };
}

document.getElementById('saveSync').addEventListener('click', async () => {
    await saveSyncSettings();
    setStatus('同步设置已保存');
});

document.getElementById('syncNow').addEventListener('click', async () => {
    const btn = document.getElementById('syncNow');
    const originalText = btn.textContent;
    btn.textContent = '同步中...';
    btn.disabled = true;
    setStatus('');

    try {
        await saveSyncSettings();

        const result = await chrome.runtime.sendMessage({ type: 'syncAliases', force: true });

        if (!result?.ok) {
            throw new Error(result?.message || '同步失败。');
        }

        setStatus(`已同步 ${result.count || 0} 条，${formatTime(result.lastSyncAt)}`);
    } catch (error) {
        setStatus(error.message || '同步失败');
        console.error(error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

loadSyncSettings();
