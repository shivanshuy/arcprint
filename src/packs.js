const AWS = {
  vm: '#ff9900',
  fn: '#ff9900',
  box: '#e07b00',
  db: '#3b48cc',
  store: '#569a31',
  cache: '#c7131f',
  queue: '#e7157b',
  topic: '#ff4f8b',
  lb: '#8c4fff',
  id: '#dd344c',
  client: '#232f3e',
  region: '#ff9900',
  net: '#8c4fff',
  subnet: '#248814',
  guard: '#dd344c',
};

const AZURE = {
  vm: '#0078d4',
  fn: '#50e6ff',
  box: '#004e8c',
  db: '#004e8c',
  store: '#0078d4',
  cache: '#5c2d91',
  queue: '#5c2d91',
  topic: '#0078d4',
  lb: '#004e8c',
  id: '#d83b01',
  client: '#0078d4',
  region: '#0078d4',
  net: '#004e8c',
  subnet: '#5c2d91',
  guard: '#d83b01',
};

const GCP = {
  vm: '#4285f4',
  fn: '#fbbc04',
  box: '#ea4335',
  db: '#4285f4',
  store: '#34a853',
  cache: '#fbbc04',
  queue: '#ea4335',
  topic: '#34a853',
  lb: '#4285f4',
  id: '#fbbc04',
  client: '#ea4335',
  region: '#4285f4',
  net: '#34a853',
  subnet: '#fbbc04',
  guard: '#ea4335',
};

function resource(pack, id, name, group, color, mark, tile) {
  return {
    id: `${pack}.${id}`,
    name,
    group,
    kind: 'badge',
    w: 112,
    h: 100,
    label: name,
    fill: 'none',
    dashed: false,
    labelAt: 'below',
    text: 's',
    tile,
    color,
    mark,
  };
}

function boundary(pack, id, name, color, extra = {}) {
  return {
    id: `${pack}.${id}`,
    name,
    group: 'boundary',
    kind: 'boundary',
    w: extra.w || 460,
    h: extra.h || 300,
    label: name,
    fill: 'tint',
    dashed: Boolean(extra.dashed),
    labelAt: 'top',
    text: 's',
    color,
  };
}

function catalog(pack, colors, tile, netName) {
  return [
    boundary(pack, 'region', 'Region', colors.region, { w: 560, h: 400 }),
    boundary(pack, 'net', netName, colors.net, { w: 500, h: 340 }),
    boundary(pack, 'subnet', 'Subnet', colors.subnet, { w: 280, h: 220 }),
    boundary(pack, 'guard', 'Security group', colors.guard, { w: 300, h: 200, dashed: true }),
    resource(pack, 'vm', 'Virtual machine', 'compute', colors.vm, 'vm', tile),
    resource(pack, 'fn', 'Function', 'compute', colors.fn, 'fn', tile),
    resource(pack, 'box', 'Container', 'compute', colors.box, 'box', tile),
    resource(pack, 'db', 'Database', 'data', colors.db, 'db', tile),
    resource(pack, 'store', 'Object storage', 'data', colors.store, 'store', tile),
    resource(pack, 'cache', 'Cache', 'data', colors.cache, 'cache', tile),
    resource(pack, 'queue', 'Queue', 'integration', colors.queue, 'queue', tile),
    resource(pack, 'topic', 'Topic', 'integration', colors.topic, 'topic', tile),
    resource(pack, 'lb', 'Load balancer', 'integration', colors.lb, 'lb', tile),
    resource(pack, 'id', 'Identity', 'identity', colors.id, 'id', tile),
    resource(pack, 'client', 'Client', 'app', colors.client, 'client', tile),
  ];
}

export const PACKS = {
  aws: [
    ...catalog('aws', AWS, 'squircle', 'VPC'),
    resource('aws', 'dns', 'DNS', 'integration', AWS.lb, 'dns', 'squircle'),
    resource('aws', 'waf', 'WAF', 'identity', AWS.guard, 'waf', 'squircle'),
    resource('aws', 'api', 'API Gateway', 'integration', AWS.lb, 'api', 'squircle'),
    resource('aws', 'vpclink', 'VPC Link', 'integration', AWS.net, 'vpclink', 'squircle'),
    resource('aws', 'igw', 'Internet gateway', 'integration', AWS.vm, 'igw', 'squircle'),
    resource('aws', 'nat', 'NAT gateway', 'integration', AWS.subnet, 'nat', 'squircle'),
    resource('aws', 'cdn', 'CDN', 'integration', AWS.lb, 'cdn', 'squircle'),
  ],
  azure: catalog('azure', AZURE, 'hex', 'VNet'),
  gcp: catalog('gcp', GCP, 'round', 'VPC'),
};
