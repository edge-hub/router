import { Options } from "@cloudflare/kv-asset-handler/src/types";

import { EdgeRequest } from "../request";
import { EdgeResponse } from "../response";
import { RouteHandler } from "../types";

export function workersSite(options?: Partial<Options>): RouteHandler {
  const { getAssetFromKV } = require("@cloudflare/kv-asset-handler");
  return async (req: EdgeRequest, _res: EdgeResponse) => {
    try {
      const response = await getAssetFromKV(req._event, options);
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
