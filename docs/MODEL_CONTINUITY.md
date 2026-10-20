# 模型切换续接规范

## 1. 目的

本项目当前由 Codex 作为主要开发工具，正常情况下不进行模型切换。如果未来确实更换模型，必须通过仓库文档恢复上下文，不能依赖旧聊天记录、记忆或模型自行猜测。

## 2. 主开发工具与执行规则

- Codex 按 `docs/IMPLEMENTATION_PLAN.md` 的分批计划持续实施。
- 操作分为自动执行、先说明再做、单独确认三档。
- 该规则是行为约束，不是系统权限边界。
- 普通推送、密钥、部署、公网暴露和破坏性操作始终需要用户明确确认。

## 3. 强制阅读顺序

任何新模型开始工作前，按顺序阅读：

1. `README.md`
2. `docs/AI_HANDOFF.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/RESEARCH_BASELINE.md`
5. `docs/DECISIONS.md`
6. `docs/OPEN_QUESTIONS.md`
7. `docs/IMPLEMENTATION_PLAN.md`
8. `docs/M1_WORKLOG.md`
9. `docs/M2_WORKLOG.md`
10. `docs/M3_WORKLOG.md`
11. `docs/SESSION_HANDOFF_2026-10-16.md`
12. `CHANGELOG.md`

阅读后先输出：

- 当前项目阶段
- 已确认决策
- 未确认问题
- 最后一次有效改动
- 本任务准备修改的最小范围

未经以上步骤，不得直接重构或大规模生成代码。

## 4. 禁止的漂移行为

新模型不得自行执行以下操作：

- 重新定义产品名称
- 更换远端仓库
- 重置目录结构
- 在没有决策记录的情况下更换技术栈
- 把旧建议当成已确认需求
- 重新全站抓取参考产品并推翻已有结论
- 删除旧文档来“简化上下文”
- 未经说明地修改积分、权限、支付和存储模型
- 直接复制参考产品代码、素材、评价和法律内容
- 把 API Key、Token、Cookie 或用户数据写入仓库

## 5. 防漂移流程

每次任务按以下顺序执行：

1. 读取文档，确认当前状态。
2. 检查工作区是否已有未提交改动。
3. 只做用户当前要求的最小改动。
4. 不顺手重构无关模块。
5. 执行可用的验证。
6. 更新 `CHANGELOG.md`。
7. 产生架构决策时更新 `docs/DECISIONS.md`。
8. 用户回答问题后更新 `docs/OPEN_QUESTIONS.md`。
9. 提交前确认没有敏感信息。

## 6. 决策状态

只有以下情况算“已确认”：

- 用户明确同意
- 用户直接提出
- 已写入 `docs/DECISIONS.md` 且状态为 `Accepted`

以下内容不算已确认：

- 旧模型建议
- 计划文档中的备选方案
- 研究推断
- 口头“可以考虑”

## 7. 提交规范

建议提交类型：

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `security`

示例：

```text
feat(chat): add model picker and streaming message shell
docs(project): record first frontend stack decision
fix(points): return reserved points after failed generation
```

每个提交都应保持单一目的，避免把文档、重构和功能混在一起。

## 8. 完成标准

一个任务只有满足以下条件才可以标记完成：

- 用户要求已经实现
- 没有破坏现有功能
- 相关测试或检查已经运行
- 错误和剩余风险已记录
- `CHANGELOG.md` 已更新
- 必要决策已经落档
- 新增环境变量已写入 `.env.example`
- 没有提交任何敏感信息

## 9. 模型切换交接模板

新模型开始任务前，先填写以下内容：

```text
当前阶段：
上次有效改动：
本次用户要求：
已确认决策：
待确认问题：
预计修改文件：
验证方式：
不会改动的内容：
```

任务结束后再填写：

```text
实际改动：
验证结果：
未完成事项：
新增风险：
下一步建议：
```

交接内容应写入 `CHANGELOG.md` 或对应决策文档，而不是只留在聊天中。

## 10. 上下文优先级

当不同模型给出的建议冲突时：

1. 用户最新明确指令
2. `DECISIONS.md` 中 `Accepted` 的记录
3. `PROJECT_CONTEXT.md`
4. `RESEARCH_BASELINE.md`
5. 当前代码和测试
6. 旧计划与聊天

任何模型都可以提出替代方案，但不能无记录地覆盖已确认决策。

## 11. 敏感数据规则

- 不保存用户登录会话
- 不保存原始 Cookie
- 不保存账号密码
- 不保存模型供应商 API Key
- 不保存支付密钥
- 不使用参考产品账号调用生产接口
- 研究截图如果包含个人信息，必须先清洗再提交

如果任务确实需要第三方密钥，只读取环境变量，并在文档中记录变量名，不记录变量值。
