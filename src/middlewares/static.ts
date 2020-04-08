import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import { Options } from "@cloudflare/kv-asset-handler/src/types";

import { Context } from "../context";

export function workersSite(options?: Partial<Options>) {
  return async (ctx: Context) => {
    try {
      const response = await getAssetFromKV(ctx.event, options);
      return response;
    } catch (error) {
      switch (error.status) {
        case 404:
          return;
        case 405:
          return;
        default:
          throw error;
      }
    }
  };
}
