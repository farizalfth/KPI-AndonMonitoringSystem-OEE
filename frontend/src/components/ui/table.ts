/** Column definition consumed by `components/ui/DataTable.vue`. */
export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Cell renderer; falls back to the raw value when omitted. */
  cell?: (row: Record<string, unknown>) => unknown;
}
