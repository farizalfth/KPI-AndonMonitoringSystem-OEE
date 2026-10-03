# Arsitektur

Dokumen ini menjelaskan batas antar-modul, aliran data, dan keputusan teknis
yang dipakai di seluruh repo. Rincian endpoint ada di [`api.md`](api.md);
petunjuk kerja tim ada di [`collaboration.md`](collaboration.md).

## 1. Prinsip

1. **Satu repositori, satu kontrak.** `shared/` adalah sumber kebenaran untuk
   enum, permission, DTO request/response, dan versi kontrak API
   (`API_CONTRACT_VERSION`). Menambah field berarti menambah DTO di `shared/`
   lebih dulu.
2. **Satu database.** Masterdata, work order, log produksi, downtime, dan OEE
   hidup di satu skema PostgreSQL dengan foreign key nyata (bukan JSON blob),
   sehingga integritas antar-modul dijamin database.
3. **Backend adalah otoritas.** Frontend hanya menyembunyikan tombol yang tidak
   diizinkan; setiap endpoint memverifikasi ulang permission dari role
   pengguna.
4. **OEE dapat diaudit.** `oee_records` menyimpan semua input perhitungan
   (`planned_minutes`, `run_minutes`, `downtime_minutes`, `total_units`,
   `good_units`, `ideal_cycle_time`) beserta FK ke log sumbernya.
5. **Tidak ada angka KPI fiktif.** Seed tidak memuat `production_logs`,
   `downtime_logs`, atau `oee_records`; halaman analytics kosong sampai ada
   transaksi produksi nyata.

## 2. Komponen

```
shared/    @andon/shared  -> enum, permission, DTO, kontrak MQTT/Socket.IO
backend/   Express 4 + TS (CommonJS) + pg + zod + pino + jsonwebtoken
frontend/  Vue 3 + Vite + TS + Tailwind + Pinia + vue-router + axios + Chart.js
database/  schema.sql + seed.sql (idempotent)
scripts/   db.mjs (schema | seed | reset | status)
docs/      api.md, architecture.md, database.md, collaboration.md
```

### shared/

- `src/constants/enums.ts` — `MACHINE_STATUSES`, `WORK_ORDER_STATUSES`,
  `PRODUCTION_EVENT_TYPES`, `DEFECT_CODES`, `ABNORMALITY_CATEGORIES`, `OEE_*`.
  Nilai ini harus identik dengan `CHECK` constraint di `database/schema.sql`.
- `src/constants/permissions.ts` — matriks `ROLE_PERMISSIONS` +
  `permissionsForRole()`. Backend memanggil fungsi yang sama saat memverifikasi
  token, sehingga tidak ada daftar permission yang berbeda di dua tempat.
- `src/types/*.ts` — DTO per modul (auth, masterdata, workorder, production,
  oee, analytics, realtime) plus envelope `ApiSuccessResponse<T>` dan
  `ApiErrorResponse`.
- Build ganda: `dist/cjs` (untuk backend Node CommonJS) dan `dist/esm`
  (untuk bundler Vite). Scripts: `npm run build -w @andon/shared`.

### backend/

Struktur mengikuti modul, bukan lapisan global:

```
src/
  app.ts, server.ts          komposisi Express + http + mqtt + ws
  config/                    env.ts (zod), db.ts (pool, query, transaction)
  lib/                       errors.ts, logger.ts, pagination.ts, validation.ts
  middleware/                authenticate, requirePermission, validate, errorHandler
  models/                    repository generik + model khusus (user)
  modules/<fitur>/           routes, controller, service, schemas (zod)
  mqtt/, websocket/          kontrak event + no-op consumer (Phase 4–5)
```

Pola yang dipakai setiap modul:

```
route (authenticate -> requirePermission -> validate(zod))
  -> controller (baca res.locals.body/query/params)
    -> service (aturan bisnis, tanpa SQL)
      -> model/repository (SQL, mapping snake_case -> camelCase)
```

- `models/repository.ts` membuat repository generik dari descriptor
  (`table`, `columns`, `searchable`, `sortable`, `map`). Semua query memakai
  parameter placeholder dan whitelist kolom, tidak ada string SQL dari input.
- `middleware/error-handler.ts` menerjemahkan SQLSTATE PostgreSQL
  (`23505`, `23503`, `23001`, `23502`, `23514`, `22P02`, `22001`) menjadi
  error envelope yang konsisten.
- Transaction (`withTransaction`) dipakai pada operasi lintas tabel
  (mis. finish production + update cache `machines.status`).

### frontend/

```
src/
  services/    axios instance + ApiError + token storage
  stores/      Pinia: auth (token, user, permissions)
  router/      rute + meta.permission, guard global
  layouts/     AppLayout (sidebar + header)
  components/  ui/ (DataTable, BaseModal, BasePagination, StatusBadge, …)
  modules/     <fitur>/views + components/config
  views/       Login, Dashboard, Forbidden, NotFound, Placeholder
```

- **Data-driven CRUD.** `modules/masterdata/components/CrudPage.vue`
  mengimplementasikan daftar, cari, paging, validasi, simpan, dan hapus
  berdasarkan konfigurasi kolom + field. Delapan halaman masterdata hanya
  berisi deklarasi field.
- **Interceptor axios** menambah bearer token, membuka envelope
  `{ success, data, meta }`, dan menormalkan semua kegagalan menjadi `ApiError`.
  Satu `401` menghapus sesi lalu mengarahkan ke `/login` (sekali saja).
- **Guard router** menjalankan `auth.restore()` (validasi token via
  `/api/auth/me`) sebelum masuk ke halaman terlindungi, lalu mengecek
  `meta.permissions`.

## 3. Alur data per fase

```
Fase 2 (selesai)   Browser -> /api/auth/login -> users+roles -> JWT
                   Browser -> /api/masterdata/* -> repository -> PostgreSQL

Fase 3            Supervisor -> work order (DRAFT) -> APPROVED -> ISSUED
                   Operator melihat hanya work order ISSued untuk shift/machine

Fase 4            Operator -> POST /api/production/events (PRODUCE/DOWNTIME/…)
                   Backend -> production_logs / downtime_logs
                   Backend -> oee_records (Availability/Performance/Quality)
                   Backend -> machines.status (cache) -> MQTT publish
Fase 5            MQTT/Socket.IO -> Andon board (subscribe per line)
Fase 6            OEE + downtime -> agregasi harian -> grafik & export
```

## 4. OEE

```
Availability = runMinutes / plannedMinutes
Performance  = (totalUnits * idealCycleTime) / runMinutes
Quality      = goodUnits / totalUnits
OEE          = Availability * Performance * Quality
```

- `plannedMinutes` berasal dari `shifts.planned_minutes` dikurangi downtime
  terencana; `runMinutes` = durasi sejak `START` sampai `FINISH`/`DOWNTIME`.
- `idealCycleTime` memakai `production_setups` bila tersedia, lalu
  `items.standard_cycle_time`, lalu `machines.default_cycle_time`.
- Setiap hasil disimpan dengan inputnya (lihat tabel `oee_records`), sehingga
  angka di dashboard dapat ditelusuri ke log asal.

## 5. MQTT & realtime (kontrak, implementasi Phase 4–5)

| Arah      | Topik                                         | Payload              |
| --------- | --------------------------------------------- | -------------------- |
| publish   | `andon/machines/{machineId}/status`           | `MachineStatusEvent` |
| publish   | `andon/production/events`                     | `ProductionEvent`    |
| publish   | `andon/downtime/events`                       | `DowntimeEvent`      |
| publish   | `andon/oee/daily`                             | `OeeSummary`         |
| subscribe | `andon/#`                                     | —                    |
| Socket.IO | `andon:status`, `andon:downtime`, `andon:oee` | event yang sama      |

Backend memverifikasi payload terhadap DTO di `@andon/shared` sebelum
menulis ke database; payload invalid masuk dead-letter log, bukan crash.

## 6. Deployment

- **Frontend** → Vercel (build di root repo, output `frontend/dist`,
  rewrite SPA). Env: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.
- **Backend** → Node 20+ di Railway/Render/Fly. Env: `DATABASE_URL`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `LOG_LEVEL`, `MQTT_URL`.
- **Database** → NeonDB; `schema.sql` dan `seed.sql` idempotent sehingga aman
  dijalankan berkali-kali.

## 7. Batasan yang diketahui

- JWT stateless: logout hanya menghapus token di client; belum ada refresh
  token/revocation list. `POST /api/auth/change-password` yang dipakai untuk
  memaksa logout semua sesi.
- `machines.status` adalah cache; kebenaran tetap `production_logs`. Command
  `/andon/machines/:id/status` hanya menulis cache, tidak membuat log.
- Test integrasi memakai PGlite (WASM), jadi tidak menguji konkurensi nyata
  maupun perilaku `LISTEN/NOTIFY`.
- MQTT consumer dan Socket.IO gateway masih no-op sampai Phase 4/5.
