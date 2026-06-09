const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const AUTO_SYNC_ALARM = 'aliases-auto-sync';

function scheduleAutoSync() {
    chrome.alarms.create(AUTO_SYNC_ALARM, {
        delayInMinutes: 1,
        periodInMinutes: 60,
    });
}

async function syncAliases({ force = false } = {}) {
    const { syncUrl, syncToken, lastSyncAt } = await chrome.storage.local.get([
        'syncUrl',
        'syncToken',
        'lastSyncAt',
    ]);

    if (!syncUrl || !syncToken) {
        return { ok: false, skipped: true, message: '请先设置同步地址和 Token。' };
    }

    if (!force && lastSyncAt && Date.now() - lastSyncAt < SYNC_INTERVAL_MS) {
        return { ok: true, skipped: true, message: '24 小时内已同步。' };
    }

    const url = new URL(syncUrl);
    url.searchParams.set('token', syncToken);

    const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`同步失败：HTTP ${response.status}`);
    }

    const data = await response.json();
    const aliases = data.aliases;

    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
        throw new Error('同步失败：返回数据缺少 aliases。');
    }

    const lastSyncAtNow = Date.now();
    await chrome.storage.local.set({
        aliases,
        lastSyncAt: lastSyncAtNow,
        lastSyncSource: 'app-script',
    });

    return {
        ok: true,
        skipped: false,
        count: Object.keys(aliases).length,
        lastSyncAt: lastSyncAtNow,
    };
}

chrome.runtime.onInstalled.addListener(scheduleAutoSync);
chrome.runtime.onStartup.addListener(scheduleAutoSync);

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== AUTO_SYNC_ALARM) return;
    syncAliases().catch(error => {
        console.error(error);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'syncAliases') return false;

    syncAliases({ force: Boolean(message.force) })
        .then(sendResponse)
        .catch(error => {
            sendResponse({ ok: false, message: error.message || '同步失败。' });
        });

    return true;
});
