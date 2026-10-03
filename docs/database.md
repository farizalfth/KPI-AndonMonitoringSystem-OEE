# Database

PostgreSQL 14+ (dipakai juga di NeonDB). Semua modul berbagi satu skema.
Ringkasan struktur ada di [`../database/README.md`](../database/README.md);
dokumen ini menjelaskan **keputusan** desainnya.

## 1. Diagram relasi

```
roles ──< users
shifts ──< production_setups >── items
items ──< work_order_items >── work_orders >── machines
machines ──< production_logs >── work_orders
abnormalities ──< downtime_logs >── production_logs
defects ──< production_logs
machines, work_orders, shifts ──< oee_records
```

Tabel (13): `roles`, `users`, `shifts`, `items`, `machines`, `abnormalities`,
`defects`, `production_setups`, `work_orders`, `work_order_items`,
`downtime_logs`, `production_logs`, `oee_records`.

## 2. Keputusan penting

### 2.1 Satu skema, FK nyata, tanpa tabel per modul

Alternatif yang dipertimbangkan adalah memisahkan tabel per orang (mis. `andon_*`, `oee_*`) dengan
`user_id` sebagai scoping. Modul-modul tersebut saling membutuhkan data yang sama
(produksi → downtime → OEE → andon), jadi dipisah hanya menambah join dan
duplikasi. Dengan satu skema:

- integritas antar modul dijamin FK, bukan oleh disiplin kode;
- satu query agregasi OEE tidak perlu menggabungkan tabel terpisah;
- tidak ada masalah "user A tidak boleh lihat data user B" karena tidak ada
  partisi per user.

### 2.2 `machines.status` = cache, bukan sumber kebenaran

Status mesin adalah turunan dari `production_logs` terakhir. Disimpan sebagai
kolom agar Andon board (dan dashboard) bisa menampilkan grid status dengan satu
query sederhana tanpa agregasi per mesin.

Aturan yang menjaga konsistensinya:

- hanya boleh ditulis oleh modul produksi (masterdata tidak pernah menulis
  `status`; schema create/update tidak memabulkan field itu);
- ditulis dalam transaksi yang sama dengan `production_logs`;
- `production_logs` tetap sumber audit, dan ada command
  `/andon/machines/:id/status` hanya untuk koreksi manual (dan tercatat di log aplikasi).

### 2.3 OEE menyimpan input, bukan hanya hasil

`oee_records` menyimpan `planned_minutes`, `run_minutes`, `downtime_minutes`,
`total_units`, `good_units`, `ideal_cycle_time` **serta** FK ke
`work_order`, `machine`, `shift`. Dengan begitu:

- angka OEE dapat dihitung ulang dan diverifikasi;
- ketika sebuah perhitungan diubah, histori lama tetap bisa dijelaskan;
- analytics cukup `GROUP BY` per hari/mesin/shift tanpa membaca log mentah.

### 2.4 Enum = `TEXT` + `CHECK`, bukan `ENUM` PostgreSQL

`ENUM` PostgreSQL sulit diubah (perlu `ALTER TYPE`, locks, dan tidak bisa
menghapus nilai). Karena enum aplikasi sudah didefinisikan di
`shared/src/constants/enums.ts`, database cukup menegakkan daftar nilai dengan
`CHECK`, sementara aplikasi menyediakan satu daftar. Konsekuensinya: menambah nilai
enum cukup mengubah `shared/` + satu `CHECK` constraint (lihat
`ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` di bawah).

### 2.5 Soft delete hanya di histori; masterdata nonaktif

Tabel masterdata tidak memakai `deleted_at`; kolomnya `is_active`. Alasannya:

- histori produksi harus tetap punya rujukan machine/item yang valid;
- "data lama" adalah data yang tidak boleh dipilih untuk transaksi baru;
- `is_active` bisa difilter di query tanpa `LEFT JOIN` ke tabel audit.

Tabel transaksi (`work_orders`, `production_logs`, `downtime_logs`,
`oee_records`) tidak bisa diedit setelah final; koreksi dilakukan dengan baris
pembalik atau voiding (Phase 3/4).

### 2.6 Waktu

Semua kolom waktu adalah `TIMESTAMPTZ` (UTC), kecuali `shifts.start_time` /
`end_time` yang `TIME` (jam lokal plant). Tanggal pada laporan OEE memakai
`DATE` yang diturunkan dari zona waktu plant saat agregasi.

### 2.7 Audit

- `created_at` / `updated_at` diisi trigger `set_updated_at()`.
- `users.last_login_at` diisi saat login berhasil.
- Tidak ada tabel audit generik di Fase 1–2; bila dibutuhkan, tambahkan
  `audit_logs (id, actor_user_id, action, entity, entity_id, payload, created_at)`
  dengan FK ke `users` — jangan menulis ke `production_logs` untuk aktivitas
  administratif.

## 3. Index

| Index                                    | Untuk                                       |
| ---------------------------------------- | ------------------------------------------- |
| `work_orders_status_machine_shift_idx`   | daftar work order per lini/shift            |
| `production_logs_work_order_created_idx` | rekap OEE per work order                    |
| `production_logs_machine_created_idx`    | status/history mesin                        |
| `downtime_logs_machine_started_idx`      | downtime aktif per mesin                    |
| `oee_records_date_machine_idx`           | agregasi harian                             |
| `oee_records_unique_daily`               | idempotensi satu baris per hari/mesin/shift |
| `production_logs_cycle_downtime_idx`     | satu downtime per siklus                    |
| unique pada `code` tiap masterdata       | idempotensi seed + konflik kode             |

## 4. Idempotensi

- `schema.sql` memakai `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT
EXISTS`, `CREATE OR REPLACE FUNCTION`, dan `DROP TRIGGER IF EXISTS` → aman
  dijalankan berulang.
- `seed.sql` memakai `INSERT ... ON CONFLICT (code) DO UPDATE` dengan UUID
  tetap → aman dijalankan berulang dan tidak menggandakan data demo.
- Seed **tidak** membuat `production_logs`/`downtime_logs`/`oee_records`,
  supaya data produksi selalu berasal dari input operator yang nyata.

Menambah kolom non-null dengan default:

```sql
ALTER TABLE machines ADD COLUMN IF NOT EXISTS barcode TEXT;
-- bila butuh nilai wajib untuk data lama:
ALTER TABLE machines ADD COLUMN IF NOT EXISTS barcode TEXT NOT NULL DEFAULT '';
ALTER TABLE machines ALTER COLUMN barcode DROP DEFAULT;
-- perbarui shared DTO + docs/api.md di PR yang sama
```

## 5. Credential demo

| Email                    | Password       | Role       |
| ------------------------ | -------------- | ---------- |
| `admin@example.com`      | `Password123!` | ADMIN      |
| `supervisor@example.com` | `Password123!` | SUPERVISOR |
| `operator@example.com`   | `Password123!` | OPERATOR   |

Hash di `seed.sql` adalah bcrypt (`$2a$10$…`) dari password tersebut.
Seluruh akun demo harus dirotasi sebelum dipakai di lingkungan nyata.
