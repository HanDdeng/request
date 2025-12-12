import { createRequest, abortRequest } from "/dist/esm/index.js";

const request = createRequest({ prefixUrl: "https://handdeng.site", timeout: 0 * 1000 });

(async () => {
  try {
    const a = await request({ url: "/api/platform/menu/getMenu", methods: "GET", needResInfo: false });
    console.log(a);
  } catch (error) {
    console.log("捕获到错误了：", error);
  }
})();

abortRequest();
