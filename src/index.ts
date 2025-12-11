import { RequestParams, StoreValue } from "@/types";

export const request = async <T>(params: RequestParams) => {
  return new Promise<T>(resolve => {
    let body: string | undefined,
      urlQuery = "";
    if (params.methods === "GET" && params.data) {
      urlQuery = "?" + new URLSearchParams(params.data as { [key: string]: StoreValue }).toString();
    } else {
      body = JSON.stringify(params.data);
    }
    const headers: { [key: string]: StoreValue } = {
      "Content-Type": "application/json",
      ...params.header,
    };
    fetch(params.url + urlQuery, {
      headers,
      method: params.methods,
      body,
    })
      .then(res => res.json())
      .then(res => {
        // console.log('body', body);
        // console.log('res', res);
        resolve(res as T);
      })
      .catch(err => {
        console.log("err", err);
      });
  });
};
