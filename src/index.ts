import { CreateRequestParams, InterceptorRequestParams, RequestParams, StoreValue } from "./types";
import { pubSub, RequestAbortedError, RequestTimeoutError } from "./utils";

const map = new Map();

export async function request<T>(
  params: Omit<RequestParams, "needResInfo"> & { needResInfo: true },
): Promise<Response & { data: T }>;
export async function request<T>(params: Omit<RequestParams, "needResInfo"> & { needResInfo?: false }): Promise<T>;
export async function request<T>(originParams: RequestParams): Promise<T | (Response & { data: T })> {
  const { interceptor, ...params } = originParams;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // 清理相关资源
  function cleanup(signal: typeof req.signal) {
    clearTimeout(timeoutId);
    if (signal != void 0 && map.has(signal)) {
      pubSub.unsubscribe("abortRequest", map.get(signal));
      map.delete(signal);
    }
  }

  // 构建请求参数对象
  let req: InterceptorRequestParams = {
    ...params,
    search: "",
    headers: { "Content-Type": "application/json", ...params.headers },
  };

  // 根据请求方法处理数据
  if (params.method === "GET" && params.data) {
    // GET请求：将data转换为URL查询字符串
    req.search = "?" + new URLSearchParams(params.data as { [key: string]: StoreValue }).toString();
  } else {
    // 非GET请求：将data转换为JSON字符串
    try {
      req.body = JSON.stringify(params.data);
    } catch (e) {}
  }

  // 请求拦截器
  if (interceptor?.request) {
    req = interceptor.request(req);
  }

  // 使用Promise.race实现超时控制和手动终止
  const resInfo = (await Promise.race([
    // 主请求Promise
    fetch(req.url + req?.search, {
      headers: req.headers,
      method: req.method,
      body: req.body,
    }),
    // 控制Promise（超时和手动终止）
    new Promise((_, reject) => {
      // 请求超时限制
      timeoutId = setTimeout(() => {
        cleanup(req.signal);
        reject(new RequestTimeoutError());
      }, params.timeout);

      // 手动终止请求
      if (req.signal != void 0) {
        // 定义终止回调函数
        const abort = (abortSignal: typeof req.signal) => {
          if (abortSignal === req.signal) {
            cleanup(req.signal);
            reject(new RequestAbortedError(abortSignal));
          }
        };
        // 存储回调并订阅终止事件
        map.set(req.signal, abort);
        pubSub.subscribe("abortRequest", abort, { once: true });
      }
    }),
  ])) as Response;
  cleanup(req.signal);

  // 构建响应对象
  let res = { ...(resInfo ?? {}), data: void 0 } as Response & { data: T };
  try {
    // 尝试解析响应数据为JSON
    const contentType = resInfo.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      res.data = await resInfo.json();
    } else {
      res.data = (await resInfo.text()) as any;
    }
  } catch (e) {
    // JSON解析失败时保持data为undefined
  }

  // 响应拦截器
  if (interceptor?.response) {
    res = interceptor.response<T>(res);
  }

  // 根据配置返回完整响应或仅返回数据
  if (originParams.needResInfo) {
    return res;
  } else {
    return res.data;
  }
}

/**
 * 创建预配置的请求函数
 * @param options 全局配置选项
 * @returns 配置好的请求函数
 */
export function createRequest(options: CreateRequestParams) {
  const { prefixUrl = "", timeout = 30 * 1000, interceptor } = options;

  function callback<T>(
    params: Omit<RequestParams, "needResInfo"> & { needResInfo: true },
  ): Promise<Response & { data: T }>;
  function callback<T>(params: Omit<RequestParams, "needResInfo"> & { needResInfo?: false }): Promise<T>;
  function callback<T>(params: RequestParams) {
    const url = prefixUrl + params.url;
    return request<T>({ ...params, url, timeout, interceptor } as StoreValue);
  }

  return callback;
}

/**
 * 手动终止请求
 * @param signal 请求标识符（symbol、string或number）
 * @throws 当signal为undefined时抛出错误
 */
export function abortRequest(signal: RequestParams["signal"]) {
  if (signal == void 0) {
    throw new Error("signal is required");
  }
  // 触发对应signal的终止事件
  if (map.has(signal)) {
    pubSub.publish("abortRequest", signal);
  }
}
