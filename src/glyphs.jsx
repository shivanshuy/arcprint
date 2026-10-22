import { fontFamily, fontPx, hexColor, strokePx } from './model.js';
import { symbolById } from './library.js';

function common(node) {
  return {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: strokePx(node.weight),
    strokeDasharray: node.dashed ? '7 4' : undefined,
    vectorEffect: 'non-scaling-stroke',
  };
}

export function ShapeArt({ node, fill, labelAt, lettering, caps, showLabel = true, labelFill }) {
  const spec = symbolById(node.type);
  const kind = node.type === 'arrow' ? 'arrow' : spec?.kind || 'rect';
  const { w, h } = node;
  const pen = common(node);
  const painted = { ...pen, fill: fill || 'none' };
  const tinted = spec && hexColor(node.fillColor) ? { ...spec, color: hexColor(node.fillColor) } : spec;
  const textFill = kind === 'boundary' && tinted?.color ? headerInk(tinted.color) : labelFill;
  return (
    <g>
      {kind === 'badge' && tinted ? <Badge w={w} h={h} spec={tinted} /> : null}
      {kind === 'boundary' && tinted ? <Boundary w={w} h={h} spec={tinted} dashed={node.dashed} /> : null}
      {kind !== 'badge' && kind !== 'boundary' ? drawKind(kind, w, h, painted, pen) : null}
      {showLabel && node.label ? (
        <Label node={node} kind={kind} labelAt={labelAt || spec?.labelAt || 'center'} lettering={lettering} caps={caps} fill={textFill} />
      ) : null}
    </g>
  );
}

export function badgeTile(w, h) {
  const tileW = Math.max(36, w * 0.86);
  const tileH = Math.max(36, Math.min(tileW * 0.78, Math.max(36, h - 22)));
  return { tileW, tileH, x: (w - tileW) / 2 };
}

function Badge({ w, h, spec }) {
  const { tileW, tileH, x } = badgeTile(w, h);
  const mark = Math.min(tileW, tileH);
  const ink = headerInk(spec.color);
  const shape = spec.tile === 'hex'
    ? <polygon points={hexPoints(tileW, tileH)} fill={spec.color} />
    : <rect width={tileW} height={tileH} rx={spec.tile === 'round' ? Math.min(tileW, tileH) * 0.28 : Math.min(tileW, tileH) * 0.18} fill={spec.color} />;
  return (
    <g>
      <g transform={`translate(${x} 0)`}>{shape}</g>
      <g
        transform={`translate(${x + (tileW - mark * 0.56) / 2} ${(tileH - mark * 0.56) / 2})`}
        fill="none"
        stroke={ink}
        strokeWidth={Math.max(1.6, mark * 0.045)}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Mark name={spec.mark} size={mark * 0.56} />
      </g>
    </g>
  );
}

function Boundary({ w, h, spec, dashed }) {
  const head = Math.min(28, Math.max(16, h * 0.12));
  return (
    <g>
      <rect width={w} height={h} fill={withAlpha(spec.color, 0.14)} stroke={spec.color} strokeWidth={1.6} strokeDasharray={dashed ? '7 4' : undefined} vectorEffect="non-scaling-stroke" />
      <rect width={w} height={head} fill={spec.color} />
    </g>
  );
}

function Mark({ name, size }) {
  const s = size;
  if (name === 'vm') {
    return (
      <g>
        <rect x={s * 0.12} y={s * 0.08} width={s * 0.76} height={s * 0.84} rx={s * 0.06} />
        <path d={`M ${s * 0.12} ${s * 0.38} H ${s * 0.88} M ${s * 0.12} ${s * 0.64} H ${s * 0.88}`} />
      </g>
    );
  }
  if (name === 'fn') {
    return <path d={`M ${s * 0.62} ${s * 0.08} L ${s * 0.28} ${s * 0.52} H ${s * 0.52} L ${s * 0.34} ${s * 0.92} L ${s * 0.78} ${s * 0.4} H ${s * 0.52} Z`} />;
  }
  if (name === 'box') {
    return (
      <path d={`M ${s * 0.5} ${s * 0.08} L ${s * 0.88} ${s * 0.28} V ${s * 0.72} L ${s * 0.5} ${s * 0.92} L ${s * 0.12} ${s * 0.72} V ${s * 0.28} Z M ${s * 0.5} ${s * 0.08} V ${s * 0.5} M ${s * 0.12} ${s * 0.28} L ${s * 0.5} ${s * 0.5} L ${s * 0.88} ${s * 0.28}`} />
    );
  }
  if (name === 'db') {
    const ry = s * 0.14;
    return (
      <g>
        <path d={`M ${s * 0.16} ${ry} A ${s * 0.34} ${ry} 0 0 1 ${s * 0.84} ${ry} V ${s * 0.78} A ${s * 0.34} ${ry} 0 0 1 ${s * 0.16} ${s * 0.78} Z`} />
        <path d={`M ${s * 0.16} ${ry} A ${s * 0.34} ${ry} 0 0 0 ${s * 0.84} ${ry}`} />
      </g>
    );
  }
  if (name === 'store') {
    return <path d={`M ${s * 0.22} ${s * 0.16} H ${s * 0.78} L ${s * 0.9} ${s * 0.84} H ${s * 0.1} Z M ${s * 0.28} ${s * 0.16} V ${s * 0.08} H ${s * 0.72} V ${s * 0.16}`} />;
  }
  if (name === 'cache') {
    return (
      <g>
        <rect x={s * 0.2} y={s * 0.08} width={s * 0.6} height={s * 0.22} rx={s * 0.04} />
        <rect x={s * 0.12} y={s * 0.38} width={s * 0.6} height={s * 0.22} rx={s * 0.04} />
        <rect x={s * 0.28} y={s * 0.68} width={s * 0.6} height={s * 0.22} rx={s * 0.04} />
      </g>
    );
  }
  if (name === 'queue') {
    return <path d={`M ${s * 0.12} ${s * 0.28} H ${s * 0.88} M ${s * 0.2} ${s * 0.5} H ${s * 0.8} M ${s * 0.28} ${s * 0.72} H ${s * 0.72}`} />;
  }
  if (name === 'topic') {
    return (
      <g>
        <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.12} />
        <path d={`M ${s * 0.28} ${s * 0.28} A ${s * 0.32} ${s * 0.32} 0 0 1 ${s * 0.72} ${s * 0.28} M ${s * 0.16} ${s * 0.16} A ${s * 0.48} ${s * 0.48} 0 0 1 ${s * 0.84} ${s * 0.16} M ${s * 0.28} ${s * 0.72} A ${s * 0.32} ${s * 0.32} 0 0 0 ${s * 0.72} ${s * 0.72} M ${s * 0.16} ${s * 0.84} A ${s * 0.48} ${s * 0.48} 0 0 0 ${s * 0.84} ${s * 0.84}`} />
      </g>
    );
  }
  if (name === 'lb') {
    return <path d={`M ${s * 0.12} ${s * 0.28} H ${s * 0.88} M ${s * 0.3} ${s * 0.28} L ${s * 0.3} ${s * 0.78} M ${s * 0.7} ${s * 0.28} L ${s * 0.7} ${s * 0.78} M ${s * 0.5} ${s * 0.08} V ${s * 0.28}`} />;
  }
  if (name === 'dns') {
    return (
      <g>
        <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.36} />
        <path d={`M ${s * 0.5} ${s * 0.14} V ${s * 0.86} M ${s * 0.14} ${s * 0.5} H ${s * 0.86} M ${s * 0.24} ${s * 0.32} Q ${s * 0.5} ${s * 0.44} ${s * 0.76} ${s * 0.32} M ${s * 0.24} ${s * 0.68} Q ${s * 0.5} ${s * 0.56} ${s * 0.76} ${s * 0.68}`} />
      </g>
    );
  }
  if (name === 'waf') {
    return <path d={`M ${s * 0.5} ${s * 0.08} L ${s * 0.86} ${s * 0.26} V ${s * 0.52} C ${s * 0.86} ${s * 0.74} ${s * 0.68} ${s * 0.88} ${s * 0.5} ${s * 0.94} C ${s * 0.32} ${s * 0.88} ${s * 0.14} ${s * 0.74} ${s * 0.14} ${s * 0.52} V ${s * 0.26} Z`} />;
  }
  if (name === 'api') {
    return <path d={`M ${s * 0.18} ${s * 0.28} H ${s * 0.82} V ${s * 0.78} H ${s * 0.18} Z M ${s * 0.4} ${s * 0.28} V ${s * 0.78} M ${s * 0.6} ${s * 0.28} V ${s * 0.78} M ${s * 0.5} ${s * 0.1} V ${s * 0.28}`} />;
  }
  if (name === 'vpclink') {
    return (
      <g>
        <circle cx={s * 0.28} cy={s * 0.28} r={s * 0.12} />
        <circle cx={s * 0.72} cy={s * 0.72} r={s * 0.12} />
        <path d={`M ${s * 0.36} ${s * 0.36} L ${s * 0.64} ${s * 0.64}`} />
      </g>
    );
  }
  if (name === 'igw') {
    return <path d={`M ${s * 0.16} ${s * 0.34} H ${s * 0.84} V ${s * 0.8} H ${s * 0.16} Z M ${s * 0.5} ${s * 0.1} V ${s * 0.58} M ${s * 0.34} ${s * 0.44} L ${s * 0.5} ${s * 0.6} L ${s * 0.66} ${s * 0.44}`} />;
  }
  if (name === 'nat') {
    return <path d={`M ${s * 0.1} ${s * 0.5} H ${s * 0.62} L ${s * 0.46} ${s * 0.32} M ${s * 0.62} ${s * 0.5} L ${s * 0.46} ${s * 0.68} M ${s * 0.78} ${s * 0.2} V ${s * 0.8}`} />;
  }
  if (name === 'cdn') {
    return (
      <g>
        <path d={`M ${s * 0.16} ${s * 0.66} Q ${s * 0.5} ${s * 0.16} ${s * 0.84} ${s * 0.66}`} />
        <circle cx={s * 0.22} cy={s * 0.6} r={s * 0.08} />
        <circle cx={s * 0.5} cy={s * 0.36} r={s * 0.08} />
        <circle cx={s * 0.78} cy={s * 0.6} r={s * 0.08} />
      </g>
    );
  }
  if (name === 'id') {
    return (
      <g>
        <rect x={s * 0.22} y={s * 0.42} width={s * 0.56} height={s * 0.42} rx={s * 0.04} />
        <path d={`M ${s * 0.36} ${s * 0.42} V ${s * 0.3} A ${s * 0.14} ${s * 0.14} 0 0 1 ${s * 0.64} ${s * 0.3} V ${s * 0.42}`} />
      </g>
    );
  }
  return (
    <g>
      <circle cx={s * 0.5} cy={s * 0.28} r={s * 0.14} />
      <path d={`M ${s * 0.22} ${s * 0.88} C ${s * 0.26} ${s * 0.58} ${s * 0.74} ${s * 0.58} ${s * 0.78} ${s * 0.88}`} />
    </g>
  );
}

function headerInk(color) {
  const n = Number.parseInt(String(color).slice(1), 16);
  if (!Number.isFinite(n)) return '#1a1a1a';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1a1a1a' : '#ffffff';
}

function withAlpha(color, alpha) {
  const n = Number.parseInt(String(color).slice(1), 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawKind(kind, w, h, painted, pen) {
  switch (kind) {
    case 'round':
      return <rect width={w} height={h} rx={Math.min(18, h / 2)} {...painted} />;
    case 'stadium':
      return <rect width={w} height={h} rx={h / 2} {...painted} />;
    case 'cylinder':
      return <Cylinder w={w} h={h} painted={painted} />;
    case 'diamond':
      return <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} {...painted} />;
    case 'hex':
      return <polygon points={hexPoints(w, h)} {...painted} />;
    case 'queue':
      return <polygon points={`${18},0 ${w},0 ${w - 18},${h} 0,${h}`} {...painted} />;
    case 'slant':
      return <polygon points={`${22},0 ${w},0 ${w - 22},${h} 0,${h}`} {...painted} />;
    case 'document':
      return <path d={documentPath(w, h)} {...painted} />;
    case 'cloud':
      return <path d={cloudPath(w, h)} {...painted} />;
    case 'actor':
      return <Actor w={w} h={h} pen={pen} />;
    case 'server':
      return <Server w={w} h={h} painted={painted} pen={pen} />;
    case 'browser':
      return <Browser w={w} h={h} painted={painted} pen={pen} />;
    case 'note':
      return <Note w={w} h={h} painted={painted} />;
    case 'delay':
      return <path d={delayPath(w, h)} {...painted} />;
    case 'layers':
      return <Layers w={w} h={h} painted={painted} pen={pen} />;
    case 'api':
      return <Api w={w} h={h} painted={painted} pen={pen} />;
    case 'worker':
      return <Worker w={w} h={h} painted={painted} pen={pen} />;
    case 'container':
      return <Container w={w} h={h} painted={painted} pen={pen} />;
    case 'lock':
      return <Lock w={w} h={h} painted={painted} pen={pen} />;
    case 'bucket':
      return <polygon points={`${w * 0.18},0 ${w * 0.82},0 ${w},${h} 0,${h}`} {...painted} />;
    case 'repo':
      return <CodeRepo w={w} h={h} painted={painted} pen={pen} />;
    case 'artifact':
      return <ArtifactRepo w={w} h={h} painted={painted} pen={pen} />;
    case 'cicd':
      return <Cicd w={w} h={h} pen={pen} />;
    case 'llm':
      return <Llm w={w} h={h} painted={painted} pen={pen} />;
    case 'agent':
      return <Agent w={w} h={h} painted={painted} pen={pen} />;
    case 'window':
      return <Window w={w} h={h} painted={painted} pen={pen} />;
    case 'field':
      return <Field w={w} h={h} painted={painted} pen={pen} />;
    case 'card':
      return <Card w={w} h={h} painted={painted} pen={pen} />;
    case 'frame':
      return <rect width={w} height={h} {...painted} />;
    case 'callout':
      return <path d={calloutPath(w, h)} {...painted} />;
    case 'text':
      return null;
    case 'arrow':
      return null;
    default:
      return <rect width={w} height={h} {...painted} />;
  }
}

function Cylinder({ w, h, painted }) {
  const ry = Math.min(14, h * 0.16);
  return (
    <g>
      <path d={`M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z`} {...painted} />
      <path d={`M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`} {...painted} fill="none" />
    </g>
  );
}

function Actor({ w, h, pen }) {
  const cx = w / 2;
  const head = Math.min(14, w * 0.22);
  return (
    <g>
      <circle cx={cx} cy={head + 2} r={head} {...pen} />
      <path d={`M ${cx} ${head * 2 + 4} V ${h * 0.62} M ${cx - 16} ${h * 0.42} H ${cx + 16} M ${cx} ${h * 0.62} L ${cx - 14} ${h - 22} M ${cx} ${h * 0.62} L ${cx + 14} ${h - 22}`} {...pen} />
    </g>
  );
}

function Server({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M 0 ${h * 0.33} H ${w} M 0 ${h * 0.66} H ${w}`} {...pen} />
      <circle cx={w - 14} cy={h * 0.16} r={3} {...pen} />
      <circle cx={w - 14} cy={h * 0.5} r={3} {...pen} />
      <circle cx={w - 14} cy={h * 0.83} r={3} {...pen} />
    </g>
  );
}

function Browser({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M 0 22 H ${w}`} {...pen} />
      <circle cx={12} cy={11} r={3} {...pen} />
      <circle cx={22} cy={11} r={3} {...pen} />
      <circle cx={32} cy={11} r={3} {...pen} />
    </g>
  );
}

function Note({ w, h, painted }) {
  const fold = 16;
  return <path d={`M 0 0 H ${w - fold} L ${w} ${fold} V ${h} H 0 Z M ${w - fold} 0 V ${fold} H ${w}`} {...painted} />;
}

function Layers({ w, h, painted, pen }) {
  return (
    <g>
      <rect x={8} width={w - 8} height={h - 16} {...painted} />
      <rect y={16} width={w - 8} height={h - 16} {...painted} />
      <path d={`M ${w - 8} 0 V 16 H ${w} V ${h} H 8 V ${h - 16}`} {...pen} fill="none" />
    </g>
  );
}

function Api({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M ${w - 28} 0 V ${h} M ${w - 28} ${h * 0.35} H ${w} M ${w - 28} ${h * 0.65} H ${w}`} {...pen} />
    </g>
  );
}

function Worker({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} rx={4} {...painted} />
      <circle cx={18} cy={h / 2} r={6} {...pen} />
      <path d={`M 18 ${h / 2 - 9} V ${h / 2 - 6} M 18 ${h / 2 + 6} V ${h / 2 + 9} M ${9} ${h / 2} H ${12} M ${24} ${h / 2} H ${27}`} {...pen} />
    </g>
  );
}

function Container({ w, h, painted, pen }) {
  const top = 16;
  return (
    <g>
      <path d={`M 10 ${top} L ${w / 2} 0 L ${w - 10} ${top}`} {...pen} fill="none" />
      <rect y={top} width={w} height={h - top} {...painted} />
      <path d={`M 0 ${top} H ${w}`} {...pen} />
    </g>
  );
}

function CodeRepo({ w, h, painted, pen }) {
  const foot = Math.min(36, h * 0.32);
  const bottom = h - foot;
  const tabH = bottom * 0.22;
  const tabW = w * 0.42;
  const r = Math.min(8, w * 0.08);
  const bodyTop = tabH * 0.62;
  const folder = [
    `M ${r} 0`,
    `H ${tabW - r}`,
    `Q ${tabW} 0 ${tabW} ${r}`,
    `V ${bodyTop}`,
    `H ${w - r}`,
    `Q ${w} ${bodyTop} ${w} ${bodyTop + r}`,
    `V ${bottom - r}`,
    `Q ${w} ${bottom} ${w - r} ${bottom}`,
    `H ${r}`,
    `Q 0 ${bottom} 0 ${bottom - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
  const frontY = bodyTop + (bottom - bodyTop) * 0.18;
  const frontX = w * 0.08;
  const frontW = w * 0.84;
  const frontH = bottom - frontY - bottom * 0.08;
  const cx = w / 2;
  const cy = frontY + frontH * 0.5;
  const s = Math.min(frontW, frontH) * 0.22;
  const brackets = `M ${cx - s * 0.55} ${cy - s} L ${cx - s * 1.55} ${cy} L ${cx - s * 0.55} ${cy + s} M ${cx - s * 0.18} ${cy + s * 0.85} L ${cx + s * 0.18} ${cy - s * 0.85} M ${cx + s * 0.55} ${cy - s} L ${cx + s * 1.55} ${cy} L ${cx + s * 0.55} ${cy + s}`;
  return (
    <g>
      <path d={folder} {...painted} />
      <rect x={frontX} y={frontY} width={frontW} height={frontH} rx={r} {...painted} />
      <path d={brackets} {...pen} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

function ArtifactRepo({ w, h, painted, pen }) {
  const foot = Math.min(36, h * 0.32);
  const bottom = h - foot;
  const cx = w / 2;
  const cy = bottom / 2;
  const outer = Math.min(w, bottom) * 0.5 - 1;
  const at = (radius, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 3);
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const outerPts = [0, 1, 2, 3, 4, 5].map((index) => at(outer, index));
  const hex = outerPts.map((point) => point.join(',')).join(' ');
  const u = outer * 0.38;
  const v = outer * 0.2;
  const edge = outer * 0.5;
  const peak = [cx, cy - edge * 0.55 - v];
  const topL = [cx - u, peak[1] + v];
  const topR = [cx + u, peak[1] + v];
  const topF = [cx, peak[1] + v * 2];
  const botL = [topL[0], topL[1] + edge];
  const botF = [topF[0], topF[1] + edge];
  const botR = [topR[0], topR[1] + edge];
  const cube = [
    `M ${peak[0]} ${peak[1]} L ${topL[0]} ${topL[1]} L ${topF[0]} ${topF[1]} L ${topR[0]} ${topR[1]} Z`,
    `M ${topL[0]} ${topL[1]} L ${botL[0]} ${botL[1]} L ${botF[0]} ${botF[1]} L ${topF[0]} ${topF[1]}`,
    `M ${topR[0]} ${topR[1]} L ${botR[0]} ${botR[1]} L ${botF[0]} ${botF[1]}`,
    `M ${topF[0]} ${topF[1]} L ${botF[0]} ${botF[1]}`,
  ].join(' ');
  const midway = (from, toward) => {
    const x = from[0] + (toward[0] - from[0]) * 0.46;
    const y = from[1] + (toward[1] - from[1]) * 0.46;
    return `M ${from[0]} ${from[1]} L ${x} ${y}`;
  };
  const stubs = [
    midway(outerPts[5], topL),
    midway(outerPts[1], topR),
    midway(outerPts[3], [cx, botF[1]]),
  ].join(' ');
  return (
    <g>
      <polygon points={hex} {...painted} />
      <path d={`${cube} ${stubs}`} {...pen} fill="none" strokeLinejoin="round" />
    </g>
  );
}

function Cicd({ w, h, pen }) {
  const foot = Math.min(32, h * 0.3);
  const body = h - foot;
  const r = Math.min(w * 0.28, body * 0.46);
  const cy = body / 2;
  const left = w * 0.34;
  const right = w * 0.66;
  const reach = (right - left) / 2;
  const rise = Math.sqrt(Math.max(r * r - reach * reach, 1));
  const alpha = Math.atan2(rise, reach);
  const outerLeft = arcPath(left, cy, r, -alpha, -(Math.PI * 2 - alpha * 2));
  const outerRight = arcPath(right, cy, r, -Math.PI + alpha, Math.PI * 2 - alpha * 2);
  const underTop = arcPath(right, cy, r, -Math.PI + alpha, -alpha * 0.72);
  const underBottom = arcPath(right, cy, r, -Math.PI - alpha * 0.28, -alpha * 0.72);
  const over = arcPath(left, cy, r, -alpha, alpha * 2);
  const gear = gearPath(left, cy, r * 0.34, r * 0.52, 8);
  const s = r * 0.3;
  const brackets = `M ${right - s * 0.5} ${cy - s} L ${right - s * 1.45} ${cy} L ${right - s * 0.5} ${cy + s} M ${right - s * 0.16} ${cy + s * 0.85} L ${right + s * 0.16} ${cy - s * 0.85} M ${right + s * 0.5} ${cy - s} L ${right + s * 1.45} ${cy} L ${right + s * 0.5} ${cy + s}`;
  return (
    <g>
      <path d={`${outerLeft} ${outerRight} ${underTop} ${underBottom}`} {...pen} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={over} {...pen} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={gear} {...pen} fill="none" strokeLinejoin="round" />
      <circle cx={left} cy={cy} r={r * 0.16} {...pen} />
      <path d={brackets} {...pen} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

function arcPath(cx, cy, radius, start, sweep, steps = 28) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = start + sweep * (i / steps);
    pts.push(`${i ? 'L' : 'M'} ${cx + Math.cos(t) * radius} ${cy + Math.sin(t) * radius}`);
  }
  return pts.join(' ');
}

function gearPath(cx, cy, inner, outer, teeth) {
  const step = (Math.PI * 2) / teeth;
  const parts = [];
  for (let i = 0; i < teeth; i += 1) {
    const a0 = i * step - Math.PI / 2;
    const tooth = step * 0.34;
    const gap = step * 0.16;
    const p = (angle, radius) => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    const [x0, y0] = p(a0 + gap, inner);
    const [x1, y1] = p(a0 + gap, outer);
    const [x2, y2] = p(a0 + gap + tooth, outer);
    const [x3, y3] = p(a0 + gap + tooth, inner);
    parts.push(`${i ? 'L' : 'M'} ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`);
  }
  return `${parts.join(' ')} Z`;
}

function Llm({ w, h, painted, pen }) {
  const foot = Math.min(30, h * 0.22);
  const body = h - foot;
  const dot = Math.min(w, body) * 0.028;
  const reach = Math.min(w, body) * 0.13;
  const margin = reach + dot * 2;
  const side = Math.min(w, body) - margin * 2;
  const x = (w - side) / 2;
  const y = (body - side) / 2;
  const pins = [
    ...[0.24, 0.5, 0.76].map((t) => [x + side * t, y, 0, -1]),
    ...[0.24, 0.5, 0.76].map((t) => [x + side * t, y + side, 0, 1]),
    ...[0.34, 0.66].map((t) => [x, y + side * t, -1, 0]),
    ...[0.34, 0.66].map((t) => [x + side, y + side * t, 1, 0]),
  ];
  const leads = pins.map(([px, py, dx, dy]) => (
    `M ${px} ${py} L ${px + dx * (reach - dot)} ${py + dy * (reach - dot)}`
  )).join(' ');
  return (
    <g>
      <rect x={x} y={y} width={side} height={side} rx={side * 0.16} {...painted} />
      <path d={leads} {...pen} fill="none" strokeLinecap="butt" />
      {pins.map(([px, py, dx, dy]) => (
        <circle key={`${px}-${py}`} cx={px + dx * reach} cy={py + dy * reach} r={dot} {...pen} fill="none" />
      ))}
      <text
        x={w / 2}
        y={y + side / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily={fontFamily('technical')}
        fontSize={side * 0.3}
        fontWeight="700"
      >
        LLM
      </text>
    </g>
  );
}

function Agent({ w, h, painted, pen }) {
  const foot = Math.min(28, h * 0.2);
  const b = h - foot;
  const headX = w * 0.16;
  const headY = b * 0.32;
  const headW = w * 0.68;
  const headH = b * 0.64;
  const earW = w * 0.11;
  const earH = headH * 0.32;
  const earY = headY + headH * 0.18;
  const faceX = headX + headW * 0.1;
  const faceY = headY + headH * 0.30;
  const faceW = headW * 0.8;
  const faceH = headH * 0.6;
  const eyeW = faceW * 0.16;
  const eyeH = faceH * 0.46;
  const eyeY = faceY + faceH * 0.22;
  const antX = headX + headW * 0.28;
  const antR = Math.min(w, b) * 0.055;
  const antY = antR + b * 0.02;
  const bubW = w * 0.28;
  const bubH = b * 0.16;
  const bubX = w * 0.62;
  const bubY = b * 0.02;
  const bubR = Math.min(bubW, bubH) * 0.34;
  const washed = !painted.fill || painted.fill === 'none';
  const bubble = [
    `M ${bubX + bubR} ${bubY}`,
    `H ${bubX + bubW - bubR}`,
    `Q ${bubX + bubW} ${bubY} ${bubX + bubW} ${bubY + bubR}`,
    `V ${bubY + bubH - bubR}`,
    `Q ${bubX + bubW} ${bubY + bubH} ${bubX + bubW - bubR} ${bubY + bubH}`,
    `H ${bubX + bubW * 0.55}`,
    `L ${bubX + bubW * 0.12} ${headY - 1}`,
    `L ${bubX + bubW * 0.28} ${bubY + bubH}`,
    `H ${bubX + bubR}`,
    `Q ${bubX} ${bubY + bubH} ${bubX} ${bubY + bubH - bubR}`,
    `V ${bubY + bubR}`,
    `Q ${bubX} ${bubY} ${bubX + bubR} ${bubY}`,
    'Z',
  ].join(' ');
  return (
    <g>
      <rect x={headX - earW * 0.72} y={earY} width={earW} height={earH} rx={earH / 2} {...pen} />
      <rect x={headX + headW - earW * 0.28} y={earY} width={earW} height={earH} rx={earH / 2} {...pen} />
      <rect x={headX} y={headY} width={headW} height={headH} rx={Math.min(headW, headH) * 0.22} {...pen} />
      <text
        x={headX + headW / 2}
        y={headY + (faceY - headY) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily={fontFamily('technical')}
        fontSize={Math.min(headW * 0.28, (faceY - headY) * 0.72)}
        fontWeight="700"
      >
        AI
      </text>
      <rect
        x={faceX}
        y={faceY}
        width={faceW}
        height={faceH}
        rx={Math.min(faceW, faceH) * 0.2}
        {...pen}
        fill={washed ? 'currentColor' : painted.fill}
        fillOpacity={washed ? 0.16 : 1}
      />
      <rect x={faceX + faceW * 0.22} y={eyeY} width={eyeW} height={eyeH} rx={eyeW / 2} {...pen} fill="currentColor" />
      <rect x={faceX + faceW * 0.62} y={eyeY} width={eyeW} height={eyeH} rx={eyeW / 2} {...pen} fill="currentColor" />
      <line x1={antX} y1={headY} x2={antX} y2={antY + antR} {...pen} />
      <circle cx={antX} cy={antY} r={antR} {...pen} />
      <path d={bubble} {...pen} strokeLinejoin="round" />
    </g>
  );
}

function Lock({ w, h, painted, pen }) {
  return (
    <g>
      <rect y={18} width={w} height={h - 18} {...painted} />
      <path d={`M ${w * 0.28} 18 V 12 A ${w * 0.22} ${12} 0 0 1 ${w * 0.72} 12 V 18`} {...pen} fill="none" />
    </g>
  );
}

function Window({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M 0 26 H ${w}`} {...pen} />
      <circle cx={14} cy={13} r={4} {...pen} />
      <circle cx={28} cy={13} r={4} {...pen} />
      <circle cx={42} cy={13} r={4} {...pen} />
    </g>
  );
}

function Field({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M 10 ${h / 2} H 22`} {...pen} />
    </g>
  );
}

function Card({ w, h, painted, pen }) {
  return (
    <g>
      <rect width={w} height={h} {...painted} />
      <path d={`M 0 28 H ${w}`} {...pen} />
    </g>
  );
}

function Label({ node, kind, labelAt, lettering, caps, fill }) {
  const size = fontPx(node.text);
  const handwriting = lettering === 'hand' || lettering === 'sketch';
  const text = caps && !handwriting ? String(node.label).toUpperCase() : String(node.label);
  const lines = wrap(text, node.w - (labelAt === 'top' ? 28 : 16), size);
  const lineH = size * 1.15;
  const blockH = lines.length * lineH;
  let y = node.h / 2 - blockH / 2 + size * 0.8;
  let x = node.w / 2;
  let anchor = 'middle';
  if (labelAt === 'top') {
    x = 12;
    y = 20;
    anchor = 'start';
  } else if (labelAt === 'below' && kind === 'badge') {
    const { tileH } = badgeTile(node.w, node.h);
    y = tileH + 6 + size * 0.72;
  } else if (labelAt === 'below') {
    y = node.h - 8 - Math.max(0, lines.length - 1) * lineH;
  } else if (node.type === 'browser' || node.type === 'window') {
    y = (node.h + 22) / 2;
  } else if (node.type === 'database') {
    y = node.h * 0.58;
  }
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill || 'currentColor'}
      stroke="none"
      fontFamily={fontFamily(lettering)}
      fontSize={size}
      fontWeight={lettering === 'technical' ? 600 : 400}
      style={{ letterSpacing: lettering === 'technical' ? '0.04em' : '0.02em' }}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : lineH}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function wrap(text, width, fontSize) {
  const max = Math.max(6, Math.floor(width / (fontSize * 0.52)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return (lines.length ? lines : ['']).slice(0, 5);
}

function hexPoints(w, h) {
  const inset = Math.min(22, w * 0.16);
  return `${inset},0 ${w - inset},0 ${w},${h / 2} ${w - inset},${h} ${inset},${h} 0,${h / 2}`;
}

function documentPath(w, h) {
  const wave = h - 14;
  return `M 0 0 H ${w} V ${wave} Q ${w * 0.75} ${h + 8} ${w / 2} ${wave} T 0 ${wave} Z`;
}

function cloudPath(w, h) {
  return `M ${w * 0.28} ${h * 0.78}
    C ${w * 0.08} ${h * 0.78} ${w * 0.06} ${h * 0.48} ${w * 0.24} ${h * 0.42}
    C ${w * 0.22} ${h * 0.18} ${w * 0.48} ${h * 0.08} ${w * 0.58} ${h * 0.28}
    C ${w * 0.7} ${h * 0.12} ${w * 0.92} ${h * 0.28} ${w * 0.86} ${h * 0.5}
    C ${w * 0.98} ${h * 0.58} ${w * 0.9} ${h * 0.82} ${w * 0.72} ${h * 0.78} Z`;
}

function delayPath(w, h) {
  return `M 0 0 H ${w * 0.55} A ${w * 0.45} ${h / 2} 0 0 1 ${w * 0.55} ${h} H 0 Z`;
}

function calloutPath(w, h) {
  return `M 0 0 H ${w} V ${h - 16} H ${w * 0.28} L ${w * 0.16} ${h} L ${w * 0.2} ${h - 16} H 0 Z`;
}

export function ToolGlyph({ name }) {
  const pen = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'select') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="3" y="3" width="12" height="12" {...pen} strokeDasharray="2.2 1.6" />
        <path d="M13 13 L17 21 L19 16 L23 15 Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'hand') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M8 11 V6.5 A1.2 1.2 0 0 1 10.4 6.5 V11 M10.4 10.2 V5.2 A1.2 1.2 0 0 1 12.8 5.2 V11 M12.8 10 V6.2 A1.2 1.2 0 0 1 15.2 6.2 V12 M15.2 11.2 V8.2 A1.2 1.2 0 0 1 17.6 8.2 V14.5 C17.6 17.5 15.4 20 12 20 H10.2 C7.4 20 6 18.2 5.2 16 L3.6 12.2 A1.3 1.3 0 0 1 6 11.2 L8 12.2" {...pen} />
      </svg>
    );
  }
  if (name === 'connector') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 6 H12 V18 H20" {...pen} />
        <circle cx="4" cy="6" r="1.7" fill="currentColor" />
        <circle cx="20" cy="18" r="1.7" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'bend') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M6 6 H16 V18" {...pen} />
        <circle cx="6" cy="6" r="1.7" fill="currentColor" />
        <circle cx="16" cy="18" r="1.7" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'bendarrow') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M6 5 H15 V14" {...pen} />
        <circle cx="6" cy="5" r="1.7" fill="currentColor" />
        <path d="M15 21 L11.4 15.4 H18.6 Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'elbow') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M18 17 H12 V9 H8" {...pen} />
        <circle cx="18" cy="17" r="1.7" fill="currentColor" />
        <path d="M3 9 L8 5.6 V12.4 Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 18 L18 6" {...pen} />
      <path d="M12 5 H19 V12" {...pen} />
    </svg>
  );
}
