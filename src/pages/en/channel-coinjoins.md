---
title: Channel Coinjoins
description: Lorem ipsum dolor sit amet - 3
layout: ../../layouts/MainLayout.astro
---

Lightning offers some privacy improvements over Bitcoin, however, it is still tied to the base layer of the bitcoin
network.
When using Lightning we should still use traditional bitcoin privacy techniques to protect our funds from observation.
We will break down how we can use coinjoins, splicing, and potentially other techniques to protect user privacy on
lightning.

# Problem Statement

A lightning node must create bitcoin transactions with peers that have been funded with its own utxos.
These inherently will reveal the lightning node's on-chain history and can harm the privacy of the user.
This is especially true for routing nodes which must broadcast their channels to the entire network.

What on-chain privacy techniques can we use to protect our funds from surveillance?

# Meat

No potatoes here. (not carnivore)

## Pre-Lightning Coinjoin

- What is doable today
- Use Samourai, JM, Wasabi, send to LN node, open channel
- Usable but extra transaction costs, fees, etc.
- Batch opens can be tied to user
- Helps current on-chain coinjoin users

Today the primary way to protect your on-chain privacy when using Lightning is to join _before_
opening a channel. The primary way to do this is to take some funds and send them into a wallet that supports coinjoins.
After coinjoining until the desired anonymity set is reached, the user would then coinjoined funds (in a separate transaction
or final coinjoin transaction) to their lightning node's on-chain wallet. They can then open a channel from this UTXO
and _should_ have a lightning channel that is not at risk from de-anonymizing your on-chain wallet.

The has several downsides, the most obvious being the number of transactions it takes.
This can take several transactions to do and can take many more if wanting a high degree of anonymity.
Improvements to coinjoins like wabisabi or coinjoins that have free remixes can mitigate the cost to the user,
however there is still a time expenditure to the user.

More importantly, there are privacy implications. When creating the transaction to fund your lightning channel,
you are creating a transaction that explicitly exits your funds from the coinjoin liquidity pool.
This means that your UTXO can be dismissed as a potential input for any new liquidity that is added to the pool.

There are a few reason this is not done today. The first being that there is no live coinjoin software that currently
supports this ([ln-vortex](https://github.com/ln-vortex/ln-vortex) release soon™). Lightning channels are unique and when
opening one it requires more than just sending to an on-chain address. The output script of a lightning channel today is
a P2WSH (explain?) whereas the traditional user's wallet would be a P2WPKH, these two are explict on-chain, so you could
tell which utxos are going out to a P2WSH and which are going to a P2WPKH and could potentially be remixed.
Luckily we do a fix for this, Taproot! Taproot enables us to have both of these look the same on-chain, however as of
this writing there are no lightning implementations that support taproot lightning channels.
Another issue is that when opening a lightning channel, you only have a 10-minute window to broadcast the transaction,
otherwise your peel will not accept the channel, if it is broadcast after this window funds could be lost.
Because of this limitation, a coinjoin coordinator that wants to support lightning would need to be custom-built to be
able to support this.

## Channel Open CoinJoins

- 1 coinjoin transaction for many channel opens
- Shared history with many channels / peers
- With Taproot, can be done in conjunction with normal coinjoins
- Batch channel opens are even better
- Lots of unspent capacity 'sitting' when it is actively being used

## Closing v2

- Current closing protocol only lets set an address
  - Can't construct a special transaction
  - Can't use coinjoins for closing
- Closing v2 could use interactive-tx to construct a special transaction
  - Can use coinjoins for closing
- Could eventually have a coinjoin transaction with:
  - on-chain self spend
  - on-chain spend
  - channel open
  - channel close

## Splicing Coinjoin

- What is splicing
  - Updating a lightning channel
  - On-chain transaction can be whatever we want
  - Any peer can join and splice with us
  - Channel does not go offline
  - Channel should be unannounced
- What if everyone was always splicing + coinjoin
- Compare lightning capacity to coinjoin capacity
- Could eventually have a coinjoin transaction with:
  - on-chain self spend
  - on-chain spend
  - channel open
  - channel close
  - swaps
  - splice

# Positives

- Helps mitigate the privacy leaks through the base layer ties that Lightning has.
- Helps current on-chain coinjoin users, but only with Taproot

# Negatives

- Can be more expensive on-chain
  - multiple remixes
  - coordinator fees
- Coinjoins have potential foot guns
  - toxic change
- Obvious fingerprint

# Implementation Status

- [Vortex](https://github.com/ln-vortex/ln-vortex)
  - Currently work in progress, hoping to release soon.
- Wasabi claims to be able to do Lightning channel opens in Wasabi 2.0 / wabisabi
  - [https://github.com/zkSNACKs/WalletWasabi/pull/8831](https://github.com/zkSNACKs/WalletWasabi/pull/8831)
- [Samourai has no plans for taproot](https://twitter.com/SamouraiWallet/status/1415788631491497985)
- Splicing is work in progress in CLN
  - I hear Eclair might do it too
- Closing v2 is just an idea
  - interactive-tx is WIP in CLN & eclair
    - Large bounty for LND

# Links to further research

- [Vortex](https://github.com/ln-vortex/ln-vortex)
- [Splicing BOLT](https://github.com/lightning/bolts/pull/863)
