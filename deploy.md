# 部署环境变量清单

本文档用于说明 **新部署一套 hc-bim / speckle 系统时需要配置的环境变量**。  
以当前仓库中的 [`docker-compose.yml`](file:///Users/yujian/work/hc-bim/docker-compose.yml) 和 [`docker-compose-speckle.yml`](file:///Users/yujian/work/hc-bim/docker-compose-speckle.yml) 为准。

## 1. 部署范围

当前部署通常包含这些服务：

- `speckle-frontend-2`
- `speckle-server`
- `preview-service`
- `webhook-service`
- `ifc-import-server`
- 依赖服务：`postgres`、`redis`、`minio`

## 2. 最重要的地址关系

新环境最容易配错的是“外部访问地址”和“容器内访问地址”。

### 2.1 外部用户访问地址

这一组地址给浏览器和用户使用，通常是公网域名、公网 IP 或内网入口：

- `NUXT_PUBLIC_API_ORIGIN`
- `NUXT_PUBLIC_BASE_URL`
- `CANONICAL_URL`
- `FRONTEND_ORIGIN`

这几个值通常应保持一致，都是“用户实际访问系统的入口地址”。

例如：

```env
NUXT_PUBLIC_API_ORIGIN=https://bim.example.com
NUXT_PUBLIC_BASE_URL=https://bim.example.com
CANONICAL_URL=https://bim.example.com
FRONTEND_ORIGIN=https://bim.example.com
```

### 2.2 容器内服务访问地址

这一组地址给容器之间互相调用使用：

- `NUXT_PUBLIC_BACKEND_API_ORIGIN`
- `PRIVATE_OBJECTS_SERVER_URL`

在 Docker Compose 下通常是：

```env
NUXT_PUBLIC_BACKEND_API_ORIGIN=http://speckle-server:3000
PRIVATE_OBJECTS_SERVER_URL=http://speckle-server:3000
```

## 3. 前端 `speckle-frontend-2` 环境变量

### 3.1 必配

| 变量名                           | 说明                             | 示例                         |
| -------------------------------- | -------------------------------- | ---------------------------- |
| `NUXT_PUBLIC_SERVER_NAME`        | 当前环境名称                     | `prod`                       |
| `NUXT_PUBLIC_API_ORIGIN`         | 浏览器访问站点的外部地址         | `https://bim.example.com`    |
| `NUXT_PUBLIC_BASE_URL`           | 前端站点基础地址，通常与上面一致 | `https://bim.example.com`    |
| `NUXT_PUBLIC_BACKEND_API_ORIGIN` | 前端容器访问后端的内部地址       | `http://speckle-server:3000` |
| `NUXT_REDIS_URL`                 | 前端服务使用的 Redis 地址        | `redis://redis`              |

### 3.2 本项目推荐配置

| 变量名                                          | 说明                                                        | 示例                      |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| `NUXT_PUBLIC_DTP_API_ORIGIN`                    | DTP API 前缀                                                | `/__dtp`                  |
| `NUXT_PUBLIC_DTP_UI_ORIGIN`                     | DTP 页面完整 origin；不配时前端会按 hostname 映射或同源回退 | `https://dtp.example.com` |
| `NUXT_PUBLIC_LOG_LEVEL`                         | 前端日志级别                                                | `warn`                    |
| `LOG_LEVEL`                                     | 容器日志级别                                                | `info`                    |
| `LOG_PRETTY`                                    | 是否格式化日志                                              | `true`                    |
| `NUXT_PUBLIC_FF_LARGE_FILE_IMPORTS_ENABLED`     | 大文件导入开关                                              | `true`                    |
| `NUXT_PUBLIC_FF_NEXT_GEN_FILE_IMPORTER_ENABLED` | 新版文件导入开关                                            | `true`                    |

### 3.3 可选观测性配置

按需启用：

- `NUXT_PUBLIC_MIXPANEL_TOKEN_ID`
- `NUXT_PUBLIC_MIXPANEL_API_HOST`
- `NUXT_PUBLIC_LOG_CLIENT_API_TOKEN`
- `NUXT_PUBLIC_LOG_CLIENT_API_ENDPOINT`
- `NUXT_PUBLIC_DATADOG_APP_ID`
- `NUXT_PUBLIC_DATADOG_CLIENT_TOKEN`
- `NUXT_PUBLIC_DATADOG_SITE`
- `NUXT_PUBLIC_DATADOG_SERVICE`
- `NUXT_PUBLIC_DATADOG_ENV`
- `NUXT_PUBLIC_INTERCOM_APP_ID`
- `NUXT_PUBLIC_DASHBOARDS_ORIGIN`

## 4. 后端 `speckle-server` 环境变量

### 4.1 必配

| 变量名                          | 说明                            | 示例                                             |
| ------------------------------- | ------------------------------- | ------------------------------------------------ |
| `CANONICAL_URL`                 | 用户访问系统的外部地址          | `https://bim.example.com`                        |
| `PRIVATE_OBJECTS_SERVER_URL`    | 容器内部访问 server 的地址      | `http://speckle-server:3000`                     |
| `SESSION_SECRET`                | 会话密钥，生产环境必须替换      | `replace-with-strong-secret`                     |
| `STRATEGY_LOCAL`                | 是否启用本地账号密码登录        | `true`                                           |
| `POSTGRES_URL`                  | Postgres 主机                   | `postgres`                                       |
| `POSTGRES_USER`                 | Postgres 用户                   | `speckle`                                        |
| `POSTGRES_PASSWORD`             | Postgres 密码                   | `strong-password`                                |
| `POSTGRES_DB`                   | Postgres 数据库名               | `speckle`                                        |
| `REDIS_URL`                     | Redis 地址                      | `redis://redis`                                  |
| `S3_ENDPOINT`                   | server 容器访问 MinIO/S3 的地址 | `http://minio:9000`                              |
| `S3_ACCESS_KEY`                 | MinIO/S3 Access Key             | `minioadmin`                                     |
| `S3_SECRET_KEY`                 | MinIO/S3 Secret Key             | `minioadmin`                                     |
| `S3_BUCKET`                     | 对象存储桶名                    | `speckle-server`                                 |
| `FRONTEND_ORIGIN`               | 前端外部地址                    | `https://bim.example.com`                        |
| `FILEIMPORT_QUEUE_POSTGRES_URL` | 文件导入任务使用的 PG 连接串    | `postgresql://speckle:password@postgres/speckle` |

### 4.2 强烈建议配置

| 变量名                              | 说明                               | 示例                                                 |
| ----------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `S3_PUBLIC_ENDPOINT`                | 默认返回给前端的 MinIO/S3 外部地址 | `https://minio.example.com`                          |
| `S3_CREATE_BUCKET`                  | 启动时自动建桶                     | `true`                                               |
| `S3_REGION`                         | S3 区域，MinIO 可留空              | ``                                                   |
| `FILE_SIZE_LIMIT_MB`                | 上传大小限制                       | `1536`                                               |
| `EMAIL_FROM`                        | 默认发信地址                       | `no-reply@example.org`                               |
| `EMAIL_SECURE`                      | 是否强制 SSL                       | `false`                                              |
| `EMAIL_REQUIRE_TLS`                 | 是否强制 TLS                       | `false`                                              |
| `ONBOARDING_STREAM_URL`             | 默认 onboarding 项目               | `https://latest.speckle.systems/projects/843d07eb10` |
| `FF_NEXT_GEN_FILE_IMPORTER_ENABLED` | 新版导入器开关                     | `true`                                               |

### 4.3 预览/导入相关

| 变量名                                              | 说明                                   | 示例            |
| --------------------------------------------------- | -------------------------------------- | --------------- |
| `PREVIEW_SERVICE_USE_PRIVATE_OBJECTS_SERVER_URL`    | preview-service 是否走内网 server 地址 | `true`          |
| `PREVIEW_SERVICE_REDIS_URL`                         | preview-service Redis 地址             | `redis://redis` |
| `FILEIMPORT_SERVICE_USE_PRIVATE_OBJECTS_SERVER_URL` | 文件导入服务是否走内网 server 地址     | `true`          |
| `FILEIMPORT_SERVICE_REDIS_URL`                      | 文件导入服务 Redis 地址                | `redis://redis` |

### 4.4 多入口前端下的对象存储地址映射

如果你有多个前端入口，例如：

- 一个内网 IP
- 一个公网 IP
- 一个公网域名

并且希望后端根据前端传来的 `x-frontend-origin` 返回不同的 MinIO 上传地址，可以配置：

`S3_FRONTEND_ORIGIN_ENDPOINT_OVERRIDES`

格式是 JSON 数组，例如：

```env
S3_FRONTEND_ORIGIN_ENDPOINT_OVERRIDES='[
  {
    "frontendOrigins": ["http://192.168.20.155:3300"],
    "endpoint": "http://192.168.20.157:9000"
  },
  {
    "frontendOrigins": ["http://61.145.255.42:3300", "https://bim.example.com"],
    "endpoint": "http://192.168.20.157:9000"
  }
]'
```

说明：

- `frontendOrigins` 按 **完整 origin** 匹配：`协议 + 域名/IP + 端口`
- 命中后会直接返回对应 `endpoint` 生成的 presigned URL
- 没命中时才回退到 `S3_PUBLIC_ENDPOINT`
- 如果 `S3_PUBLIC_ENDPOINT` 也没配，则继续回退到 `S3_ENDPOINT`

建议：

- `S3_ENDPOINT` 配内部可达地址，供 server 容器访问
- `S3_PUBLIC_ENDPOINT` 配默认兜底的外部可达地址
- `S3_FRONTEND_ORIGIN_ENDPOINT_OVERRIDES` 配多入口精确映射

## 5. `preview-service` 环境变量

| 变量名       | 说明           | 示例            |
| ------------ | -------------- | --------------- |
| `HOST`       | 服务监听地址   | `127.0.0.1`     |
| `PORT`       | 服务端口       | `3001`          |
| `LOG_LEVEL`  | 日志级别       | `info`          |
| `LOG_PRETTY` | 是否格式化日志 | `true`          |
| `REDIS_URL`  | Redis 地址     | `redis://redis` |

## 6. `webhook-service` 环境变量

| 变量名                 | 说明            | 示例                                           |
| ---------------------- | --------------- | ---------------------------------------------- |
| `LOG_LEVEL`            | 日志级别        | `info`                                         |
| `LOG_PRETTY`           | 是否格式化日志  | `true`                                         |
| `PG_CONNECTION_STRING` | Postgres 连接串 | `postgres://speckle:password@postgres/speckle` |

## 7. `ifc-import-server` 环境变量

| 变量名                          | 说明                   | 示例                                             |
| ------------------------------- | ---------------------- | ------------------------------------------------ |
| `LOG_LEVEL`                     | 日志级别               | `info`                                           |
| `LOG_PRETTY`                    | 是否格式化日志         | `true`                                           |
| `FILEIMPORT_QUEUE_POSTGRES_URL` | 文件导入队列 PG 连接串 | `postgresql://speckle:password@postgres/speckle` |

## 8. 依赖服务配置

### 8.1 Postgres

至少需要：

```env
POSTGRES_DB=speckle
POSTGRES_USER=speckle
POSTGRES_PASSWORD=strong-password
```

### 8.2 Redis

至少需要一个可用实例，例如：

```env
REDIS_URL=redis://redis:6379
```

### 8.3 MinIO / S3

至少需要：

```env
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=speckle-server
S3_CREATE_BUCKET=true
```

## 9. 新环境最小可用示例

下面是一套“单域名 + Docker Compose 内网互通 + MinIO 内部访问”的最小配置示例。

### 9.1 前端

```env
NUXT_PUBLIC_SERVER_NAME=prod
NUXT_PUBLIC_API_ORIGIN=https://bim.example.com
NUXT_PUBLIC_BASE_URL=https://bim.example.com
NUXT_PUBLIC_BACKEND_API_ORIGIN=http://speckle-server:3000
NUXT_PUBLIC_DTP_API_ORIGIN=/__dtp
NUXT_PUBLIC_DTP_UI_ORIGIN=https://dtp.example.com
NUXT_PUBLIC_LOG_LEVEL=warn
NUXT_REDIS_URL=redis://redis
LOG_LEVEL=info
LOG_PRETTY=true
NUXT_PUBLIC_FF_LARGE_FILE_IMPORTS_ENABLED=true
NUXT_PUBLIC_FF_NEXT_GEN_FILE_IMPORTER_ENABLED=true
```

### 9.2 后端

```env
CANONICAL_URL=https://bim.example.com
PRIVATE_OBJECTS_SERVER_URL=http://speckle-server:3000
SESSION_SECRET=replace-with-strong-secret
STRATEGY_LOCAL=true

POSTGRES_URL=postgres
POSTGRES_USER=speckle
POSTGRES_PASSWORD=strong-password
POSTGRES_DB=speckle

REDIS_URL=redis://redis
PREVIEW_SERVICE_USE_PRIVATE_OBJECTS_SERVER_URL=true
PREVIEW_SERVICE_REDIS_URL=redis://redis
FILEIMPORT_SERVICE_USE_PRIVATE_OBJECTS_SERVER_URL=true
FILEIMPORT_SERVICE_REDIS_URL=redis://redis

S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://minio.example.com
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=speckle-server
S3_CREATE_BUCKET=true
S3_REGION=

FRONTEND_ORIGIN=https://bim.example.com
FILEIMPORT_QUEUE_POSTGRES_URL=postgresql://speckle:strong-password@postgres/speckle
FF_NEXT_GEN_FILE_IMPORTER_ENABLED=true
FILE_SIZE_LIMIT_MB=1536
EMAIL_FROM=no-reply@example.org
EMAIL_SECURE=false
EMAIL_REQUIRE_TLS=false
ONBOARDING_STREAM_URL=https://latest.speckle.systems/projects/843d07eb10
```

## 10. 上线前检查

上线前至少确认这几项：

1. `NUXT_PUBLIC_API_ORIGIN`、`NUXT_PUBLIC_BASE_URL`、`CANONICAL_URL`、`FRONTEND_ORIGIN` 是否一致
2. `NUXT_PUBLIC_BACKEND_API_ORIGIN` 和 `PRIVATE_OBJECTS_SERVER_URL` 是否指向容器内可达地址
3. `S3_ENDPOINT` 是否为 server 容器可达地址
4. `S3_PUBLIC_ENDPOINT` / `S3_FRONTEND_ORIGIN_ENDPOINT_OVERRIDES` 返回的地址，浏览器是否可访问
5. `SESSION_SECRET` 是否替换为正式密钥
6. `POSTGRES` / `REDIS` / `MinIO` 账号密码是否替换默认值
7. `FILEIMPORT_QUEUE_POSTGRES_URL`、`PG_CONNECTION_STRING` 是否与数据库实际配置一致
8. 如果接入 DTP，`NUXT_PUBLIC_DTP_API_ORIGIN`、`NUXT_PUBLIC_DTP_UI_ORIGIN` 是否正确

## 11. 当前仓库参考文件

- [`docker-compose.yml`](file:///Users/yujian/work/hc-bim/docker-compose.yml)
- [`docker-compose-speckle.yml`](file:///Users/yujian/work/hc-bim/docker-compose-speckle.yml)
- [`packages/server/.env.example`](file:///Users/yujian/work/hc-bim/packages/server/.env.example)
