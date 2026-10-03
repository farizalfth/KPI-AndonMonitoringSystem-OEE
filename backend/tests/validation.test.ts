import { describe, expect, it } from 'vitest';

import {
  abnormalityCreateSchema,
  defectCreateSchema,
  itemCreateSchema,
  machineCreateSchema,
  machineUpdateSchema,
  productionSetupCreateSchema,
  roleCreateSchema,
  shiftCreateSchema,
  shiftUpdateSchema,
} from '../src/modules/masterdata/masterdata.schemas';
import { loginSchema, passwordSchema } from '../src/modules/auth/auth.schemas';
import { pageQuerySchema, queryBoolean, timeOfDay, codeField } from '../src/lib/validation';

describe('loginSchema', () => {
  it('normalises the email', () => {
    expect(loginSchema.parse({ email: ' Admin@Example.COM ', password: 'x' }).email).toBe(
      'admin@example.com',
    );
  });

  it('rejects a missing password and a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'admin@example.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'admin', password: 'x' }).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('enforces length, letters and digits', () => {
    expect(passwordSchema.safeParse('short1').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
    expect(passwordSchema.safeParse('1234567890').success).toBe(false);
    expect(passwordSchema.safeParse('Password123!').success).toBe(true);
  });
});

describe('codeField', () => {
  it('uppercases and validates the format', () => {
    expect(codeField.parse(' mc-001 ')).toBe('MC-001');
    expect(codeField.safeParse('a').success).toBe(false);
    expect(codeField.safeParse('_bad').success).toBe(false);
    expect(codeField.safeParse('has space').success).toBe(false);
  });
});

describe('timeOfDay', () => {
  it('accepts HH:MM and rejects other formats', () => {
    expect(timeOfDay.safeParse('06:00').success).toBe(true);
    expect(timeOfDay.safeParse('23:59').success).toBe(true);
    expect(timeOfDay.safeParse('24:00').success).toBe(false);
    expect(timeOfDay.safeParse('6:00').success).toBe(false);
  });
});

describe('pageQuerySchema', () => {
  it('coerces numbers and applies defaults', () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1, limit: 20, sortOrder: 'asc' });
    expect(pageQuerySchema.parse({ page: '3', limit: '50' })).toMatchObject({ page: 3, limit: 50 });
    expect(pageQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});

describe('queryBoolean', () => {
  it('accepts query strings and booleans', () => {
    expect(queryBoolean.parse('true')).toBe(true);
    expect(queryBoolean.parse('false')).toBe(false);
    expect(queryBoolean.parse(true)).toBe(true);
    expect(queryBoolean.safeParse('yes').success).toBe(false);
  });
});

describe('masterdata schemas', () => {
  it('applies defaults on create (shift)', () => {
    const parsed = shiftCreateSchema.parse({
      code: 'shift-1',
      name: 'Shift 1',
      startTime: '06:00',
      endTime: '14:00',
    });

    expect(parsed.code).toBe('SHIFT-1');
    expect(parsed.plannedMinutes).toBe(480);
    expect(parsed.isActive).toBe(true);
  });

  it('rejects a shift without times and a planned time above 24h', () => {
    expect(shiftCreateSchema.safeParse({ code: 'S1', name: 'Shift' }).success).toBe(false);
    expect(
      shiftCreateSchema.safeParse({
        code: 'S1',
        name: 'Shift',
        startTime: '06:00',
        endTime: '14:00',
        plannedMinutes: 2000,
      }).success,
    ).toBe(false);
  });

  it('rejects an empty partial update', () => {
    expect(shiftUpdateSchema.safeParse({}).success).toBe(false);
    expect(shiftUpdateSchema.safeParse({ name: 'Shift 1 Pagi' }).success).toBe(true);
  });

  it('does not re-apply create defaults on partial update', () => {
    const parsed = shiftUpdateSchema.parse({ name: 'New name' });
    expect(parsed).toEqual({ name: 'New name' });
  });

  it('requires a positive standard cycle time for items', () => {
    const parsed = itemCreateSchema.parse({ code: 'item-a', name: 'Product A', standardCycleTime: '10.5' });
    expect(parsed.standardCycleTime).toBe(10.5);
    expect(parsed.unit).toBe('PCS');
    expect(itemCreateSchema.safeParse({ code: 'I', name: 'x', standardCycleTime: 0 }).success).toBe(false);
    expect(itemCreateSchema.safeParse({ code: 'I', name: 'x', standardCycleTime: -1 }).success).toBe(false);
  });

  it('never accepts status on the machine payload (system managed field)', () => {
    const parsed = machineCreateSchema.parse({ code: 'mc-1', name: 'Molding 1', status: 'RUNNING' });
    expect(parsed).not.toHaveProperty('status');
    expect(machineUpdateSchema.safeParse({ status: 'RUNNING' }).success).toBe(false);
  });

  it('defaults the abnormality category to OTHER', () => {
    const parsed = abnormalityCreateSchema.parse({ code: 'abn-9', name: 'Other issue' });
    expect(parsed.category).toBe('OTHER');
    expect(parsed.isPlanned).toBe(false);
    expect(abnormalityCreateSchema.safeParse({ code: 'A', name: 'x', category: 'NOPE' }).success).toBe(false);
  });

  it('accepts defects and production setups', () => {
    expect(defectCreateSchema.parse({ code: 'def-1', name: 'Scratch' }).isActive).toBe(true);
    const setup = productionSetupCreateSchema.parse({ code: 'ps-1', name: 'Startup', setupMinutes: '15' });
    expect(setup.setupMinutes).toBe(15);
    expect(productionSetupCreateSchema.safeParse({ code: 'ps-1', name: 'x', setupMinutes: -1 }).success).toBe(
      false,
    );
  });

  it('uppercases role codes and validates baseRole', () => {
    expect(roleCreateSchema.parse({ code: 'quality', name: 'Quality' }).code).toBe('QUALITY');
    expect(roleCreateSchema.safeParse({ code: '1bad', name: 'x' }).success).toBe(false);
    expect(roleCreateSchema.safeParse({ code: 'ok', name: 'x', baseRole: 'ROOT' }).success).toBe(false);
  });
});