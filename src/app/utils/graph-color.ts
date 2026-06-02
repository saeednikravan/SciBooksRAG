const DEFAULT_NODE_COLOR = '#5D6D7E';

const TYPE_SYNONYMS: Record<string, string> = {
  unknown: 'unknown', other: 'other',
  concept: 'concept', object: 'concept', type: 'concept', category: 'concept',
  model: 'concept', project: 'concept', condition: 'concept', rule: 'concept',
  method: 'method', process: 'method',
  artifact: 'artifact', technology: 'artifact', tech: 'artifact', product: 'artifact',
  equipment: 'artifact', device: 'artifact', component: 'artifact', material: 'artifact',
  chemical: 'artifact', drug: 'artifact', medicine: 'artifact', food: 'artifact',
  naturalobject: 'naturalobject', natural: 'naturalobject', phenomena: 'naturalobject',
  substance: 'naturalobject', plant: 'naturalobject',
  data: 'data', figure: 'data', value: 'data',
  content: 'content', book: 'content', video: 'content',
  organization: 'organization', org: 'organization', company: 'organization',
  event: 'event', activity: 'event',
  person: 'person', people: 'person', human: 'person', role: 'person',
  creature: 'creature', animal: 'creature', beings: 'creature', alien: 'creature',
  location: 'location', geography: 'location', geo: 'location', place: 'location',
  address: 'location'
};

const NODE_TYPE_COLORS: Record<string, string> = {
  person: '#4169E1',
  creature: '#bd7ebe',
  organization: '#00cc00',
  location: '#cf6d17',
  event: '#00bfa0',
  concept: '#e3493b',
  method: '#b71c1c',
  content: '#0f558a',
  data: '#0000ff',
  artifact: '#4421af',
  naturalobject: '#b2e061',
  other: '#f4d371',
  unknown: '#b0b0b0'
};

const EXTENDED_COLORS = [
  '#84a3e1', '#5a2c6d', '#2F4F4F', '#003366', '#9b3a31',
  '#00CED1', '#b300b3', '#0f705d', '#ff99cc', '#6ef7b3', '#cd071e'
];

const PREDEFINED_COLOR_SET = new Set(Object.values(NODE_TYPE_COLORS));

export interface ResolveNodeColorResult {
  color: string;
  map: Map<string, string>;
  updated: boolean;
}

export function resolveNodeColor(
  nodeType: string | undefined,
  currentMap: Map<string, string> | undefined
): ResolveNodeColorResult {
  const typeColorMap = currentMap ?? new Map<string, string>();
  const normalizedType = nodeType ? nodeType.toLowerCase() : 'unknown';
  const standardType = TYPE_SYNONYMS[normalizedType];
  const cacheKey = standardType || normalizedType;

  if (typeColorMap.has(cacheKey)) {
    return {
      color: typeColorMap.get(cacheKey) || DEFAULT_NODE_COLOR,
      map: typeColorMap,
      updated: false
    };
  }

  if (standardType) {
    const color = NODE_TYPE_COLORS[standardType] || DEFAULT_NODE_COLOR;
    const newMap = new Map(typeColorMap);
    newMap.set(standardType, color);
    return { color, map: newMap, updated: true };
  }

  const usedExtendedColors = new Set(
    Array.from(typeColorMap.values()).filter(c => !PREDEFINED_COLOR_SET.has(c))
  );
  const unusedColor = EXTENDED_COLORS.find(c => !usedExtendedColors.has(c));
  const color = unusedColor || DEFAULT_NODE_COLOR;
  const newMap = new Map(typeColorMap);
  newMap.set(normalizedType, color);
  return { color, map: newMap, updated: true };
}

export { DEFAULT_NODE_COLOR, NODE_TYPE_COLORS };
