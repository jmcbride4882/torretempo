import "./RoleLegend.css";

interface RoleLegendProps {
  roles: Array<{ name: string; color: string }>;
}

export default function RoleLegend({ roles }: RoleLegendProps) {
  return (
    <div className="role-legend">
      <h4>Role Color Key</h4>
      <div className="legend-items">
        {roles.map((role) => (
          <div key={role.name} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: role.color }}
            />
            <span className="legend-label">{role.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
