# 2026 年 5 月工作总结（hc-bim / speckle-server）

## 一、工作概览

- 时间范围：2026-05-01 ~ 2026-05-31
- 覆盖仓库：
  - hc-bim（/Users/yujian/work/hc-bim）
  - speckle-server（/Users/yujian/work/speckle-server/packages/server）
- 产出规模（按 Git 提交统计，含生成代码/锁文件变动）：
  - hc-bim：80 commits；约 25,949 行新增 / 8,282 行删除
  - speckle-server：40 commits；约 374,556 行新增 / 2,480 行删除

## 二、主要工作与成果

### 1）图纸（DWG/DXF）能力打通

- 后端：完善 DWG 图纸转换链路（如 DWG → DXF 服务），支撑图纸查看与转换。
- 前端：新增图纸入口与查看能力，并对分屏渲染做体验优化；补齐 MinIO 鉴权 URL 访问链路。
- 成果：形成图纸上传/查看/转换的闭环能力，降低对人工转换与临时处理的依赖。

### 2）模型/文件同步与构件参数同步

- 前端：推进模型同步、文件同步、目录树同步与查找等能力；补齐 seedId 等外部标识同步。
- 后端：配合模型同步、构件参数同步链路及相关接口能力建设。
- 成果：同步链路更完整，支撑更稳定的模型/构件数据对齐与后续业务流程。

### 3）二三维联动、联动视图与分屏体验

- 后端：推进二三维联动相关能力与接口支撑。
- 前端：推进模型联动能力，并对分屏渲染体验做优化。
- 成果：联动与分屏使用体验更顺滑，为复核、对照、定位等场景提供更好的交互基础。

### 4）轻量模型：分享与检索能力完善

- 前端：新增轻量模型分享能力，并完成相关问题修复。
- 后端：补齐轻量模型分页筛选等能力。
- 成果：轻量模型更易分发、更易检索，提升协作效率。

### 5）权限、组织架构与可见性治理

- 后端：推进组织架构基于角色的可见性控制，并完善权限管理相关问题。
- 前端：配合权限能力调整（如 canDelete 等场景），并将“组”调整为“团队”等结构优化。
- 成果：权限与组织治理更清晰，降低误操作风险，增强系统可管控性。

### 6）构件自定义属性：新增、同步与导出

- 后端：新增构件自定义属性相关能力，支持导出自定义属性，并完善相关 REST/仓储实现。
- 前端：补齐上传日志、导出属性、同步属性等链路，支撑与 DTP/第三方的对接使用。
- 成果：形成可用的“构件自定义属性”生产与输出能力，支撑数据交付与对外集成。

### 7）外部接口与 Token 对接

- 后端：实现 speckle token → 第三方平台 token 的接口能力，并推进外部接口建设。
- 前端：配合登录/接口联调及相关缓存清理等细节补齐。
- 成果：打通认证与外部集成关键链路，降低对接成本。

### 8）稳定性与体验优化

- 前端：将 setSelectionFromObjectIds 调整为分批处理，降低大选择集场景的卡顿风险；修复 CORS、复制链接报错、样式与多处体验问题。
- 后端：补齐/修复部分数据库迁移与测试用例相关缺失，提升回归稳定性。
- 成果：减少常见报错与卡顿点，提升日常使用稳定性。

## 三、关键触达文件（Top Touched Files）

### hc-bim（节选）

- packages/frontend-2/components/Model/LightModel.vue
- packages/frontend-2/components/projects/workbench/page.vue
- packages/frontend-2/components/Model/TwinModel.vue
- packages/frontend-2/plugins/016-fetchDtp.ts
- packages/frontend-2/components/viewer/catalog/Panel.vue
- packages/frontend-2/components/dashboard/Sidebar.vue
- packages/frontend-2/pages/twin-scene/[workgroupId]/members.vue
- packages/frontend-2/pages/twin-scene/[workgroupId]/cases.vue
- packages/frontend-2/composables/useDtpModelUpload.ts
- packages/frontend-2/components/auth/LoginWithEmailBlock.vue

### speckle-server（packages/server，节选）

- packages/server/modules/core/graph/generated/graphql.ts
- packages/server/modules/core/rest/models.ts
- packages/server/modules/index.ts
- packages/server/modules/core/index.ts
- packages/server/modules/drawings/services/dwgToDxf.ts
- packages/server/modules/flow/services/approvalFlows.ts
- packages/server/modules/core/tests/versions.spec.ts
- packages/server/modules/viewer/rest/viewerObjectCustomAttributes.ts
- packages/server/modules/viewer/repositories/viewerObjectCustomAttributes.ts

## 四、数据备注

- 本总结的“工作内容”主要来源于 2026-05 的 Git 提交记录与变更文件统计。
- 行数统计包含自动生成文件（如 graphql 生成文件）与锁文件变更，因此仅用于衡量量级，不代表全部有效业务代码产出。

## 五、待你补充（非提交类工作）

- 需求评审/方案设计/技术预研
- 联调支持（跨端、跨团队、第三方）
- 线上问题排查、灰度/发布支持
- 文档沉淀、培训/交接

