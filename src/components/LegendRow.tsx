import type { Group } from '../types';

interface Props {
  group: Group;
  hidden: boolean;
  onToggleVisibility: () => void;
  onZoomTo: () => void;
}

export function LegendRow({ group, hidden, onToggleVisibility, onZoomTo }: Props) {
  return (
    <div className={`legend-row${hidden ? ' hidden' : ''}`}>
      <span
        className="swatch"
        style={{ background: hidden ? 'transparent' : group.color }}
      />
      <span className="label">{group.label}</span>
      <span className="count">{group.count.toLocaleString()}</span>
      <span className="row-actions">
        <button title={hidden ? 'Show group' : 'Hide group'} onClick={onToggleVisibility}>
          <i className="modus-icons-outlined">{hidden ? 'visibility_off' : 'visibility'}</i>
        </button>
        <button title="Zoom to elements" onClick={onZoomTo}>
          <i className="modus-icons-outlined">my_location</i>
        </button>
      </span>
    </div>
  );
}
