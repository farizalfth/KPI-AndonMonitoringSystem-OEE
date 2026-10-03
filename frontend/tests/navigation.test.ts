import { describe, expect, it } from 'vitest';

import { PERMISSIONS, ROLE_PERMISSIONS } from '@andon/shared';

import { navigation, visibleSections } from '@/types/navigation';

describe('navigation', () => {
  it('hides sections the role cannot use', () => {
    const asOperator = visibleSections(navigation, ROLE_PERMISSIONS.OPERATOR);
    const labels = asOperator.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toContain('Machines');
    expect(labels).toContain('Operator Playground');
    expect(labels).not.toContain('Users');
    expect(labels).not.toContain('Production Analytics');
  });

  it('gives administrators every entry', () => {
    const asAdmin = visibleSections(navigation, ROLE_PERMISSIONS.ADMIN);
    const total = navigation.reduce((sum, section) => sum + section.items.length, 0);

    expect(asAdmin.flatMap((section) => section.items)).toHaveLength(total);
  });

  it('only references declared permissions', () => {
    const known = new Set<string>(Object.values(PERMISSIONS));

    for (const section of navigation) {
      for (const item of section.items) {
        for (const permission of item.permissions ?? []) {
          expect(known.has(permission)).toBe(true);
        }
      }
    }
  });
});
