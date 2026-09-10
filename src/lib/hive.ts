// Read-only client for the public Hive blockchain API.
// No keys, no writes — only public account data.

const NODES = [
  "https://api.hive.blog",
  "https://api.deathwing.me",
  "https://anyx.io",
  "https://api.openhive.network",
];

let nodeIndex = 0;

async function rpc<T>(method: string, params: unknown): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < NODES.length; attempt++) {
    const node = NODES[(nodeIndex + attempt) % NODES.length]!;
    try {
      const res = await fetch(node, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) throw new Error(`${node} responded ${res.status}`);
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (json.error) throw new Error(json.error.message ?? "Hive API error");
      if (json.result === undefined) throw new Error("Empty Hive API response");
      nodeIndex = (nodeIndex + attempt) % NODES.length;
      return json.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Hive API unreachable");
}

const FIVE_DAYS_SECONDS = 5 * 24 * 60 * 60;

type Manabar = { current_mana: string | number; last_update_time: number };

/** Percent of a mana bar, regenerated to "now" (0-100). */
function manabarPercent(bar: Manabar, maxMana: number, nowSeconds: number) {
  if (!maxMana || maxMana <= 0) return 0;
  const elapsed = Math.max(0, nowSeconds - bar.last_update_time);
  const regenerated = (maxMana * elapsed) / FIVE_DAYS_SECONDS;
  const current = Math.min(maxMana, Number(bar.current_mana) + regenerated);
  return Math.max(0, Math.min(100, (current / maxMana) * 100));
}

/** Hours until a mana bar reaches 100%, or 0 when already full. */
function hoursToFull(percent: number) {
  if (percent >= 99.995) return 0;
  return ((100 - percent) / 100) * 120;
}

function amount(asset: string | { amount: string; precision: number } | undefined) {
  if (!asset) return 0;
  if (typeof asset === "string") return parseFloat(asset) || 0;
  return (parseInt(asset.amount, 10) || 0) / 10 ** asset.precision;
}

export type AccountSnapshot = {
  name: string;
  votingPower: number;
  votingFullInHours: number;
  rcPercent: number;
  rcFullInHours: number;
  hive: number;
  hiveSavings: number;
  hbd: number;
  hbdSavings: number;
  hivePower: number;
  rewardHive: number;
  rewardHbd: number;
  rewardHp: number;
  usd: number;
};

export type PortfolioSnapshot = {
  accounts: AccountSnapshot[];
  missing: string[];
  hiveUsd: number;
  hbdUsd: number;
  totals: {
    hive: number;
    hbd: number;
    hivePower: number;
    hiveSavings: number;
    hbdSavings: number;
    usd: number;
  };
  fetchedAt: number;
};

type RawAccount = {
  name: string;
  balance: string;
  savings_balance: string;
  hbd_balance: string;
  savings_hbd_balance: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  vesting_withdraw_rate: string;
  reward_hive_balance?: string;
  reward_hbd_balance?: string;
  reward_vesting_hive?: string;
  voting_manabar: Manabar;
};

async function getHiveUsd(): Promise<{ hiveUsd: number; hbdUsd: number }> {
  try {
    const price = await rpc<{ base: string; quote: string }>(
      "condenser_api.get_current_median_history_price",
      [],
    );
    const base = amount(price.base); // HBD
    const quote = amount(price.quote); // HIVE
    if (quote > 0 && base > 0) return { hiveUsd: base / quote, hbdUsd: 1 };
  } catch {
    /* fall through to CoinGecko */
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd",
    );
    const json = (await res.json()) as Record<string, { usd: number }>;
    return {
      hiveUsd: json["hive"]?.usd ?? 0,
      hbdUsd: json["hive_dollar"]?.usd ?? 1,
    };
  } catch {
    return { hiveUsd: 0, hbdUsd: 1 };
  }
}

export async function accountExists(name: string) {
  const accounts = await rpc<RawAccount[]>("condenser_api.get_accounts", [[name]]);
  return accounts.length > 0;
}

export async function fetchPortfolio(names: string[]): Promise<PortfolioSnapshot> {
  const now = Math.floor(Date.now() / 1000);
  if (names.length === 0) {
    const { hiveUsd, hbdUsd } = await getHiveUsd();
    return {
      accounts: [],
      missing: [],
      hiveUsd,
      hbdUsd,
      totals: { hive: 0, hbd: 0, hivePower: 0, hiveSavings: 0, hbdSavings: 0, usd: 0 },
      fetchedAt: Date.now(),
    };
  }

  const [raw, props, rc, prices] = await Promise.all([
    rpc<RawAccount[]>("condenser_api.get_accounts", [names]),
    rpc<{ total_vesting_fund_hive: string; total_vesting_shares: string }>(
      "condenser_api.get_dynamic_global_properties",
      [],
    ),
    rpc<{
      rc_accounts: { account: string; max_rc: string; rc_manabar: Manabar }[];
    }>("rc_api.find_rc_accounts", { accounts: names }).catch(() => ({ rc_accounts: [] })),
    getHiveUsd(),
  ]);

  const fund = amount(props.total_vesting_fund_hive);
  const shares = amount(props.total_vesting_shares);
  const vestsToHp = (v: number) => (shares > 0 ? (v * fund) / shares : 0);

  const rcByName = new Map(rc.rc_accounts.map((r) => [r.account, r]));
  const byName = new Map(raw.map((a) => [a.name, a]));

  const accounts: AccountSnapshot[] = [];
  const missing: string[] = [];

  for (const name of names) {
    const a = byName.get(name);
    if (!a) {
      missing.push(name);
      continue;
    }
    const own = amount(a.vesting_shares);
    const delegated = amount(a.delegated_vesting_shares);
    const received = amount(a.received_vesting_shares);
    const effectiveVests = own - delegated + received;

    const votingPower = manabarPercent(a.voting_manabar, own * 1e6, now);

    const rcEntry = rcByName.get(name);
    const rcPercent = rcEntry
      ? manabarPercent(rcEntry.rc_manabar, Number(rcEntry.max_rc), now)
      : 0;

    const hive = amount(a.balance);
    const hiveSavings = amount(a.savings_balance);
    const hbd = amount(a.hbd_balance);
    const hbdSavings = amount(a.savings_hbd_balance);
    const hivePower = vestsToHp(effectiveVests);
    const rewardHive = amount(a.reward_hive_balance);
    const rewardHbd = amount(a.reward_hbd_balance);
    const rewardHp = amount(a.reward_vesting_hive);

    const usd =
      (hive + hiveSavings + hivePower + rewardHive + rewardHp) * prices.hiveUsd +
      (hbd + hbdSavings + rewardHbd) * prices.hbdUsd;

    accounts.push({
      name,
      votingPower,
      votingFullInHours: hoursToFull(votingPower),
      rcPercent,
      rcFullInHours: hoursToFull(rcPercent),
      hive,
      hiveSavings,
      hbd,
      hbdSavings,
      hivePower,
      rewardHive,
      rewardHbd,
      rewardHp,
      usd,
    });
  }

  const totals = accounts.reduce(
    (acc, a) => ({
      // Totals include savings so the headline matches the USD value.
      hive: acc.hive + a.hive + a.hiveSavings,
      hbd: acc.hbd + a.hbd + a.hbdSavings,
      hivePower: acc.hivePower + a.hivePower,
      hiveSavings: acc.hiveSavings + a.hiveSavings,
      hbdSavings: acc.hbdSavings + a.hbdSavings,
      usd: acc.usd + a.usd,
    }),
    { hive: 0, hbd: 0, hivePower: 0, hiveSavings: 0, hbdSavings: 0, usd: 0 },
  );

  return {
    accounts,
    missing,
    hiveUsd: prices.hiveUsd,
    hbdUsd: prices.hbdUsd,
    totals,
    fetchedAt: Date.now(),
  };
}

export function formatNumber(value: number, decimals = 3) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

export function formatDuration(hours: number) {
  if (hours <= 0) return "full";
  if (hours < 1) return `full in ${Math.round(hours * 60)}m`;
  if (hours < 24) return `full in ${Math.round(hours)}h`;
  return `full in ${Math.round(hours / 24)}d`;
}
