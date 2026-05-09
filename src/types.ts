import type { ModelObjectIds } from './workspace';

export type Scope = 'whole-model' | 'selection';

export interface Group {
  key: string;
  label: string;
  color: string;
  count: number;
  modelObjectIds: ModelObjectIds[];
}
