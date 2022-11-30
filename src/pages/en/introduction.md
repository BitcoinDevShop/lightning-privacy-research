---
title: Lightning Privacy Introduction
description: An introduction to Lightning privacy
layout: ../../layouts/MainLayout.astro
---

Each bitcoin transaction is published on the public blockchain forever, and each transaction is composed of references to prior transactions [^1]. There are [many well-established](https://en.bitcoin.it/Privacy) [best practices for using bitcoin privately](https://bitcoin.org/en/protect-your-privacy) but no silver bullets.

As a layer two on top of bitcoin the Lightning network can greatly help [improve the privacy](https://abytesjourney.com/Lightning-privacy) of bitcoin usage. Lightning has no central ledger or permanent record of all transactions — all transactions are conducted peer-to-peer — and transactions have no natural association with each other. But Lightning is, also, not a silver bullet:

1. As a layer two, Lightning is built on top of on-chain bitcoin transactions. If a Lightning transaction can be easily associated with a bitcoin transaction it will then inherit the privacy of that bitcoin transaction.
2. The world doesn't know about every Lightning transaction, but the peer nodes involved in a transaction do know certain facts about it. If they choose to share this data with the world, or correlate it with other information themselves, they may be able to de-anonymize some transactions.
3. Centralization increases the risk of point two: highly connected nodes can see a larger percentage of network activity and have a better chance of creating valid inferences.

Here's a good way to start thinking about how to use Lightning privately:

> What is the anonymity set of this action?

Which is to say, if I'm making a transaction, how many other actors on the network could be plausibly making a transaction that looks like this one?

As an example, if I have a unannounced channel with a peer, and I send a payment directly to that peer over that channel, the peer can assume I'm making the payment because _who else would be routing over this channel only the two of us know about?_

## Overview of our research

With this framework in mind, we set out to investigate potential improvements to Lightning on both the protocol level and in how it's used. With an awareness of [current privacy best practices and pitfalls](https://abytesjourney.com/lightning-privacy/), what else is possible to improve Lightning privacy?

We've split our findings into three chapters, though there's obviously a compounding effect to adopting multiple of these techniques, along with pitfalls that can render a whole stack of privacy techniques ineffective. No silver bullets, at least not yet!

### Routing Analysis

In the [Routing Analysis](/en/routing-analysis) chapter we investigate ways in which other nodes on the network can compromise sender and receiver privacy by participating as one or more hops on a payment route. Some of the mitigations we explore include PTLCs, Timing Delays, and Multi-Path Payments.

### Channel Coinjoins

In the [Channel Coinjoins](/en/channel-coinjoins) chapter we look into the on-chain connection to Lightning, where channel opens and channel closes can harm the privacy of a Lightning node. This is a particular problem for routing nodes which announce their channels to the network. Potential mitigations include Coinjoins of many flavors, including Coinjoin in and out of a channel, and splicing.

### Blinded Paths + Trampoline Routing

In the [Blinded Paths + Trampoline Routing](/en/blinded-trampoline) chapter we tackle the receiver privacy problem. In the current state of Lightning, receivers embed their node public keys in invoices so the sender knows how to route to them, which makes it challenging to receive privately. We explore the potential of Blinded Paths and Trampoline Routing, and the potential combination of both, to solve this problem.

## Feedback welcome!

This research is open source at [lightning-privacy-research](https://github.com/BitcoinDevShop/lightning-privacy-research). Comments, suggestions, fixes, and additional ideas are all welcome.

## About the authors

We are a group of cypherpunks, bitcoiners, and privacy enthusiasts, researching and building the next generation of Lightning Network clients optimized to protect user privacy and security.

[benthecarman](https://github.com/benthecarman), [Evan Kaloudis](https://github.com/kaloudis), [Max Hillebrand](https://github.com/maxhillebrand), [Paul Miller](https://github.com/futurepaul), [Tony Giorgio](https://github.com/TonyGiorgio)

## Acknowledgements

Throughout this write up experience, we met with several Lightning experts to hear more about Lightning and privacy. These include [Rusty](https://mobile.twitter.com/rusty_twit), [t-bast](https://mobile.twitter.com/realtbast), and [Dusty](https://mobile.twitter.com/dusty_daemon).

## Thanks to the sponsors

This work was [graciously funded](https://blog.wasabiwallet.io/1-11-btc-ln-privacy-grant/) by [zkSNACKs](https://github.com/zksnacks), [Dan Gershony](https://github.com/dangershony), and the [Wasabi Wallet crew](https://wasabiwallet.io).

[^1]: Other than coinbase transactions received as mining rewards
