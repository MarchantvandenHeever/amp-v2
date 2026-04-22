import React from "react";

/**
 * Decorative network pattern: nodes connected by thin lines.
 * Used on hero banners. Pure SVG, themable, crisp at any size.
 */
export const HeroPattern: React.FC<{ className?: string; opacity?: number }> = ({
  className,
  opacity = 0.18,
}) => {
  // Hand-placed nodes for a balanced, organic feel
  const nodes: { x: number; y: number; r?: number }[] = [
    { x: 60,  y: 50,  r: 2.5 },
    { x: 150, y: 90 },
    { x: 240, y: 40,  r: 3 },
    { x: 320, y: 130 },
    { x: 410, y: 70,  r: 2.5 },
    { x: 500, y: 120, r: 3.5 },
    { x: 560, y: 50 },
    { x: 90,  y: 180, r: 3 },
    { x: 200, y: 220 },
    { x: 290, y: 200, r: 2.5 },
    { x: 380, y: 250, r: 3 },
    { x: 470, y: 210 },
    { x: 540, y: 260, r: 2.5 },
    { x: 130, y: 280 },
  ];

  // Edges by node index — designed to look like a mesh, not a complete graph
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 6],
    [1, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
    [2, 9], [3, 10], [5, 11], [4, 9], [7, 13], [13, 8],
    [0, 7], [1, 8], [6, 11], [3, 9],
  ];

  const stroke = "hsl(0 0% 100%)";
  const lineOpacity = opacity;
  const nodeOpacity = Math.min(1, opacity * 3);

  return (
    <svg
      className={className}
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="cl-node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity={nodeOpacity * 0.6} />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g stroke={stroke} strokeOpacity={lineOpacity} strokeWidth="0.8" strokeLinecap="round" fill="none">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
      </g>

      <g>
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={(n.r ?? 2) * 4} fill="url(#cl-node-glow)" />
            <circle cx={n.x} cy={n.y} r={n.r ?? 2} fill={stroke} fillOpacity={nodeOpacity} />
          </g>
        ))}
      </g>
    </svg>
  );
};
