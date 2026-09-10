# Hive Portfolio Widget

A single-screen, phone-first app you add to your home screen. Tap the icon and see every Hive account you track, plus one combined total.

## What you get

**Top: global totals card**
- Total Hive Power, HIVE and HBD across all tracked accounts
- Combined USD value, using live HIVE and HBD prices
- Last refreshed time, with pull-to-refresh and a refresh button

**Below: one compact card per account**
- Account name and avatar
- Voting Power and Resource Credits as percentages, each with a slim bar; RC shows a "full in Xh" estimate when below 100%
- HIVE, Hive Power, HBD balances
- HBD savings and HIVE savings
- Unclaimed rewards (HIVE / HP / HBD), highlighted when there is something to claim
- USD value of that account

**Managing accounts**
- "Add account" field that checks the name exists on Hive before saving
- Reorder by drag, remove with a swipe or a delete button
- The list is saved on the device only — no login, nothing sent anywhere

**Home-screen install**
- App icon, name, splash colors and full-screen mode so it opens without a browser bar
- Prompt on first visit explaining how to add it to the home screen (iOS Share > Add to Home Screen; Android install banner)
- Last loaded data is shown instantly while fresh numbers load, so it works offline as a snapshot

## Look

Dark, dense, glanceable — think a trading terminal widget rather than a marketing page. Numbers are the hero: large tabular figures, muted labels, a single accent color for HIVE and a second for HBD, red/amber only when something needs attention (low RC, unclaimed rewards). No sign-up screen, no navigation bar; one scrolling column.

## Technical notes

- Data comes straight from the public Hive API (`api.hive.blog`, with fallback nodes) from the browser — no backend, no keys, read-only, never asks for a Hive key.
- `condenser_api.get_accounts` for balances, vesting shares, voting mana; `rc_api.find_rc_accounts` for Resource Credits; `condenser_api.get_dynamic_global_properties` to convert VESTS to Hive Power.
- Voting Power and RC computed from the mana bars with the 5-day regeneration formula, capped at 100%.
- Prices: `condenser_api.get_current_median_history_price` for HIVE/HBD USD, with CoinGecko as fallback.
- Accounts list and last snapshot persisted in device storage; loaded in `useEffect` so it stays SSR-safe.
- Fetching via TanStack Query with a 60s refetch and cached snapshot as placeholder data.
- Built as one route (`/`) with a web app manifest and icons for home-screen install.
