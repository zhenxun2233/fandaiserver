// 引入必要的库
const express = require("express");
const axios = require("axios");
const https = require("https");

// 创建 Express 应用
const app = express();

// Railway 等平台会通过 PORT 环境变量告诉我们应该监听哪个端口。
const PORT = process.env.PORT || 3000;

// 创建一个 https Agent，它会忽略无效或自签名的SSL证书错误。
const unsafeAgent = new https.Agent({
  rejectUnauthorized: false,
});

// 定义代理路由
app.get("/proxy", async (req, res) => {
  // 从查询参数中获取我们真正想访问的目标 URL
  const targetUrl = req.query.url;

  // 如果没有提供 url 参数，返回错误
  if (!targetUrl) {
    return res.status(400).send('Error: "url" query parameter is required.');
  }

  console.log("Proxying request for:", targetUrl);

  try {
    // --- 这是本次最关键的修改 ---
    // 定义要发送给目标服务器的请求头，伪装成Clash客户端
    const requestHeaders = {
      'User-Agent': 'NekoBox/Android/1.3.9', // 模拟Clash for Windows的User-Agent
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
    };
    // --- 修改结束 ---

    // 使用 axios 发起网络请求
    const response = await axios.get(targetUrl, {
      // 如果目标是 https 链接，使用“不安全” Agent
      httpsAgent: targetUrl.startsWith("https:") ? unsafeAgent : undefined,
      // 以“流”的形式获取响应
      responseType: "stream",
      // 让 axios 不要因为错误状态码而抛出异常
      validateStatus: () => true,
      // 在请求中带上我们伪装好的头信息
      headers: requestHeaders,
    });

    // 将从目标服务器获取到的响应头，转换为纯对象后，原样设置回给客户端
    // 这一步依然保留，是好的编程实践
    res.set(response.headers.toJSON());
    res.status(response.status);

    // 将目标服务器的响应内容，通过管道直接转发给客户端
    response.data.pipe(res);

  } catch (error) {
    // 如果请求过程中发生网络错误等，返回 500 错误
    console.error("Error in proxy request:", error.message);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
});

// 定义根路由，方便检查服务是否运行
app.get("/", (req, res) => {
  res.send(
    "Proxy server is running. Use /proxy?url=YOUR_TARGET_URL to make a request."
  );
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Proxy server is ready and listening on port ${PORT}`);
});
