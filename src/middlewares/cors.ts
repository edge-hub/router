import { EdgeRequest } from "../request";
import { EdgeResponse } from "../response";
import { RouteHandler } from "../types";

const DEFAULT_ALLOW_METHODS = [
  "POST",
  "GET",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const DEFAULT_ALLOW_HEADERS = [
  "X-Requested-With",
  "Access-Control-Allow-Origin",
  "X-HTTP-Method-Override",
  "Content-Type",
  "Authorization",
  "Accept",
];

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

type Origin = ((request: EdgeRequest) => string | boolean) | string | boolean;
interface Options {
  origin?: Origin;
  maxAge?: number;
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
  allowCredentials?: boolean;
}

function getOriginValue(origin: Origin, request: EdgeRequest) {
  if (typeof origin === "function") {
    return origin(request);
  }
  if (typeof origin === "boolean") {
    return origin ? "*" : "";
  }
  return origin;
}

export function cors(options: Options = {}): RouteHandler {
  return (req: EdgeRequest, res: EdgeResponse) => {
    const origin = options.origin || "*";
    const maxAge = options.maxAge || DEFAULT_MAX_AGE_SECONDS;
    const allowMethods = options.allowMethods || DEFAULT_ALLOW_METHODS;
    const allowHeaders = options.allowHeaders || DEFAULT_ALLOW_HEADERS;
    const allowCredentials = options.allowCredentials || true;
    const exposeHeaders = options.exposeHeaders || [];

    const originValue = getOriginValue(origin, req);

    if (originValue) {
      res.setHeader("Access-Control-Allow-Origin", String(originValue));
    }

    if (allowCredentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (exposeHeaders.length) {
      res.setHeader("Access-Control-Expose-Headers", exposeHeaders.join(","));
    }

    const preFlight = req.method === "OPTIONS";
    if (preFlight) {
      res.setHeader("Access-Control-Allow-Methods", allowMethods.join(","));
      res.setHeader("Access-Control-Allow-Headers", allowHeaders.join(","));
      res.setHeader("Access-Control-Max-Age", String(maxAge));
    }
  };
}
