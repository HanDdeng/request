import {
  CreateRequestParams,
  CreateRequestReturn,
  InterceptorRequestParams,
  RequestParams,
  RequestResponse,
  StoreValue,
} from "@/types";
import { pubSub } from "./utils";

// export function request<T>(params: RequestParams & { needResInfo: true }): Promise<RequestResponse<T>>;

// export function request<T>(params: RequestParams & { needResInfo?: false }): Promise<T>;

export async function request<T>(originParams: RequestParams): Promise<T | RequestResponse<T>> {
  const { interceptor, ...params } = originParams;
  let timeoutId: number | undefined;
  let abort = () => void 0;

  let req: InterceptorRequestParams = {
    ...params,
    search: "",
    headers: { "Content-Type": "application/json", ...params.headers },
  };

  if (params.methods === "GET" && params.data) {
    req.search = "?" + new URLSearchParams(params.data as { [key: string]: StoreValue }).toString();
  } else {
    req.body = JSON.stringify(params.data);
  }

  if (interceptor?.request) {
    req = interceptor.request(req);
  }

  const resInfo = (await Promise.race([
    fetch(req.url + req?.search, {
      headers: req.headers,
      method: req.methods,
      body: req.body,
    }),
    new Promise((_, reject) => {
      abort = () => {
        clearTimeout(timeoutId);
        pubSub.unsubscribe("abortRequest", abort);
        reject(new Error("request aborted"));
        console.log("abort");
      };

      // 请求超时限制
      timeoutId = setTimeout(() => {
        pubSub.unsubscribe("abortRequest", abort);
        reject(new Error("request timeout"));
        console.log("setTimeout");
      }, params.timeout);

      // 手动终止请求
      pubSub.subscribe("abortRequest", abort, { once: true });
    }),
  ])) as Response;
  clearTimeout(timeoutId);
  pubSub.unsubscribe("abortRequest", abort);

  console.log("resInfo", resInfo);

  let res = { ...(resInfo ?? {}), data: void 0 } as RequestResponse<T>;
  try {
    res.data = await resInfo.json();
  } catch (e) {}

  if (interceptor?.response) {
    res = interceptor.response<T>(res);
  }

  if (originParams.needResInfo) {
    return res;
  } else {
    return res.data;
  }
}

export function createRequest(options: CreateRequestParams): CreateRequestReturn {
  const { prefixUrl = "", timeout = 30 * 1000, interceptor } = options;

  return <T>(params: RequestParams) => {
    params.url = prefixUrl + params.url;
    params.timeout = timeout;
    return request<T>({ ...params, interceptor });
  };
}

export function abortRequest() {
  pubSub.publish("abortRequest");
}
