-- =============================================================================
--  Andon Monitoring System & OEE — seed data (development / demo)
--
--  Apply with:  npm run db:seed
--
--  All rows are idempotent (ON CONFLICT), so the script can be re-run safely.
--
--  DEMO CREDENTIALS (development only, never use in production):
--    admin@example.com      / Password123!     ADMIN
--    supervisor@example.com / Password123!     SUPERVISOR
--    operator@example.com   / Password123!     OPERATOR
--    operator2@example.com  / Password123!     OPERATOR
--
--  No production_logs / downtime_logs / oee_records are seeded on purpose:
--  OEE and Analytics must start from real events only (zero, never random).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
--  roles
-- -----------------------------------------------------------------------------
INSERT INTO roles (id, code, name, description, base_role, is_system) VALUES
  ('00000000-0000-4000-8000-000000000001', 'ADMIN', 'Administrator',
   'Full access to masterdata, users, roles and every module.', 'ADMIN', TRUE),
  ('00000000-0000-4000-8000-000000000002', 'SUPERVISOR', 'Supervisor',
   'Creates and approves work orders, monitors Andon and reads analytics.', 'SUPERVISOR', TRUE),
  ('00000000-0000-4000-8000-000000000003', 'OPERATOR', 'Operator',
   'Runs the assigned work orders from the operator playground.', 'OPERATOR', TRUE)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      base_role = EXCLUDED.base_role,
      is_system = EXCLUDED.is_system;

-- -----------------------------------------------------------------------------
--  users  (bcrypt hash of "Password123!", cost 10)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, role_id, is_active) VALUES
  ('10000000-0000-4000-8000-000000000001', 'admin@example.com',
   '$2a$10$rR3VJZybhWHeTNQK3ZP9OuAeYUHSccHPUvKd96homoJ562G7nciLm',
   'Andon Admin',
   (SELECT id FROM roles WHERE code = 'ADMIN'), TRUE),
  ('10000000-0000-4000-8000-000000000002', 'supervisor@example.com',
   '$2a$10$Y1H8tkmOlX1HnsYiwkyWVuO.2IB1Gwktml3YUN56npzUM.vnYCuvy',
   'Budi Santoso',
   (SELECT id FROM roles WHERE code = 'SUPERVISOR'), TRUE),
  ('10000000-0000-4000-8000-000000000003', 'operator@example.com',
   '$2a$10$mPRPn9uyPNpi8dEDEprPU.KYn1HbwlvHx/bpPtO5EdIGGIOX3LsaW',
   'Operator Satu',
   (SELECT id FROM roles WHERE code = 'OPERATOR'), TRUE),
  ('10000000-0000-4000-8000-000000000004', 'operator2@example.com',
   '$2a$10$/LOTfn8wvkksiqtyzQisYeCDxozC2GXVBLVTkUu6kylBQ2ZcEcurq',
   'Operator Dua',
   (SELECT id FROM roles WHERE code = 'OPERATOR'), TRUE)
ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role_id = EXCLUDED.role_id,
      is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
--  shifts  (planned_minutes drives the OEE planned production time)
-- -----------------------------------------------------------------------------
INSERT INTO shifts (id, code, name, start_time, end_time, planned_minutes, description) VALUES
  ('20000000-0000-4000-8000-000000000001', 'SHIFT-1', 'Shift 1', '06:00', '14:00', 480,
   'Morning shift, 06:00 - 14:00.'),
  ('20000000-0000-4000-8000-000000000002', 'SHIFT-2', 'Shift 2', '14:00', '22:00', 480,
   'Afternoon shift, 14:00 - 22:00.'),
  ('20000000-0000-4000-8000-000000000003', 'SHIFT-3', 'Shift 3', '22:00', '06:00', 480,
   'Night shift, 22:00 - 06:00 (crosses midnight).')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      planned_minutes = EXCLUDED.planned_minutes,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  items  (standard_cycle_time in seconds = ideal cycle time for OEE Performance)
-- -----------------------------------------------------------------------------
INSERT INTO items (id, code, name, category, unit, standard_cycle_time, description) VALUES
  ('30000000-0000-4000-8000-000000000001', 'ITEM-A', 'Product A', 'Finished Goods', 'PCS', 10.000,
   'Injection molded housing, ideal cycle time 10 seconds.'),
  ('30000000-0000-4000-8000-000000000002', 'ITEM-B', 'Product B', 'Finished Goods', 'PCS', 12.500,
   'Injection molded bottle, ideal cycle time 12.5 seconds.'),
  ('30000000-0000-4000-8000-000000000003', 'ITEM-C', 'Product C', 'Semi Finished', 'PCS', 8.000,
   'Assembly part, ideal cycle time 8 seconds.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      standard_cycle_time = EXCLUDED.standard_cycle_time,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  machines  (`status` is a cache of the latest event; starts IDLE)
-- -----------------------------------------------------------------------------
INSERT INTO machines (id, code, name, area, status, default_cycle_time, description) VALUES
  ('40000000-0000-4000-8000-000000000001', 'MC-001', 'Injection Molding 1', 'Line A', 'IDLE', 10.000,
   'Primary injection molding machine, line A.'),
  ('40000000-0000-4000-8000-000000000002', 'MC-002', 'Injection Molding 2', 'Line A', 'IDLE', 12.500,
   'Secondary injection molding machine, line A.'),
  ('40000000-0000-4000-8000-000000000003', 'MC-003', 'Assembly Station 1', 'Line B', 'IDLE', 8.000,
   'Manual assembly station, line B.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      area = EXCLUDED.area,
      default_cycle_time = EXCLUDED.default_cycle_time,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  abnormalities  (is_planned = TRUE is excluded from OEE Availability)
-- -----------------------------------------------------------------------------
INSERT INTO abnormalities (id, code, name, category, is_planned, default_duration_minutes, description) VALUES
  ('50000000-0000-4000-8000-000000000001', 'ABN-001', 'Machine Breakdown', 'MECHANICAL', FALSE, 30,
   'Unexpected machine breakdown, counts as downtime loss.'),
  ('50000000-0000-4000-8000-000000000002', 'ABN-002', 'Material Problem', 'MATERIAL', FALSE, 15,
   'Material shortage or feeding problem.'),
  ('50000000-0000-4000-8000-000000000003', 'ABN-003', 'Sensor Error', 'SENSOR', FALSE, 10,
   'Sensor or detection error.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      is_planned = EXCLUDED.is_planned,
      default_duration_minutes = EXCLUDED.default_duration_minutes,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  defects
-- -----------------------------------------------------------------------------
INSERT INTO defects (id, code, name, defect_type, description) VALUES
  ('60000000-0000-4000-8000-000000000001', 'DEF-001', 'Scratch', 'COSMETIC', 'Surface scratch on the part.'),
  ('60000000-0000-4000-8000-000000000002', 'DEF-002', 'Crack', 'STRUCTURAL', 'Crack found on the part.'),
  ('60000000-0000-4000-8000-000000000003', 'DEF-003', 'Wrong Dimension', 'DIMENSIONAL', 'Part dimension is out of tolerance.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      defect_type = EXCLUDED.defect_type,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  production_setups  (changeover masterdata)
-- -----------------------------------------------------------------------------
INSERT INTO production_setups (id, code, name, item_id, machine_id, setup_minutes, description) VALUES
  ('70000000-0000-4000-8000-000000000001', 'PS-001', 'Changeover Product A',
   '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 30,
   'Mould change and first article check for Product A.'),
  ('70000000-0000-4000-8000-000000000002', 'PS-002', 'Changeover Product B',
   '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 25,
   'Mould change and first article check for Product B.'),
  ('70000000-0000-4000-8000-000000000003', 'PS-003', 'Startup Check',
   NULL, NULL, 15, 'Generic startup verification, valid for any machine/item.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      item_id = EXCLUDED.item_id,
      machine_id = EXCLUDED.machine_id,
      setup_minutes = EXCLUDED.setup_minutes,
      description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
--  work_orders  (demo data so the operator playground is usable right away)
--  Member 2 (workorder) owns this table - the rows below are only seed data.
-- -----------------------------------------------------------------------------
INSERT INTO work_orders (
  id, code, period_type, period_start, period_end, status, machine_id, item_id, shift_id,
  target_qty, approved_by, approved_at, created_by, notes
) VALUES
  ('80000000-0000-4000-8000-000000000001', 'WO-DAILY-DEMO', 'DAILY',
   CURRENT_DATE, CURRENT_DATE, 'APPROVED',
   '40000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   500,
   '10000000-0000-4000-8000-000000000002', now(),
   '10000000-0000-4000-8000-000000000002',
   'Demo daily work order for the operator playground.'),
  ('80000000-0000-4000-8000-000000000002', 'WO-MONTHLY-DEMO', 'MONTHLY',
   date_trunc('month', CURRENT_DATE)::date,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
   'APPROVED',
   '40000000-0000-4000-8000-000000000002',
   '30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   8000,
   '10000000-0000-4000-8000-000000000002', now(),
   '10000000-0000-4000-8000-000000000002',
   'Demo monthly work order.')
ON CONFLICT (code) DO UPDATE
  SET period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      machine_id = EXCLUDED.machine_id,
      item_id = EXCLUDED.item_id,
      shift_id = EXCLUDED.shift_id,
      target_qty = EXCLUDED.target_qty;

INSERT INTO work_order_items (work_order_id, item_id, target_qty, sequence) VALUES
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 500, 1),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 8000, 1)
ON CONFLICT (work_order_id, item_id) DO UPDATE
  SET target_qty = EXCLUDED.target_qty;

COMMIT;