---
title: Introduction to Lightning Privacy
description: Docs intro
layout: ../../layouts/MainLayout.astro
---

Each bitcoin transaction is published on the public blockchain forever, and each transaction is composed of references to prior transactions [^1]. There are many well-established [best practices for using bitcoin privately](https://bitcoin.org/en/protect-your-privacy) but no silver bullets.

As a layer two on top of bitcoin the lightning network can greatly help improve the privacy of bitcoin usage. Lightning has no central ledger or permanent record of all transactions — all transactions are conducted peer-to-peer — and transactions have no natural association with each other. But lightning is, also, not a silver bullet:

1. As a layer two, lightning is built on top of on-chain bitcoin transactions. If a lightning transaction can be easily associated with a bitcoin transaction it will then inherit the privacy of that bitcoin transaction.
2. The world doesn't know about every lightning transaction, but the peer nodes involved in a transaction do know certain facts about it. If they choose to share this data with the world, or correlate it with other information themselves, they may be able to de-anonymize some transactions.
3. Centralization increases the risk of point two: highly connected nodes can see a larger percentage of network activity and have a better chance of creating valid inferences.

Here's a good way to start thinking about how to use lightning privately:

> What is the anonymity set of this action?

Which is to say, if I'm making a transaction, how many other actors on the network could be plausibly making a transaction that looks like this one?

As an example, if I have a unannounced channel with a peer, and I send a payment directly to that peer over that channel, the peer can assume I'm making the payment because _who else would be routing over this channel only the two of us know about?_

A simple mitigation in this case of adding intermediate "hops" to the route can greatly increase the anonimity set of this transaction (the number of other people who could be potentially making this payment).

# Basic lightning terms

Onion routing
Node pubkeys
???

# Conclusion

Summary of 3 blog posts

[^1] Other than coinbase transactions received as mining rewards
