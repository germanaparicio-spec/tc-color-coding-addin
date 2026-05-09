interface Props {
  scope: 'Whole model' | 'Current selection';
  elementCount: number;
}

export function ScopeChip({ scope, elementCount }: Props) {
  return (
    <div className="scope">
      <i className="modus-icons-outlined" style={{ fontSize: 14 }}>cube</i>
      <span>Applying to</span>
      <span className="pill"><b>{scope}</b></span>
      <span style={{ marginLeft: 'auto', color: '#8a8e98' }}>{elementCount.toLocaleString()} elements</span>
    </div>
  );
}
