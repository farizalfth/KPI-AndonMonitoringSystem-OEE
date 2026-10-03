import type { TableColumn } from '@/components/ui/table';

/**
 * Declarative configuration for a Master Data CRUD screen.
 * See `modules/masterdata/components/CrudPage.vue`.
 */
export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'password' | 'datetime';

export type FieldValue = string | number | boolean | null;

export interface SelectSource {
  /** API path, e.g. `/masterdata/roles`. */
  path: string;
  /** Column used as the option label. */
  labelKey: string;
  /** Column used as the option value. */
  valueKey: string;
  /** Optional extra query params, e.g. `{ isActive: true }`. */
  params?: Record<string, unknown>;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
  optionsSource?: SelectSource;
  /** Show only while creating (e.g. password). */
  createOnly?: boolean;
  /** Show only while editing (e.g. active toggles). */
  editOnly?: boolean;
  /** Value used when the user leaves the field empty on create. */
  defaultValue?: FieldValue;
  colSpan?: 1 | 2;
}

export interface CrudPageProps {
  title: string;
  description?: string;
  /** Resource path segment, e.g. `machines` -> `/masterdata/machines`. */
  resource: string;
  columns: TableColumn[];
  fields: FieldConfig[];
  /** Hides create/edit/delete for read-only roles. */
  canWrite: boolean;
  /** Columns searched by the search box (`searchFields` query param). */
  searchFields?: string[];
  defaultSortBy?: string;
  /** Extra query params sent with every list request. */
  params?: Record<string, unknown>;
  createLabel?: string;
}
