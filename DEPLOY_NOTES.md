# Daemon — Hackathon Günü Deploy Notları

## Sıra önemli, adım adım yap

### 1. Monad Testnet'ten MON al
- https://faucet.monad.xyz adresinden test MON al
- Deploy + gas için en az 1 MON yeterli

### 2. .env dosyalarını hazırla

```bash
# Contracts
cd /Users/alperenacar/Daemon
cp .env.example .env
# .env içine yaz:
#   PRIVATE_KEY=0x_deployer_private_key
#   RPC_URL=https://testnet-rpc.monad.xyz
```

### 3. Contracts deploy et

```bash
cd /Users/alperenacar/Daemon
npm install
npm run deploy
```

Çıktıdan bu iki adresi kopyala:
```
MARKETPLACE_ADDRESS = "0x..."
IDLE_TOKEN_ADDRESS  = "0x..."
```

### 4. Frontend'e adresleri yaz

`frontend/lib/contracts.ts` — en üst iki satır:
```ts
export const MARKETPLACE_ADDRESS = '0xBURASI_MARKETPLACE'
export const IDLE_TOKEN_ADDRESS   = '0xBURASI_IDLE_TOKEN'
```

### 5. Agent CLI'yi ayarla

```bash
cd /Users/alperenacar/Daemon/agent-cli
cp .env.example .env
# .env içine yaz:
#   PRIVATE_KEY=0x_agent_private_key  (farklı bir cüzdan olabilir)
#   CONTRACT_ADDRESS=0xBURASI_MARKETPLACE
#   RPC_URL=https://testnet-rpc.monad.xyz
```

### 6. Hepsini başlat

```bash
# Terminal 1 — Frontend
cd /Users/alperenacar/Daemon/frontend
npm install
npm run dev
# → http://localhost:3000

# Terminal 2 — Agent CLI
cd /Users/alperenacar/Daemon/agent-cli
npm install
node agent-node.js
```

### 7. Demo akışı (1 dakika)

1. `localhost:3000` aç → Gateway ekranı göster
2. "ENTER AS HUMAN" → Dashboard (mock taskler zaten görünür)
3. MetaMask bağla → Gerçek balance gelir
4. Yeni task post et (0.1 MON) → listeye düşer
5. Terminal 2'de agent zaten çalışıyor → task'ı alır, 3 sn bekler, tamamlar
6. "ENTER AS AGENT" → Matrix terminal + simüle log akışı göster

---

## Olası sorunlar

| Sorun | Çözüm |
|---|---|
| `Cooldown active` hatası | 30 saniye bekle, tekrar dene |
| MetaMask ağ hatası | Monad Testnet ekle: chainId 10143, RPC https://testnet-rpc.monad.xyz |
| `insufficient funds` | Faucet'ten MON al |
| Frontend kontrata bağlanamıyor | contracts.ts'deki adresleri kontrol et |
