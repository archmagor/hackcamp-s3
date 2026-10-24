# Brief：OddsGate

## 定位
为跑自主 client agent 参与受监管消费（首垂直：欧洲足球博彩数据）的用户，改善 agent 无人监督购买时的合规准入与授权问责风险：卖方不接触 PII 即可核验买方"已成年 + 持牌辖区居民"，agent 每笔购买密码学绑定到人类的一次首次授权，付款走 sponsored（买方不持 CCD、只付标价），成交与授权全链上可独立审计、可随时撤销；
相较现有 agent 支付方案（只做付钱通道、合规靠后端 policy 或人工 KYC、卖方要么接触 PII 要么留合规缺口），关键差异是"零知识身份门禁 + 委托证明第三方复验 + sponsored 结算 + agent 问责"四者组合，由链上锚定（VRA/VAA）与 Agent Registry 强制；本次用 testnet 完整跑通"首次授权 → 自主购买四门校验 → x402 sponsored 结算 → 独立复核留痕"，并给出至少一条门校验失败被拒（无链上动作、无资金变动）的负向用例。

## 目标赛事
- 主赛 / 赛道：Concordium Trusted Agents Hackathon（不设赛道、无 bounty）。
- 截止（北京时间）：2026-12-10（周四）07:59；Checkpoint 1 = 2026-11-23（周一）07:59；开赛 11-02、build window 11-19 开启、评审 12-10~12-11。
- 硬条件：跑在 Concordium testnet；提交项目说明 + public 仓库 + demo 视频 ≤3 分钟 + CCDExplorer 链接 + path to production；可带现有 agent，单人 / 团队均可、免费。
- 必需集成：≥1 个 Concordium 组件（Concordium ID / Verify and Access、Agent Registry badge、x402、PLT、sponsored tx、MCP server）；OddsGate 目标覆盖六项，**已实测命中 4 项**（x402 + sponsored + PLT/EUDemo + Agent Registry #974，另用托管 MCP 只读核实），Verify and Access 待钱包 E2E。SDK：Concordium 侧 concordium-node-sdk-js / @concordium/web-sdk；x402 官方包 @x402/concordium@2.28.0（scheme ccd:*，含 client/server/facilitator）——**无公共 Concordium facilitator，需自建 / 自托管**（官方 TS 或自建 Rust，W1 选型验证）。

## 约束
- 时间：每天 __ 小时，共 3 周
- 我熟悉的：
- 我不熟悉、需要验证的：Verify and Access 委托证明的第三方复验语义、钱包出组合证明 + ContextString 绑 agent 的 UX、凭证吊销后的复验行为
- 预算（模型 / 服务 / gas）：testnet CCD（faucet 免费）；VRA/VAA 两笔由 server（verifier 钥）自付；结算手续费由 sponsor 代付

## 一条核心流程（用户视角，5 步以内）
1. 真人首次授权（只一次）：连接 Concordium 钱包出组合 ZKP（age≥18 + 持牌辖区 + ContextString 绑 client agent token id），拿到审计记录（委托证明），VRA/VAA 上链；开零钱账户充 EUDemo、Registry 登记为 agentWallet；此后真人退出
2. agent 无凭据询价 → server 回 `402 PaymentRequired`（价格 + 身份 / 结算条款）
3. agent 用零钱账户钥签 sender 半签，携 `X-PAYMENT` + `X-IDENTITY-PROOF` 重试同一请求
4. server 过四门（①问责 ②属性复验 ③额度 ④链上独立复核），facilitator 补 sponsor 签、广播、代付 CCD 手续费
5. agent 收到数据产品 + 结算凭据；成交写入 `/sales` 审计账本，CCDExplorer 上可独立查证

## 链上做什么、为什么必须在链上
- 链上动作：① 结算（核心）—— x402 V2 sponsored，EUDemo PLT 从 agentWallet 转商户，sponsor 代付 CCD 手续费，即时模式按笔上链；② 身份锚定 —— VRA（验证请求摘要上链，防事后伪造请求）+ VAA（审计摘要上链，留公开可核存证）；③ 问责 —— Agent Registry CIS-8004 / CIS-8 记录 agent 注册、状态（active/suspended/revoked）、跨链密钥绑定与 badge。不在链上：赔率数据（静态 fixture）、四门判定逻辑（server 侧，但门①查链上 agent 状态、门②回链复验审计记录）、`/sales` 账本（链下，引用链上 tx hash）；dob / 居住国原值永不出钱包。
- 为什么必须在链上：结算涉及买方 agent / 卖方 / sponsor 三方互不信任，资金转移须中立强制，且 sponsored 让买方无需持 CCD；委托证明的可信度依赖 VRA/VAA 先上链存证（纯链下验证记录可被单方篡改）；agent 撤销要跨 server 生效，必须靠全局中立的 Registry 状态。若身份锚定与问责退回后端，"不接触 PII 的可复验合规门禁"差异化不成立（见未知项①）。

## 本次做 / 延后 / 不承诺
- 做：三 SKU 商品目录（odds-snapshot / team-status / match-probability，统一 0.1 EUDemo）+ 静态赔率源（demo 标注模拟）；四门校验骨架；首次授权页（钱包出组合证明 + VRA/VAA 锚定）；betting-agent（client 侧三级预算 + 域名白名单 + JSONL 消费记账）；x402 V2 sponsored EUDemo 结算 + merchant 独立复核 + 防重放；卖方 Registry 注册 + badge；负向矩阵（门①②③拒绝，无链上动作、无资金变动）
- 延后（P2）：挂账结算 tab / flush（IOU 记账、批量上链、memo = tab 清单哈希）；买方 Registry 注册演示；撤销路径端到端演示
- 不承诺：主网部署；对真实世界博彩合规效力的声明（testnet 数据 + 测试身份属性，不构成真实合规结论）；PLT 批量操作（单笔多转）、浏览器钱包付款、PLL

## 最大的未知项（按风险排序）
1. 委托证明的第三方复验语义 —— server 能否凭 client 每笔携带的审计记录（request + presentation + VRA/VAA tx hash）复验其有效性，Verify and Access 是否支持"已存审计记录被第三方复验"而非仅一次性在线验证；若不支持，门②退化为后端签名 + nonce，差异化消失
2. 钱包出组合证明 + ContextString 绑定 agent token id 的 UX 是否可用 —— 钱包无"只签不广播"API，付款签名者为 client agent，身份签名者为钱包，二者边界须成立
3. 账户凭证吊销后，已锚定审计记录的事后复验是否回链查吊销状态 —— 撤销语义（P1 用真钱包 + 真吊销实测）；兜底 = 新鲜度窗口 30 天 + 换钥 + Registry 状态

## 验收条件
- 成功：一条命令在 testnet 跑通核心流程 5 步 —— 首次授权出组合证明（VRA/VAA 上链）→ 自主购买过四门 → x402 sponsored EUDemo 结算（sponsor 代付 CCD）→ merchant 独立复核 → CCDExplorer 上可独立查证；另有至少一条门校验失败被拒（门①②③任一不过 → 402 + reason，无链上动作、无资金变动）；提交物齐（public 仓库、demo ≤3 分钟、CCDExplorer 链接、项目说明）
- 失败时应有的行为：agent 未注册 / 被吊销 → 门①拒（`agent_not_registered` / `agent_inactive`）；委托证明复验不过 / 绑定不符 / 过期 → 门②拒（`identity_verification_failed` / `identity_binding_mismatch` / `identity_proof_stale`）；sender ≠ agentWallet → 门③拒（`payer_not_agent_wallet`）；链上独立复核不符 → `on_chain_audit_failed`，不交付；verifier 钥缺失 → fail-closed 拒售；数据源不可达 → 明确报错或标注 "demo data"，不用 mock 冒充真实结果
