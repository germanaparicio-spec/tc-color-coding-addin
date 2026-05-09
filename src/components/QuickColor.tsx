import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceAPI, ModelObjects } from '../workspace';
import type { Group } from '../types';
import { buildGroups, extractPropertyNames, generatePalette } from '../palette';
import { ScopeChip } from './ScopeChip';
import { LegendRow } from './LegendRow';

interface Props {
  api: WorkspaceAPI;
}

export function QuickColor({ api }: Props) {
  const [availableProps, setAvailableProps] = useState<string[]>([]);
  const [selectedProp, setSelectedProp] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cached model data — avoids re-fetching on property change
  const allModelObjectsRef = useRef<ModelObjects[]>([]);

  // Fetch all model objects (with embedded properties) once on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.viewer.getObjects().then(async modelObjects => {
      if (cancelled) return;

      // Real SDK returns objects without property sets — fetch them per model.
      const allModelObjects = await Promise.all(
        modelObjects.map(async ({ modelId, objects }) => {
          const hasProps = objects.some(o => o.properties && o.properties.length > 0);
          if (hasProps) return { modelId, objects };
          const withProps = await api.viewer.getObjectProperties(
            modelId,
            objects.map(o => o.id),
          );
          return { modelId, objects: withProps };
        }),
      );

      if (cancelled) return;
      allModelObjectsRef.current = allModelObjects;

      const total = allModelObjects.reduce((s, m) => s + m.objects.length, 0);
      setTotalElements(total);

      const props = extractPropertyNames(allModelObjects);
      setAvailableProps(props);
      setSelectedProp(prev => prev ?? props[0] ?? null);
    }).catch(e => {
      if (!cancelled) setError(String(e));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [api]);

  // Rebuild groups + apply colors whenever the selected property changes
  useEffect(() => {
    if (!selectedProp || allModelObjectsRef.current.length === 0) return;

    const newGroups = buildGroups(allModelObjectsRef.current, selectedProp);
    setGroups(newGroups);
    setHidden({});

    api.viewer.resetAllObjectState().then(() =>
      Promise.all(
        newGroups.map(g =>
          api.viewer.setObjectState({ modelObjectIds: g.modelObjectIds }, { color: g.color }),
        ),
      ),
    ).catch(console.error);
  }, [selectedProp, api]);

  const toggleHidden = useCallback((key: string) => {
    setHidden(prev => {
      const nowHidden = !prev[key];
      const group = groups.find(g => g.key === key);
      if (group) {
        api.viewer.setObjectState(
          { modelObjectIds: group.modelObjectIds },
          { visible: !nowHidden },
        ).catch(console.error);
      }
      return { ...prev, [key]: nowHidden };
    });
  }, [groups, api]);

  const zoomTo = useCallback((group: Group) => {
    api.viewer.zoomTo(group.modelObjectIds).catch(console.error);
  }, [api]);

  const showAll = useCallback(() => {
    setHidden({});
    Promise.all(
      groups.map(g =>
        api.viewer.setObjectState({ modelObjectIds: g.modelObjectIds }, { visible: true }),
      ),
    ).catch(console.error);
  }, [groups, api]);

  const regenerateColors = useCallback(() => {
    if (groups.length === 0) return;
    const palette = generatePalette(groups.length);
    // Offset by 3 so regenerate gives visibly different colors
    const reshuffled = groups.map((g, i) => ({ ...g, color: palette[(i + 3) % palette.length] }));
    setGroups(reshuffled);
    Promise.all(
      reshuffled.map(g =>
        api.viewer.setObjectState({ modelObjectIds: g.modelObjectIds }, { color: g.color }),
      ),
    ).catch(console.error);
  }, [groups, api]);

  const visibleCount = groups
    .filter(g => !hidden[g.key])
    .reduce((s, g) => s + g.count, 0);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading model properties…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="banner error-banner">
        <i className="modus-icons-outlined">error</i>
        <div><b>Error.</b> {error}</div>
      </div>
    );
  }

  return (
    <>
      <ScopeChip scope="Whole model" elementCount={totalElements} />

      <div className="section">
        <div className="field">
          <label className="field-label">Color by</label>
          <div className="select-wrapper">
            <i className="modus-icons-outlined select-lead">tag</i>
            <select
              className="select native"
              value={selectedProp ?? ''}
              onChange={e => setSelectedProp(e.target.value)}
            >
              {availableProps.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <i className="modus-icons-outlined select-caret">expand_more</i>
          </div>
          <div className="field-help">
            Pick a property — each unique value gets a distinct color automatically.
          </div>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="section">
          <div className="section-title">
            <span>Legend · {groups.length} groups</span>
            <span className="meta">
              {visibleCount.toLocaleString()} of {totalElements.toLocaleString()} elements visible
            </span>
          </div>
          <div className="legend">
            {groups.map(g => (
              <LegendRow
                key={g.key}
                group={g}
                hidden={!!hidden[g.key]}
                onToggleVisibility={() => toggleHidden(g.key)}
                onZoomTo={() => zoomTo(g)}
              />
            ))}
          </div>
          <div className="legend-summary">
            <button className="btn text" type="button" onClick={showAll}>
              <i className="modus-icons-outlined">visibility</i> Show all
            </button>
            <button className="btn text" type="button" onClick={regenerateColors}>
              <i className="modus-icons-outlined">refresh</i> Regenerate colors
            </button>
          </div>
        </div>
      )}

      <div className="banner">
        <i className="modus-icons-outlined">info</i>
        <div>
          <b>Tip.</b> Hover a row to reveal the eye icon (isolate) and the locator icon (zoom-fit those elements).
        </div>
      </div>
    </>
  );
}
