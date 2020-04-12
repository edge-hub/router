import { EdgeRequest } from "./request";
import { EdgeResponse } from "./response";

export type RouteHandler = (
  req: EdgeRequest,
  res: EdgeResponse
) => Response | Promise<Response | void> | void;

export type ErrorHandler = (
  error: Error,
  req: EdgeRequest,
  res: EdgeResponse
) => Response | Promise<Response>;

export type NoMatchHandler = (
  req: EdgeRequest,
  res: EdgeResponse
) => Response | Promise<Response>;

export type BeforeResponseHandler = (
  req: EdgeRequest,
  res: EdgeResponse
) => Response | Promise<Response> | void;

export interface RouterOptions {
  onError?: ErrorHandler;
  onNoMatch?: NoMatchHandler;
  onBeforeResponse?: BeforeResponseHandler;
}

export interface VHostData {
  host: string;
  params: string[];
}

export interface OnRequestOptions {
  vhost?: VHostData;
}
