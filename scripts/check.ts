#!/usr/bin/env tsx
/**
 * Base Sepolia 链上检查脚本 (Node + TypeScript + viem)
 *
 * 功能:
 *   1. 连接 Base Sepolia 测试网 (RPC: https://sepolia.base.org)
 *   2. 打印当前最新区块号
 *   3. 读取指定地址的 ETH 余额, 并用 formatEther 转成可读数字
 *   4. 所有网络调用都带超时 + try/catch, 失败时打印可读的错误原因
 *
 * 地址来源优先级: 命令行参数 > 环境变量 WALLET_ADDRESS > 脚本内 DEFAULT_ADDRESS
 *
 * 用法:
 *   npm run check                                     # 使用默认地址 / 环境变量
 *   npm run check -- 0xYourAddress                    # 命令行传入地址
 *   WALLET_ADDRESS=0xYourAddress npm run check        # 环境变量传入地址
 */
import { createPublicClient, http, formatEther, isAddress } from 'viem'
import { baseSepolia } from 'viem/chains'

const RPC_URL = 'https://sepolia.base.org'
const REQUEST_TIMEOUT_MS = 15_000 // 单次网络请求超时

// 你的测试钱包地址；也可用命令行参数或环境变量 WALLET_ADDRESS 覆盖。
const DEFAULT_ADDRESS = '0x95C3f87322134E5Ae73152e0c2cc338975C0dA17'

/** 解析要查询的地址 */
function resolveAddress(): string {
  const fromArg = process.argv[2]
  const fromEnv = process.env.WALLET_ADDRESS
  const raw = fromArg ?? fromEnv ?? DEFAULT_ADDRESS
  return raw.trim()
}

/** 把未知异常转成人类可读的错误原因 */
function humanError(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { shortMessage?: string; details?: string }
    return e.shortMessage ?? e.details ?? e.message
  }
  return String(err)
}

async function main(): Promise<void> {
  const address = resolveAddress()

  console.log('='.repeat(58))
  console.log(' Base Sepolia 链上检查')
  console.log('='.repeat(58))
  console.log(`网络     : ${baseSepolia.name} (chainId=${baseSepolia.id})`)
  console.log(`RPC      : ${RPC_URL}`)
  console.log(`超时     : ${REQUEST_TIMEOUT_MS} ms`)
  console.log(`查询地址 : ${address}`)
  console.log('-'.repeat(58))

  // 地址合法性校验，避免无意义的网络请求
  if (!isAddress(address)) {
    console.error(`❌ 无效的地址: ${address}`)
    console.error('   请通过命令行参数、环境变量 WALLET_ADDRESS，或修改脚本内 DEFAULT_ADDRESS 提供合法地址。')
    process.exitCode = 1
    return
  }

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL, { timeout: REQUEST_TIMEOUT_MS, retryCount: 2 }),
  })

  let allOk = true

  // 1) 最新区块号
  try {
    const blockNumber = await client.getBlockNumber()
    console.log(`✅ 最新区块号 : ${blockNumber}`)
  } catch (err) {
    allOk = false
    console.error(`❌ 获取区块号失败: ${humanError(err)}`)
  }

  // 2) ETH 余额
  try {
    const balanceWei = await client.getBalance({ address })
    console.log(`✅ ETH 余额   : ${formatEther(balanceWei)} ETH`)
  } catch (err) {
    allOk = false
    console.error(`❌ 获取余额失败: ${humanError(err)}`)
  }

  console.log('='.repeat(58))
  if (allOk) {
    console.log('全部完成 ✅')
  } else {
    console.log('已完成，但存在错误 ❌')
    process.exitCode = 1
  }
}

main().catch((err) => {
  // 兜底：捕获 main() 之外的意外异常
  console.error(`❌ 未预期的错误: ${humanError(err)}`)
  process.exitCode = 1
})
