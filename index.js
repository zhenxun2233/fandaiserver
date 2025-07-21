const express = require("express");
const axios = require("axios");
const https = require("https");
const app = express();

// Railway 会通过 PORT 环境变量告诉我们应该监听哪个端口
// 这是在 Railway 上部署的关键
const PORT = process.env.PORT || 3000; 

// 创建一个可以忽略SSL证书错误的https Agent
const unsafeAgent = new https.Agent({
  rejectUnauthorized: false,
});

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Error: "url" query parameter is required.');
  }

  console.log("Proxying request for:", targetUrl);

  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: targetUrl.startsWith("https:") ? unsafeAgent : undefined,
      responseType: "stream",
      validateStatus: () => true,
    });

    res.set(response.headers);
    res.status(response.status);
    response.data.pipe(res);

  } catch (error) {
    console.error("Error in proxy request:", error.message);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
});

app.get("/", (req, res) => {
  res.send(
    "Proxy server is running on Railway. Use /proxy?url=YOUR_TARGET_URL to make a request."
  );
});

app.listen(PORT, () => {
  console.log(`Proxy server is ready and listening on port ${PORT}`);
});
