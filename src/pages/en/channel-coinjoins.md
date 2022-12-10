---
title: Channel Coinjoins
description: Lorem ipsum dolor sit amet - 3
layout: ../../layouts/MainLayout.astro
---

## Intro

Lightning offers some privacy improvements over traditional on-chain bitcoin, however, it is still tied to the base
layer of the bitcoin network. When using Lightning we should still use traditional bitcoin privacy techniques to protect
our funds from observation. We will break down how we can use coinjoins, splicing, and potentially other techniques to
protect user privacy on lightning.

## Problem Statement

A lightning node must create on-chain bitcoin transactions to open and close channels. These inherently will reveal the
lightning node's on-chain history and can harm the privacy of the node. This is especially true for routing nodes which
announce their channels to the entire network.

![Onchain tracking](/onchain-tracking.svg)

What on-chain privacy techniques can we use to protect us from surveillance?

## A deep dive into channel coinjoins

### Pre-Lightning Coinjoin

Today the primary way to protect your on-chain privacy when using Lightning is to coinjoin _before_
opening a channel. The primary way to do this is to take some funds and send them into a wallet that supports coinjoins.
After coinjoining until the desired anonymity set is reached, you would then send coinjoined funds (in a separate
transaction or final coinjoin transaction) to your lightning node's on-chain wallet. You can then open a channel from
this UTXO and _should_ have a lightning channel that is not at risk from de-anonymizing your on-chain wallet.

This has several downsides, the most obvious being the number of transactions it takes, especially if wanting a high
degree of anonymity. Improvements to coinjoins like wabisabi or coinjoins that have free remixes can mitigate the cost
to the user, however there is still a time expenditure to the user as well as blockchain bloat. Even in the best case,
two transactions are required, one coinjoin, and another channel opening transaction.

More importantly, there are privacy implications. When creating the transaction to fund your lightning channel, you are
creating a transaction that explicitly exits your funds from the coinjoin liquidity pool. This means that your UTXO will
no longer be a part of the growing coinjoin pool and can be treated as a normal utxo. This means that your utxo's
anonymity set can only shrink as peers you coinjoined with do de-anonymizing actions on the blockchain.

It gets more interesting when you're trying to open multiple channels at once. If you are doing a batch channel open without
a coinjoin it is very explict and one can easily make an assumption that all outputs in that transaction are channels
that your node owns. Whereas if it is in a coinjoin there would be multiple channels going on, but it would be unknown
which channels a node owns inside the transaction without being the channel owner.

There are a few reason this is not done today. The first being that there is no live coinjoin software that currently
supports this ([Vortex](https://github.com/ln-vortex/ln-vortex) release soon™). Lightning channels are unique and
when opening one it requires more than just sending to an on-chain address. The two lightning nodes in the channel need
to communicate before you can send to an address and there is a finite window in which you can send to this address.
This makes transaction coordinator software tricky around channel openings because if you do not have good guarantees it
can result in a loss of funds, or at the very least a huge headache. Because of this limitation, a
coinjoin coordinator that wants to support lightning would need to be custom-built to be able to support this. This is
because current coinjoin coordinators have long queue times for users, so they can come and go as they please, however
to do lightning you would need to rework the coordinator to be able to fit in the registration, signing, and
broadcasting of the transaction within a 10-minute window.

Another issue is the output script of a lightning channel today is a P2WSH whereas a traditional user's wallet would be
a P2WPKH, these two are explict on-chain, so you could tell which utxos are going out to a P2WSH and which are going to
a P2WPKH that could potentially be remixed. Ideally in a coinjoin you want everything to look as uniform as possible so
there are as many possible interpretations as possible. Further, the exact script gets revealed in the channel closing
transaction. Luckily we do have a fix for this, taproot! Taproot enables us to have both of these look the same
on-chain, however as of this writing there are no lightning implementations that support taproot lightning channels.

As of today Vortex has full support for Lightning channels and taproot. The
Wasabi [coordinator](https://github.com/zkSNACKs/WalletWasabi/pull/8831) already supports taproot,
and [client support](https://github.com/zkSNACKs/WalletWasabi/pull/9070) is active work in progress. Samourai Wallet has
stated is has [no plans](https://twitter.com/SamouraiWallet/status/1415788631491497985) for taproot support. JoinMarket
has support for sending to taproot addresses
but [has no plans](https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1079#issuecomment-1041594917) for
wallet implementation.

### Channel Open CoinJoins

We've talked about the downsides of coinjoining before opening a channel, but what if we could open a lightning channel
inside a coinjoin? This would allow us to have a single transaction that opens multiple channels that are all
indistinguishable from each other on-chain. There are a few massive benefits to this.

![Coinjoin stages](/coinjoin-stages.svg)

The biggest benefit of this is that you are able to intermingled your on-chain history with the history of many other
users. This means that when an observer tries to ascertain information about your lightning node's wallet history from
your lightning channels, they will not be able to tell which inputs of the transaction are being used to fund which
channel, essentially making it impossible to determine the previous on-chain history of your lightning node. Not only
that, but since the opening of the lightning channel does not need to exit the coinjoin liquidity pool, your channel can
continue to gain potential anonymity set from the coinjoin liquidity pool if your peers continue to remix. As well, if
multiple channels are opened in a single coinjoin, an observer will not be able to tell if the other channels are also
for your lightning node or if they are for other users.

Taproot makes this all even stronger, as taproot lets our lightning channels look the same as a normal wallet utxo. This
means that we can open a lightning channel in a coinjoin, and the observer cannot explicitly tell if an output is a
lightning channel or a normal wallet utxo. This means we have coinjoin transactions that are serving multiple purposes,
they can be opening channels for some users, while some users are mixing their own utxos for a later payment. This may
not sound that important, but it allows for them to share the same liquidity pool and anonymity set which are normally
the biggest resource constraints for a coinjoin and gets us closer to the dream of having every on-chain transaction
being a coinjoin.

### Closing v2

The opening of a lightning channel inside a coinjoin is great, but what about closing a channel? The current lightning
protocol
does [not actually support this](https://github.com/lightning/bolts/blob/341ec844f13c0c0abc4fe849059fbb98173f9766/02-peer-protocol.md#closing-initiation-shutdown)
. To close a channel, you just tell your peer which channel to close and an address to send the funds to. Notably, this
means that you cannot construct a coinjoin transaction as this is an interactive process with other inputs and outputs.

The current protocol may not support this, but there are some ideas on how to add this functionality.
[Interactive-tx](https://github.com/lightning/bolts/pull/851) is a proposal to add a way to interactively construct a
transaction for _opening_ a channel. This could be extended to allow for the construction of a transaction for _closing_
a channel. Alternatively, you could just add a shutdownV2 message that allows you to specify a transaction to close the
channel, rather than just an address. This would allow you to construct a coinjoin transaction that closes the channel,
and then give it to your peer to validate.

There are implementations of interactive-tx in Core Lightning and in Eclair, however this is only for channel opens.
There are no current implementations or even concrete proposals for using interactive-tx for closing channels, however
it has been discussed and seems to be a logical next step for the lightning protocol after interactive-tx is widely
deployed.

### Splicing Coinjoin

Splicing is a new feature that is [being added](https://github.com/lightning/bolts/pull/863) to the
lightning protocol that allows you to update an active lightning channel. This means that you can add or remove funds
from a channel without closing it. This is a very powerful feature because it allows you to have a channel that is
always open and still be able to do on-chain transactions with the present balance. It also builds off of dual-funded
lightning channels using the same interactive-tx protocol. This allows for peers to interactively construct bitcoin
transactions together that will result in a splice of the peers channels.

#### Regular splicing

![Splice step 1](/splice-0.svg)

![Splice step 2](/splice-1.svg)

![Splice step 3](/splice-2.svg)

Splicing can be done amongst any number of peers, you can initiate a splice with one peer, and then have another peer
join in on the splice through either one of you. This can allow for splicing to become a coinjoin coordination mechanism
where many peers can join in on a splice and all register utxos which they wish to mix. Because we are doing a splice
this can remove the need for equal output amounts because we can disguise the resulting amounts because the amount the
user received is not explicit on-chain, only the total channel amount. This means that we can have a coinjoin
coordinated on the lightning network, updating lightning channels, with unequal output amounts. This would require a lot
of work to implement, but it is a very powerful feature that would have drastic implications for on-chain and lightning
privacy.

#### Coinjoin splicing

![Coinjoin splice before](/splice-coinjoin-before.svg)

![Coinjoin splice after](/splice-coinjoin-after.svg)

Splicing could rework the way we think about coinjoin coordination, but what about the way we think about lightning
channels? Previously, we had talked about that it is assumed that a once a lightning channel is opened it can no longer
be remixed as it would require closing the channel and without something like closing v2, it would be impossible to
close inside a coinjoin. However, with splicing, we can have a channel that is always open, and we can add or remove
funds at will, but we can also choose to splice a channel and not change its capacity it at all. At first glance, this
seems like a bad idea, it would just waste on-chain fees, but it actually can be a game changer for lightning privacy.

Splicing can enable remixing for lightning channels. This can allow for lightning channels to even further intermingle
and be indistinguishable from other on-chain utxos. This means that we can have a lightning channel that is always open,
but is constantly changing its on-chain history, and is constantly being remixed with other utxos. With this, we can
boostrap potentially all lightning liquidity to a single coinjoin liquidity pool.

An easy way to think of this is that we are swapping the paint on our car everytime we do a coinjoin. If someone is able
to link a lightning channel to us, then we can just do a spliced coinjoin and change the on-chain history of our channel
to protect our privacy. This means that we can have a lightning channel that is always open, but is extremely hard to
trace and thus making our lightning activity harder to trace.

This would allow for a massive increase in the anonymity set of lightning channels as well as on-chain utxos.
