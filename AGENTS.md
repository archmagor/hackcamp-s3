# AGENTS.md

## Project
OddsGate：agent 驱动受监管商业的合规轨，首垂直欧洲足球博彩数据。server agent 按次卖三类数据（赔率快照 / 球队状态 / 胜平负概率），client agent 自主询价购买；x402 V2 sponsored 结算（sponsor 代付 CCD 手续费、买方只付 EUDemo）；四门校验（Registry 问责 / 委托证明属性复验 / 额度 / 链上独立复核），身份用 Concordium Verify and Access 组合 ZKP（age≥18 + 持牌辖区 + 绑 agent），卖方不接触 PII。当前阶段：spike（W1）→ MVP（W2）→ polish（W3）。
目标赛事：Concordium Trusted Agents Hackathon（开赛 11-02 · Checkpoint 1 11-22 · 提交截止 12-09 23:59 UTC）。
文档：docs/01-选赛卡（赛事）· 02-机会卡 · **03-brief（产品说明，开工前先读）** · 04-链上角色 · tech-notes-x402（支付调研）。

## Stack（已验证可用的版本，不要擅自升级）
- Node 22.20 / TypeScript 7.0.2 / npm（仓库用 package-lock.json，无 pnpm）
- viem 2.x（现有 check.ts 仍连 Sepolia，属旧 spike）
- Concordium/x402 SDK：**均未安装**；目标版本已由 HACKATHON.md §9.1.1 核实——@x402/concordium@2.28.0（scheme `ccd:*`，含 client/server/facilitator，无公共 facilitator 需自建）+ @concordium/web-sdk ^12（或 concordium-node-sdk-js）；W1 spike 落地后回填 package.json

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
