# Kolaborasi

Empat anggota, satu repository, empat modul. Dokumen ini berisi pembagian
tugas, alur Git, aturan commit, dan Definition of Done supaya tidak ada yang
menabrak saat merge.

## 1. Pembagian modul

| Anggota      | Backend                      | Frontend                                      | Database                                   |
| ------------ | ---------------------------- | --------------------------------------------- | ------------------------------------------ |
| **Member 1** | `auth`, `masterdata`         | shell, login, dashboard, 8 halaman masterdata | review `schema.sql`                        |
| **Member 2** | `analytics`, `oee`           | halaman analytics + grafik                    | `schema.sql`, `seed.sql`, `scripts/db.mjs` |
| **Member 3** | `andon`, `websocket`, `mqtt` | Andon board (Socket.IO)                       | review query agregasi                      |
| **Member 4** | `workorder`, `production`    | operator playground                           | review FK transaksi                        |

Semua anggota **wajib** membaca [`api.md`](api.md) dan memakai DTO dari
`@andon/shared`; tidak boleh membuat bentuk response sendiri.

## 2. Alur Git

```
main        -> deployable (hanya merge dari develop + tag)
develop     -> integrasi harian, selalu bisa dijalankan
feature/*   -> satu modul per branch, dibuat dari develop
```

Branch yang dipakai (konvensi nama):

| Branch                       | Isi                                  |
| ---------------------------- | ------------------------------------ |
| `feature/member1-masterdata` | CRUD masterdata + halaman UI         |
| `feature/member2-oee`        | perhitungan OEE + agregasi analytics |
| `feature/member3-andon`      | Andon board + Socket.IO/MQTT         |
| `feature/member4-production` | work order + operator + log produksi |
| `fix/<deskripsi-singkat>`    | perbaikan bug                        |
| `chore/<deskripsi-singkat>`  | dependency, config, dokumentasi      |

Aturan:

1. Branch baru selalu dari `develop` terbaru.
2. Satu branch = satu modul; jangan mencampur refactor tak terkait.
3. PR wajib menyertakan: ringkasan, test yang ditambahkan, dan dampak kontrak
   (bila mengubah `shared/` atau `docs/api.md`).
4. Minimal 1 review orang lain sebelum merge. Merge ke `develop`,
   bukan langsung ke `main`.
5. `main` hanya berisi rilis yang sudah diuji manual (login, satu transaksi
   produksi, satu perhitungan OEE).

## 3. Commit message

Format: `<tipe>(<scope>): <deskripsi singkat>`.

Tipe: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

```
feat(masterdata): add machine crud with numeric cycle time
fix(auth): reject inactive accounts on login
test(db): cover restrict-violation on machine delete
docs(api): document /api/andon/machines/:id/status
```

## 4. Definition of Done per fitur

- [ ] DTO ada di `shared/` bila ada data yang lintas modul.
- [ ] Endpoint punya permission di `route` (bukan hanya dicek di UI).
- [ ] Validasi Zod ada di modul (`*.schemas.ts`), pesan error ramah pengguna.
- [ ] Error SQLSTATE diterjemahkan di `middleware/error-handler.ts`.
- [ ] Test: unit untuk service/validation, integrasi untuk query yang menyentuh DB.
- [ ] `npm run typecheck && npm run lint && npm test` hijau di branch itu.
- [ ] `docs/api.md` diperbarui bila kontrak berubah.
- [ ] Tidak ada `console.log`, tidak ada secrets di repo.

## 5. Kontrak yang tidak boleh diubah sepihak

- `shared/src/constants/enums.ts` (nilai enum = `CHECK` di database).
- `shared/src/constants/permissions.ts` (matriks role).
- Nama endpoint dan bentuk envelope `{ success, data, meta }`.
- Topik MQTT dan nama event Socket.IO.

Perubahan kontrak = PR terpisah yang memperbarui `shared/`, `docs/api.md`,
`database/schema.sql` (bila perlu), dan seluruh konsumennya sekaligus.

## 6. Standar kode

- TypeScript `strict` di ketiga workspace; tidak ada `any` tanpa alasan
  tertulis.
- Backend memakai CommonJS (`module.exports`/ESM-CJS interop) — jangan
  mengarang `.js` extension baru.
- Nama file: `kebab-case.ts` / `kebab-case.vue`; komponen Vue `PascalCase.vue`.
- Format dengan Prettier (`npm run format`), lint dengan ESLint
  (`npm run lint`).
- Jangan menaruh log sensitif (password, token) ke logger.

## 7. Environment bersama

| Service  | Default                 | Catatan                           |
| -------- | ----------------------- | --------------------------------- |
| Database | NeonDB `DATABASE_URL`   | branch dev per anggota bila perlu |
| API      | `http://localhost:4000` | `PORT` dapat diganti              |
| Web      | `http://localhost:5173` | dev proxy `/api` → backend        |
| MQTT     | `mqtt://localhost:1883` | opsional (Phase 4)                |

Salin `backend/.env.example` → `backend/.env`; jangan commit `.env`.

## 8. Timeline yang disepakati

| Fase | Isi                           | Deliverable                          |
| ---- | ----------------------------- | ------------------------------------ |
| 1    | Fondasi, shared, schema, seed | repo jalan, `npm test` hijau         |
| 2    | Auth, RBAC, masterdata CRUD   | login + 8 halaman masterdata         |
| 3    | Work Order + approval         | alur DRAFT → APPROVED → ISSUED       |
| 4    | Operator, MQTT, downtime, OEE | log produksi nyata + OEE terhitung   |
| 5    | Andon board                   | status real-time per mesin           |
| 6    | Analytics + laporan           | grafik OEE, downtime, defect, export |
