import type { Permission } from '@andon/shared';

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Permission required to enter the route. */
    permissions?: Permission[];
    /** Route reachable without a session. */
    public?: boolean;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Sign in' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Overview' },
      },
      {
        path: 'dashboard',
        redirect: { name: 'dashboard' },
      },
      {
        path: 'masterdata/users',
        name: 'masterdata.users',
        component: () => import('@/modules/masterdata/views/UsersView.vue'),
        meta: { title: 'Users', permissions: ['users:manage'] },
      },
      {
        path: 'masterdata/roles',
        name: 'masterdata.roles',
        component: () => import('@/modules/masterdata/views/RolesView.vue'),
        meta: { title: 'Roles', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/machines',
        name: 'masterdata.machines',
        component: () => import('@/modules/masterdata/views/MachinesView.vue'),
        meta: { title: 'Machines', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/items',
        name: 'masterdata.items',
        component: () => import('@/modules/masterdata/views/ItemsView.vue'),
        meta: { title: 'Items', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/shifts',
        name: 'masterdata.shifts',
        component: () => import('@/modules/masterdata/views/ShiftsView.vue'),
        meta: { title: 'Shifts', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/defects',
        name: 'masterdata.defects',
        component: () => import('@/modules/masterdata/views/DefectsView.vue'),
        meta: { title: 'Defects', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/abnormalities',
        name: 'masterdata.abnormalities',
        component: () => import('@/modules/masterdata/views/AbnormalitiesView.vue'),
        meta: { title: 'Abnormalities', permissions: ['masterdata:read'] },
      },
      {
        path: 'masterdata/production-setups',
        name: 'masterdata.production-setups',
        component: () => import('@/modules/masterdata/views/ProductionSetupsView.vue'),
        meta: { title: 'Production Setup', permissions: ['masterdata:read'] },
      },
      {
        path: 'work-orders',
        name: 'work-orders',
        component: () => import('@/modules/workorder/views/WorkOrdersView.vue'),
        meta: {
          title: 'Work Orders',
          permissions: ['workorder:read'],
        },
      },
      {
        path: 'operator',
        name: 'operator',
        component: () => import('@/modules/operator/views/OperatorLogsView.vue'),
        meta: {
          title: 'Operator Playground',
          permissions: ['production:execute'],
        },
      },
      {
        path: 'andon',
        name: 'andon',
        component: () => import('@/modules/andon/views/AndonEventsView.vue'),
        meta: {
          title: 'Andon Monitoring',
          permissions: ['andon:view'],
        },
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/modules/analytics/views/KpiSnapshotsView.vue'),
        meta: {
          title: 'Production Analytics',
          permissions: ['analytics:view'],
        },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
        meta: { title: 'Access denied' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: 'Page not found' },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.initialised) await auth.restore();

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' };
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const required = to.meta.permissions ?? [];
  if (required.length > 0 && !auth.hasPermission(...required)) {
    return { name: 'forbidden' };
  }

  return true;
});

router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} · Andon OEE` : 'Andon Monitoring System & OEE';
  document.title = title;
});

export default router;
