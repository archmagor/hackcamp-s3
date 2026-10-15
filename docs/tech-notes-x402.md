# tech notes：x402（VetGate 采购支付调研）

> 信息来源与时效：`x402.org`、`github.com/coinbase/x402`（README）、`docs.x402.org/getting-started/quickstart-for-buyers`、repo 示例 `examples/typescript/clients/fetch`、npm registry 实查 —— 全部抓取于 2026-10-15。**仓库已迁移：coinbase/x402 → [x402-foundation/x402](https://github.com/x402-foundation/x402)**（x402 Foundation，Linux Foundation 运营）；coinbase 仓库现为 development fork。

## 1. 版本与安装（以 npm 实查为准，2026-10-15）

| 包 | 版本 | 说明 |
|---|---|---|
| `@x402/core` | 2.28.0 | 协议核心（x402Client 等） |
| `@x402/evm` | 2.28.0 | EVM 机制（exact / upto / auth-capture） |
| `@x402/fetch` | 2.28.0 | fetch 包装客户端 |
| `@x402/express` | 2.28.0 | 服务端中间件 |
| `@x402/concordium` | 未实查版本，安装命令见下 | **官方 Concordium scheme，买家 quickstart 明确列出** |
| `x402-axios` | 1.2.1 | 旧 v1 包，v2 勿混用 |

```bash
# 本项目（TS 客户端，EVM + Concordium）
npm install @x402/fetch @x402/evm @x402/concordium @x402/core
# concordium signer 需要（@x402/concordium 配套）
npm install @concordium/web-sdk
# viem 项目里已有，无需重装
```

## 2. 最小可跑示例（测试网）

官方 quickstart-for-buyers 的 fetch 客户端（EVM）：

```typescript
import { wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPayment("https://<真实付费端点>", { method: "GET" });

const httpClient = new x402HTTPClient(client);
const result = await httpClient.processResponse(response);
console.log("Response:", result.body);
if (result.paymentStatus === "settled") console.log("Settled:", result.header);
```

Concordium 注册（quickstart 原文）：

```typescript
import { ExactConcordiumScheme } from "@x402/concordium/exact/client";
import { buildBasicAccountSigner, AccountAddress } from "@concordium/web-sdk";

const concordiumSigner = {
  accountAddress: AccountAddress.fromBase58(process.env.CCD_ADDRESS!),
  signer: buildBasicAccountSigner(process.env.CCD_PRIVATE_KEY!),
};
client.register("ccd:*", new ExactConcordiumScheme(concordiumSigner));
```

"能直接跑"的两条路径：
- **本地配对**：repo `examples/typescript/clients/` 下同时跑 express server 示例（监听 `localhost:4021`）+ fetch client（示例默认打 `http://localhost:4021/weather`）。repo 示例用 pnpm v10 + Node 20+。
- **公网真实端点**：从 Bazaar discovery 拿真实付费服务（无需 key）：
  `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`，按 `accepts[].amount` 过滤后挑一个直接付。

## 3. 账号 / key / 测试币

| 项目 | 需要 | 来源 |
|---|---|---|
| EVM 侧 | `EVM_PRIVATE_KEY`（环境变量）+ 测试网 USDC | quickstart 仅说 "wallet with USDC"，未给 faucet 链接；Base Sepolia USDC 走 Coinbase 官方 faucet |
| EVM 可选 | `EVM_RPC_URL`（例 `https://sepolia.base.org`） | 启用 gas sponsoring 扩展（EIP-2612 / ERC-20 approval） |
| Concordium 侧 | `CCD_ADDRESS` + `CCD_PRIVATE_KEY`（basic account signer） | test CCD 从 Concordium testnet faucet 领（选赛卡已确认免费） |
| facilitator | 客户端 SDK 不需要 key；verify/settle 由 resource server 或 facilitator 完成 | 官方 EVM facilitator 走 Coinbase CDP；**Concordium 的 facilitator 支持情况文档未写 → 未确认** |

## 4. 官方已知限制 + 与 Brief 的冲突

**官方限制（文档原文）**：
- Spend controls：客户端默认只支付"recognized USD-pegged assets (e.g. USDC)"，单笔默认上限 **$1**（`maxAmountPerPayment` 可调，`allowedAssets` 可加自定义资产）
- 一笔请求只尝试一次支付（重试报 "Payment already attempted"）
- scheme 决定行为：`exact`（固定价）/ `upto`（按用量）/ `batch-settlement`（escrow 批量结算），示例中另有 `auth-capture`

**与 Brief 的冲突（按严重度）**：
1. **"授权在链上同交易内被消耗" vs x402 结算模型** —— x402 的 settle 是一笔独立资产转账（USDC transferWithAuthorization / CCD 转账），交易里没有调用我方授权合约的钩子。"同交易消耗"在 x402 流程内做不到。可行改法：两笔交易（先消耗授权合约，再 x402 支付），用 lifecycle hook `onBeforePaymentCreation` 串联；代价是两步之间可能失败 → 需要补偿/回滚设计。**直接动摇验收条件"授权同交易消耗"与未知项①的表述，需改 Brief 或改验收口径**。
2. **拓扑差异** —— Brief 是"agent ↔ 供应商 agent 经 MCP 双向通信"；x402 是"client → resource server 的 HTTP 付费"。好消息：官方有 MCP client 示例（`examples/typescript/clients/mcp`），MCP server 可作为收费资源。demo 里供应商侧应设计为"x402 收费的 MCP 资源服务"，而非对等对话 agent。Brief 第 3 步措辞需意识到这点。
3. **Concordium scheme 存在但细节缺位** —— `ccd:*` 注册方式官方有；但测试网 network 标识符写法、结算资产（CCD 原生 vs CIS-2/PLT）、facilitator 是否支持 Concordium settle 均未在 quickstart 出现。未知项②聚焦调整为：**装 `@x402/concordium` 跑通 `ccd:*` 测试网付费请求**。
4. **$1 默认单笔上限** —— demo 需调 `maxAmountPerPayment`；顺带注意默认只认 USD-pegged 资产，Concordium 网络上的"认可资产"是什么未确认。

## 5. 凭记忆 vs 当前文档不一致

| 项 | 旧记忆（约 2025，v1） | 当前文档（v2，2026-10） |
|---|---|---|
| 仓库归属 | coinbase/x402 | x402-foundation/x402（Linux Foundation 下的 x402 Foundation） |
| 包名 | 无 scope：`x402-axios`、`x402-express` | 全部 `@x402/*` scope；旧包仍在但属 v1 |
| HTTP header | `X-PAYMENT` / `X-PAYMENT-RESPONSE` | `PAYMENT-SIGNATURE` / `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` |
| 客户端 API | `wrapFetchWithPayment(fetch, walletClient, config)` 直收 viem walletClient | `x402Client` + `register(network, scheme)`，scheme 按链拆包 |
| 支持链 | Base 为主（EVM）+ 后加 Solana | 12+：EVM 全兼容、Solana、Stellar、Algorand、Aptos、Keeta、Hedera、**Concordium**、TON、NEAR、XRPL |
| spend controls | 无此概念 | 默认只认 USD-pegged 资产 + $1/笔上限 |
| facilitator | `https://x402.org/facilitator`（Coinbase 托管） | 架构上 facilitator 可替换（payai 等第三方）；官方 discovery 走 CDP |

**结论**：记忆里的 v1 知识全部过时，以本文档为准；对本项目最重要的新事实是 `@x402/concordium` 官方存在。
