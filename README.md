# datacel
page menampilkan database buatan sendiri yang bisa export ke excel /google sheet
https://baguzzz.github.io/datacel/

dengan fitur:
 search :
 tags:
 data tambahan:
import/expot data  xml/json/csv


Rangkuman Proyek: SPA Manajemen Data Skala Besar (IndexedDB + OPFS)
Tujuan Proyek
Aplikasi Single Page Application (SPA) untuk mengelola koleksi data dalam jumlah besar (hingga jutaan item) secara lokal di browser. Data disimpan permanen menggunakan IndexedDB (penyimpanan utama) dan dapat dicadangkan ke OPFS (Origin Private File System) atau diekspor/impor dalam berbagai format.

Teknologi yang Digunakan
Frontend murni: HTML5, CSS3, JavaScript (ES6+)

Penyimpanan: IndexedDB (operasi asinkron, mendukung indeks), OPFS (backup/restore via File System Access API)

Format data: JSON, XML, CSV (import/export)

Desain responsif: CSS Grid, Flexbox, media queries, aksesibilitas (minimal tombol 44x44px)

Fitur Utama
1. Dua Tampilan Utama
View Publik → daftar item dengan pencarian (#tag + kata kunci), pagination, dan detail sidebar.

Edit View → manajemen penuh data (tambah, edit, hapus, hapus massal, hapus duplikat).

2. Manajemen Data Lanjutan
CRUD lengkap dengan field tambahan dinamis (key-value + warna teks).

Checkbox seleksi + hapus terpilih per halaman.

Deteksi & hapus duplikat (berdasarkan semua field termasuk warna).

Pencarian real-time pada edit view (filter berdasarkan nama/tag).

3. Impor & Ekspor Multi-format
Ekspor: JSON, XML, CSV (CSV tanpa informasi warna).

Impor: JSON, XML, CSV dengan 5 mode:

Replace All (ganti semua)

Append All (tambah tanpa cek)

Update Existing (update jika ID/name sama, tambah jika baru)

Merge & Skip Duplicates (hanya tambah baru)

Overwrite by ID/Name (timpa jika ada)

Mendukung match key (ID atau name) dan opsi hapus sebelum import.

4. Backup & Restore Skala Besar
Backup ke OPFS → simpan file .json ke sistem file lokal (dialog save).

Restore dari OPFS → buka file .json dari lokal dan ganti database.

Fallback ke download/upload biasa jika File System Access API tidak didukung.

5. Informasi & Utilitas
Menampilkan total item dan estimasi ukuran penyimpanan.

Reset form, validasi input, konfirmasi hapus massal.

Dukungan gambar (URL bebas, default dari picsum).

Arsitektur & Alur Data
IndexedDB wrapper → fungsi openIndexedDB, getAllItems, saveItem, deleteMultipleItems, clearAllItems, replaceAllItems.

Cache global currentItems untuk mengurangi akses DB saat render.

Dua sistem pagination independen (main view: 20 item/halaman, edit view: 20 item/halaman).

State terpisah untuk pencarian, filter, item terpilih, extra fields form.

Render ulang otomatis setelah setiap operasi (refreshCache → refreshMain/refreshEdit).

Keamanan & Kinerja
Semua operasi DB bersifat asinkron (async/await) agar tidak memblokir UI.

Escape HTML untuk mencegah XSS.

Validasi data impor (nama wajib, format array).

Tidak menggunakan library eksternal (vanilla JS).

Contoh Data Default
Jika database kosong, akan dibuat 2 item contoh:

Karakter RPG (dengan extra field berwarna)

Baju Tidur Wanita (extra field biasa)

Cara Menjalankan
Cukup buka file index.html di browser modern (Chrome/Edge/Firefox). IndexedDB akan otomatis dibuat, dan data tersimpan secara lokal hingga dihapus manual melalui fitur “Hapus Semua Data” atau melalui devtools.

Kelebihan Proyek
Mendukung data besar (IndexedDB tahan hingga ratusan MB bahkan GB).

Impor/ekspor fleksibel dengan mode merge/update.

Backup ke OPFS lebih aman dan tanpa batasan ukuran (sebanding dengan file sistem).

UI modern, responsif, dan ramah sentuhan (mobile-friendly).

Keterbatasan
OPFS hanya bekerja di browser dengan dukungan File System Access API (Chromium-based).

CSV tidak mempertahankan warna teks pada extra field (hanya key-value).

Pencarian tag di main view hanya mendukung awalan # (tanpa saran otomatis).
 
 
