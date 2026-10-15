import 'dotenv/config'
import { readFileSync } from 'node:fs'
import solc from 'solc'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const rawKey = process.env.WALLET_PRIVATE_KEY ?? ''
const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
const account = privateKeyToAccount(privateKey)
const transport = http(process.env.RPC_URL)
const wallet = createWalletClient({ account, chain: baseSepolia, transport })
const reader = createPublicClient({ chain: baseSepolia, transport })

const source = readFileSync(new URL('../contracts/Ledger.sol', import.meta.url), 'utf8')

const input = {
  language: 'Solidity',
  sources: { 'Ledger.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = (output.errors ?? []).filter((e: { severity: string }) => e.severity === 'error')
if (errors.length > 0) {
  console.error(errors.map((e: { formattedMessage: string }) => e.formattedMessage).join('\n'))
  process.exit(1)
}

const { abi, evm } = output.contracts['Ledger.sol']['Ledger']
const bytecode = `0x${evm.bytecode.object}` as `0x${string}`

const hash = await wallet.deployContract({ abi, bytecode })
console.log('deploy tx:', `https://sepolia.basescan.org/tx/${hash}`)

const receipt = await reader.waitForTransactionReceipt({ hash })
console.log('contract:', `https://sepolia.basescan.org/address/${receipt.contractAddress}`)
console.log('status:', receipt.status, '| block:', receipt.blockNumber, '| gasUsed:', receipt.gasUsed)
