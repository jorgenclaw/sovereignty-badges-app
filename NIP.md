# Sovereignty Badges — Nostr Protocol

## Events Used

### kind:30009 — Badge Definition (Addressable)
NIP-58 badge definition. Published by the issuer.

Tags: `d` (badge ID), `name`, `description`, `image`, `thumb`.

### kind:8 — Badge Award (Regular)
NIP-58 badge award. Published by the issuer to grant a badge.

Tags: `a` (reference to kind:30009 badge definition), `p` (recipient pubkey).

### kind:30008 — Profile Badges (Addressable)
NIP-58 profile badges. Published by the user to accept/display badges.

Tags: `d` = `profile_badges`, `a` (references to kind:30009 badge definitions).

## Issuer
Pubkey: `d0514175a31de1942812597ee4e3f478b183f7f35fb73ee66d8c9f57485544e4`

## Relays
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.primal.net`
