import 'dotenv/config'
import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseAbi, parseAbiItem } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const rawKey = process.env.WALLET_PRIVATE_KEY ?? ''
const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
const account = privateKeyToAccount(privateKey)
const transport = http(process.env.RPC_URL)
const wallet = createWalletClient({ account, chain: baseSepolia, transport })
const reader = createPublicClient({ chain: baseSepolia, transport })
const address = process.env.LEDGER_ADDRESS as `0x${string}`

const abi = parseAbi(['function record(bytes32 id, bytes32 dataHash, string note)'])
const recordedEvent = parseAbiItem(
  'event Recorded(address indexed actor, bytes32 indexed id, bytes32 dataHash, string note)'
)

// 1. 一份"业务内容"，比如 Agent 的一次决策
const payload = { task: 'task-001', decision: 'pay', amountUsd: 0.05, reason: 'price below budget' }
const content = JSON.stringify(payload)
const id = keccak256(toBytes(payload.task))
const dataHash = keccak256(toBytes(content))

// 2. 写入
const hash = await wallet.writeContract({ address, abi, functionName: 'record', args: [id, dataHash, 'hackcamp W1D4'] })
// 等 2 个确认：公共 RPC 背后是多个节点，刚出块时有的节点还没同步到这个块，马上查事件会报 "block range extends beyond current head block"
const receipt = await reader.waitForTransactionReceipt({ hash, confirmations: 2 })
console.log('record tx:', `https://sepolia.basescan.org/tx/${hash}`, receipt.status)

// 3. 读回（公共 RPC 对区块范围有限制，只查最近一小段）
const logs = await reader.getLogs({
  address,
  event: recordedEvent,
  args: { id },
  fromBlock: receipt.blockNumber - 5n,
  toBlock: receipt.blockNumber,
})
const onchainHash = logs.at(-1)?.args.dataHash
console.log('on-chain dataHash:', onchainHash)

// 4. 篡改实验：内容改一个字，哈希就对不上了
const tampered = JSON.stringify({ ...payload, amountUsd: 5 })
console.log('original matches:', keccak256(toBytes(content)) === onchainHash)
console.log('tampered matches:', keccak256(toBytes(tampered)) === onchainHash)
