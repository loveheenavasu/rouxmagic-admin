import { Flag, Response } from "@/types";

export class APIResponse {
  constructor(
    private readonly data: Response["data"],
    private readonly flag: Response["flag"] = Flag.UnknownOrSuccess,
    private readonly error?: Response["error"]
  ) {}
  build(): Response {
    return {
      error: this.error,
      data: this.data,
      flag: this.flag,
    };
  }
}
