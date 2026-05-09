import type { WorkspaceAPI } from '../workspace';
import { QuickColor } from './QuickColor';

interface Props {
  api: WorkspaceAPI;
  onReset?: () => void;
}

export function AddinPanel({ api, onReset }: Props) {
  return (
    <div className="addin">
      <div className="addin-head">
        <div className="row1">
          <div className="emblem">
            <i className="modus-icons-outlined">palette</i>
          </div>
          <div style={{ minWidth: 0 }}>
            <h2>Color Coding</h2>
            <div className="addin-sub">Add-in · v0.1 · session only</div>
          </div>
          <div className="actions">
            <button title="Help">
              <i className="modus-icons-outlined">help_outline</i>
            </button>
            <button title="Reset all" onClick={onReset}>
              <i className="modus-icons-outlined">refresh</i>
            </button>
            <button title="More options">
              <i className="modus-icons-outlined">more_vertical</i>
            </button>
          </div>
        </div>
      </div>

      <div className="addin-body">
        <QuickColor api={api} />
      </div>

      <div className="addin-foot">
        <button className="btn subtle" type="button" onClick={onReset}>
          <i className="modus-icons-outlined">restart_alt</i> Reset
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => api.viewer.resetAllObjectState().catch(console.error)}
        >
          <i className="modus-icons-outlined">visibility</i> Save view
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8a8e98' }}>Live preview</span>
      </div>
    </div>
  );
}
