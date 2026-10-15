# AGENTS.md

## Project
兽医诊所的管制药物采购 agent：库存用完才能采购，agent 经 MCP 与供应商通信，通信中实时核验 FDA 召回 / DEA 注册。当前阶段：spike（W1）→ MVP（W2）→ polish（W3）。
产品说明见 docs/03-brief.md，开工前先读它。

## Stack（已验证可用的版本，不要擅自升级）
- Node 22.20 / TypeScript 7.0.2 / npm（仓库用 package-lock.json，无 pnpm）
- viem 2.x（现有 check.ts 仍连 Sepolia，属旧 spike）
- concordium-node-sdk-js：未安装，版本待 W1 spike 验证后回填

## Commands
- install: npm install
- check: npm run check   # tsx scripts/check.ts；dev 脚本暂无

## Conventions
- 外部调用（RPC / API / LLM）必须有超时、try/catch 和可读的错误信息
- 不写 mock 数据冒充真实结果；拿不到真实数据时明确报错或在界面标注 "demo data"
- 默认测试网（Concordium testnet，赛事硬条件；旧 spike 脚本仍连 Sepolia）

## Definition of done
- 我能用一条命令跑起来并看到预期结果
- 有一个失败用例并且行为符合预期
- 改动超过 3 个文件时，最后给一段 changelog

## Red lines（任何情况下先问我）
- 查看、打印、提交 .env / 私钥 / 助记词 / API key 的内容（运行读取 .env 的程序没问题）
- 任何主网交易或涉及真实资产的调用
- 删除文件、删除分支、force push
- 安装我没提过的新依赖、请求我没提过的新外部服务

## Autonomy（直接做，做完汇报）
- 范围内的重构、错误处理、日志、样式调整
- 跑 lint / typecheck / 格式化
- 遇到不影响产品目标的小选择，自己定，不要问我
