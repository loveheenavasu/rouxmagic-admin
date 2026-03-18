import { JSDataType } from "@/types"

export function getDataType(value: unknown): JSDataType {
  if (value === null) return "null"
  if(typeof value === 'string' && value.trim().length ===0) return "emptystrings" as JSDataType
  return typeof value as JSDataType
}