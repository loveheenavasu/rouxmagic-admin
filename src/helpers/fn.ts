import { JSDataType } from "@/types"

export function getDataType(value: unknown): JSDataType {
  if (value === null) return "null"
  if(typeof value === 'string' && value.trim().length ===0) return "emptystring" as JSDataType
  return typeof value as JSDataType
}