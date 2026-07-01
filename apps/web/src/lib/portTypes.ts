export type PortDataType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'object'
  | 'array'
  | 'file'
  | 'resource'
  | 'contract'
  | 'boq'
  | 'claim'
  | 'variation'
  | 'date';

export const PORT_COLORS: Record<PortDataType, string> = {
  any: '#9ca3af',
  string: '#2563eb',
  number: '#16a34a',
  boolean: '#ca8a04',
  json: '#7c3aed',
  object: '#9333ea',
  array: '#db2777',
  file: '#0891b2',
  resource: '#0d9488',
  contract: '#dc2626',
  boq: '#ea580c',
  claim: '#4f46e5',
  variation: '#be123c',
  date: '#0f766e',
};

const PORT_TYPES = new Set<PortDataType>(Object.keys(PORT_COLORS) as PortDataType[]);

type PortLike = {
  id?: string;
  label?: string;
  name?: string;
  type?: unknown;
  dataType?: unknown;
};

export function normalizePortDataType(value: unknown): PortDataType | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase() as PortDataType;
  return PORT_TYPES.has(normalized) ? normalized : undefined;
}

export function getPortType(port?: PortLike): PortDataType | undefined {
  return normalizePortDataType(port?.dataType) ?? normalizePortDataType(port?.type);
}

export function getPortLabel(port?: PortLike): string {
  return port?.label ?? port?.name ?? port?.id ?? 'port';
}

export function isPortCompatible(
  sourceType?: PortDataType,
  targetType?: PortDataType,
): boolean {
  if (!sourceType || !targetType || sourceType === 'any' || targetType === 'any') {
    return true;
  }

  if (sourceType === targetType) {
    return true;
  }

  if (targetType === 'json') {
    return sourceType === 'object' || sourceType === 'array' || sourceType === 'boq';
  }

  if (targetType === 'object') {
    return sourceType === 'json' || sourceType === 'boq';
  }

  if (targetType === 'array') {
    return sourceType === 'json';
  }

  return false;
}
