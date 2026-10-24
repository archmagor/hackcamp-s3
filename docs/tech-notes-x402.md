# tech notes：x402（OddsGate 结算调研）

> 信息来源与时效：`x402.org`、`github.com/coinbase/x402`（README）、`docs.x402.org/getting-started/quickstart-for-buyers`、repo 示例 `examples/typescript/clients/fetch`、npm registry 实查 —— 全部抓取于 2026-10-15。**仓库已迁移：coinbase/x402 → [x402-foundation/x402](https://github.com/x402-foundation/x402)**（x402 Foundation，Linux Foundation 运营）；coinbase 仓库现为 development fork。**更新（2026-10-20）**：以下 §3 / §4 多处原标"未确认"项，已由 hackcamp-ccd/HACKATHON.md §9.1.1（从 npm 包源码扒出 + 真实 testnet 交易）核实，见各条标注。

## 1. 版本与安装（以 npm 实查为准，2026-10-15）

| 包 | 版本 | 说明 |
|---|---|---|
| `@x402/core` | 2.28.0 | 协议核心（x402Client 等） |
| `@x402/evm` | 2.28.0 | EVM 机制（exact / upto / auth-capture） |
| `@x402/fetch` | 2.28.0 | fetch 包装客户端 |
| `@x402/express` | 2.28.0 | 服务端中间件 |
| `@x402/concordium` | 2.28.0（2026-09-29，HACKATHON.md §9.1.1 核实） | **官方 Concordium scheme**；依赖 `@concordium/web-sdk ^12`；导出 client / server / **facilitator** 三件套 |
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
| facilitator | 客户端 SDK 不需要 key；verify/settle 由 facilitator 完成 | 官方 EVM facilitator 走 Coinbase CDP；**Concordium 无公共 facilitator → 必须自建**（`@x402/concordium` 导出 `./exact/facilitator`；sponsor 私钥走 `CCD_FACILITATOR_ADDRESS`/`CCD_FACILITATOR_PRIVATE_KEY`，hex Ed25519）。已核实（HACKATHON.md §9.1.1） |

## 4. 官方已知限制 + 与 Brief 的冲突

**官方限制（文档原文）**：
- Spend controls：客户端默认只支付"recognized USD-pegged assets (e.g. USDC)"，单笔默认上限 **$1**（`maxAmountPerPayment` 可调，`allowedAssets` 可加自定义资产）
- 一笔请求只尝试一次支付（重试报 "Payment already attempted"）
- scheme 决定行为：`exact`（固定价）/ `upto`（按用量）/ `batch-settlement`（escrow 批量结算），示例中另有 `auth-capture`

**与 Brief 的冲突（按严重度）**：
1. **x402 settle 是独立资产转账，交易内无调用业务合约的钩子** —— settle 只是一笔资产转移（CCD `transfer` / PLT `tokenUpdate`），没法在同一笔里"消耗授权"或调我方合约。**对 OddsGate 的影响已消解**：OddsGate 不依赖"同交易消耗"，改用委托证明（审计记录）+ 四门校验（问责 / 属性复验 / 额度 / 链上独立复核）在 HTTP 层做准入，settle 仅负责结算。（旧 VetGate 的"授权同交易消耗"模型才与此冲突，已弃用。事实来源：HACKATHON.md §9.1.1）
2. **拓扑：OddsGate 天然贴合 x402** —— OddsGate 是 client agent → server agent 的 HTTP 按次付费（询价 402 → 携 `X-PAYMENT` 重试 → 交付），正是 x402 的原生模型，无拓扑冲突。MCP 在 OddsGate 里只用于门①问责（经托管 MCP 只读查 Agent Registry 注册 / 状态 / 绑定），不是付费通道。（旧 VetGate 的"agent↔供应商 MCP 双向通信"才需把供应商设计成 x402 收费 MCP 资源，已不适用）
3. **Concordium scheme 细节（已核实，HACKATHON.md §9.1.1）** —— 现行 **V2 形态**：client 只部分签名（不上链、不付 gas），facilitator 补 sponsor 签名并广播（取代旧 `{txHash, sender}` V1 形态）。CAIP-2：testnet `ccd:4221332d34e1694168c2a0c0b3fd0f27`、mainnet `ccd:9dd9ca4d19e9393877d2c44b70f89acb`、wildcard `ccd:*`。结算资产：CCD 走 `transfer`（不带 memo）、PLT 走 `tokenUpdate`，**decimals 一律链上 `getTokenInfo` 取、不信任服务端**（防恶意低报）。EUDemo（PLT，decimals 6）已实测走通（tx `2b040e71…`）。
4. **$1 默认单笔上限** —— demo 需调 `maxAmountPerPayment`；默认只认 USD-pegged 资产。Concordium 侧结算资产已核实为 **EUDemo（PLT，decimals 6、allow_list=true）**，另有 CCD 原生（`CCD_DECIMALS=6`）；USDR 仍无余额。（HACKATHON.md §9.3）

## 5. 凭记忆 vs 当前文档不一致

| 项 | 旧记忆（约 2025，v1） | 当前文档（v2，2026-10） |
|---|---|---|
| 仓库归属 | coinbase/x402 | x402-foundation/x402（Linux Foundation 下的 x402 Foundation） |
| 包名 | 无 scope：`x402-axios`、`x402-express` | 全部 `@x402/*` scope；旧包仍在但属 v1 |
| HTTP header | `X-PAYMENT` / `X-PAYMENT-RESPONSE` | ⚠️ **两份调研冲突**：本行原记为 `PAYMENT-SIGNATURE`/`PAYMENT-REQUIRED`/`PAYMENT-RESPONSE`（10-15 抓 quickstart）；但 HACKATHON.md §9.1.1（10-20，扒 npm 包源码）+ idea-oddsgate（真实 testnet 交易）均用 **`X-PAYMENT`（标准 base64 JSON）/ `X-PAYMENT-RESPONSE`**。**以 `X-PAYMENT` 为准**（Concordium exact scheme），旧记法待复核 |
| 客户端 API | `wrapFetchWithPayment(fetch, walletClient, config)` 直收 viem walletClient | `x402Client` + `register(network, scheme)`，scheme 按链拆包 |
| 支持链 | Base 为主（EVM）+ 后加 Solana | 12+：EVM 全兼容、Solana、Stellar、Algorand、Aptos、Keeta、Hedera、**Concordium**、TON、NEAR、XRPL |
| spend controls | 无此概念 | 默认只认 USD-pegged 资产 + $1/笔上限 |
| facilitator | `https://x402.org/facilitator`（Coinbase 托管） | 架构上 facilitator 可替换（payai 等第三方）；官方 discovery 走 CDP |

**结论**：记忆里的 v1 知识全部过时，以本文档为准；对本项目最重要的新事实是 `@x402/concordium` 官方存在。
