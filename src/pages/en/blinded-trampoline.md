---
title: Blinded Trampoline
description: Lorem ipsum dolor sit amet - 4
layout: ../../layouts/MainLayout.astro
---

A casual follower of the Lightning Network may just assume that in building a solution that moves transactions off the blockchain to an ephemeral P2P layer that users achieve more privacy and anonymity by default. That assumption is wrong, however. The reality of the matter is quite nuanced.

# Problem statement

While senders on the lightning network have great anonymity guarantees thanks to onion routing, receivers currently have no anonymity as their nodes' public key are embedded in their invoices.

Blinded paths and trampoline routing are solutions for receivers to not explicitly embed their public keys in their invoices and maintain their anonymity on the lightning network.

# Meat

### Blinded Paths

Blinded paths are the spiritual successor to rendez-vous routing. In rendez-vous routing, the receiver chooses routes from select third-party nodes in the network to himself and passes sphinx-encrypted blobs for those routes to the sender (typically, this will be passed in the payment request). The sender completes the route by finding routes from himself to those nodes, and tries to perform the payment over these routes. The receiver has to tell the sender how many hops payer may add to a route - each hop adding more privacy for the receiver.

Blinded paths (also referred to as blinded routes, or route blinding) is a similar technique that allows a recipient to provide a blinded route to potential senders. Each node public key in the route is tweaked, and dummy hops may be included.

For blinded paths to work, the following parties would need to upgrade their nodes:

- Receivers: they needs to construct blinded node pubkeys and encrypted data
- Senders: they need to include blinding points and encrypted data into their onions
- Forwarders: they need to be able to derive shared secret to decrypt forwarding data

Thankfully, not everyone on lightning needs to update - just the parties involved in helping settle your transaction. But the more people that update to blinded paths the better, as receivers will have a bigger selection of nodes to include in their path.

### Trampoline Routing

Trampoline routing is a method of deferring route construction when making a payment to another node who has a larger view of the network. This is helpful for mobile users, particularly, as they are prone to have device and connection constraints that are not conducive to syncing the the full network graph. Trampoline nodes can calculate the missing parts of the payment route while providing the same privacy as fully source-routed payments.

The trampoline routing proposal also includes a proposal for new routing hints format that is more robust, while remaining backwards compatible. It improves upon privacy by requiring at least two trampoline nodes, and not leaking channel information. It also allows for more anonymity down the road by providing a more flexible design space.

For trampoline to work, the following parties would need to upgrade their nodes:

- Receivers: they needs to provide trampoline hints
- Senders: they need to be able to handle trampoline hints and not expect to generate the full onion end-to-end
- Trampolines: they need to be able help users route their transactions, of course!

Non-trampoline peers in the route do not need to upgrade.

### Blinded Paths + Trampoline Routing

Trampoline payments can be combined with blinded paths (or even rendez-vous routes) to improve recipient privacy.

Instead of the last trampoline sending to the recipient they will send to a blinded path (or a rendez-vous node) and never learn the recipient's identity.

This is quite novel as receivers can now accept payments anonymously from users that may have a very limited view of the network graph. Constrained, mobile phone senders also maintain the same level of privacy that a sender with the full network graph have.

# Misconceptions

- Blinded paths are not explicitly tied to the BOLT12/offers proposal. They can be integrated with BOLT11 invoices. One concern that is handled by BOLT12 is that an integration with BOLT11 would mean that invoice data would be much bigger, creating larger QR codes that are harder for phones to scan. This can be mitigated with animated QR codes, NFC, and LNURL.

# Positives

- Onions can be reused across multiple invoices
- No need for receiver to explicitly request how many hops the sender should include in their payment

# Negatives / Trade-offs

- Compared to rendezvous routing, blinded paths' privacy guarantees are a bit weaker and require more work (e.g. when handling errors).
- Upon payment failure, interaction is required from the receiver to generate a new onion
- Potentially bigger routes mean potentially higher fees for the sender and more time to execute route finding, especially with fake hops and processing tweaks.
- Trampoline route hints lead to bigger invoices if we want them to potentially be paid by "legacy" senders

# Implementation status

Core Lightning has had an undocumented and experimental implementation of blinded paths since 2020. See https://github.com/ElementsProject/lightning/pull/3623

In late June 2022, the LND team opened a PR to their lightning-onion library: https://github.com/lightningnetwork/lightning-onion/pull/57. The PR is still under review. Once it's merged in we expect work should begin to add it to LND, but that should be a lighter lift than the integration in lightning-onion.

Work on blinded paths in Eclair has been underway for a while now, but is not yet available for users. See progress here: https://github.com/ACINQ/eclair/pulls?q=blinded. It appears implementation will be tied to BOLT12: https://github.com/ACINQ/eclair/pull/2021

LDK also appears to be integrating blinded paths with BOLT12.

Eclair is currently the only implementation with support for trampoline routing.

# Links to further research

### BOLTS

Blinded Paths:

lightning/bolts#765

Trampoline:

lightning/bolts#829

lightning/bolts#836

### Misc.

Rendez-vous routing original proposal: https://lists.linuxfoundation.org/pipermail/lightning-dev/2018-November/001498.html

How route blinding fits in with BOLT12 (Offers): https://github.com/lightningnetwork/lnd/issues/5594#issuecomment-1150822223
