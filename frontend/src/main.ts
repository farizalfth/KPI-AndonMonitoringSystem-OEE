import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import router from '@/router';
import { setUnauthorizedHandler } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

import '@/assets/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// A 401 from any request tears the session down once, then sends the user to
// the login page with the current location preserved.
const auth = useAuthStore(pinia);
setUnauthorizedHandler(() => {
  if (!auth.isAuthenticated) return;
  auth.clearSession();
  const current = router.currentRoute.value;
  if (current.name === 'login') return;
  void router.replace({ name: 'login', query: { redirect: current.fullPath } });
});

app.mount('#app');

export { app, pinia };
