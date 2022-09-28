---
title: Routing Analysis
description: Lorem ipsum dolor sit amet - 2
layout: ../../layouts/MainLayout.astro
---

Through the inherint nature of onion-enabled payments, a certain degree of source and destination privacy is given as any payment flows through the network. Since Lightning payments typically go through other third parties, it's important that the source, destination, and any other metadata is concealed. Lightning Nodes are paid for the service they provide as they route payments, and to know more information than necessary may lead to censorship and privacy concearns.

## Problem statement

There are scenarios in which routing nodes may derrive information about the sender or receiver of a Lightning payment. This article will dive into a few scenarios and some improvements to make it difficult to observe payments as they route down any given path.

## Meat

### Routing concerns today

The Onion Routing properties of Lightning payments provide a lot of benefits that are similar to Tor's onion routing. The source and destination of payments are supposed to be concealed as a payment is being routed across the network. However, there are a few scenario's where routers can obviously tell when the payment came from or is going. There are also scenarios where a payment passing through a single actor (across one or more of the actor's nodes) can be correlatable.

Whenever a node is paying a direct channel partner, it's possible that the payment was routing through them so it cannot be certain who the payment came from. However, if the payer has no public channel open with any other node, then there's virtually no way a payment was routed by anyone else. The same thing applies whenever it's a two hop payment and the destination also does not have any other public channel opened. This scenario actually happens frequently when there's LSP's involved.

Having good routing hygeinue is not enough though. There are several properties of Lightning routing that are being improved upon to provide better guarantees in the future. We elaborate on them below.

### PTLCs

PTLCs offer two main improvements to Lightning. One is some escrow / DLC / smart contract possibilities and one helps payment correlability.

When a payment goes through multiple nodes, it appears as the same payment hash each time. So whenever the same actor sees the same payment hash on multiple nodes, they can tell that it is the same payment. They might not know who exactly it came from or where it is going (except in cases outlined above)

(quickly summarize the "point" aspect and how it could enable contracts)

(Explain further the concern with hashes showing up on multiple parts of the path, and how each section of the path improves with points. Also explain how this alone is not enough and other methods are needed, such as timing delays / amounts).

### Timing Delay

Timing delays are important so that it is not possible to estimated how far away a source or destination is from the observing node. Some early research shows that this is possible today. Even estimating how far away a source/destination is may start to narrow down on the exact node based on the topology of the network.

There are two primary concerns to timing analysis when it comes to routing Lightning Payments. One comes from routers estimating if the next node is the final destination. Another comes from payment correlation (assuming HTLC correlation is fixed).

Research has shown that there's an average and estimated amount of delay between two nodes. You could estimate this based on averages or you could actively probe the network to find the delays between two specific nodes. If the average (or specific) time delay was 100ms between Alice and Bob, and Alice routes a payment to Bob and Bob immediately responds with the preimage to that HTLC, then Alice has a reasonable assumption that Bob was the final destination. Alice can even extend that assumption further if she knows the time delays of the nodes Bob is connected to and so on. It doesn't assert which is the sending destination, but Alice could assume that if she was routing to Bob (and possibly further to some specific nodes past Bob), then she can do routing analysis to figure out the nodes that may have taken her path. It would not be reasonable in most scenarios for Bob's direct channel partners to make a payment through Alice to Bob. It would not be the shortest path or the smallest fee, which is quite often the algorithms used for Lightning node implementations.

This can be even further analyzed if Alice had another node named Dave and it turns out that the payment went from Alice -> Bob -> Charlie -> Dave. For one, Alice can tell this today because of the payment preimage hash. However, even without that, given the fact that a payment with a specific amount flowed through Alice and very quickly a similar payment with near the exact same amount (a little less) flowed through the Dave node. One cannot assume on Lightning that because it's a different node, it is always a different owner. There are many nodes owned by the same actor on the Lightning Network.

#### Fixing Timing Analysis

There's a few solutions to solving the timing analysis problem after PTLC's are in place. In some research papers (TODO link), there's the aspect of having routing nodes on the network add a random delay to the payment they are routing. For this delay to be meaningful, it should provide some amount of delay in the orders of magnitude of 2 to 3 average node delays (TODO better phrasing). If it was only a few miliseconds while the average per hop delay was 100ms, then that would not mean much. If each node is adding this level of random delay, then that is around 2 to 3x the time it takes for payments to complete, which may already take a few seconds (TODO research). This would significantly hurt payment reliability for the entire Lightning Network.

Another aspect, as discussed by Peter Todd on the [Lightning-Dev Mailing list](https://lists.linuxfoundation.org/pipermail/lightning-dev/2022-June/003621.html), is based on having sender opt-in timing delays. The sender can ask each node along the hop to add a delay to the payment before they send it off to the next node. This allows the sender to have more fine grain control of their anonymity set of payments being routed. If a payment reaches a routing node and that node was asked to hold onto the payment for 10 seconds, meanwhile 2 more payments of around the same amount size came in, then there's more ambiguity as to which payment was being routed where. Since the sender is asking for these delays, they are okay with how long they are asking for it to take. As long as the receiver gets the payment before the timeout specified in their invoice, they would be okay with some extra delay too.

However there's a few problems with this sender opt-in timing delay. One is the fact that it cannot be enforced without network wide consensus changes. If the sender asks a node today for a certain delay, but once received by the routing node, it decides to forward instantly anyways, there's nothing stopping that from happening. The router can ignore this timing delay ask. One possible solution is to also alert to the next node about this delay, and if that node is respecting the timing delay ask, they know the time stamp the previous node was asked to hold it till (without revealing how long in total), and may reject it if it was not respected. However, there are no incentives for upgrading consensus in this way. In fact, having HTLC's in flight for longer is a concern in general given the max per channel is currently 483. There could be some reasonable max's set if we were able to have a consensus change but with all of this adds complexity and possibly more failures to routing. Is it worth the privacy cost? And how much timing delay would be needed assuming a certain amount of payment activity? (TODO, if feeling really ambitious, do some math).

Without a consensus wide change, routing delays might not be respected but some probing could be done to see which nodes honor it and which don't. By probing the paths between each node and measuring the timing, you could figure out which nodes are respecting the delay by having the test node with a more significant delay than the others. This might not be perfect in practice given that it's not always reliable that a certain delay between two nodes is consistent. General network issues could occur, especially on Tor.

### Random Amount MPP

Uncorrelatable payment hashes and some timing delay is not enough to break routing analysis completly. In order to improve assumptions that could be made about where a payment came from or where it is going, Multi Path Payments are needed and it should be done with more randomness. Simply spllitting up the payments evenly in half may not be good enough.

For the scenarios below, assume that payment hashes are uncorrelatable via PTLCs and that not enough of a timing delay occurred to provide a reasonable amount of amount + timing anonymity set. We disect how improvements can still be made with these features. In the examples below, this also assumes a 1 sat fee across all nodes but this will vary in reality.

#### Single payment analysis

![Single Payment Analysis](./images/SplinteredPayments-SinglePathPayment-red.png)

In the image above, we can see a basic payment flow through 4 routing nodes in order to pay a 100 sat invoice. Routing through 4 hops on the Lightning Network should be able to provide pretty good source & destination anonymity at the surface level. However, let's consider in this example that the first hop and the last hop are the same actor, indicated by the red circles above. A single actor sitting in multiple locations may not be able to prove that a certain payment flow through their nodes, but they have a strong indication it did, with some possible assumptions of the nodes that it may have also flowed through and who might be the source and destination.

Even with timing delays built in, the anonymity set now because the question as to "how many ~100 sat payments flowed through the same-actor routing nodes during the time delay window?" Fee calculations are built into the public gossip layer of the Lightning Network, so it is not far off to believe that they can be reverse calculated to find all possible routes that a payment took if it came in one actor's node at 104 sats and went through another of that actor's nodes at 100 sats. Even if each route did not cost 1 sat, a calculation could still be made to theorize all the possible routes. Over paying gives the payer a bit more ambiguity as to the routes taken in this example. Though even knowing a few hops in a route (both of the observer's nodes) can be enough to narrow down the possible source and destinations. This can be further analyzed if the observer had current balance information into the routing nodes that sit between their node, especially if the amounts are higher and are more limited in the paths that could be taken successfully.

#### Multi Path payment analysis

With MPP, we can see how improvements can be made today by splitting up the payment into multiple shards. All major implementations of the Lightning Network support this.

![MPP Payment Analysis](./images/SplinteredPayments-SimpleMPPPayment-red.png)

In the example above, we were able to improve the visibility that the observer had insights into by splitting up the payment into 3 pieces that sent across multiple entry nodes and multiple exit nodes. In this example, a observer with two of the nodes was only have to see a 50 sat payment flow across. The observor does not know the exact amount being paid for anymore, but they still do have a route analysis concern by estimating routes taken by the amount difference received by the final node. However, if more payers on the Lightning Network utilized MPP, we would be able to add more of an anonymity set. Instead of "how many ~100 sat payments did an observer's nodes route?" becomes "how many 50 sat pieces did an observer's nodes route?" Effectively multiplying each payment part's anonymity set by a possible 2 - 10+ (or how ever many MPP shards was common on Lightning - TODO should this be researched into defaults on LN implementations?), depending on how common amounts might be more frequent by more participants splitting their payments into common smaller denominations.

#### Complex MPP analysis

Let's look at a more complex example of MPP, where we split the payments into tiny common amount denominations of 7 with some repeated nodes receiving multiple parts.

![MPP Payment Analysis](./images/SplinteredPayments-AdvancedMPP-red.png)

By splitting the payments into smaller denonminzations, even despite taking the similar paths for some of the parts, it complicates the analysis that can be done. Even though our example observer in red can see 40 sats of that 100 sat payment, it still degrades the analysis in multiple ways. For one, it improves by removing 10 sats that the observer cannot see like they were able to in the previous MPP example. Another, since there are many low valued sat parts flowing around, if more of the network did this then it would increase the anonymity set even more. Instead of dividing a payment by 2 or 3 when making an MPP payment, payers could divide until they reach common low value amounts.

While the example above uses 10/20/30 sat parts to convey the message simply, in reality these should be small random amount sats in order to remove the fee analysis concerns.

TODO:

- Maybe which implementations support MPP today and what is their method of spliting?

### Splintered Payments

While the examples could be done today, we wanted to explore another possible tech improvement to make amount based routing analysis more difficult. In this section we talk about the concept of Splintered Payments.

Splintered payments is a possible protocol enhancement that allows one or more MPP payments to initiaite midway through a path to a destination. This allows for further decoupling as payments flow through the network. It would no longer be the case that a payment of a certain size flowing through one node shows up later on a different node owned by the same actor but has near the exact same amount, thus ridding the amount correlatability.

![MPP Payment Analysis](./images/SplinteredPayments-MPPSplintered-red.png)

We can see in the picture a similar payment splitting mechanism to the advanced MPP scenario earlier. The payments end up taking similar splits, however the splits happen at the routing node level instead of the user having to define all the paths and repeat certain ones some of the time. Doing so provides some fee savings too.

However the main benefit is that there is more randomness introduced with the amounts and that the observor's node at the end can't correlate specific parts together. In aggregation it may be possible, but if we were able to get into a situation where many nodes on the network were always splintering, it becomes much harder to do amount correlation, even amongst parts.

One important note is that this is currently theoretical and not, to our knowledge, something that is currently being proposed as a Lightning Network protocol change. One question is whether or not you could enforce the splintering to occur or if this is something that could be acheived at a trampoline router layer, however voluntarily at the trampoline's discretion.

Until we get better decorrelation on Lightning (via PTLCs and timing delay), it may not be worth tackling this problem quite yet, however we could acheive something that may prove to be good enough by manually crafting complex small amount MPPs, which can be done today. One problem with the complexity to MPP or splintered payments is the UX concern. How much time will it take to find many successful routes of low value, especially if avoiding node reuse is a priority.

### Longer paths

(maybe a shout out to how longer paths should be considered? has any research shown how sufficient it is based on how long a path is?)

## positives

Better privacy, third party routing nodes begin to be restricted on what they can observe on the network.

## negatives / tradeoffs

Routing fees, payments taking longer, more failed routes, destination receiving their payment later.

## implementation status

- PTLC status is currently unplanned.
- Timing delay is just beginning to be a discussion point.
- Random amount MPP can be achieved today
- Splintered payments is just theory for now.

## links to further research

- Timing analysis paper
- Timing delay theories
- PTLC (suredbits posts)
- MPP/AMP
