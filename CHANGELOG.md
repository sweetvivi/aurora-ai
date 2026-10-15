# Changelog

本文件记录项目所有有效改动。每次完成一项可验证的工作后都要追加记录，不能只依赖对话上下文。

格式参考 Keep a Changelog：

- `Added`：新增功能、页面、文档或配置
- `Changed`：行为、结构、文案或依赖变更
- `Fixed`：修复问题
- `Removed`：删除功能或文件
- `Security`：安全、权限、密钥或数据处理变更

## [Unreleased]

### Added

- 初始化 `project2` 本地 Git 仓库，默认分支为 `main`。
- 添加项目总览、研究基线、模型续接、决策记录和待确认问题文档。
- 添加变更日志和基础 `.gitignore`。
- 添加 `.gitattributes`，统一文本和二进制文件的换行处理。

### Changed

- 将 `origin` 设置为 `http://182.92.154.206:3000/sweetvivi/web-ai-design-clone.git`。
- 已验证远端可访问且当前没有分支；因本机尚未配置 Git 提交邮箱，暂未创建初始提交。
- 配置当前仓库的 Git 提交身份为 `sweetvivi <2020532166@qq.com>`，凭据用户名使用 `sweetvivi`。

### Fixed

- 无。

### Removed

- 无。

### Security

- 明确禁止将 API Key、Token、Cookie、账号密码和支付信息写入仓库。
- 初始提交 `5a087cc` 已创建；推送因远端要求认证且当前没有可用凭据而暂停，未保存任何密码或 Token。
- 2026-10-15：HTTP 账号密码认证被远端拒绝并返回 `Unauthorized`，已从 Windows Credential Manager 删除该无效凭据。后续需要有效 Gitea Token，或确认账号激活和登录策略。

## 记录规则

每条记录应尽量包含：

- 日期
- 变更目的
- 主要文件或模块
- 验证方式
- 遗留风险和后续动作

示例：

```text
### Added

- 2026-10-16：新增对话工作台首页，支持模型选择和流式消息。
  - 文件：`apps/web/src/views/chat/`
  - 验证：`pnpm test`、Playwright 桌面端和移动端冒烟测试
  - 遗留：真实模型调用仍依赖供应商 API Key
```
