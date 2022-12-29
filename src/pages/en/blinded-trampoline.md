---
title: Blinded Paths + Trampoline Routing
description: Lorem ipsum dolor sit amet - 4
layout: ../../layouts/MainLayout.astro
---

## Problem statement

While senders on the lightning network have great anonymity guarantees thanks to onion routing, receivers currently have no anonymity as their nodes' public key are embedded in their invoices.

Blinded paths and trampoline routing are solutions for receivers to not explicitly embed their public keys in their invoices and maintain their anonymity on the lightning network.

## Blinded Paths

Blinded paths are the spiritual successor to rendez-vous routing. In rendez-vous routing, the receiver chooses routes from select third-party nodes to himself and passes onion-encrypted blobs for those routes to the sender (typically, this will be passed in the payment request). The sender completes the route by finding routes from himself to the rendez-vous node (or introduction point), and tries to perform the payment over these routes. The receiver has to tell the sender how many hops he may add to a route - each hop adding more privacy for the receiver.

Blinded paths (also referred to as blinded routes, or route blinding) is a similar technique that allows a recipient to provide a blinded route to potential senders. Each node public key in the route is tweaked, and dummy hops may be included.

#### How it usually be - Source routing, all constructed by sender

![Source routing](/blinded-routes-source.svg)

#### How it could be - Blinded routing, tail constructed by receiver

![Blinded routing](/blinded-routes-blinded.svg)

#### Legend

![Routing legend](/blinded-routes-legend.svg)

Blinded paths are more flexible and simple than rendez-vous routing. With blinded paths, the public keys of the nodes in the route are just replaced with random public keys while letting senders choose what data they put in the onion for each hop. Rendez-vous senders cannot add data to the partial onion or reuse it. This means that amounts must be fixed ahead of time in the partial onion which is conducive to multi-part payments. Blinded routes are also reusable when used with onion messaging.

For blinded paths to work, the following parties would need to upgrade their nodes:

- Receivers: they needs to construct blinded node pubkeys and encrypted data
- Senders: they need to include blinding points and encrypted data into their onions
- Forwarders: they need to be able to derive shared secret to decrypt forwarding data

Thankfully, not everyone on lightning needs to update - just the parties involved in helping settle the transaction. But the more people that update to blinded paths the better, as receivers will have a bigger selection of nodes to include in their path.

## Trampoline Routing

Trampoline routing is a method of deferring route construction when making a payment to another node who has a larger view of the network. This is helpful for mobile users, particularly, as they are prone to have device and connection constraints that are not conducive to syncing the the full network graph. Trampoline nodes can calculate the missing parts of the payment route while providing the same privacy as fully source-routed payments.

The trampoline routing proposal also includes a proposal for new routing hints format that is more robust, while remaining backwards compatible. It improves upon privacy by requiring at least two trampoline nodes, and not leaking channel information. It also allows for more anonymity down the road by providing a more flexible design space.

For trampoline to work, the following parties would need to upgrade their nodes:

- Receivers: they needs to provide trampoline hints
- Senders: they need to not expect to generate the full onion end-to-end
- Trampolines: they need to be able help users route their transactions, of course!

Non-trampoline peers in the route do not need to upgrade.

## Blinded Paths + Trampoline Routing

Trampoline payments can be combined with blinded paths (or even rendez-vous routes) to improve recipient privacy.

Instead of the last trampoline sending to the recipient they will send to a blinded path (or a rendez-vous node) and never learn the recipient's identity.

This is quite novel as receivers can now accept payments anonymously from users that may have a very limited view of the network graph. Constrained, mobile phone senders also maintain the same level of privacy that a sender with the full network graph have.

Trampoline payments can also be nested and jump between multiple trampolines before reaching the receiver.

## Picking a Blinded Path

There are a few UX challenges in picking your points for a blinded path. More novice users will want blinded paths constructed for them by default. Consumer level lightning wallets will all want to do it in a similar manner to ensure the whole ecosystem has a high degree of privacy. First, we must settle on a uniform number of hops to use in a blinded path. Three (one introduction point plus two secondary) seems to be the bare minimum but perhaps wallets will want two or three different paths included in their onion. Second, we must encourage major service providers and nodes on the lightning network to adopt blinded paths so that they can all be used as introduction points. To increase privacy, wallets shouldn't point their users to their own service's node by default, but rather shuffle randomly through an assortment of highly trafficked nodes on the network that support blinded paths.

More advanced wallets should attempt to follow similar guidelines as consumer level wallets. Users should be warned of implications if they choose to construct an onion using a non-standard size.

Core Lightning has had support for manually constructing blinded paths via CLI for a while, but the UX burden of having to construct it manually means few end-users in practice. We encourage applications and implementations to offer both automatic and manual construction of blinded paths to encourage common use but also give power users optionality for more control.

## Misconceptions

The biggest misconception is that blinded paths are explicitly tied to the BOLT12/offers proposal. They are not. They can be integrated with BOLT11 invoices. One concern that is handled by BOLT12 is that an integration with BOLT11 would mean that invoice data would be much bigger, creating larger QR codes that are harder for phones to scan. This can be mitigated with animated QR codes, NFC, and LNURL. BOLT12 ultimately has much more flexibility for updates though.

## Trade-offs

### Positives

- Onions can be reused across multiple invoices
- No need for receiver to explicitly request how many hops the sender should include in their payment

### Negatives

- Compared to rendezvous routing, blinded paths' privacy guarantees are a bit weaker and require more work (e.g. when handling errors).
- Upon payment failure, interaction is required from the receiver to generate a new onion
- Potentially bigger routes mean potentially higher fees for the sender and more time to execute route finding, especially with fake hops and processing tweaks.
- Trampoline route hints lead to bigger invoices if we want them to potentially be paid by "legacy" senders

## Attacks

Two attacks are spelled out in BOLT that important to acknowledge. Firstly, channels have the potential to be unblinded with payment probing. Recipients must be careful when using route blinding for payments to avoid letting attackers guess which nodes are hidden inside of the route. If an attacker knows that the receiver is at most N hops away from the introduction point, they can delay payment, watch for new channel updates with fee or CLTV increases that are within that radius from the introduction point, attempt payment, see the failure and be able to infer that the counterparty of the fee increase is the final recipient.

This is all exacerbated with the inclusion of BOLT12. With BOLT12 attackers don't even have to attempt the payment. They can simply request invoices from the recipient over time and detect when the recipient raises the fees or CLTV of the blinded route, and correlate them with recent channel updates. To mitigate this, it is important for users to add a large enough margin to the current values actually used by nodes inside the route to protect against future raises.

A similar attack can be executed by waiting for nodes to go offline and attempting payment, instead of waiting for channel updates with value increases. To mitigate, receivers should choose hops with high uptime.

## Implementation status

Core Lightning has had an undocumented and experimental implementation of blinded paths since 2020. See [here](https://github.com/ElementsProject/lightning/pull/3623).

In late June 2022, the LND team opened a PR to their lightning-onion library. [The PR](https://github.com/lightningnetwork/lightning-onion/pull/57) is still under review. Once it's merged in we expect work should begin to add it to LND, but that should be a lighter lift than the integration in lightning-onion.

Work on blinded paths in Eclair has been underway for a while now, but is not yet available for users. See progress [here](https://github.com/ACINQ/eclair/pulls?q=blinded). It appears implementation will be tied to BOLT12, see [here](https://github.com/ACINQ/eclair/pull/2021).

LDK also appears to be integrating blinded paths with BOLT12.

Eclair is currently the only implementation with support for trampoline routing.

## Links to further research

### BOLTS

[Route Blinding (Feature 24/25)](https://github.com/lightning/bolts/pull/765)

[Trampoline Routing (2021 edition) (Feature 56/57)](https://github.com/lightning/bolts/pull/829)

[Trampoline onion format (Feature 56/57)](https://github.com/lightning/bolts/pull/836)

### Misc.

[Rendez-vous routing original proposal](https://lists.linuxfoundation.org/pipermail/lightning-dev/2018-November/001498.html)

[How route blinding fits in with BOLT12 (Offers)](https://github.com/lightningnetwork/lnd/issues/5594#issuecomment-1150822223)
