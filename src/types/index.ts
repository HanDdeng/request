// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreValue = any;

export interface RequestParams {
  methods: "GET" | "POST";
  url: string;
  header?: { [key: string]: StoreValue };
  data?: unknown;
  needResInfo?: boolean;
}

export interface RequestResponse<T> {
  resInfo: Response;
  data: T;
}
