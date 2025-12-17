# hd-request
一个现代化的、类型安全的 HTTP 请求库，基于 Fetch API 构建，支持 TypeScript 和 JavaScript。

## 特性
- 🚀 基于原生 Fetch API，轻量高效

- 📦 完整的 TypeScript 支持

- 🔧 可配置的请求拦截器

- ⏱️ 请求超时控制

- 🛑 请求取消功能

- 🔄 自动 JSON 解析

- 🎯 精确的类型推断

## 安装
```typescript
// npm
npm install hd-request

// or yarn
yarn add hd-request

// or npm 
pnpm add hd-request
```

## 快速开始
### 基础用法
```typescript
import { request } from 'hd-request';

// 发起 GET 请求
const user = await request<{ id: number; name: string }>({
  url: 'https://api.example.com/users/1',
  method: 'GET',
  data: { name: 'John Doe', email: 'john@example.com' }
}); // => "https://api.example.com/users/1?name=John+Doe&email=john%40example.com"

console.log(user.name); // 类型安全

// 发起 POST 请求
const newUser = await request({
  url: 'https://api.example.com/users',
  method: 'POST',
  data: { name: 'John Doe', email: 'john@example.com' },
});
```

### 创建预配置的请求实例
```typescript
import { createRequest } from 'hd-request';

const api = createRequest({
  prefixUrl: 'https://api.example.com',
  timeout: 30000, // 30秒超时
});

// 使用预配置的实例
const users = await api<Array<{ id: number; name: string }>>({
  url: '/users',
  method: 'GET',
});
```

## API文档
### request<T>(params: RequestParams): Promise<T | Response & { data: T }>
发起 HTTP 请求。

**参数**
```typescript
interface RequestParams {
  url: string;                    // 请求 URL

  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

  data?: any;                     // 请求体数据

  headers?: Record<string, string>; // 请求头

  timeout?: number;               // 超时时间（毫秒）

  signal?: string | number | symbol | AbortSignal; // 取消令牌

  needResInfo?: boolean;          // 是否需要完整响应信息

  interceptor?: {                 // 拦截器配置
    request?: (params: InterceptorRequestParams) => InterceptorRequestParams;
    response?: <T>(response: Response & { data: T }) => Response & { data: T };
  };
}
```

**返回值**
- 当 needResInfo: false 或未设置时：返回解析后的数据 Promise\<T>
  
- 当 needResInfo: true 时：返回完整的响应对象 Promise<Response & { data: T }>

**示例**
```typescript
// 只获取数据
const data = await request<string>({
  url: 'https://api.example.com/data',
  method: 'GET',
});

// 获取完整响应信息
const response = await request<string>({
  url: 'https://api.example.com/data',
  method: 'GET',
  needResInfo: true,
});

console.log(response.status); // HTTP 状态码
console.log(response.headers); // 响应头
console.log(response.data); // 响应数据
```

### createRequest(options: CreateRequestParams): RequestFunction
创建预配置的请求函数。
**参数**
```typescript
interface CreateRequestParams {
  prefixUrl?: string;    // URL 前缀

  timeout?: number;      // 默认超时时间

  interceptor?: {        // 默认拦截器
    request?: (params: InterceptorRequestParams) => InterceptorRequestParams;
    response?: <T>(response: Response & { data: T }) => Response & { data: T };
  };
}
```

**示例**
```typescript
const api = createRequest({
  prefixUrl: 'https://api.example.com/v1',
  timeout: 10000,
  interceptor: {
    request: (params) => {
      // 添加认证 token
      params.headers = {
        ...params.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      };
      return params;
    },
    response: (response) => {
      // 全局错误处理
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    },
  },
});
```

### abortRequest(signal: string | number | symbol): void
手动终止请求。
```typescript
import { request, abortRequest } from 'hd-request';

// 定义取消令牌
const requestId = Symbol('userRequest');

// 发起请求
const userPromise = request({
  url: 'https://api.example.com/users/1',
  method: 'GET',
  signal: requestId,
});

// 取消请求
abortRequest(requestId);

// 或者使用 AbortSignal
const controller = new AbortController();

request({
  url: 'https://api.example.com/users/1',
  method: 'GET',
  signal: controller.signal,
});

// 取消请求
controller.abort();
```

### 拦截器
**请求拦截器**
```typescript 
const api = createRequest({
  prefixUrl: 'https://api.example.com',
  interceptor: {
    request: (params) => {
      // 添加公共请求头
      params.headers = {
        ...params.headers,
        'X-Request-ID': generateUUID(),
        'X-App-Version': '1.0.0',
      };
      
      // 记录请求日志
      console.log('Outgoing request:', params.method, params.url);
      
      return params;
    },
  },
});
```

**响应拦截器**
```typescript
const api = createRequest({
  prefixUrl: 'https://api.example.com',
  interceptor: {
    response: (response) => {
      // 统一错误处理
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      // 处理特定的业务错误码
      if (response.data?.code !== 0) {
        throw new Error(response.data?.message || 'Business error');
      }
      
      // 提取业务数据
      return {
        ...response,
        data: response.data.data,
      };
    },
  },
});
```