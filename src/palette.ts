import type { ModelObjects } from './workspace';
import type { Group } from './types';

const BASE_COLORS = [
  '#0063a3', '#fbad26', '#62b1e0', '#1e8a44', '#da212c',
  '#a04ed1', '#e49325', '#7da9c5', '#0e416c', '#9bcb7f',
  '#c14545', '#a36028', '#8a8e98', '#3d4145',
];

export function generatePalette(count: number): string[] {
  if (count <= BASE_COLORS.length) return BASE_COLORS.slice(0, count);
  const colors = [...BASE_COLORS];
  for (let i = 0; i < count - BASE_COLORS.length; i++) {
    const h = Math.round((i * 137.508) % 360);
    colors.push(`hsl(${h}, 62%, 42%)`);
  }
  return colors;
}

// Collect all "SetName · PropName" keys, sorted by distinct value count (fewest first).
export function extractPropertyNames(allModelObjects: ModelObjects[]): string[] {
  const distinctValues = new Map<string, Set<string>>();
  for (const { objects } of allModelObjects) {
    for (const obj of objects) {
      for (const set of obj.properties ?? []) {
        if (!set.name) continue;
        for (const prop of set.properties ?? []) {
          const key = `${set.name} · ${prop.name}`;
          if (!distinctValues.has(key)) distinctValues.set(key, new Set());
          distinctValues.get(key)!.add(String(prop.value));
        }
      }
    }
  }
  return Array.from(distinctValues.entries())
    .sort((a, b) => a[1].size - b[1].size || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}

function parsePropertyKey(key: string): { setName: string; propName: string } {
  const sep = key.indexOf(' · ');
  return sep === -1
    ? { setName: '', propName: key }
    : { setName: key.slice(0, sep), propName: key.slice(sep + 3) };
}

// Build legend groups from all model objects and a chosen "SetName · PropName" key.
export function buildGroups(allModelObjects: ModelObjects[], propertyKey: string): Group[] {
  const { setName, propName } = parsePropertyKey(propertyKey);

  // label → { byModel: modelId → runtimeIds[], count }
  const valueMap = new Map<string, { byModel: Map<string, number[]>; count: number }>();

  for (const { modelId, objects } of allModelObjects) {
    for (const obj of objects) {
      const set = obj.properties?.find(s => s.name === setName);
      const prop = set?.properties?.find(p => p.name === propName);
      const label = prop != null ? String(prop.value) : '(no value)';

      let entry = valueMap.get(label);
      if (!entry) {
        entry = { byModel: new Map(), count: 0 };
        valueMap.set(label, entry);
      }
      const ids = entry.byModel.get(modelId) ?? [];
      ids.push(obj.id);
      entry.byModel.set(modelId, ids);
      entry.count++;
    }
  }

  const sorted = Array.from(valueMap.entries()).sort((a, b) => b[1].count - a[1].count);
  const palette = generatePalette(sorted.length);

  return sorted.map(([label, { byModel, count }], i) => ({
    key: `grp:${label}`,
    label,
    color: palette[i],
    count,
    modelObjectIds: Array.from(byModel.entries()).map(([modelId, objectRuntimeIds]) => ({
      modelId,
      objectRuntimeIds,
    })),
  }));
}
