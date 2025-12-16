// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreValue = any;

export interface InterceptorRequestParams extends RequestParams {
  search?: string;
  body?: string;
}

export interface Interceptor {
  request?: (params: InterceptorRequestParams) => InterceptorRequestParams;
  response?: <T>(params: Response & { data: T }) => Response & { data: T };
}

export interface RequestParams {
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly headers?: { [key: string]: StoreValue };
  readonly data?: StoreValue;
  readonly needResInfo?: boolean;
  readonly timeout?: number;
  readonly interceptor?: Interceptor;
  readonly signal?: symbol | string | number;
}

export interface CreateRequestParams {
  prefixUrl?: string;
  timeout?: number;
  interceptor?: Interceptor;
}
