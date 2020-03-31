import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import { Options } from "@cloudflare/kv-asset-handler/src/types";

import { Context } from "../context";

export function workersSite(options: Options) {
  return async (ctx: Context) => {
    try {
      const response = await getAssetFromKV(ctx.event, options);
      return response;
    } catch (error) {
      throw error;
    }
  };
}
