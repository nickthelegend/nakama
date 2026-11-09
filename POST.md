# Nakama: social posts (drafts for Nick)

Post only after the repo is public and the film link works. Replace `<repo>` and `<film>`. If Walrus Memory and the mainnet round are still PENDING when you post, keep the "dry-run" wording as it is.

## X (under 280 characters; X counts each link as 23)

```
Nakama: your crew calls short BTC moves, friends join with one tap, each signing their own bet. Sui + DeepBook Predict, Tatum gRPC for chain data, Walrus Memory for the crew's record.

Demo (mainnet dry-runs): <film>
Code: <repo>
#TotalRecall
```

## LinkedIn

```
I built Nakama for Total Recall, the Tatum x Walrus Memory hackathon (Consumer Finance track).

The idea: betting on short Bitcoin moves is usually a solo, private habit. Nakama makes it a crew thing. One friend posts a call ("BTC above $73,766 in the next 5 minutes"), the card shows a countdown and the live odds, and everyone else joins with one tap. Each person signs their own small order from their own Sui wallet, so nobody holds anyone else's money.

Two details I care about:
• It checks the market's live odds before a call goes up. DeepBook Predict only takes a new bet between 15% and 50% odds, so Nakama refuses calls outside that band and closes the tap when the price drifts out.
• It's designed to learn. Settled calls, each member's results and a crew playbook are written to Walrus Memory and recalled the next time a similar setup comes up, to suggest a stake and flag setups that keep losing.

Where it stands today: market reads, odds checks, quotes and dry-runs run on Sui mainnet, with Tatum's Sui gRPC gateway for chain data. The full signing path is proven on a local fork of mainnet. The first signed mainnet round and the first Walrus Memory writes are next.

Film: <film>
Code: <repo>

#Sui #Walrus #Tatum #DeepBook #TotalRecall
```
