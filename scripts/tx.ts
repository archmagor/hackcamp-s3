import 'dotenv/config'
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const rawKey = process.env.WALLET_PRIVATE_KEY ?? ''
const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
const account = privateKeyToAccount(privateKey)
const transport = http(process.env.RPC_URL)
const wallet = createWalletClient({ account, chain: baseSepolia, transport })
const reader = createPublicClient({ chain: baseSepolia, transport })

const hash = await wallet.sendTransaction({ to: account.address, value: parseEther('0.00001') })
console.log('tx:', `https://sepolia.basescan.org/tx/${hash}`)

const receipt = await reader.waitForTransactionReceipt({ hash })
console.log('status:', receipt.status, '| block:', receipt.blockNumber, '| gasUsed:', receipt.gasUsed)
