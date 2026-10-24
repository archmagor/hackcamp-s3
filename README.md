# hackcamp-s3 · OddsGate

> **OddsGate** —— agent 驱动受监管商业的合规轨。首垂直：欧洲足球博彩数据。
> 参赛：Concordium Trusted Agents Hackathon（开赛 2026-11-02 · Checkpoint 1 11-22 · 提交截止 12-09 23:59 UTC）。

## OddsGate 是什么

- **server agent** 按次出售三类数据：赔率快照 / 球队状态 / 胜平负概率，统一 **0.1 EUDemo** 一次。
- **client agent** 自主询价、购买、记账（A2A，真人只在首次授权时在场一次）。
- **结算**：Concordium testnet 上的 x402 V2 **sponsored** 交易——sponsor 代付 CCD 手续费，买方只付标价 EUDemo。
- **合规门禁**：买方用 Concordium Verify and Access 出组合 ZKP（age≥18 + 持牌辖区 + 绑定 agent token id），**卖方不接触 PII**；每笔购买过四门校验，成交 / 拒绝全量留痕、可独立审计、授权可随时撤销。

## 四门校验（每笔购买）

1. **问责**：付款 agent 在 Agent Registry 已注册 + active + CIS-8 跨链绑定
2. **属性**：委托证明（审计记录）密码学复验 + 绑定该 agent + 新鲜度 ≤30 天
3. **额度**：`X-PAYMENT` 的 sender == Registry 登记的 agentWallet
4. **链上独立复核**：不完全信任 facilitator 回包，自查链上 TokenUpdate / sponsor / 买方手续费为 0

门①②③任一不过 → `402 + reason` 拒绝，**无链上动作、无资金变动**；只有门④会触链。

## 用到的 Concordium 组件

x402 payments · sponsored transactions · Protocol-Level Tokens（EUDemo）· Agent Registry（CIS-8004 / CIS-8）+ Verified by Concordium badge · Verify and Access · Agent Registry MCP（只读问责）——覆盖赛事"有意义地使用 ≥1 个组件"的硬条件。

## 文档

| 文件 | 内容 |
|---|---|
| `docs/01-选赛卡.md` | 赛事调研（主赛 Concordium + 备选 PayPal AI Hackathon） |
| `docs/02-机会卡.md` | 机会卡：问题 / 差异化 / 最危险假设 / 推翻条件 |
| `docs/03-brief.md` | 产品说明（**开工前先读**） |
| `docs/04-链上角色.md` | 链上做什么、为什么必须在链上 |
| `docs/tech-notes-x402.md` | x402 + Concordium 支付调研（版本 / 最小示例 / 已核实事实） |

## 开发（当前可跑的）

```bash
npm install
npm run check     # tsx scripts/check.ts：连 Base Sepolia 打印最新区块号 + ETH 余额（旧 spike）
```

- 栈：Node 22.20 · TypeScript · npm（`package-lock.json`，无 pnpm）· viem 2.x。
- 目标新增（W1 spike）：`@x402/concordium@2.28.0` + `@concordium/web-sdk`（^12）；Concordium 无公共 facilitator，需自建 / 自托管。
- 环境变量（`.env`，此处仅列**变量名**，切勿提交值）：`WALLET_ADDRESS` / `WALLET_PRIVATE_KEY` / `RPC_URL` / `LEDGER_ADDRESS`。

## 约定 & 红线

详见 [`AGENTS.md`](./AGENTS.md)。要点：外部调用必须带超时 + try/catch + 可读错误；不写 mock 数据冒充真实结果（拿不到真实数据时明确报错或标注 "demo data"）；默认测试网；`.env` / 私钥 / 助记词不查看、不打印、不提交；不做任何主网交易。
