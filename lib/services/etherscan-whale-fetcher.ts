import { RawArticle } from "@/types/article";
import { getSnapshot, upsertSnapshot } from "./crypto-snapshot-store";

// Known whale / exchange wallets (MVP list)
const WHALE_ADDRESSES = [
  {
    address: "0x00000000219ab540356cbb839cbe05303d7705fa",
    label: "ETH2 Deposit",
  },
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    label: "WETH Contract",
  },
  {
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    label: "Binance Hot Wallet",
  },
];

// Threshold: >100 ETH (in wei)
const MIN_ETH_WEI = BigInt("100000000000000000000"); // 100 * 10^18

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // wei as string
  timeStamp: string; // unix seconds as string
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTx[] | string;
}

async function fetchAddressTxs(
  address: string,
  apiKey: string
): Promise<EtherscanTx[]> {
  // Etherscan V2 API (V1 deprecated — H1 fix)
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist` +
    `&address=${address}&startblock=0&endblock=99999999` +
    `&page=1&offset=10&sort=desc&apikey=${apiKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) return [];

  const data: EtherscanResponse = await res.json();
  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  return data.result;
}

export async function fetchEtherscanWhaleTransfers(): Promise<RawArticle[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return [];

  const results: RawArticle[] = [];

  for (const whale of WHALE_ADDRESSES) {
    try {
      const txs = await fetchAddressTxs(whale.address, apiKey);

      // Get last-seen timestamp snapshot for dedup
      const snapshot = await getSnapshot("etherscan", whale.address);
      const lastSeen = snapshot?.value ?? 0;

      // Filter: value > 100 ETH AND newer than last seen (skip NaN timestamps — EC2 fix)
      const largeTxs = txs.filter((tx) => {
        let valueWei: bigint;
        try {
          valueWei = BigInt(tx.value);
        } catch {
          return false;
        }
        const ts = parseInt(tx.timeStamp, 10);
        if (!Number.isFinite(ts)) return false;
        return valueWei >= MIN_ETH_WEI && ts > lastSeen;
      });

      for (const tx of largeTxs) {
        const ethValue = Number(BigInt(tx.value) / BigInt("1000000000000000"))
          / 1000; // wei → ETH with 3 decimals
        results.push({
          url: `https://etherscan.io/tx/${tx.hash}`,
          title: `Whale Transfer: ${ethValue.toLocaleString()} ETH — ${whale.label}`,
          summary: `From ${tx.from.slice(0, 10)}... to ${tx.to.slice(0, 10)}...`,
          publishedAt: new Date(parseInt(tx.timeStamp, 10) * 1000),
          source: "Etherscan",
        });
      }

      // Update snapshot with newest timestamp from this batch (skip NaN — EC2 fix)
      if (txs.length > 0) {
        const validTs = txs
          .map((t) => parseInt(t.timeStamp, 10))
          .filter((n) => Number.isFinite(n));
        if (validTs.length > 0) {
          const maxTs = Math.max(...validTs);
          await upsertSnapshot("etherscan", whale.address, maxTs, {
            label: whale.label,
          });
        }
      }

      // Courtesy delay between calls (200ms)
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.warn(`Etherscan fetch failed for ${whale.label}:`, err);
    }
  }

  return results;
}
