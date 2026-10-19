import { facingSide, today, uid } from './model.js';
import { PACKS } from './packs.js';

export const LIBRARIES = [
  { id: 'technical', label: 'Tech' },
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp', label: 'GCP' },
];

export const GROUPS = [
  { id: 'system', label: 'System' },
  { id: 'flow', label: 'Flow' },
  { id: 'interface', label: 'Interface' },
  { id: 'plan', label: 'Plan' },
  { id: 'notes', label: 'Notes' },
];

export const CLOUD_GROUPS = [
  { id: 'boundary', label: 'Boundaries' },
  { id: 'compute', label: 'Compute' },
  { id: 'data', label: 'Data' },
  { id: 'integration', label: 'Integration' },
  { id: 'identity', label: 'Identity' },
  { id: 'app', label: 'App' },
];

const packSymbols = Object.values(PACKS).flat();

export const BEHIND = new Set([
  'zone', 'region', 'vpc', 'cluster',
  ...packSymbols.filter((symbol) => symbol.kind === 'boundary').map((symbol) => symbol.id),
]);

const S = (id, name, group, kind, w, h, label, extra = {}) => ({
  id,
  name,
  group,
  kind,
  w,
  h,
  label,
  fill: extra.fill || 'none',
  dashed: Boolean(extra.dashed),
  labelAt: extra.labelAt || 'center',
  text: extra.text || 'm',
  also: extra.also || [],
});

export const SYMBOLS = [
  S('service', 'Service', 'system', 'rect', 168, 72, 'Service'),
  S('database', 'Database', 'system', 'cylinder', 112, 108, 'Database'),
  S('queue', 'Queue', 'system', 'queue', 188, 64, 'Queue'),
  S('cache', 'Cache', 'system', 'layers', 120, 88, 'Cache'),
  S('api', 'API', 'system', 'api', 156, 64, 'API'),
  S('gateway', 'Gateway', 'system', 'hex', 150, 78, 'Gateway'),
  S('function', 'Function', 'system', 'round', 136, 60, 'Function'),
  S('worker', 'Worker', 'system', 'worker', 140, 72, 'Worker'),
  S('container', 'Container', 'system', 'container', 148, 84, 'Container'),
  S('cloud', 'Cloud', 'system', 'cloud', 160, 96, 'Cloud'),
  S('server', 'Server', 'system', 'server', 104, 120, 'Server'),
  S('auth', 'Auth', 'system', 'lock', 124, 88, 'Auth'),
  S('client', 'Client', 'system', 'actor', 72, 108, 'Client', { labelAt: 'below' }),
  S('browser', 'Browser', 'system', 'browser', 168, 112, 'Browser'),
  S('topic', 'Topic', 'system', 'stadium', 176, 52, 'Topic'),
  S('bucket', 'Bucket', 'system', 'bucket', 112, 96, 'Bucket'),
  S('repo', 'Code repo', 'system', 'repo', 112, 128, 'Code repo', { labelAt: 'below', also: ['github', 'bitbucket', 'git repository', 'source repository'] }),
  S('artifact', 'Artifact repo', 'system', 'artifact', 112, 128, 'Artifact repo', { labelAt: 'below', also: ['nexus', 'artifactory', 'package repository', 'build artifacts'] }),
  S('cicd', 'CI/CD', 'system', 'cicd', 180, 124, 'CI/CD', { labelAt: 'below', also: ['continuous integration', 'continuous delivery', 'build pipeline', 'pipeline'] }),
  S('llm', 'LLM', 'system', 'llm', 132, 140, 'LLM', { labelAt: 'below', also: ['large language model', 'language model', 'ai model'] }),
  S('aiagent', 'AI agent', 'system', 'agent', 132, 140, 'AI agent', { labelAt: 'below', fill: 'tint', also: ['autonomous agent', 'assistant agent'] }),
  S('process', 'Process', 'flow', 'rect', 156, 64, 'Process'),
  S('decision', 'Decision', 'flow', 'diamond', 136, 96, 'Decision'),
  S('start', 'Start', 'flow', 'stadium', 132, 52, 'Start'),
  S('document', 'Document', 'flow', 'document', 140, 88, 'Document'),
  S('data', 'Data', 'flow', 'slant', 156, 64, 'Data'),
  S('delay', 'Delay', 'flow', 'delay', 88, 72, 'Delay'),
  S('window', 'Window', 'interface', 'window', 220, 148, 'Screen'),
  S('button', 'Button', 'interface', 'round', 124, 40, 'Button'),
  S('field', 'Field', 'interface', 'field', 188, 44, 'Field'),
  S('card', 'Card', 'interface', 'card', 180, 116, 'Card'),
  S('zone', 'Zone', 'plan', 'frame', 420, 280, 'Zone', { fill: 'tint', dashed: true, labelAt: 'top', text: 's' }),
  S('region', 'Region', 'plan', 'frame', 480, 320, 'Region', { fill: 'tint', dashed: true, labelAt: 'top', text: 's' }),
  S('vpc', 'Network', 'plan', 'frame', 360, 220, 'Network', { fill: 'tint', dashed: true, labelAt: 'top', text: 's' }),
  S('cluster', 'Cluster', 'plan', 'frame', 340, 220, 'Cluster', { fill: 'tint', dashed: true, labelAt: 'top', text: 's' }),
  S('note', 'Note', 'notes', 'note', 188, 116, 'Note', { fill: 'tint', labelAt: 'top' }),
  S('text', 'Text', 'notes', 'text', 168, 40, 'Label', { text: 'l' }),
  S('callout', 'Callout', 'notes', 'callout', 188, 84, 'Callout', { fill: 'tint' }),
];

const byId = new Map([...SYMBOLS, ...packSymbols].map((symbol) => [symbol.id, symbol]));

export function symbolById(id) {
  return byId.get(id) || null;
}

export function groupsFor(library) {
  return library && library !== 'technical' ? CLOUD_GROUPS : GROUPS;
}

export function symbolsIn(library, group) {
  const list = library && library !== 'technical' ? (PACKS[library] || []) : SYMBOLS;
  return list.filter((symbol) => symbol.group === group);
}

export function makeNode(spec, x, y, box = {}) {
  return {
    id: uid(),
    type: spec.id,
    x,
    y,
    w: box.w ?? spec.w,
    h: box.h ?? spec.h,
    label: spec.label,
    weight: 'm',
    text: spec.text || 'm',
    fill: spec.fill || 'none',
    dashed: Boolean(spec.dashed),
    locked: false,
  };
}

function link(from, to, label = '', dashed = false, at = null) {
  return {
    id: uid(),
    from: from.id,
    to: to.id,
    fromSide: facingSide(from, to),
    toSide: facingSide(to, from),
    fromAt: at ?? 0.5,
    toAt: at ?? 0.5,
    route: 'elbow',
    arrow: 'end',
    label,
    weight: 'm',
    dashed,
  };
}

function place(type, x, y, label, box) {
  const spec = symbolById(type);
  const node = makeNode(spec, x, y, box);
  if (label) node.label = label;
  return node;
}

export const TEMPLATES = [
  {
    id: 'aws-web-deploy',
    library: 'aws',
    name: 'Web app deployment',
    description: 'CloudFront, WAF, and API Gateway sit in the Region, outside the VPC. The load balancer is in the public subnet. The web app, microservice, and database each sit in their own private subnet.',
    build() {
      const iconY = 210;
      const users = place('aws.client', 16, iconY, 'Users');
      const region = place('aws.region', 150, 16, 'Production', { w: 1624, h: 460 });
      const cdn = place('aws.cdn', 176, iconY, 'CloudFront');
      const waf = place('aws.waf', 308, iconY, 'WAF');
      const api = place('aws.api', 440, iconY, 'API Gateway');
      const vpc = place('aws.net', 580, 64, 'VPC', { w: 1170, h: 380 });
      const pub = place('aws.subnet', 606, 112, 'Public subnet', { w: 260, h: 300 });
      const appNet = place('aws.subnet', 886, 112, 'Private app subnets', { w: 260, h: 300 });
      const serviceNet = place('aws.subnet', 1166, 112, 'Private service subnets', { w: 300, h: 300 });
      const dataNet = place('aws.subnet', 1486, 112, 'Database subnets', { w: 240, h: 300 });
      const lb = place('aws.lb', 680, iconY, 'Load balancer');
      const app = place('aws.box', 960, iconY, 'Web app');
      const service = place('aws.box', 1260, iconY, 'Microservice');
      const db = place('aws.db', 1550, iconY, 'Database');
      const flow = (from, to) => ({ ...link(from, to, '', false, 0.38), route: 'straight' });
      return {
        nodes: [region, vpc, pub, appNet, serviceNet, dataNet, users, cdn, waf, api, lb, app, service, db],
        edges: [
          flow(users, cdn),
          flow(cdn, waf),
          flow(waf, api),
          flow(api, lb),
          flow(lb, app),
          flow(app, service),
          flow(service, db),
        ],
      };
    },
  },
  {
    id: 'aws-multi-zone',
    library: 'aws',
    name: 'Multi-zone deployment',
    description: 'WAF and API Gateway sit in the Region, outside the VPC. Each zone has a public subnet with a load balancer and a NAT gateway, then a private app subnet, a private service subnet, and a database subnet. The second database is the standby.',
    build() {
      const row = 28;
      const users = place('aws.client', 8, row, 'Users');
      const region = place('aws.region', 130, 12, 'Production', { w: 770, h: 1000 });
      const cdn = place('aws.cdn', 156, row, 'CloudFront');
      const waf = place('aws.waf', 278, row, 'WAF');
      const api = place('aws.api', 390, row, 'API Gateway');
      const vpc = place('aws.net', 148, 150, 'VPC', { w: 730, h: 840 });
      const zoneA = place('zone', 160, 300, 'Zone A', { w: 320, h: 668 });
      const zoneB = place('zone', 540, 300, 'Zone B', { w: 320, h: 668 });
      const pubA = place('aws.subnet', 176, 336, 'Public subnet', { w: 288, h: 146 });
      const appNetA = place('aws.subnet', 176, 494, 'Private app subnet', { w: 288, h: 146 });
      const svcNetA = place('aws.subnet', 176, 652, 'Private service subnet', { w: 288, h: 146 });
      const dataA = place('aws.subnet', 176, 810, 'Database subnet', { w: 288, h: 146 });
      const pubB = place('aws.subnet', 556, 336, 'Public subnet', { w: 288, h: 146 });
      const appNetB = place('aws.subnet', 556, 494, 'Private app subnet', { w: 288, h: 146 });
      const svcNetB = place('aws.subnet', 556, 652, 'Private service subnet', { w: 288, h: 146 });
      const dataB = place('aws.subnet', 556, 810, 'Database subnet', { w: 288, h: 146 });
      const lbA = place('aws.lb', 200, 364, 'Load balancer');
      const natA = place('aws.nat', 328, 364, 'NAT gateway');
      const appA = place('aws.box', 200, 522, 'Web app');
      const serviceA = place('aws.box', 200, 680, 'Microservice');
      const dbA = place('aws.db', 200, 838, 'Primary');
      const lbB = place('aws.lb', 580, 364, 'Load balancer');
      const natB = place('aws.nat', 708, 364, 'NAT gateway');
      const appB = place('aws.box', 580, 522, 'Web app');
      const serviceB = place('aws.box', 580, 680, 'Microservice');
      const dbB = place('aws.db', 580, 838, 'Standby');
      const across = (from, to) => ({ ...link(from, to, '', false, 0.38), route: 'straight' });
      const down = (from, to) => ({ ...link(from, to, '', false, 0.5), route: 'straight' });
      const outbound = (from, to) => ({ ...link(from, to, 'outbound', true, 0.72), fromSide: 'right', toSide: 'right', route: 'elbow' });
      return {
        nodes: [
          region, vpc, zoneA, zoneB,
          pubA, appNetA, svcNetA, dataA, pubB, appNetB, svcNetB, dataB,
          users, cdn, waf, api,
          lbA, natA, appA, serviceA, dbA, lbB, natB, appB, serviceB, dbB,
        ],
        edges: [
          across(users, cdn),
          across(cdn, waf),
          across(waf, api),
          { ...link(api, lbA, '', false, 0.5), route: 'elbow' },
          { ...link(api, lbB, '', false, 0.5), route: 'elbow' },
          down(lbA, appA),
          down(appA, serviceA),
          down(serviceA, dbA),
          down(lbB, appB),
          down(appB, serviceB),
          down(serviceB, dbB),
          outbound(appA, natA),
          outbound(appB, natB),
          { ...link(dbA, dbB, 'standby', true, 0.38), route: 'straight' },
        ],
      };
    },
  },
  {
    id: 'aws-vpc-nat',
    library: 'aws',
    name: 'Private servers and NAT',
    description: 'Amazon VPC User Guide. The load balancer is public. Application servers stay in private subnets and call out through a NAT gateway in each zone. S3 is reached through a gateway endpoint.',
    build() {
      const client = place('aws.client', 24, 120, 'Clients');
      const region = place('aws.region', 180, 24, 'Region', { w: 680, h: 760 });
      const vpc = place('aws.net', 204, 72, 'VPC', { w: 632, h: 680 });
      const igw = place('aws.igw', 230, 110, 'Internet gateway');
      const lb = place('aws.lb', 460, 110, 'Load balancer');
      const pubA = place('aws.subnet', 230, 280, 'Public subnet AZ-a', { w: 260, h: 210 });
      const pubB = place('aws.subnet', 230, 520, 'Public subnet AZ-b', { w: 260, h: 210 });
      const privA = place('aws.subnet', 520, 280, 'Private subnet AZ-a', { w: 280, h: 210 });
      const privB = place('aws.subnet', 520, 520, 'Private subnet AZ-b', { w: 280, h: 210 });
      const natA = place('aws.nat', 250, 310, 'NAT gateway');
      const natB = place('aws.nat', 250, 550, 'NAT gateway');
      const srvA = place('aws.vm', 560, 310, 'App server');
      const srvB = place('aws.vm', 560, 550, 'App server');
      const store = place('aws.store', 900, 400, 'Object storage');
      return {
        nodes: [region, vpc, pubA, pubB, privA, privB, client, igw, lb, natA, natB, srvA, srvB, store],
        edges: [
          link(client, igw),
          link(igw, lb),
          link(lb, srvA),
          link(lb, srvB),
          link(srvA, natA, 'outbound', true),
          link(srvB, natB, 'outbound', true),
          link(natA, igw, '', true),
          link(natB, igw, '', true),
          link(srvA, store, 'S3 endpoint'),
        ],
      };
    },
  },
  {
    id: 'aws-serverless-web',
    library: 'aws',
    name: 'Serverless web app',
    description: 'AWS Well-Architected Serverless Lens. CloudFront serves the static site from S3 and calls API Gateway. Lambda reads DynamoDB. Cognito issues the token for the API.',
    build() {
      const user = place('aws.client', 24, 180, 'Browser');
      const cognito = place('aws.id', 220, 24, 'Cognito');
      const cdn = place('aws.cdn', 220, 220, 'CloudFront');
      const site = place('aws.store', 460, 24, 'Static site');
      const api = place('aws.api', 460, 220, 'API Gateway');
      const fn = place('aws.fn', 720, 220, 'Lambda');
      const db = place('aws.db', 980, 220, 'DynamoDB');
      return {
        nodes: [user, cognito, cdn, site, api, fn, db],
        edges: [
          link(user, cognito, 'sign in'),
          link(user, cdn),
          link(cdn, site),
          link(cdn, api),
          link(api, fn),
          link(fn, db),
        ],
      };
    },
  },
  {
    id: 'azure-web',
    library: 'azure',
    name: 'Azure web stack',
    description: 'A region, VNet and subnet with a gateway, virtual machine and database.',
    build() {
      const region = place('azure.region', 24, 24, 'Region', { w: 760, h: 460 });
      const net = place('azure.net', 56, 72, 'VNet', { w: 700, h: 380 });
      const subnet = place('azure.subnet', 88, 112, 'Subnet', { w: 640, h: 300 });
      const lb = place('azure.lb', 120, 200, 'Gateway');
      const vm = place('azure.vm', 320, 190, 'Virtual machine');
      const db = place('azure.db', 540, 250, 'Database');
      return {
        nodes: [region, net, subnet, lb, vm, db],
        edges: [link(lb, vm), link(vm, db)],
      };
    },
  },
  {
    id: 'gcp-web',
    library: 'gcp',
    name: 'GCP web stack',
    description: 'A region, VPC and subnet with a load balancer, virtual machine and object storage.',
    build() {
      const region = place('gcp.region', 24, 24, 'Region', { w: 760, h: 460 });
      const net = place('gcp.net', 56, 72, 'VPC', { w: 700, h: 380 });
      const subnet = place('gcp.subnet', 88, 112, 'Subnet', { w: 640, h: 300 });
      const lb = place('gcp.lb', 120, 200, 'Load balancer');
      const vm = place('gcp.vm', 320, 190, 'Virtual machine');
      const store = place('gcp.store', 540, 250, 'Object storage');
      return {
        nodes: [region, net, subnet, lb, vm, store],
        edges: [link(lb, vm), link(vm, store)],
      };
    },
  },
  {
    id: 'three-tier',
    library: 'technical',
    name: 'Three-tier web',
    description: 'Browser, gateway, API, cache and a primary database inside one zone.',
    build() {
      const zone = place('zone', 40, 36, 'Production', { w: 820, h: 440 });
      const browser = place('browser', 80, 180, 'Web app');
      const gateway = place('gateway', 310, 196, 'API gateway');
      const api = place('service', 540, 120, 'API');
      const db = place('database', 620, 280, 'Primary DB');
      const cache = place('cache', 470, 300, 'Cache');
      return {
        nodes: [zone, browser, gateway, api, cache, db],
        edges: [link(browser, gateway), link(gateway, api), link(api, db), link(api, cache)],
      };
    },
  },
  {
    id: 'microservices',
    library: 'technical',
    name: 'Microservices',
    description: 'A gateway in front of users, orders and catalog, each with its own store.',
    build() {
      const edge = place('gateway', 40, 188, 'Edge');
      const users = place('service', 280, 40, 'Users');
      const orders = place('service', 280, 180, 'Orders');
      const catalog = place('service', 280, 320, 'Catalog');
      const usersDb = place('database', 540, 28, 'Users DB');
      const ordersDb = place('database', 540, 168, 'Orders DB');
      const catalogDb = place('database', 540, 308, 'Catalog DB');
      const queue = place('queue', 280, 460, 'Order events');
      return {
        nodes: [edge, users, orders, catalog, usersDb, ordersDb, catalogDb, queue],
        edges: [
          link(edge, users),
          link(edge, orders),
          link(edge, catalog),
          link(users, usersDb),
          link(orders, ordersDb),
          link(catalog, catalogDb),
          link(orders, queue),
        ],
      };
    },
  },
  {
    id: 'events',
    library: 'technical',
    name: 'Event pipeline',
    description: 'An API publishes to a topic. A worker writes the database and object storage.',
    build() {
      const client = place('client', 40, 150, 'Client');
      const api = place('api', 180, 168, 'Ingest API');
      const topic = place('topic', 400, 176, 'Events');
      const worker = place('worker', 640, 160, 'Worker');
      const db = place('database', 860, 70, 'Warehouse');
      const bucket = place('bucket', 870, 240, 'Archive');
      return {
        nodes: [client, api, topic, worker, db, bucket],
        edges: [
          link(client, api),
          link(api, topic, 'publish'),
          link(topic, worker, 'consume'),
          link(worker, db),
          link(worker, bucket),
        ],
      };
    },
  },
  {
    id: 'signin',
    library: 'technical',
    name: 'Sign-in',
    description: 'Browser, gateway, auth service, session cache and a user directory.',
    build() {
      const browser = place('browser', 36, 150, 'Sign-in');
      const gateway = place('gateway', 260, 168, 'Gateway');
      const auth = place('auth', 480, 150, 'Auth');
      const cache = place('cache', 700, 60, 'Sessions');
      const db = place('database', 710, 230, 'Users');
      return {
        nodes: [browser, gateway, auth, cache, db],
        edges: [
          link(browser, gateway),
          link(gateway, auth),
          link(auth, cache),
          link(auth, db),
        ],
      };
    },
  },
];

export function templateSheet(templateId, index) {
  const template = TEMPLATES.find((item) => item.id === templateId) || TEMPLATES[0];
  const built = template.build();
  return {
    id: uid(),
    code: `A-${100 + index}`,
    title: template.name,
    date: today(),
    nodes: built.nodes,
    edges: built.edges,
  };
}
