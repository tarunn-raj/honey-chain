import { polygonAmoy } from "viem/chains";
import { createPublicClient, createWalletClient, http, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const anchorAbi = [
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "batchCode", type: "string" },
      { name: "root", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

function getConfig() {
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const contractAddress = process.env.HONEY_CHAIN_ANCHOR_CONTRACT_ADDRESS;
  if (!privateKey || !contractAddress) return null;

  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedKey)) throw new Error("POLYGON_PRIVATE_KEY must be a 32-byte hex key.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) throw new Error("HONEY_CHAIN_ANCHOR_CONTRACT_ADDRESS must be a valid address.");

  return {
    account: privateKeyToAccount(normalizedKey as `0x${string}`),
    contractAddress: contractAddress as `0x${string}`,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology",
  };
}

export function isPolygonAnchoringAvailable() {
  return Boolean(process.env.POLYGON_PRIVATE_KEY && process.env.HONEY_CHAIN_ANCHOR_CONTRACT_ADDRESS);
}

export async function anchorBatchOnPolygon(batchCode: string, merkleRoot: string): Promise<Hash> {
  const config = getConfig();
  if (!config) throw new Error("Polygon anchoring is not configured.");
  if (!/^0x[0-9a-fA-F]{64}$/.test(merkleRoot)) throw new Error("Merkle root must be a 32-byte hex value.");

  const transport = http(config.rpcUrl);
  const walletClient = createWalletClient({ account: config.account, chain: polygonAmoy, transport });
  const publicClient = createPublicClient({ chain: polygonAmoy, transport });
  const hash = await walletClient.writeContract({
    address: config.contractAddress,
    abi: anchorAbi,
    functionName: "anchor",
    args: [batchCode, merkleRoot as `0x${string}`],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
