---
title: Routing Analysis
description: An analysis into the privacy aspects of the routing layer on lightning.
layout: ../../layouts/MainLayout.astro
---

## Intro

Through the inherent nature of onion-routed payments, a certain degree of source and destination privacy is given as any payment flows through the network. Since Lightning payments typically go through other third parties, it's important that the source, destination, and any other metadata are concealed. Lightning nodes are paid for the service they provide as they route payments, and knowing more information than necessary may lead to censorship and privacy concerns.

## Problem statement

There are scenarios in which routing nodes may derive information about the sender or receiver of a Lightning payment. This article will dive into a few scenarios and some improvements to make it difficult to observe payments as they route down any given path.

## A deep dive into Routing Analysis

### Routing concerns today

The onion routing properties of Lightning payments provide a lot of benefits that are similar to Tor's onion routing. The source and destination of payments are supposed to be concealed as they are routed across the network. However, there are a few scenarios where routers could infer this information. There are also scenarios where a payment passing through a single actor with multiple nodes can be correlatable.

Whenever a node is paying a direct channel partner, it's possible that the payment was routed through them so it cannot be certain whom the payment came from. However, if the payer has no public channel open with any other node, then there's a very low likelyhood the payment was routed by anyone else. The same thing applies whenever it's a two-hop payment and the destination also does not have any other public channel opened. This scenario happens frequently when there are LSPs involved.

Having good routing hygiene is not enough though. There are several properties of Lightning routing that are being improved upon to provide better guarantees in the future. We elaborate on them below.

### PTLCs

PTLCs offer two main improvements to Lightning. One is escrow / DLC / smart contract possibilities and one helps payment correlatability. There are other benefits, such as fixing the wormhole attack.

When a HTLC payment goes through multiple nodes, the same payment hash is used each time. So whenever the same actor sees the same payment hash on multiple nodes, they can tell that it is the same payment. They might not know who exactly it came from or where it is going (except in cases outlined above). If a Lightning service provider routes a user's payment to a major merchant, they might be able to conclude the exact source and destination.

#### How it be

![HTLCs routing diagram](/ptlc-how-it-be.svg)

#### How it could be

![PTLCs routing diagram](/ptlc-how-it-could-be.svg)

The Suredbits blog has a [deeper exploration of how PTLCs work](https://suredbits.com/payment-points-part-1/).

### Timing Delay

Timing delays are important so that it is not possible to estimate how far away a source or destination is from the observing node. Some early research shows that this is possible today. Some of the top nodes on the network are capable of analyzing the source and destination of [50 to 72% of payments](https://arxiv.org/pdf/2006.12143.pdf). Even estimating how far away a source/destination is may start to narrow down on the exact node based on the topology of the network. This is done by looking at the estimated paths that might have been taken and then doing the timing analysis to narrow them down.

There are two primary concerns to timing analysis when it comes to routing Lightning payments. One comes from routers estimating if the next node is the final destination. Another comes from payment correlation (assuming HTLC correlation is fixed).

Let's look at the timing analysis aspect. If the average time delay was 100ms between Alice and Bob, and Alice routes a payment to Bob, and Bob immediately responds with the preimage to that HTLC, then Alice has a reasonable assumption that Bob was the final destination. Alice can even extend that assumption further if she knows the time delays of the nodes Bob is connected to and so on. It doesn't assert which is the sending destination, but Alice could assume that if she was routing to Bob (and possibly further to some specific nodes past Bob), then she can do routing analysis to figure out the nodes that may have taken her path. It would not be reasonable in most scenarios for Bob's direct channel partners to make a payment through Alice to Bob. It would not be the shortest path or the smallest fee, which is quite often the algorithm used for Lightning node implementations. The exception to this is if an alternative route was taken strictly because of liquidity issues or node failures/downtime, though through the use of probing this kind of information can be figured out.

This can be even further analyzed if Bob had another node named Bob-2 and it turns out that the payment went from Alice -> Bob -> Charlie -> Bob-2 -> Evan. For one, Bob can tell this today because of the payment preimage hash. However, even without that, Bob would see that a payment with a specific amount flowed through his first node just before a payment with just under the same amount flowed through his 2nd node. One cannot assume on Lightning that because it's a different node, it is always a different owner. There are many nodes owned by the same actor on the Lightning Network.

#### Fixing Timing Analysis

There are a few solutions to solving the timing analysis problem after PTLCs are in place. In ["Counting Down Thunder"](https://arxiv.org/pdf/2006.12143.pdf), they suggest that nodes add a random delay to the payment they are routing. For this delay to be meaningful, it should provide some amount of delay equal to about 2 to 3 times the average node delay. If it was only a few milliseconds while the average per-hop delay was 100ms, then that would not mean much. If each node is adding this level of random delay, then that is around 2 to 3 times the time it takes for payments to complete. Depending on how much time this adds, it could significantly hurt payment reliability for the entire Lightning network.

Another aspect, as discussed by Peter Todd on the [Lightning-Dev Mailing list](https://lists.linuxfoundation.org/pipermail/lightning-dev/2022-June/003621.html), is based on having sender opt-in timing delays. The sender can ask each node along the hop to add a delay to the payment before they send it off to the next node. This allows the sender to have more fine grain control of their anonymity set of payments being routed. If a payment reaches a routing node and that node was asked to hold onto the payment for 10 seconds, meanwhile, 2 more payments of around the same amount size came in, then there's more ambiguity as to which payment was being routed where. Since the sender is asking for these delays, they are okay with how long they are asking for it to take. As long as the receiver gets the payment before the timeout specified in their invoice, they would be okay with some extra delay too.

#### How it be

![Timing analysis diagram](/timing-delay-how-it-be.svg)

#### How it could be

![Timing analysis diagram with delay](/timing-delay-how-it-could-be.svg)

However, there are a few problems with sender opt-in timing delays. One is the fact that it may not be enforceable. If the sender asks a node today for a certain delay, but once received by the routing node, it decides to forward instantly anyways, nothing is stopping that from happening. The router can ignore this timing delay ask. One possible solution is to also alert the next node about this delay, and if that node is respecting the timing delay ask, they know the time stamp the previous node was asked to hold it till (without revealing how long in total) and may reject it if it was not respected. However, there are no incentives for upgrading the protocol in this way. Having HTLCs in flight for longer is a concern in general given the max per channel is currently 483. There could be some reasonable maximums set if we were able to have a consensus change but with all of this adds complexity and possibly more failures to routing. Is it worth the privacy cost? And how much timing delay would be needed assuming a certain amount of payment activity?

Without a protocol-wide change, routing delays might not be respected but some probing could be done to see which nodes honor it and which don't. By probing the paths between each node and measuring the timing, you could figure out which nodes are respecting the delay by having the test node with a more significant delay than the others. This might not be perfect in practice given that it's not always reliable that a certain delay between two nodes is consistent. General network issues could occur, especially on Tor.

### Random Amount MPP

Uncorrelatable payment hashes and some timing delays are not enough to break routing analysis completely. To improve assumptions that could be made about where a payment came from or where it is going, Multi-Path Payments are needed and it should be done with more randomness. Simply splitting up the payments evenly in half may not be good enough.

For the scenarios below, assume that payment hashes are uncorrelatable via PTLCs and that not enough of a timing delay occurred to provide a reasonable amount + timing anonymity set. We dissect how improvements can still be made with these features. In the examples below, this also assumes a 1 sat fee across all nodes but this will vary in reality. Since routing fees are public information anyways, the exact fees in any given route can be calculated easily.

#### Single payment analysis

![Single Payment Analysis](/SplinteredPayments-SinglePathPayment-red.png)

In the image above, we can see a basic payment flow through 4 routing nodes to pay a 100 sat invoice. Routing through 4 hops on the lightning network should be able to provide pretty good source & destination anonymity at the surface level. However, let's consider in this example that the first hop and the last hop are the same actors, indicated by the red circles above. A single actor sitting in multiple locations may not be able to prove that a certain payment flowed through their nodes, but they have a strong indication it did, with some possible assumptions of the nodes that it may have also flowed through and who might be the source and destination.

Even with timing delays built in, the anonymity set now because of the question "how many ~100 sat payments flowed through the same-actor routing nodes during the time delay window?" Fee calculations are built into the public gossip layer of the lightning Network, so it is not far off to believe that they can be reverse calculated to find all possible routes that a payment took if it came in one actor's node at 104 sats and went through another of that actor's nodes at 100 sats. Even if each route did not cost 1 sat, a calculation could still be made to theorize all the possible routes. Overpaying gives the payer a bit more ambiguity as to the routes taken in this example. Though even knowing a few hops in a route (both of the observer's nodes) can be enough to narrow down the possible source and destinations. This can be further analyzed if the observer had current balance information into the routing nodes that sit between their node, especially if the amounts are higher and are more limited in the paths that could be taken successfully.

#### Multi path payment analysis

With MPP, we can see how improvements can be made today by splitting up the payment into multiple shards. All major implementations of the lightning network support this.

![MPP Payment Analysis](/SplinteredPayments-SimpleMPPPayment-red.png)

In the example above, we were able to improve the visibility that the observer had insights into by splitting up the payment into 3 pieces that were sent across multiple entry nodes and multiple exit nodes. In this example, an observer with two of the nodes only sees a 50 sat payment flow across. The observer does not know the exact amount being paid for anymore, which may help if the final destination is a shop with public prices, but they still do have a route analysis concern by estimating routes taken by the amount difference received by the final node. However, if more payers on the lightning network utilized MPP, we would be able to add more of an anonymity set. Instead of "how many ~100 sat payments did an observer's nodes route?" becomes "how many 50 sat pieces did an observer's nodes route?" Effectively multiplying each payment part's anonymity set by a possible 2 - 10+, depending on how common amounts might be more frequent by more participants splitting their payments into common smaller denominations.

#### Complex MPP analysis

Let's look at a more complex example of MPP, where we split the payments into tiny common amount denominations of 7 with some repeated nodes receiving multiple parts.

![MPP Payment Analysis](/SplinteredPayments-AdvancedMPP-red.png)

Splitting the payments into smaller denominations, even despite taking similar paths for some of the parts, complicates the analysis that can be done. Even though our example observer in red can see 40 sats of that 100 sat payment, it still degrades the analysis in multiple ways. For one, it improves by removing 10 sats that the observer cannot see like they were able to in the previous MPP example. Another, since there are many low-valued sat parts flowing around, if more of the network did this then it would increase the anonymity set even more. Instead of dividing a payment by 2 or 3 when making an MPP payment, payers could divide until they reach common amounts.

While the example above uses 10/20/30 sat parts to convey the message simply, in reality, these should be small random amount sats to remove the fee analysis concerns.

### Splintered Payments

While the examples could be done today, we wanted to explore another possible tech improvement to make amount-based routing analysis more difficult. In this section, we talk about the concept of splintered payments.

Splintered payments are a possible protocol enhancement that allows one or more MPP payments to initiate midway through a path to a destination. This allows for further decoupling as payments flow through the network. It would no longer be the case that a payment of a certain size flowing through one node shows up later on a different node with near the same amount, thus ridding the amount correlatability.

![MPP Payment Analysis](/SplinteredPayments-MPPSplintered-red.png)

We can see in the picture a similar payment splitting mechanism to the advanced MPP scenario earlier. The payments end up taking similar splits, however, the splits happen in the middle of the route instead of at the source. Doing so provides some fee savings too.

However, the main benefit is that there is more randomness introduced with the amounts and that the observer's node at the end can't correlate specific parts together. In aggregation, it may be possible, but if many nodes on the network are splintering, it becomes much harder to do amount correlation, even amongst parts.

One important note is that this is currently theoretical and not, to our knowledge, something that is being proposed as a lightning network protocol change. One question is whether or not splintering can be enforced or if this is something that could be achieved at a trampoline router layer.

Until we get better decorrelation on lightning (via PTLCs and timing delay), it may not be worth tackling this problem quite yet, however, we could achieve something that may prove to be good enough by manually crafting complex small amount MPPs, which can be done today. One problem with the complexity of MPP or splintered payments is the UX concern. How much time will it take to find many successful routes of low value, especially if avoiding node reuse is a priority?

### Longer paths

Evaluating the optimal amount of hops that a sender should route through to seek privacy has [been discussed before](https://bitcoin.stackexchange.com/questions/92073/what-is-the-rationale-for-the-lightning-networks-path-length-limit-20-hops) by lightning privacy researchers. In their analysis, they compare the [6 Degrees of Seperation](https://en.wikipedia.org/wiki/Six_degrees_of_separation) theory that all people are within 6 degrees of separation from each other. They also point to the fact that all public nodes are typically within [10 - 20](https://bitcoinvisuals.com/ln-eccentricity) hops of each other, with 20 hops being the current max that is supported (Trampoline routing can increase this). Therefore, since most nodes are within 9 hops of each other, going beyond this number should be able to provide enough of an anonymity set to avoid being suspected of being in a specific area of the lightning graph, assuming that HTLC, amount, and timing correlation of multiple nodes under the control of a single actor isn't at play.

Further research could be done to see how many compromised or malicious nodes controlled by a single actor could degrade some of the assumptions here. However, unlike with the Tor network, there is a higher degree of cost associated with creating a sufficiently connected lightning node, mostly around the fact that locked-up liquidity is required.

However, based on the "routing concerns today" section above, it is known that single or double hop routes significantly degrade the anonymity set of the sender and receiver and in some cases can be guaranteed to identify accurately.

## Positives

The reason for many of the improvements discussed in this article is to increase the anonymity of the sender and final destination. Doing so will allow for the network to be censorship resistant.

## Negatives / Tradeoffs

The negatives and tradeoffs of the improvements above will decrease the user experience, increase the amount of failed payments, increase the network bugs and unilateral channel closures, increase the time it takes for a payment to be completed, and increase the fees that senders are required to pay. However, this should be part of the equation when network participants are using lightning today for users to make that conscious choice.

## Implementation Status

### PTLCs

PTLCs have been widely known for many years but were not possible until the taproot fork in 2021. However, not much public progress has been made to move the protocol forward since then. While it may be occasionally a [talking point](https://github.com/lightning/bolts/issues/987), no actual progress has been discovered by any of the node implementations.

### Timing Delays

To our knowledge, besides occasional mailing list posts and theories, no active work is being done to solve this problem.

### MPP

This should be possible by all node implementations today at the application layer for developers to utilize in their wallets. The idea of splintering the MPP midway through a route has not been discussed before to our knowledge.

## Links to further research

[Suredbits PTLCs Introduction](https://suredbits.com/payment-points-part-1/)

[MPP]([https://docs.lightning.engineering/lightning-network-tools/lnd/amp](https://docs.lightning.engineering/the-lightning-network/pathfinding/multipath-payments-mpp))/[AMP](https://docs.lightning.engineering/lightning-network-tools/lnd/amp)

["Counting Down Thunder" (Timing analysis)](https://arxiv.org/pdf/2006.12143.pdf)
