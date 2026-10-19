import { PERMISSIONS, type Permission } from '@andon/shared';

/**
 * Sidebar definition — the single place that maps permissions to navigation.
 * A section is hidden when the user holds none of its permissions.
 *
 * `icon` refers to a key understood by `components/ui/NavIcon.vue`.
 */
export interface NavigationItem {
  label: string;
  to: string;
  icon: string;
  permissions?: Permission[];
  /** True while the module is still planned (placeholder page). */
  planned?: boolean;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export const navigation: NavigationSection[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Overview', to: '/dashboard', icon: 'dashboard' }],
  },
  {
    label: 'Master Data',
    items: [
      { label: 'Users', to: '/masterdata/users', icon: 'users', permissions: [PERMISSIONS.USERS_MANAGE] },
      { label: 'Roles', to: '/masterdata/roles', icon: 'shield', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Machines', to: '/masterdata/machines', icon: 'machine', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Items', to: '/masterdata/items', icon: 'box', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Shifts', to: '/masterdata/shifts', icon: 'clock', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Defects', to: '/masterdata/defects', icon: 'defect', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Abnormalities', to: '/masterdata/abnormalities', icon: 'warning', permissions: [PERMISSIONS.MASTERDATA_READ] },
      { label: 'Production Setup', to: '/masterdata/production-setups', icon: 'settings', permissions: [PERMISSIONS.MASTERDATA_READ] },
    ],
  },
  {
    label: 'Production',
    items: [
      {
        label: 'Work Orders',
        to: '/work-orders',
        icon: 'clipboard',
        permissions: [PERMISSIONS.WORKORDER_READ],
      },
      {
        label: 'Operator Playground',
        to: '/operator',
        icon: 'play',
        permissions: [PERMISSIONS.PRODUCTION_EXECUTE],
      },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      {
        label: 'Andon Monitoring',
        to: '/andon',
        icon: 'monitor',
        permissions: [PERMISSIONS.ANDON_VIEW],
      },
    ],
  },
  {
    label: 'Analytics',
    items: [
      {
        label: 'Production Analytics',
        to: '/analytics',
        icon: 'chart',
        permissions: [PERMISSIONS.ANALYTICS_VIEW],
      },
    ],
  },
];

export function visibleSections(
  sections: NavigationSection[],
  granted: string[],
): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permissions || item.permissions.some((permission) => granted.includes(permission)),
      ),
    }))
    .filter((section) => section.items.length > 0);
}