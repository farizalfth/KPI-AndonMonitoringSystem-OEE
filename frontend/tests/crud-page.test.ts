import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import CrudPage from '@/modules/masterdata/components/CrudPage.vue';
import type { CrudPageProps } from '@/modules/masterdata/types';
import { resetLocalData } from '@/services/local-data';

/**
 * End-to-end check of the shared CRUD screen against the demo store: the
 * toolbar button opens the form, saving writes a row and the table action
 * buttons edit and delete it — all without a backend.
 */
const props: CrudPageProps = {
  title: 'Work Orders',
  resource: 'work-orders',
  canWrite: true,
  createLabel: 'New work order',
  columns: [
    { key: 'code', label: 'Code' },
    { key: 'targetQty', label: 'Target', align: 'right' },
    { key: 'status', label: 'Status' },
  ],
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'targetQty', label: 'Target quantity', type: 'number', required: true, defaultValue: 0 },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'DRAFT',
      options: [{ value: 'DRAFT', label: 'DRAFT' }, { value: 'APPROVED', label: 'APPROVED' }],
    },
  ],
};

function mountPage(): VueWrapper {
  return mount(CrudPage, {
    props,
    global: { stubs: { teleport: true } },
  });
}

async function clickButton(wrapper: VueWrapper, label: string): Promise<void> {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`Button "${label}" not found`);
  await button.trigger('click');
  await flushPromises();
}

function textInputs(wrapper: VueWrapper) {
  return wrapper.findAll('input').filter((input) => input.attributes('type') === 'text');
}

function numberInputs(wrapper: VueWrapper) {
  return wrapper.findAll('input').filter((input) => input.attributes('type') === 'number');
}

beforeEach(() => {
  resetLocalData();
});

describe('CrudPage against the demo store', () => {
  it('lists the seeded rows', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('WO-DAILY-DEMO');
    expect(wrapper.text()).toContain('WO-MONTHLY-DEMO');
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });

  it('creates a record from the toolbar button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await clickButton(wrapper, 'New work order');

    const code = textInputs(wrapper)[0];
    if (!code) throw new Error('Code input not rendered');
    await code.setValue('WO-UNIT-TEST');

    const target = numberInputs(wrapper)[0];
    if (!target) throw new Error('Target input not rendered');
    await target.setValue('42');

    await clickButton(wrapper, 'Save');
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(4);
    expect(wrapper.text()).toContain('WO-UNIT-TEST');
  });

  it('edits a record from the row action button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const row = wrapper.findAll('tbody tr').find((candidate) => candidate.text().includes('WO-DRAFT-001'));
    if (!row) throw new Error('Seed row not found');
    const edit = row.findAll('button').find((button) => button.text() === 'Edit');
    if (!edit) throw new Error('Edit button not found');
    await edit.trigger('click');
    await flushPromises();

    const target = numberInputs(wrapper)[0];
    if (!target) throw new Error('Target input not rendered');
    await target.setValue('999');

    await clickButton(wrapper, 'Save');
    await flushPromises();

    const updated = wrapper.findAll('tbody tr').find((candidate) => candidate.text().includes('WO-DRAFT-001'));
    expect(updated?.text()).toContain('999');
  });

  it('deletes a record after the confirmation step', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const row = wrapper.findAll('tbody tr').find((candidate) => candidate.text().includes('WO-MONTHLY-DEMO'));
    if (!row) throw new Error('Seed row not found');
    const remove = row.findAll('button').find((button) => button.text() === 'Delete');
    if (!remove) throw new Error('Delete button not found');
    await remove.trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    const confirm = dialog.findAll('button').find((button) => button.text() === 'Delete');
    if (!confirm) throw new Error('Confirmation button not found');
    await confirm.trigger('click');
    await flushPromises();

    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('WO-MONTHLY-DEMO');
  });

  it('surfaces a validation error instead of saving', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await clickButton(wrapper, 'New work order');
    await clickButton(wrapper, 'Save');
    await flushPromises();

    expect(wrapper.text()).toContain('Code is required');
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });
});
