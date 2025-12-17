import { CreateRequestParams, InterceptorRequestParams, RequestParams, StoreValue } from "./utils/types";
import { pubSub, RequestAbortedError, RequestTimeoutError } from "./utils";
import { DEFAULT_CONTENT_TYPE, DEFAULT_METHOD } from "./utils/const";

const abortCallbacks = new Map<RequestParams["signal"], (signal: RequestParams["signal"]) => void>();

// 类型辅助函数
const isAbortSignal = (signal: StoreValue): signal is AbortSignal =>
  typeof signal === "object" && signal !== null && "aborted" in signal;

// 清理资源函数
const cleanupResources = (signal: RequestParams["signal"], timeoutId?: ReturnType<typeof setTimeout>) => {
  clearTimeout(timeoutId);

  if (signal !== undefined && abortCallbacks.has(signal)) {
    pubSub.unsubscribe("abortRequest", abortCallbacks.get(signal)!);
    abortCallbacks.delete(signal);
  }
};

// 构建请求参数对象
const parseReq = (params: RequestParams) => {
  const { url, data, method = DEFAULT_METHOD, headers, signal } = params;
  let req: InterceptorRequestParams = {
    url,
    signal,
    method: method,
    search: "",
    headers: { "Content-Type": DEFAULT_CONTENT_TYPE, ...headers },
  };

  // 根据请求方法处理数据
  if (method === DEFAULT_METHOD && data) {
    // GET请求：将data转换为URL查询字符串
    req.search = "?" + new URLSearchParams(data as { [key: string]: StoreValue }).toString();
  } else {
    // 非GET请求：将data转换为JSON字符串
    try {
      req.body = JSON.stringify(data);
    } catch (e) {}
  }
  return req;
};

const createControlPromise = ({ signal, timeout }: Pick<RequestParams, "signal" | "timeout">) => {
  if (signal == void 0 && !timeout) {
    return;
  }
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const promise = new Promise((_, reject) => {
    // 请求超时限制
    if (timeout) {
      timeoutId = setTimeout(() => {
        cleanupResources(signal, timeoutId);
        reject(new RequestTimeoutError());
      }, timeout);
    }

    // 手动终止请求
    if (signal != void 0 && !isAbortSignal(signal)) {
      // 定义终止回调函数
      const abort = (abortSignal: RequestParams["signal"]) => {
        if (abortSignal === signal) {
          console.log("timeoutId", timeoutId);
          cleanupResources(signal, timeoutId);
          reject(new RequestAbortedError(abortSignal as string | symbol | number));
        }
      };
      // 存储回调并订阅终止事件
      abortCallbacks.set(signal, abort);
      pubSub.subscribe("abortRequest", abort, { once: true });
    }
  });

  return {
    timeoutId,
    promise,
  };
};

// 构建响应对象
const parseRes = async <T>(params: Response): Promise<Response & { data: T }> => {
  let res = { ...(params ?? {}), data: void 0 } as Response & { data: T };
  try {
    // 尝试解析响应数据为JSON
    const contentType = params.headers.get("content-type");
    if (contentType?.includes(DEFAULT_CONTENT_TYPE)) {
      res.data = await params.json();
    } else {
      res.data = (await params.text()) as any;
    }
  } catch (e) {
    // JSON解析失败时保持data为undefined
  }
  return res;
};

export async function request<T>(
  params: Omit<RequestParams, "needResInfo"> & { needResInfo: true },
): Promise<Response & { data: T }>;
export async function request<T>(params: Omit<RequestParams, "needResInfo"> & { needResInfo?: false }): Promise<T>;
export async function request<T>(originParams: RequestParams): Promise<T | (Response & { data: T })> {
  let req = parseReq(originParams);

  // 请求拦截器
  if (originParams.interceptor?.request) {
    req = originParams.interceptor.request(req);
  }

  const controlPromise = createControlPromise({ signal: req.signal, timeout: originParams.timeout });

  // 使用Promise.race实现超时控制和手动终止
  const resInfo: Response = (await Promise.race([
    // 主请求Promise
    fetch(req.url + req?.search, {
      headers: req.headers,
      method: req.method,
      body: req.body,
      signal: isAbortSignal(req.signal) ? req.signal : void 0,
    }).catch(e => {
      cleanupResources(req.signal, controlPromise?.timeoutId);
      throw e;
    }),
    // 控制Promise（超时和手动终止）
    ...(controlPromise?.promise ? [controlPromise?.promise] : []),
  ])) as Response;

  cleanupResources(req.signal, controlPromise?.timeoutId);

  let res = await parseRes<T>(resInfo);

  // 响应拦截器
  if (originParams.interceptor?.response) {
    res = originParams.interceptor.response<T>(res);
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
  const { prefixUrl = "", timeout, interceptor } = options;

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
  if (!isAbortSignal(signal) && abortCallbacks.has(signal)) {
    pubSub.publish("abortRequest", signal);
  }
}
