// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreValue = any;

export type InterceptorRequestParams = RequestParams & { search?: string; body?: string };

export type Interceptor = {
  request?: (params: InterceptorRequestParams) => InterceptorRequestParams;
  response?: <T>(params: RequestResponse<T>) => RequestResponse<T>;
};

export interface RequestParams {
  method: "GET" | "POST";
  url: string;
  headers?: { [key: string]: StoreValue };
  data?: StoreValue;
  needResInfo?: boolean;
  timeout?: number;
  interceptor?: Interceptor;
  signal?: symbol | string | number;
}

export interface RequestResponse<T> extends Response {
  data: T;
}

export type CreateRequestParams = {
  prefixUrl?: string;
  timeout?: number;
  interceptor?: Interceptor;
};
/**
 * @returns
 */
export type CreateRequestReturn = {
  <T>(params: RequestParams & { needResInfo?: false }): Promise<T>;
  <T>(params: RequestParams & { needResInfo: true }): Promise<RequestResponse<T>>;
};
