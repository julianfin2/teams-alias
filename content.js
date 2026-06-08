const PERSON_ID_PREFIX = 'chat-topic-person-';
const ICON_ID_PREFIX = "presence-pill-";
const CHAT_ROSTER_PREFIX = "chat-roster-item-name-";
const SUGGEST_PEOPLE_PREFIX = "AUTOSUGGEST_SUGGESTION_PEOPLE";
const ROSTER_AVATAR_PREFIX = "roster-avatar-img-";
const SERP_PEOPLE_CARD_PREFIX = "serp-people-card-content-";
const PEOPLE_PICKER_PREFIX = "people-picker-entry-";
const PEOPLE_PICKER_SEL_PREFIX = "people-picker-selected-user-";
let debounceTimer = null;
let isMutating = false;

async function getAlias(id) {
    const key = id.replace(PERSON_ID_PREFIX, "");
    const result = await chrome.storage.local.get('aliases');
    const aliases = result.aliases || {};
    return aliases[key] || null;
}

// 设置别名显示 + 按钮添加
function applyAliasAndButton(el) {
    const id = el.id;
    if (!id || !id.startsWith(PERSON_ID_PREFIX)) return;

    const rawId = id.replace(PERSON_ID_PREFIX, "");

    const existingBtn = document.querySelector(`[data-floating-btn-for="${id}"]`);
    if (!existingBtn) {
        const rect = el.getBoundingClientRect();

        const button = document.createElement('button');
        button.textContent = '显示ID'; // 改为显示ID
        button.style.position = 'fixed';
        button.style.left = `${rect.left + window.scrollX}px`;
        button.style.top = `${rect.bottom + window.scrollY + 20}px`;
        button.style.zIndex = '99999';
        button.style.padding = '4px 8px';
        button.style.fontSize = '12px';
        button.style.backgroundColor = '#6c757d'; // 灰色，表示只是信息查看
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.setAttribute('data-floating-btn-for', id);

        button.addEventListener('click', () => {
             // 弹窗显示 ID，方便复制
             prompt("该用户的账号ID为 (请复制):", rawId);
        });

        document.body.appendChild(button);
    }

    // 应用别名（异步）
    getAlias(rawId).then(alias => {
        if (alias && el.textContent !== alias) {
            el.textContent = alias;
        }
    });
}

// 主要查找右侧消息列表中的名字并修改
function applyRightChatAlias(el) {
    let id = el.id;
    if (!id || !id.startsWith(ICON_ID_PREFIX)) return;

    let parent = el;
    // 向上查找 4 个父元素
    for (let i = 0; i < 4; i++) {
        if (parent.parentElement) {
            parent = parent.parentElement;
        } else {
            return; // 如果不足4层，就跳过
        }
    }

    // 获取前一个兄弟元素
    const prevSibling = parent.previousElementSibling;
    if (!prevSibling) return;

    // 向下查找第 4 个子元素（层级式）
    let target = prevSibling;
    for (let i = 0; i < 4; i++) {
        if (target.children.length > 0) {
            target = target.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足4层，跳过
        }
    }
    // 判断符合才修改
    if (target.getAttribute('data-tid') === 'message-author-name') {
        getAlias(id.replace(ICON_ID_PREFIX, "")).then(alias => {
            if (alias && target.textContent !== alias) {
                target.textContent = alias;
            }
        });
    }
}

// 主要查找左侧消息列表中的名字并修改
function applyLeftChatAlias(el) {
    let id = el.id;
    if (!id || !id.startsWith(ICON_ID_PREFIX)) return;

    let parent = el;
    // 向上查找 4 个父元素
    for (let i = 0; i < 4; i++) {
        if (parent.parentElement) {
            parent = parent.parentElement;
        } else {
            return; // 如果不足4层，就跳过
        }
    }

    // 获取后一个兄弟元素
    const nextSibling = parent.nextElementSibling;
    if (!nextSibling) return;

    // 向下查找第 7 个子元素（层级式）
    let target = nextSibling;
    for (let i = 0; i < 7; i++) {
        if (target.children.length > 0) {
            target = target.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足7层，跳过
        }
    }
    // 判断符合才修改
    if (target.id.startsWith('title-chat-list-item')) {
        getAlias(id.replace(ICON_ID_PREFIX, "")).then(alias => {
            if (alias && target.textContent !== alias) {
                target.textContent = alias;
            }
        });
    }
}

// 修改群组人员的名称
function applyChatRosterAlias(el) {
    let id = el.id;
    if (!id || !id.startsWith(CHAT_ROSTER_PREFIX)) return;

    getAlias(id.replace(CHAT_ROSTER_PREFIX, "")).then(alias => {
        if (alias && el.textContent !== alias) {
            el.textContent = alias;
        }
    });
}

// 群组添加人员的别名
function applyPeoplePickerAlias(el) {
    let tid = el.getAttribute('data-tid');
    if (!tid || !tid.startsWith(PEOPLE_PICKER_PREFIX)) return;

    let child = el.children[1];
    // 向下查找第 3 个子元素（层级式）
    for (let i = 0; i < 3; i++) {
        if (child.children.length > 0) {
            child = child.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足3层，跳过
        }
    }
    if (child.tagName.toLowerCase() === 'span') {
        let id = "8:" + tid.replace(PEOPLE_PICKER_PREFIX, "");
        getAlias(id).then(alias => {
            if (alias && child.textContent !== alias) {
                child.textContent = alias;
            }
        });
    }
}

// 群组添加人员时选中的人员
function applyPeoplePickerSelectedAlias(el) {
    let tid = el.getAttribute('data-tid');
    if (!tid || !tid.startsWith(PEOPLE_PICKER_SEL_PREFIX)) return;

    let id = "8:" + tid.replace(PEOPLE_PICKER_SEL_PREFIX, "");
    getAlias(id).then(alias => {
        if (alias && el.textContent !== alias) {
            el.textContent = alias;
        }
    });
}

// 追加搜索框中的人员别名
function applySuggestPeopleAlias(el) {
    let tid = el.getAttribute('data-tid');
    if (!tid || !tid.startsWith(SUGGEST_PEOPLE_PREFIX)) return;

    let child = el.children[1];  // 第二个子元素
    // 向下查找第 2 个子元素（层级式）
    for (let i = 0; i < 2; i++) {
        if (child.children.length > 0) {
            child = child.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足2层，跳过
        }
    }
    if (child.getAttribute('data-tid') !== 'AUTOSUGGEST_SUGGESTION_TITLE') return;

    let id = tid.replace(SUGGEST_PEOPLE_PREFIX, "");
    getAlias(id).then(alias => {
        if (alias) {
            let lastSpan = child.lastElementChild;
            if (lastSpan.id.startsWith("suggest-alias-attached")) {
                if (lastSpan.textContent === `[${alias}]`) return;
                lastSpan.textContent = `[${alias}]`;
            } else {
                const span = document.createElement('span');
                span.id = `suggest-alias-attached-${id}`;
                span.textContent = `[${alias}]`;
                span.style.marginLeft = '4px';
                span.style.color = document.documentElement.classList.contains("theme-tfl-default") ? '#ed0833' : '#78ef0b';
                child.appendChild(span);
            }
        }
    });
}

// 追加人员搜索中的别名
function applySerpPeopleAlias(el) {
    let id = el.id;
    if (!id || !id.startsWith(SERP_PEOPLE_CARD_PREFIX)) return;

    let child = el.children[2];
    // 向下查找第 4 个子元素（层级式）
    for (let i = 0; i < 4; i++) {
        if (child.children.length > 0) {
            child = child.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足4层，跳过
        }
    }

    id = id.replace(SERP_PEOPLE_CARD_PREFIX, "");
    getAlias(id).then(alias => {
        if (alias) {
            let lastSpan = child.lastElementChild;
            if (lastSpan.id.startsWith("people-card-attached")) {
                if (lastSpan.textContent === `[${alias}]`) return;
                lastSpan.textContent = `[${alias}]`;
            } else {
                const span = document.createElement('span');
                span.id = `people-card-attached-${id}`;
                span.textContent = `[${alias}]`;
                span.style.marginLeft = '4px';
                span.style.color = document.documentElement.classList.contains("theme-tfl-default") ? '#ed0833' : '#78ef0b';
                child.appendChild(span);
            }
        }
    });
}

// 修改通话中的人名
function applyCallingAlias(el) {
    if (el.getAttribute('data-cid') !== 'calling-participant-stream') return;

    let child = el.children[1];
    // 向下查找第 5 个子元素（层级式）
    for (let i = 0; i < 5; i++) {
        if (child.children.length > 0) {
            child = child.children[0]; // 每层往下取第一个子元素
        } else {
            return; // 不足5层，跳过
        }
    }
    if (child.tagName.toLowerCase() === 'span') {
        getAlias(el.getAttribute('data-acc-element-id')).then(alias => {
            if (alias && child.textContent !== alias) {
                child.textContent = alias;
            }
        });
    }
}

// 修改通话右侧人名的别名
function applyRosterAvatarAlias(el) {
    let id = el.id;
    if (!id || !id.startsWith(ROSTER_AVATAR_PREFIX)) return;

    getAlias(id.replace(ROSTER_AVATAR_PREFIX, "")).then(alias => {
        if (alias && el.textContent !== alias) {
            el.textContent = alias;
        }
    });
}

// 查看此通话中的人员
function applyPeopleInCall(el) {
    let id = el.id;
    if (!id || !id.startsWith(ICON_ID_PREFIX)) return;

    let parent = el;
    // 向上查找 2 个父元素
    for (let i = 0; i < 2; i++) {
        if (parent.parentElement) {
            parent = parent.parentElement;
        } else {
            return; // 如果不足2层，就跳过
        }
    }
    // 一个是查看此通话中的参与者，一个是呼叫其他人加入
    if ([
        "audio_dropin_add_participants_dialog_renderer",
        "audio-drop-in-live-roster"
    ].includes(parent.getAttribute("data-tid"))) {
        let target = parent.nextElementSibling;
        if (!target) return;
        if (target.tagName.toLowerCase() === "span") {
            getAlias(id.replace(ICON_ID_PREFIX, "")).then(alias => {
                if (alias && target.textContent !== alias) {
                    target.textContent = alias;
                }
            });
        }
    }

}

// 回应表情的人员别名
function applyReactionAlias(el) {
    if (el.getAttribute('data-tid') !== 'diverse-reaction-user-list-item') return;
    try {
        const tabster = JSON.parse(el.getAttribute("data-tabster"));

        let child = el.children[1];
        let target = child.children[0];
        let id = tabster.observed.names[0];
        getAlias(id).then(alias => {
            if (alias && target.textContent !== alias) {
                target.textContent = alias;
            }
        });

    } catch (error) {}
}

// 查找所有目标元素应用别名和按钮
function applyToAll() {
    document.querySelectorAll('[data-floating-btn-for]').forEach(btn => btn.remove());

    const allPersons = document.querySelectorAll(`[id^="${PERSON_ID_PREFIX}"]`);
    allPersons.forEach(el => applyAliasAndButton(el));

    const allIcons = document.querySelectorAll(`[id^="${ICON_ID_PREFIX}"]`);
    allIcons.forEach(el => {
        applyRightChatAlias(el);
        applyLeftChatAlias(el);
        applyPeopleInCall(el);
    });

    const allChatRoster = document.querySelectorAll(`[id^="${CHAT_ROSTER_PREFIX}"]`);
    allChatRoster.forEach(el => applyChatRosterAlias(el));

    const allSuggestPeople = document.querySelectorAll(`[data-tid^="${SUGGEST_PEOPLE_PREFIX}"]`);
    allSuggestPeople.forEach(el => applySuggestPeopleAlias(el));

    const allCalling = document.querySelectorAll(`[data-cid="calling-participant-stream"]`);
    allCalling.forEach(el => applyCallingAlias(el));

    const allRosterAvatar = document.querySelectorAll(`[id^="${ROSTER_AVATAR_PREFIX}"]`);
    allRosterAvatar.forEach(el => applyRosterAvatarAlias(el));

    const allSerpPeople = document.querySelectorAll(`[id^="${SERP_PEOPLE_CARD_PREFIX}"]`);
    allSerpPeople.forEach(el => applySerpPeopleAlias(el));

    const allPeoplePicker = document.querySelectorAll(`[data-tid^="${PEOPLE_PICKER_PREFIX}"]`);
    allPeoplePicker.forEach(el => applyPeoplePickerAlias(el));

    const allPeoplePickerSelected = document.querySelectorAll(`[data-tid^="${PEOPLE_PICKER_SEL_PREFIX}"]`);
    allPeoplePickerSelected.forEach(el => applyPeoplePickerSelectedAlias(el));

    const allReaction = document.querySelectorAll(`[data-tid="diverse-reaction-user-list-item"]`);
    allReaction.forEach(el => applyReactionAlias(el));
}

// 初始化逻辑
function init() {
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (isMutating) return; // 🧠 防止自己触发自己
            isMutating = true;

            applyToAll(); // 页面内容变动后重新应用

            // 给浏览器一点时间完成 DOM 更新后再允许 observer 响应
            setTimeout(() => {
                isMutating = false;
            }, 500); // 至少比这个高才行，不然会一直触发
        }, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    applyToAll(); // 初始执行

    // 兜底：每 2 秒再扫一次（避免漏掉异步更新）
    // setInterval(() => {
    //     applyToAll();
    // }, 2000);
}

init();
