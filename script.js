/**
 * ======================= INDEXEDDB WRAPPER (PENYIMPANAN SKALA BESAR) =======================
 * Menggunakan IndexedDB untuk menyimpan hingga jutaan data.
 * Semua operasi bersifat asinkron (async/await).
 */
const DB_NAME = 'BigDataSPA';
const DB_VERSION = 2;
const STORE_NAME = 'items';
let db = null;

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        if (db && db.name === DB_NAME) return resolve(db);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('by_name', 'name', { unique: false });
                store.createIndex('by_tags', 'tags', { multiEntry: true });
            }
        };
    });
}

async function getAllItems() {
    const database = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function saveItem(item) {
    const database = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItemById(id) {
    const database = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function deleteMultipleItems(ids) {
    const database = await openIndexedDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const promises = ids.map(id => new Promise((res, rej) => {
        const req = store.delete(id);
        req.onsuccess = res;
        req.onerror = rej;
    }));
    await Promise.all(promises);
}

async function clearAllItems() {
    const database = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function replaceAllItems(newItems) {
    await clearAllItems();
    const database = await openIndexedDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of newItems) {
        store.put(item);
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

/**
 * ======================= OPFS BACKUP & RESTORE =======================
 * Menyimpan seluruh data ke file sistem lokal (hanya browser modern).
 */
// ======================= BACKUP & RESTORE dengan FILE SYSTEM ACCESS API =======================
// Backup: simpan data ke file .json pilihan pengguna
async function backupToOPFS() {
    // Cek dukungan File System Access API
    if (!window.showSaveFilePicker) {
        // Fallback: download biasa
        const items = await getAllItems();
        const dataStr = JSON.stringify(items, null, 2);
        download(dataStr, 'spa_backup.json', 'application/json');
        alert(`Backup berhasil! ${items.length} item di-download.`);
        return true;
    }
    
    try {
        const items = await getAllItems();
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        // Tampilkan dialog simpan file
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'spa_backup.json',
            types: [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] }
            }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        alert(`Backup berhasil! ${items.length} item disimpan ke ${fileHandle.name}`);
        return true;
    } catch (err) {
        if (err.name === 'AbortError') {
            // User membatalkan dialog, tidak perlu error
            return false;
        }
        console.error('Backup Error:', err);
        alert('Gagal backup: ' + err.message);
        return false;
    }
}

// Restore: buka file .json pilihan pengguna
async function restoreFromOPFS() {
    if (!window.showOpenFilePicker) {
        // Fallback: input file biasa
        document.getElementById('importFileInput').click();
        return false;
    }
    
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] }
            }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const items = JSON.parse(text);
        if (!Array.isArray(items)) throw new Error('File backup tidak valid');
        
        await replaceAllItems(items);
        await refreshMain();
        await refreshEdit();
        
        alert(`Restore berhasil! ${items.length} item dimuat dari ${fileHandle.name}`);
        return true;
    } catch (err) {
        if (err.name === 'AbortError') {
            return false;
        }
        console.error('Restore Error:', err);
        alert('Gagal restore: ' + err.message);
        return false;
    }
}
/**
 * ======================= UTILITIES =======================
 */
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 8); }
function parseTags(tagStr) { return tagStr.trim() ? tagStr.split(',').map(t => t.trim()).filter(t => t) : []; }
function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'); }
function escapeXml(s) { return s ? s.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;') : ''; }
function download(content, fn, type) { const a = document.createElement('a'); const blob = new Blob([content], { type }); a.href = URL.createObjectURL(blob); a.download = fn; a.click(); URL.revokeObjectURL(a.href); }
function getTagValue(parent, tag) { const el = parent.getElementsByTagName(tag)[0]; return el ? el.textContent : ''; }

/**
 * ======================= STATE GLOBAL (CACHE) =======================
 */
let currentItems = [];           // cache semua item dari IndexedDB
let selectedItemId = null;       // id item yang sedang dipilih di main view
let currentSearchQuery = "";     // query pencarian di main view
let mainCurrentPage = 1;
const MAIN_ITEMS_PER_PAGE = 20;
let mainFilteredItems = [];

let editCurrentPage = 1;
const EDIT_ITEMS_PER_PAGE = 20;
let editFilteredItems = [];
let editSearchKeyword = "";
let selectedEditItemIds = new Set();   // id-item yang dicentang di edit view

let currentExtraFields = [];           // untuk form tambah/edit

/**
 * ======================= FUNGSI REFRESH & RENDER =======================
 */
async function refreshCache() {
    currentItems = await getAllItems();
    await updateStorageInfo();
}

async function refreshMain() {
    await refreshCache();
    updateMainFiltered();
    renderMainList();
    updateSidebar();
}

async function refreshEdit() {
    await refreshCache();
    updateEditFilteredItems();
    renderEditList();
}

// Update info penyimpanan (jumlah item & estimasi ukuran)
async function updateStorageInfo() {
    const items = await getAllItems();
    const total = items.length;
    document.getElementById('totalItemsCount').innerText = total;
    const approx = JSON.stringify(items).length;
    const sizeText = approx < 1024 ? approx + ' B' : (approx / 1024).toFixed(1) + ' KB';
    document.getElementById('storageSize').innerText = sizeText;
}

// Filter main view berdasarkan query (biasa + tag #)
function updateMainFiltered() {
    const q = currentSearchQuery.trim();
    if (!q) { mainFilteredItems = [...currentItems]; return; }
    const parts = q.split(/\s+/);
    const tagFilters = [], keywords = [];
    for (let p of parts) {
        if (p.startsWith('#')) { let tn = p.slice(1).toLowerCase(); if (tn) tagFilters.push(tn); }
        else if (p) keywords.push(p.toLowerCase());
    }
    mainFilteredItems = currentItems.filter(item => {
        for (let kw of keywords) {
            if (!item.name.toLowerCase().includes(kw) && !item.description.toLowerCase().includes(kw)) return false;
        }
        if (tagFilters.length) {
            const itemTags = (item.tags || []).map(t => t.toLowerCase());
            for (let tf of tagFilters) if (!itemTags.includes(tf)) return false;
        }
        return true;
    });
}

function renderMainList() {
    const total = mainFilteredItems.length;
    const totalPages = Math.ceil(total / MAIN_ITEMS_PER_PAGE);
    if (mainCurrentPage > totalPages && totalPages > 0) mainCurrentPage = totalPages;
    if (mainCurrentPage < 1) mainCurrentPage = 1;
    const start = (mainCurrentPage - 1) * MAIN_ITEMS_PER_PAGE;
    const pageItems = mainFilteredItems.slice(start, start + MAIN_ITEMS_PER_PAGE);
    const container = document.getElementById('itemsListContainer');
    if (!pageItems.length) container.innerHTML = '<div class="empty-message">Tidak ada data</div>';
    else {
        container.innerHTML = pageItems.map(item => `
            <div class="item-card ${selectedItemId === item.id ? 'selected' : ''}" data-id="${item.id}">
                <div class="item-info">
                    <h3>${escapeHtml(item.name)}</h3>
                    <div class="item-tags">${(item.tags || []).map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}</div>
                </div>
            </div>
        `).join('');
    }
    document.getElementById('mainPrevPageBtn').disabled = mainCurrentPage <= 1;
    document.getElementById('mainNextPageBtn').disabled = mainCurrentPage >= totalPages;
    document.getElementById('mainPageInfo').innerText = `Halaman ${mainCurrentPage} / ${totalPages || 1} (${total} item)`;
}

async function updateSidebar() {
    if (!selectedItemId) {
        document.getElementById('detailImg').src = "https://picsum.photos/id/20/300/200";
        document.getElementById('detailDescText').innerHTML = "Pilih item";
        document.getElementById('detailTags').innerHTML = '<span style="color:gray;">-</span>';
        document.getElementById('detailExtraFields').innerHTML = '<span style="color:gray;">-</span>';
        return;
    }
    const item = currentItems.find(i => i.id === selectedItemId);
    if (!item) { selectedItemId = null; updateSidebar(); return; }
    document.getElementById('detailImg').src = item.imageUrl;
    document.getElementById('detailDescText').innerHTML = item.description || "Tidak ada";
    document.getElementById('detailTags').innerHTML = (item.tags || []).map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('') || '-';
    const extraDiv = document.getElementById('detailExtraFields');
    if (item.extra && item.extra.length) {
        extraDiv.innerHTML = item.extra.map(e => `
            <div class="extra-field-item">
                <div class="extra-key" style="color: ${e.keyColor || '#000000'};">${escapeHtml(e.key)} :</div>
                <div class="extra-value" style="color: ${e.valueColor || '#777777'};">${escapeHtml(e.value)}</div>
            </div>
        `).join('');
    } else {
        extraDiv.innerHTML = '<span style="color:gray;">Tidak ada informasi tambahan</span>';
    }
}

// Filter edit view
function updateEditFilteredItems() {
    if (!editSearchKeyword.trim()) editFilteredItems = [...currentItems];
    else {
        const kw = editSearchKeyword.toLowerCase();
        editFilteredItems = currentItems.filter(i => i.name.toLowerCase().includes(kw) || (i.tags || []).some(t => t.toLowerCase().includes(kw)));
    }
    editCurrentPage = 1;
    renderEditList();
}

function renderEditList() {
    const total = editFilteredItems.length;
    const totalPages = Math.ceil(total / EDIT_ITEMS_PER_PAGE);
    const start = (editCurrentPage - 1) * EDIT_ITEMS_PER_PAGE;
    const pageItems = editFilteredItems.slice(start, start + EDIT_ITEMS_PER_PAGE);
    const container = document.getElementById('editItemsList');
    if (!pageItems.length) container.innerHTML = '<div class="empty-message">Tidak ada data</div>';
    else {
        container.innerHTML = pageItems.map(item => `
            <div class="edit-item-row" data-id="${item.id}">
                <div class="edit-item-left">
                    <input type="checkbox" class="edit-item-checkbox" data-id="${item.id}" ${selectedEditItemIds.has(item.id) ? 'checked' : ''}>
                    <div class="edit-item-info">
                        <strong>${escapeHtml(item.name)}</strong>
                        <div style="font-size:0.75rem; color:#475569;">${(item.tags || []).slice(0, 2).map(t => `#${t}`).join(' ')}</div>
                    </div>
                </div>
                <div class="edit-actions">
                    <button class="edit-btn" data-id="${item.id}" data-action="editItem">✏️ Edit</button>
                    <button class="delete-edit-btn" data-id="${item.id}" data-action="deleteEdit">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
    }
    document.getElementById('totalDataCount').innerText = total;
    document.getElementById('prevPageBtn').disabled = editCurrentPage <= 1;
    document.getElementById('nextPageBtn').disabled = editCurrentPage >= totalPages;
    document.getElementById('pageInfo').innerText = `Halaman ${editCurrentPage} / ${totalPages || 1}`;
    const delBtn = document.getElementById('deleteSelectedBtn');
    const count = selectedEditItemIds.size;
    delBtn.innerText = count ? `🗑️ Hapus Terpilih (${count})` : '🗑️ Hapus Terpilih (0)';
    delBtn.disabled = count === 0;
    const allCheckboxes = document.querySelectorAll('.edit-item-checkbox');
    const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) selectAll.checked = allChecked;
}

/**
 * ======================= CRUD OPERATIONS =======================
 */
async function addOrUpdateItem(id, name, desc, img, tags, extra) {
    const newItem = {
        id: id || generateId(),
        name: name.trim(),
        description: desc.trim(),
        imageUrl: img.trim() || "https://picsum.photos/id/1/300/200",
        tags: tags,
        extra: extra
    };
    await saveItem(newItem);
    await refreshMain();
    await refreshEdit();
}

async function deleteItemHandler(id) {
    await deleteItemById(id);
    if (selectedItemId === id) selectedItemId = null;
    selectedEditItemIds.delete(id);
    await refreshMain();
    await refreshEdit();
}

async function deleteSelectedItemsHandler() {
    const ids = Array.from(selectedEditItemIds);
    if (ids.length === 0) return;
    if (confirm(`Hapus ${ids.length} item?`)) {
        await deleteMultipleItems(ids);
        selectedEditItemIds.clear();
        await refreshMain();
        await refreshEdit();
    }
}

// Hapus duplikat: item dianggap duplikat jika semua field identik (termasuk warna)
async function removeDuplicateItems() {
    const seen = new Map();
    const unique = [];
    for (const item of currentItems) {
        const sig = JSON.stringify({
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            tags: [...(item.tags || [])].sort(),
            extra: (item.extra || []).map(e => ({ key: e.key, value: e.value, keyColor: e.keyColor, valueColor: e.valueColor })).sort((a, b) => a.key.localeCompare(b.key))
        });
        if (!seen.has(sig)) {
            seen.set(sig, true);
            unique.push(item);
        }
    }
    const removed = currentItems.length - unique.length;
    if (removed === 0) { alert("Tidak ada duplikat"); return; }
    await replaceAllItems(unique);
    await refreshMain();
    await refreshEdit();
    alert(`✅ ${removed} duplikat dihapus.`);
}

/**
 * ======================= FORM HANDLING (Extra Fields Dinamis) =======================
 */
function renderExtraFieldsInput() {
    const container = document.getElementById('extraFieldsList');
    if (!container) return;
    if (!currentExtraFields.length) {
        container.innerHTML = '<div style="color:#6c757d;">Belum ada field, klik tombol tambah.</div>';
    } else {
        container.innerHTML = currentExtraFields.map((f, idx) => `
            <div class="extra-row" data-idx="${idx}">
                <input type="text" placeholder="Key" value="${escapeHtml(f.key)}" class="extra-key-input" data-idx="${idx}" style="flex:1;">
                <input type="color" class="extra-key-color-input" data-idx="${idx}" value="${f.keyColor || '#000000'}" style="width:48px;">
                <input type="text" placeholder="Value" value="${escapeHtml(f.value)}" class="extra-value-input" data-idx="${idx}" style="flex:1;">
                <input type="color" class="extra-value-color-input" data-idx="${idx}" value="${f.valueColor || '#777777'}" style="width:48px;">
                <button type="button" class="remove-extra" data-idx="${idx}">Hapus</button>
            </div>
        `).join('');
    }
    // Pasang event listener untuk input dinamis
    document.querySelectorAll('.extra-key-input').forEach(inp => inp.addEventListener('change', function () { let idx = parseInt(this.dataset.idx); if (currentExtraFields[idx]) currentExtraFields[idx].key = this.value; }));
    document.querySelectorAll('.extra-value-input').forEach(inp => inp.addEventListener('change', function () { let idx = parseInt(this.dataset.idx); if (currentExtraFields[idx]) currentExtraFields[idx].value = this.value; }));
    document.querySelectorAll('.extra-key-color-input').forEach(inp => inp.addEventListener('change', function () { let idx = parseInt(this.dataset.idx); if (currentExtraFields[idx]) currentExtraFields[idx].keyColor = this.value; }));
    document.querySelectorAll('.extra-value-color-input').forEach(inp => inp.addEventListener('change', function () { let idx = parseInt(this.dataset.idx); if (currentExtraFields[idx]) currentExtraFields[idx].valueColor = this.value; }));
    document.querySelectorAll('.remove-extra').forEach(btn => btn.addEventListener('click', function () { let idx = parseInt(this.dataset.idx); if (!isNaN(idx)) { currentExtraFields.splice(idx, 1); renderExtraFieldsInput(); } }));
}

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('editName').value = '';
    document.getElementById('editDesc').value = '';
    document.getElementById('editImageUrl').value = '';
    document.getElementById('editTags').value = '';
    currentExtraFields = [];
    renderExtraFieldsInput();
}

function populateForm(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editDesc').value = item.description || '';
    document.getElementById('editImageUrl').value = item.imageUrl || '';
    document.getElementById('editTags').value = (item.tags || []).join(', ');
    currentExtraFields = (item.extra || []).map(ext => ({ key: ext.key || '', value: ext.value || '', keyColor: ext.keyColor || '#000000', valueColor: ext.valueColor || '#777777' }));
    renderExtraFieldsInput();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value;
    const desc = document.getElementById('editDesc').value;
    const img = document.getElementById('editImageUrl').value;
    const tags = parseTags(document.getElementById('editTags').value);
    const extra = currentExtraFields.filter(f => f.key && f.key.trim()).map(f => ({ key: f.key.trim(), value: f.value || '', keyColor: f.keyColor || '#000000', valueColor: f.valueColor || '#777777' }));
    if (!name.trim()) { alert('Nama wajib'); return; }
    await addOrUpdateItem(id, name, desc, img, tags, extra);
    resetForm();
    await refreshMain();
    await refreshEdit();
}

/**
 * ======================= EXPORT (JSON, XML, CSV) =======================
 */
async function exportToJSON() {
    const items = await getAllItems();
    download(JSON.stringify(items, null, 2), 'database.json', 'application/json');
}

async function exportToXML() {
    const items = await getAllItems();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<database>\n  <items>\n';
    items.forEach(i => {
        xml += `    <item>\n      <id>${escapeXml(i.id)}</id>\n      <name>${escapeXml(i.name)}</name>\n      <description>${escapeXml(i.description || '')}</description>\n      <imageUrl>${escapeXml(i.imageUrl || '')}</imageUrl>\n      <tags>\n` +
            (i.tags || []).map(t => `        <tag>${escapeXml(t)}</tag>\n`).join('') +
            `      </tags>\n      <extra>\n` +
            (i.extra || []).map(e => `        <field key="${escapeXml(e.key)}" value="${escapeXml(e.value)}" keyColor="${escapeXml(e.keyColor || '#000000')}" valueColor="${escapeXml(e.valueColor || '#777777')}"/>\n`).join('') +
            `      </extra>\n    </item>\n`;
    });
    xml += `  </items>\n</database>`;
    download(xml, 'database.xml', 'application/xml');
}

async function exportCSV() {
    const items = await getAllItems();
    const headers = ["id", "name", "description", "imageUrl", "tags", "extra_info"];
    const escape = (s) => s === undefined || s === null ? '' : (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
    const rows = [headers.map(escape).join(',')];
    for (let it of items) {
        const extraWithoutColor = (it.extra || []).map(e => ({ key: e.key, value: e.value }));
        rows.push([it.id, it.name, it.description || '', it.imageUrl || '', (it.tags || []).join('; '), JSON.stringify(extraWithoutColor)].map(escape).join(','));
    }
    const blob = new Blob(["\uFEFF" + rows.join('\n')], { type: "text/csv;charset=utf-8" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'database.csv'; a.click(); URL.revokeObjectURL(a.href);
}

/**
 * ======================= IMPORT (JSON, XML, CSV) dengan berbagai mode =======================
 * Mendukung: replace, append, update, mergeSkip, overwrite.
 * Match key: id atau name.
 */
async function importJSONorXML(content, fileType, mode, matchKey, clearBefore) {
    let importedItems = [];
    if (fileType === 'json') {
        const parsed = JSON.parse(content);
        if (parsed.items && Array.isArray(parsed.items)) importedItems = parsed.items;
        else if (Array.isArray(parsed)) importedItems = parsed;
        else throw new Error('Format JSON tidak dikenal');
    } else if (fileType === 'xml') {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'application/xml');
        const itemsNodes = xmlDoc.getElementsByTagName('item');
        for (let node of itemsNodes) {
            const id = getTagValue(node, 'id') || generateId();
            const name = getTagValue(node, 'name');
            if (!name) continue;
            const desc = getTagValue(node, 'description');
            const img = getTagValue(node, 'imageUrl');
            const tags = [];
            const tagsNode = node.getElementsByTagName('tags')[0];
            if (tagsNode) for (let t of tagsNode.getElementsByTagName('tag')) tags.push(t.textContent);
            const extra = [];
            const extraNode = node.getElementsByTagName('extra')[0];
            if (extraNode) {
                const fields = extraNode.getElementsByTagName('field');
                for (let f of fields) {
                    const key = f.getAttribute('key');
                    const value = f.getAttribute('value');
                    const keyColor = f.getAttribute('keyColor');
                    const valueColor = f.getAttribute('valueColor');
                    if (key) extra.push({ key, value: value || '', keyColor: keyColor || '#000000', valueColor: valueColor || '#777777' });
                }
            }
            importedItems.push({ id, name, description: desc || '', imageUrl: img || '', tags, extra });
        }
    } else throw new Error('Format tidak didukung');

    const cleanItems = importedItems.map(item => ({
        id: item.id || generateId(),
        name: item.name || '',
        description: item.description || '',
        imageUrl: item.imageUrl || 'https://picsum.photos/id/1/300/200',
        tags: Array.isArray(item.tags) ? item.tags : [],
        extra: Array.isArray(item.extra) ? item.extra.map(e => ({
            key: e.key,
            value: e.value || '',
            keyColor: e.keyColor || '#000000',
            valueColor: e.valueColor || '#777777'
        })) : []
    })).filter(i => i.name);
    if (cleanItems.length === 0) throw new Error('Tidak ada data valid');

    let existingItems = await getAllItems();
    if (clearBefore && mode !== 'replace') existingItems = [];

    let resultItems = [...existingItems];

    if (mode === 'replace') {
        resultItems = cleanItems;
    } else if (mode === 'append') {
        for (let newItem of cleanItems) {
            let finalId = newItem.id;
            while (resultItems.some(i => i.id === finalId)) finalId = generateId();
            newItem.id = finalId;
            resultItems.push(newItem);
        }
    } else if (mode === 'update') {
        for (let newItem of cleanItems) {
            let existing = null;
            if (matchKey === 'id') existing = resultItems.find(i => i.id === newItem.id);
            else existing = resultItems.find(i => i.name === newItem.name);
            if (existing) {
                Object.assign(existing, newItem);
            } else {
                let finalId = newItem.id;
                while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                newItem.id = finalId;
                resultItems.push(newItem);
            }
        }
    } else if (mode === 'mergeSkip') {
        for (let newItem of cleanItems) {
            let exists = false;
            if (matchKey === 'id') exists = resultItems.some(i => i.id === newItem.id);
            else exists = resultItems.some(i => i.name === newItem.name);
            if (!exists) {
                let finalId = newItem.id;
                while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                newItem.id = finalId;
                resultItems.push(newItem);
            }
        }
    } else if (mode === 'overwrite') {
        const newMap = new Map();
        for (let ni of cleanItems) {
            const key = matchKey === 'id' ? ni.id : ni.name;
            if (key) newMap.set(key, ni);
        }
        if (matchKey === 'id') {
            for (let i = 0; i < resultItems.length; i++) {
                if (newMap.has(resultItems[i].id)) {
                    resultItems[i] = newMap.get(resultItems[i].id);
                    newMap.delete(resultItems[i].id);
                }
            }
            for (let ni of newMap.values()) {
                let finalId = ni.id;
                while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                ni.id = finalId;
                resultItems.push(ni);
            }
        } else {
            const existingByName = new Map();
            for (let it of resultItems) existingByName.set(it.name, it);
            for (let [name, ni] of newMap.entries()) {
                if (existingByName.has(name)) {
                    Object.assign(existingByName.get(name), ni);
                } else {
                    let finalId = ni.id;
                    while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                    ni.id = finalId;
                    resultItems.push(ni);
                }
            }
        }
    }

    await replaceAllItems(resultItems);
    await refreshMain();
    await refreshEdit();
    alert(`Import berhasil: ${cleanItems.length} item diproses. Total item sekarang: ${resultItems.length}`);
}

async function importCSV(file, mode, matchKey, clearBefore) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const lines = e.target.result.replace(/^\uFEFF/, '').split(/\r?\n/);
            if (lines.length < 2) throw new Error('CSV kosong');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const nameIdx = headers.indexOf('name');
            if (nameIdx === -1) throw new Error('CSV harus punya kolom name');
            const idIdx = headers.indexOf('id');
            const descIdx = headers.indexOf('description');
            const imgIdx = headers.indexOf('imageurl');
            const tagsIdx = headers.indexOf('tags');
            const extraIdx = headers.indexOf('extra_info');
            const imported = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                let values = [], inQuote = false, cur = '';
                for (let ch of lines[i]) {
                    if (ch === '"') { if (inQuote && lines[i][values.join(',').length + 1] === '"') { cur += '"'; } else inQuote = !inQuote; }
                    else if (ch === ',' && !inQuote) { values.push(cur); cur = ''; }
                    else cur += ch;
                }
                values.push(cur);
                values = values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
                const name = values[nameIdx]?.trim();
                if (!name) continue;
                const id = (idIdx !== -1 && values[idIdx]) ? values[idIdx] : generateId();
                const description = (descIdx !== -1) ? (values[descIdx] || '') : '';
                const imageUrl = (imgIdx !== -1) ? (values[imgIdx] || '') : 'https://picsum.photos/id/1/300/200';
                let tags = [];
                if (tagsIdx !== -1 && values[tagsIdx]) tags = values[tagsIdx].split(';').map(t => t.trim()).filter(t => t);
                let extra = [];
                if (extraIdx !== -1 && values[extraIdx]) {
                    try {
                        const parsed = JSON.parse(values[extraIdx]);
                        if (Array.isArray(parsed)) extra = parsed.map(e => ({ key: e.key, value: e.value || '', keyColor: '#000000', valueColor: '#777777' }));
                    } catch (e) { }
                }
                imported.push({ id, name, description, imageUrl, tags, extra });
            }
            if (imported.length === 0) throw new Error('Tidak ada data valid');

            let existingItems = await getAllItems();
            if (clearBefore && mode !== 'replace') existingItems = [];

            let resultItems = [...existingItems];

            if (mode === 'replace') {
                resultItems = imported;
            } else if (mode === 'append') {
                for (let newItem of imported) {
                    let finalId = newItem.id;
                    while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                    newItem.id = finalId;
                    resultItems.push(newItem);
                }
            } else if (mode === 'update') {
                for (let newItem of imported) {
                    let existing = null;
                    if (matchKey === 'id') existing = resultItems.find(i => i.id === newItem.id);
                    else existing = resultItems.find(i => i.name === newItem.name);
                    if (existing) {
                        Object.assign(existing, newItem);
                    } else {
                        let finalId = newItem.id;
                        while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                        newItem.id = finalId;
                        resultItems.push(newItem);
                    }
                }
            } else if (mode === 'mergeSkip') {
                for (let newItem of imported) {
                    let exists = false;
                    if (matchKey === 'id') exists = resultItems.some(i => i.id === newItem.id);
                    else exists = resultItems.some(i => i.name === newItem.name);
                    if (!exists) {
                        let finalId = newItem.id;
                        while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                        newItem.id = finalId;
                        resultItems.push(newItem);
                    }
                }
            } else if (mode === 'overwrite') {
                const newMap = new Map();
                for (let ni of imported) {
                    const key = matchKey === 'id' ? ni.id : ni.name;
                    if (key) newMap.set(key, ni);
                }
                if (matchKey === 'id') {
                    for (let i = 0; i < resultItems.length; i++) {
                        if (newMap.has(resultItems[i].id)) {
                            resultItems[i] = newMap.get(resultItems[i].id);
                            newMap.delete(resultItems[i].id);
                        }
                    }
                    for (let ni of newMap.values()) {
                        let finalId = ni.id;
                        while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                        ni.id = finalId;
                        resultItems.push(ni);
                    }
                } else {
                    const existingByName = new Map();
                    for (let it of resultItems) existingByName.set(it.name, it);
                    for (let [name, ni] of newMap.entries()) {
                        if (existingByName.has(name)) {
                            Object.assign(existingByName.get(name), ni);
                        } else {
                            let finalId = ni.id;
                            while (resultItems.some(i => i.id === finalId)) finalId = generateId();
                            ni.id = finalId;
                            resultItems.push(ni);
                        }
                    }
                }
            }
            await replaceAllItems(resultItems);
            await refreshMain();
            await refreshEdit();
            alert(`Import CSV sukses: ${imported.length} item diproses. Total item sekarang: ${resultItems.length}`);
            document.getElementById('importWarning').style.display = 'none';
        } catch (err) {
            document.getElementById('importWarning').innerHTML = `❌ ${err.message}`;
            document.getElementById('importWarning').style.display = 'block';
        }
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * ======================= INISIALISASI DATA DEFAULT =======================
 * Jika database kosong, tambahkan contoh data.
 */
async function initDefaultData() {
    const existing = await getAllItems();
    if (existing.length === 0) {
        const defaultItems = [
            { id: "1", name: "Karakter RPG", description: "Contoh status karakter", imageUrl: "https://picsum.photos/id/20/300/200", tags: ["rpg", "game"], extra: [{ key: "atk", value: "55", keyColor: "#ff0000", valueColor: "#ff0000" }, { key: "dmg", value: "55", keyColor: "#00aa00", valueColor: "#00aa00" }, { key: "def", value: "5557", keyColor: "#0000ff", valueColor: "#0000ff" }] },
            { id: "2", name: "Baju Tidur Wanita", description: "Motif lucu", imageUrl: "https://picsum.photos/id/64/300/200", tags: ["baju tidur", "wanita"], extra: [{ key: "Ukuran", value: "S/M/L", keyColor: "#000000", valueColor: "#777777" }] }
        ];
        for (let item of defaultItems) await saveItem(item);
    }
}

/**
 * ======================= EVENT LISTENERS & STARTUP =======================
 */
document.addEventListener('DOMContentLoaded', async () => {
    await initDefaultData();
    await refreshMain();
    await refreshEdit();

    // Tombol navigasi
    document.getElementById('openEditPageBtn').onclick = () => { document.getElementById('mainView').classList.add('hidden'); document.getElementById('editView').classList.remove('hidden'); refreshEdit(); resetForm(); };
    document.getElementById('backToMainBtn').onclick = () => { document.getElementById('editView').classList.add('hidden'); document.getElementById('mainView').classList.remove('hidden'); refreshMain(); };
    
    // Form submit & reset
    document.getElementById('itemForm').onsubmit = handleFormSubmit;
    document.getElementById('resetFormBtn').onclick = resetForm;
    document.getElementById('addExtraFieldBtn').onclick = () => { currentExtraFields.push({ key: "", value: "", keyColor: "#000000", valueColor: "#777777" }); renderExtraFieldsInput(); };
    
    // Export buttons
    document.getElementById('exportJsonBtn').onclick = exportToJSON;
    document.getElementById('exportXmlBtn').onclick = exportToXML;
    document.getElementById('exportCsvBtn').onclick = exportCSV;
    
    // OPFS Backup / Restore
    document.getElementById('backupToOpfsBtn').onclick = backupToOPFS;
    document.getElementById('restoreFromOpfsBtn').onclick = async () => { await restoreFromOPFS(); await refreshMain(); await refreshEdit(); };
    document.getElementById('exportDbBtn').onclick = exportToJSON;
    document.getElementById('importDbBtn').onclick = () => document.getElementById('importFileInput').click();
    document.getElementById('clearAllDataBtn').onclick = async () => { if (confirm('Hapus SEMUA data? Tindakan permanen!')) { await clearAllItems(); await refreshMain(); await refreshEdit(); } };
    document.getElementById('importFileInput').onchange = async (e) => { if (e.target.files.length) { const text = await e.target.files[0].text(); const items = JSON.parse(text); if (Array.isArray(items)) { await replaceAllItems(items); await refreshMain(); await refreshEdit(); alert('Import sukses'); } e.target.value = ''; } };
    
    // Pagination edit view
    document.getElementById('prevPageBtn').onclick = () => { if (editCurrentPage > 1) { editCurrentPage--; renderEditList(); } };
    document.getElementById('nextPageBtn').onclick = () => { const total = Math.ceil(editFilteredItems.length / EDIT_ITEMS_PER_PAGE); if (editCurrentPage < total) { editCurrentPage++; renderEditList(); } };
    document.getElementById('editSearchInput').oninput = e => { editSearchKeyword = e.target.value; updateEditFilteredItems(); };
    
    // Pagination main view
    document.getElementById('mainPrevPageBtn').onclick = () => { if (mainCurrentPage > 1) { mainCurrentPage--; refreshMain(); } };
    document.getElementById('mainNextPageBtn').onclick = () => { const total = Math.ceil(mainFilteredItems.length / MAIN_ITEMS_PER_PAGE); if (mainCurrentPage < total) { mainCurrentPage++; refreshMain(); } };
    document.getElementById('searchInput').oninput = e => { currentSearchQuery = e.target.value; mainCurrentPage = 1; refreshMain(); };
    
    // Pilih item di main view
    document.getElementById('itemsListContainer').addEventListener('click', (e) => { const card = e.target.closest('.item-card'); if (card) { selectedItemId = card.getAttribute('data-id'); refreshMain(); } });
    
    // Checkbox di edit view
    document.getElementById('editItemsList').addEventListener('change', (e) => { if (e.target.classList.contains('edit-item-checkbox')) { const id = e.target.getAttribute('data-id'); if (e.target.checked) selectedEditItemIds.add(id); else selectedEditItemIds.delete(id); renderEditList(); } });
    document.getElementById('deleteSelectedBtn').onclick = deleteSelectedItemsHandler;
    document.getElementById('selectAllCheckbox').onchange = (e) => { const checkboxes = document.querySelectorAll('.edit-item-checkbox'); checkboxes.forEach(cb => { const id = cb.getAttribute('data-id'); if (e.target.checked) { selectedEditItemIds.add(id); cb.checked = true; } else { selectedEditItemIds.delete(id); cb.checked = false; } }); renderEditList(); };
    
    // Edit & hapus per item di edit view
    document.getElementById('editItemsList').addEventListener('click', (e) => { 
        const editBtn = e.target.closest('[data-action="editItem"]'); 
        if (editBtn) { const id = editBtn.getAttribute('data-id'); const item = currentItems.find(i => i.id === id); if (item) populateForm(item); return; } 
        const delBtn = e.target.closest('[data-action="deleteEdit"]'); 
        if (delBtn) { const id = delBtn.getAttribute('data-id'); if (confirm('Hapus permanen?')) deleteItemHandler(id); } 
    });
    
    document.getElementById('deduplicateBtn').onclick = removeDuplicateItems;
    
    // Import JSON/XML & CSV dengan mode
    const fileImporter = document.getElementById('fileImporter');
    const csvImporter = document.getElementById('csvImporter');
    document.getElementById('importFileLegacyBtn').onclick = () => fileImporter.click();
    document.getElementById('importCsvBtn').onclick = () => csvImporter.click();
    fileImporter.onchange = async (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            const fileType = file.name.endsWith('.xml') ? 'xml' : 'json';
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const mode = document.getElementById('importModeSelect').value;
                    const matchKey = document.getElementById('importMatchKey').value;
                    const clearBefore = document.getElementById('clearBeforeImport').checked;
                    await importJSONorXML(ev.target.result, fileType, mode, matchKey, clearBefore);
                    document.getElementById('importWarning').style.display = 'none';
                } catch (err) {
                    document.getElementById('importWarning').innerHTML = `❌ ${err.message}`;
                    document.getElementById('importWarning').style.display = 'block';
                }
            };
            reader.readAsText(file, 'UTF-8');
            fileImporter.value = '';
        }
    };
    csvImporter.onchange = async (e) => {
        if (e.target.files.length) {
            const mode = document.getElementById('importModeSelect').value;
            const matchKey = document.getElementById('importMatchKey').value;
            const clearBefore = document.getElementById('clearBeforeImport').checked;
            await importCSV(e.target.files[0], mode, matchKey, clearBefore);
            csvImporter.value = '';
        }
    };
});