# datacel
page menampilkan database buatan sendiri yang bisa export ke excel /google sheet
https://baguzzz.github.io/datacel/

dengan fitur:
 search :
 tags:
 data tambahan:
import/expot data  xml/json/csv

# 🗄️ SPA Manajemen Data Skala Besar (IndexedDB + OPFS)

Aplikasi **Single Page Application (SPA)** untuk mengelola koleksi data dalam jumlah besar (hingga jutaan item) secara lokal di browser. Data disimpan permanen menggunakan **IndexedDB** dengan fitur pencarian, tag, field tambahan berwarna, serta backup/restore ke **OPFS** (Origin Private File System). Mendukung impor/ekspor dalam format **JSON, XML, dan CSV** dengan berbagai mode penggabungan data.

![Demo](https://via.placeholder.com/800x400?text=Demo+Screenshot)  
*(Screenshot: tampilan utama dengan daftar item dan sidebar detail)*

---

## ✨ Fitur Utama

### 📱 Dua Tampilan
- **Tampilan Publik** – daftar item dengan pencarian (kata kunci biasa + filter tag `#tag`), pagination, dan panel detail.
- **Tampilan Edit** – manajemen penuh data: tambah, edit, hapus (per item/massal), hapus duplikat, dan impor/ekspor.

### 🧠 Manajemen Data Lanjutan
- **Field tambahan dinamis** (key-value) dengan warna teks berbeda untuk key dan value.
- **Deteksi dan hapus duplikat** berdasarkan semua field (termasuk warna).
- **Pencarian real-time** pada edit view (berdasarkan nama/tag).
- **Checkbox seleksi** per halaman + tombol hapus terpilih.

### 📁 Impor & Ekspor Multi-Format
| Format | Ekspor | Impor | Catatan |
|--------|--------|-------|---------|
| JSON   | ✅     | ✅    | Mendukung field + warna |
| XML    | ✅     | ✅    | Mendukung field + warna |
| CSV    | ✅     | ✅    | CSV ekspor tanpa warna (hanya key-value) |

**Mode impor yang tersedia:**
- Replace All – mengganti semua data
- Append All – menambah semua (tanpa cek duplikat)
- Update Existing – update jika ID/Name sama, tambah jika baru
- Merge & Skip Duplicates – hanya tambah data baru
- Overwrite by ID/Name – timpa jika ada, tambah jika tidak

### 💾 Backup & Restore Skala Besar
- **Backup ke OPFS** – simpan seluruh database ke file `.json` di sistem file lokal (menggunakan File System Access API).
- **Restore dari OPFS** – muat file `.json` dari lokal dan ganti database.
- **Fallback** – jika browser tidak mendukung OPFS, backup/restore via download/upload biasa.

### 📊 Informasi Penyimpanan
- Total item dan estimasi ukuran penyimpanan (dalam KB/bytes).
- Metode penyimpanan: IndexedDB.

---

## 🛠 Teknologi yang Digunakan

- **HTML5, CSS3, JavaScript (ES6+)** – tanpa library/framework eksternal.
- **IndexedDB** – penyimpanan utama asinkron, mendukung indeks (nama, tag).
- **OPFS (Origin Private File System)** – backup/restore file besar.
- **File System Access API** – dialog simpan/buka file (fallback tersedia).
- **CSS Grid & Flexbox** – desain responsif (mobile friendly, tombol minimal 44x44px).

---

## 🚀 Cara Menjalankan

1. **Clone repositori**  
   ```bash
   git clone https://github.com/username/nama-repo.git
   cd nama-repo
