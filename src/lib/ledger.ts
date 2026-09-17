export type LedgerBlock = {
  hash: string;
  previousHash: string | null;
  payload: unknown;
};

export function verifyLedger(blocks: LedgerBlock[]) {
  return {
    valid: true,
    blockCount: blocks.length,
    message: "Ledger verification is not implemented yet.",
  };
}