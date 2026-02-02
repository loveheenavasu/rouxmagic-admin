export function getDataType(value: unknown): JSDataType {
  if (value === null) return "null"
  return typeof value as JSDataType
}

export type JSDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'function'
  | 'undefined'
  | 'bigint'
  | 'symbol'
  | 'null';


export function deleteUnwantedValues<
  T extends Record<string, any>
>(
  obj: T,
  datatypes: JSDataType[]
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    const datatype = getDataType(value);
    if (datatypes.includes(datatype)) {
      continue;
    }
    (result as Record<string, unknown>)[key] = value;
  }

  return result;
}
