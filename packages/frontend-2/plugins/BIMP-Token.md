# BIMP-Token 与 WDP-Token 认证流程说明

## 概述

- `bimp-token` 采用约定算法加解密，内容包含关键字段：`mobile`、`username`。
- `wdp-backend` 进行解密，请求 OAuth 校验后，生成并返回 `wdp-token`。
- `wdp-token` 将作为所有 API 请求的校验 Token，请在 Header 中添加：authorization: Bearer %s

## 第三方登录接口

- **URL**：`http://10.66.8.188:30080/service/v1/login/third-party`
- **Method**：`POST`

### 请求体

{
"token": "xxxxxx"
}

### 响应体

{
  "token": "yyyyyy"
}

### BIMP-Token 加密算法

{
  "mobile": "xxx",   // 手机号
  "username": "zzz"  // 用户名
}

加密算法信息
参数	值
Cipher	AES
Key	Ze/0w7rnQg7jznntRcuxGQ==
Mode	ECB
Padding	PKCS7

### JS 加密示例代码

```js
const data = CryptoJS.enc.Utf8.parse("xxxxx");
const key = CryptoJS.enc.Utf8.parse("Ze/0w7rnQg7jznntRcuxGQ==");
const encrypted = CryptoJS.AES.encrypt(data, key, {
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7,
});
const target = encrypted.toString();
console.log("encrypted data", target);
```