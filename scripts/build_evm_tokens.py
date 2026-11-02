#!/usr/bin/env python3
"""Build wallets/evm.json: chain list (public keyless RPCs, CORS-checked) + per-chain token list for the
watch-only wallet page. The browser reads balances with ONE Multicall3 call per chain per address
(getEthBalance + balanceOf for every listed token) and prices them with coins.llama.fi.
Token list = top ~1500 CoinGecko coins (by market cap) mapped to each chain + Aave v3 aTokens / variable debt
tokens (bgd-labs aave-address-book) + LSTs/LRTs + Pendle/Morpho tokens that appear in the CoinGecko set.
Decimals come from DefiLlama coins (tokens DefiLlama cannot price are dropped, they would show $0 anyway).
Re-run weekly or when adding a chain: python3 scripts/build_evm_tokens.py"""
import json, os, re, time, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def get(u, tries=4):
    for i in range(tries):
        try:
            r = urllib.request.Request(u, headers={'User-Agent': 'kms-capital/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(r, timeout=60) as f: b = f.read()
            return json.loads(b) if b[:1] in b'[{' else b.decode()
        except Exception as e:
            print('retry', u[:90], e); time.sleep(6 * (i + 1))
# key, chainId, name, rpc, llama chain, coingecko platform, native symbol, native coingecko id
CHAINS = [
 ('ethereum', 1, 'Ethereum', 'https://ethereum-rpc.publicnode.com', 'ethereum', 'ethereum', 'ETH', 'ethereum'),
 ('base', 8453, 'Base', 'https://base-rpc.publicnode.com', 'base', 'base', 'ETH', 'ethereum'),
 ('arbitrum', 42161, 'Arbitrum', 'https://arbitrum-one-rpc.publicnode.com', 'arbitrum', 'arbitrum-one', 'ETH', 'ethereum'),
 ('optimism', 10, 'Optimism', 'https://optimism-rpc.publicnode.com', 'optimism', 'optimistic-ethereum', 'ETH', 'ethereum'),
 ('bsc', 56, 'BNB Chain', 'https://bsc-rpc.publicnode.com', 'bsc', 'binance-smart-chain', 'BNB', 'binancecoin'),
 ('polygon', 137, 'Polygon', 'https://polygon-bor-rpc.publicnode.com', 'polygon', 'polygon-pos', 'POL', 'polygon-ecosystem-token'),
 ('avalanche', 43114, 'Avalanche', 'https://avalanche-c-chain-rpc.publicnode.com', 'avax', 'avalanche', 'AVAX', 'avalanche-2'),
 ('hyperevm', 999, 'HyperEVM', 'https://rpc.hyperliquid.xyz/evm', 'hyperliquid', 'hyperevm', 'HYPE', 'hyperliquid'),
 ('monad', 143, 'Monad', 'https://rpc.monad.xyz', 'monad', 'monad', 'MON', 'monad'),
 ('sonic', 146, 'Sonic', 'https://sonic-rpc.publicnode.com', 'sonic', 'sonic', 'S', 'sonic-3'),
 ('unichain', 130, 'Unichain', 'https://unichain-rpc.publicnode.com', 'unichain', 'unichain', 'ETH', 'ethereum'),
 ('linea', 59144, 'Linea', 'https://linea-rpc.publicnode.com', 'linea', 'linea', 'ETH', 'ethereum'),
 ('scroll', 534352, 'Scroll', 'https://scroll-rpc.publicnode.com', 'scroll', 'scroll', 'ETH', 'ethereum'),
 ('zksync', 324, 'zkSync Era', 'https://mainnet.era.zksync.io', 'era', 'zksync', 'ETH', 'ethereum'),
 ('mantle', 5000, 'Mantle', 'https://mantle-rpc.publicnode.com', 'mantle', 'mantle', 'MNT', 'mantle'),
 ('berachain', 80094, 'Berachain', 'https://berachain-rpc.publicnode.com', 'berachain', 'berachain', 'BERA', 'berachain-bera'),
 ('gnosis', 100, 'Gnosis', 'https://gnosis-rpc.publicnode.com', 'xdai', 'xdai', 'XDAI', 'xdai'),
 ('blast', 81457, 'Blast', 'https://rpc.blast.io', 'blast', 'blast', 'ETH', 'ethereum'),
 ('ink', 57073, 'Ink', 'https://rpc-gel.inkonchain.com', 'ink', 'ink', 'ETH', 'ethereum'),
 ('plasma', 9745, 'Plasma', 'https://rpc.plasma.to', 'plasma', 'plasma', 'XPL', 'plasma'),
 ('celo', 42220, 'Celo', 'https://celo-rpc.publicnode.com', 'celo', 'celo', 'CELO', 'celo'),
 ('worldchain', 480, 'World Chain', 'https://worldchain-mainnet.g.alchemy.com/public', 'wc', 'world-chain', 'ETH', 'ethereum'),
 ('abstract', 2741, 'Abstract', 'https://api.mainnet.abs.xyz', 'abstract', 'abstract', 'ETH', 'ethereum'),
 ('soneium', 1868, 'Soneium', 'https://rpc.soneium.org', 'soneium', 'soneium', 'ETH', 'ethereum'),
 ('mode', 34443, 'Mode', 'https://mainnet.mode.network', 'mode', 'mode', 'ETH', 'ethereum'),
 ('zora', 7777777, 'Zora', 'https://rpc.zora.energy', 'zora', 'zora-network', 'ETH', 'ethereum'),
 ('fraxtal', 252, 'Fraxtal', 'https://rpc.frax.com', 'fraxtal', 'fraxtal', 'FRAX', 'frax-share'),
 ('taiko', 167000, 'Taiko', 'https://rpc.mainnet.taiko.xyz', 'taiko', 'taiko', 'ETH', 'ethereum'),
 ('cronos', 25, 'Cronos', 'https://cronos-evm-rpc.publicnode.com', 'cronos', 'cronos', 'CRO', 'crypto-com-chain'),
 ('opbnb', 204, 'opBNB', 'https://opbnb-rpc.publicnode.com', 'op_bnb', 'opbnb', 'BNB', 'binancecoin'),
 ('katana', 747474, 'Katana', 'https://rpc.katana.network', 'katana', 'katana', 'ETH', 'ethereum'),
 ('megaeth', 4326, 'MegaETH', 'https://mainnet.megaeth.com/rpc', 'megaeth', 'megaeth', 'ETH', 'ethereum'),
]
AAVE = {'ethereum': ['AaveV3Ethereum', 'AaveV3EthereumLido', 'AaveV3EthereumEtherFi'], 'base': ['AaveV3Base'], 'arbitrum': ['AaveV3Arbitrum'], 'optimism': ['AaveV3Optimism'],
        'polygon': ['AaveV3Polygon'], 'avalanche': ['AaveV3Avalanche'], 'bsc': ['AaveV3BNB'], 'gnosis': ['AaveV3Gnosis'], 'scroll': ['AaveV3Scroll'], 'zksync': ['AaveV3ZkSync'],
        'linea': ['AaveV3Linea'], 'sonic': ['AaveV3Sonic'], 'celo': ['AaveV3Celo'], 'mantle': ['AaveV3Mantle'], 'plasma': ['AaveV3Plasma'], 'ink': ['AaveV3InkWhitelabel']}
LST = {'STETH', 'WSTETH', 'CBETH', 'RETH', 'WEETH', 'EETH', 'EZETH', 'RSETH', 'METH', 'SFRXETH', 'OSETH', 'ETHX', 'SWETH', 'WBETH', 'LSETH', 'PUFETH', 'CMETH', 'SAVAX', 'KHYPE', 'STHYPE', 'WSTHYPE', 'STS', 'SUSDE', 'SUSDS', 'SDAI', 'STKAAVE', 'GMON', 'SHMON', 'APRMON'}
def main():
    cg = get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
    plat = {x['id']: x['platforms'] for x in cg}
    top = []
    for p in range(1, 7):
        top += [(x['id'], x['symbol'].upper()) for x in get(f'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page={p}') or []]; time.sleep(8)
    toks = {c[0]: {} for c in CHAINS}; byp = {c[5]: c for c in CHAINS}
    for cid, sym in top:
        for pl, addr in (plat.get(cid) or {}).items():
            c = byp.get(pl)
            if c and addr and addr.startswith('0x') and len(addr) == 42:
                kind = 'lst' if sym in LST else 'pendle' if sym.startswith(('PT-', 'YT-')) else 'token'
                toks[c[0]][addr.lower()] = [addr.lower(), sym, None, kind, None]
    for key, files in AAVE.items():
        for f in files:
            ts = get(f'https://raw.githubusercontent.com/bgd-labs/aave-address-book/main/src/ts/{f}.ts') or ''
            for m in re.finditer(r"\n  (\w+): \{([^}]*)\}", ts):
                b = m.group(2); g = lambda k: (re.search(r'\b' + k + r": '?(0x[0-9a-fA-F]{40}|\d+)'?", b) or [None, None])[1]
                u, d, a, v = g('UNDERLYING'), g('decimals'), g('A_TOKEN'), g('V_TOKEN')
                if not (u and a and d): continue
                toks[key][a.lower()] = [a.lower(), 'a' + m.group(1), int(d), 'aave', u.lower()]
                if v: toks[key][v.lower()] = [v.lower(), 'debt' + m.group(1), int(d), 'aave-debt', u.lower()]
    ll = {c[0]: c[4] for c in CHAINS}
    keys = sorted({f"{ll[k]}:{t[4] or t[0]}" for k, d in toks.items() for t in d.values()})
    px = {}
    for i in range(0, len(keys), 80):
        d = get('https://coins.llama.fi/prices/current/' + ','.join(keys[i:i + 80])) or {}
        px.update(d.get('coins') or {}); time.sleep(0.3)
    out = {}
    for k, d in toks.items():
        rows = []
        for t in d.values():
            p = px.get(f"{ll[k]}:{t[4] or t[0]}")
            if not p: continue
            if t[2] is None: t[2] = p.get('decimals')
            if t[2] is None: continue
            if t[3] == 'token' and p.get('symbol'): t[1] = p['symbol']
            if t[3] == 'token': t[3] = 'lst' if t[1].upper() in LST else 'pendle' if t[1].upper().startswith(('PT-', 'YT-')) else 'token'
            rows.append(t if t[4] else t[:4])
        out[k] = sorted(rows, key=lambda r: r[1])
    doc = {'_help': 'Built by scripts/build_evm_tokens.py. tokens[chain] = [address, symbol, decimals, kind(token|lst|pendle|aave|aave-debt), underlying?]',
           'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'multicall3': '0xcA11bde05977b3631167028862bE2a173976CA11',
           'chains': [{'key': c[0], 'id': c[1], 'name': c[2], 'rpc': c[3], 'llama': c[4], 'native': c[6], 'native_cg': c[7]} for c in CHAINS], 'tokens': out}
    os.makedirs(os.path.join(ROOT, 'wallets'), exist_ok=True)
    json.dump(doc, open(os.path.join(ROOT, 'wallets', 'evm.json'), 'w'), separators=(',', ':'))
    print({k: len(v) for k, v in out.items()}, os.path.getsize(os.path.join(ROOT, 'wallets', 'evm.json')) // 1024, 'KB')
if __name__ == '__main__': main()
