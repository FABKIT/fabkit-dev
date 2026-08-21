# FABKIT Card Preset Links

A preset link is a URL that opens [FABKIT's card creator](https://fabkit.io) pre-filled
with a specific card. It's meant for third-party tools that want to hand a user off into
FABKIT with a card already drafted — no FABKIT account, backend, or API key required. The
whole card description lives in the URL itself.

```
https://fabkit.io/#/preset?link=<url-encoded JSON payload>
```

> **The `/#/` matters.** FABKIT uses hash-based routing, so the route path and its query
> string both live *after* the `#`. `https://fabkit.io/preset?link=...` (no `#`) will not
> work.

Opening that URL resolves the card (no network fetch is involved — see
[Card backs](#card-backs)) and hands off to the card creator with it loaded. It's a
dedicated resolver route, not the card creator itself — you're never left looking at a
half-loaded editor.

Jump to: [Quick example](#quick-example) · [Payload shape](#payload-shape) ·
[Field reference](#field-reference) · [Card backs](#card-backs) ·
[Rules text markup](#rules-text-markup) ·
[Error handling](#error-handling)

## Quick example

```json
{
  "CardType": "action",
  "CardName": "Rolling Thunder",
  "CardPitch": 2,
  "CardResource": "1",
  "CardPower": "3",
  "CardDefense": "3",
  "CardClass": "ranger",
  "CardTalent": "lightning",
  "CardRarity": "rare",
  "CardText": "Whenever you hit a hero with an arrow attack action card this turn, they get **Dominate**.\n\n:power: Go again.",
  "CardBack": { "id": 12 }
}
```

Build the URL by JSON-stringifying the payload and URL-encoding it into the `link` param:

```js
const url =
  "https://fabkit.io/#/preset?link=" +
  encodeURIComponent(JSON.stringify(payload));
```

Opening that URL always starts a **brand-new, unsaved card** in the editor — it never
overwrites or merges into whatever the user already has open.

## Payload shape

The payload is just the card's fields, flat — see [Field reference](#field-reference)
below for the full list. Every field is **optional**; omit any you don't want to set and
it falls back to the card creator's normal default. There is no required minimum — even
`{}` is a valid (if boring) preset link.

**This whole feature is best-effort.** An invalid value or an unrecognized field is
silently dropped rather than blocking the load — the card still opens with everything
that *did* parse correctly. See [Error handling](#error-handling) for how to debug a
link that isn't behaving as expected. There's no version field: a preset link is never
stored anywhere, so there's nothing to migrate — a sender always builds one fresh, and
new fields are added in a way that doesn't break links built against an older field set.

## Field reference

| Field | Type | Notes |
|---|---|---|
| `CardType` | string | One of the [card types](#card-types) below |
| `CardName` | string | |
| `CardPitch` | `1` \| `2` \| `3` | |
| `CardResource` | string | Resource cost, printed as-is (e.g. `"1"`) |
| `CardPower` | string | |
| `CardDefense` | string | |
| `CardLife` | string | |
| `CardHeroIntellect` | string | |
| `CardText` | string | Rules text — see [restricted markup](#rules-text-markup) |
| `CardClass` | string | One of the [classes](#classes) below |
| `CardSecondaryClass` | string | Same value set as `CardClass` |
| `CardTalent` | string | One of the [talents](#talents) below |
| `CardSubType` | string | Free text (e.g. `"Ninja Attack"`) |
| `CardRarity` | string | One of the [rarities](#rarities) below |
| `CardWeapon` | `"(1H)"` \| `"(2H)"` | |
| `CardMacroGroup` | string | Only meaningful for macro cards |
| `CardSetNumber` | string | |
| `CardArtworkCredits` | string | Artist credit line |
| `CardBackStyle` | `"dented"` \| `"flat"` | Frame style variant |
| `CardBackSplit` | number, `0.02`–`0.98` | Hybrid frame seam position |
| `CardBackBlend` | number, `0`–`1` | Hybrid frame seam softness |
| `CardBack` | object | See [Card backs](#card-backs) |
| `CardBackRight` | object | Right half of a hybrid frame; same shape as `CardBack` |
| `meldActiveHalf` | `"A"` \| `"B"` | Which meld half is shown first in the editor |
| `meldHalfA`, `meldHalfB` | object | See [Meld cards](#meld-cards) |

Card artwork itself (`CardArtwork`/`CardArtPosition`) is **not** settable via a preset
link, including per meld half — it's out of scope for this feature. Set it interactively
in the editor after opening the preset. Same for `CardOverlay`/`CardOverlayOpacity` —
that's a dev-only debug overlay, not a real card-creation field, so it isn't part of the
preset-link contract either. Custom (image-URL-based) card backs are out of scope too —
see [Card backs](#card-backs).

### Card types

`action`, `attack_reaction`, `block`, `defense_reaction`, `demi_hero`, `equipment`,
`hero`, `instant`, `macro`, `mentor`, `resource`, `token`, `weapon`,
`weapon_equipment`, `ally`, `event`, `meld`

### Classes

Valid for both `CardClass` and `CardSecondaryClass`:

`none`, `adjudicator`, `assassin`, `bard`, `brute`, `generic`, `guardian`,
`illusionist`, `mechanologist`, `merchant`, `necromancer`, `ninja`, `ranger`,
`runeblade`, `shapeshifter`, `warrior`, `wizard`

### Talents

`none`, `chaos`, `draconic`, `earth`, `elemental`, `ice`, `light`, `lightning`,
`mystic`, `pirate`, `revered`, `reviled`, `royal`, `shadow`

### Rarities

`basic`, `common`, `rare`, `superrare`, `majestic`, `legendary`, `fabled`, `token`,
`promo`, `marvel`

Any value outside these lists is dropped, not rejected — the rest of the card still loads.

## Card backs

`CardBack` and `CardBackRight` take a built-in ("stock") frame, by id:

```json
{ "id": 12 }
```

Stock ids are stable across every FABKIT install (they come from a static manifest), so
you can hardcode one once you know it. There's currently no public lookup endpoint for
these ids — if you need one, open the card creator, pick the frame you want in the
background picker, and ask a FABKIT maintainer, or inspect the manifest directly if you
have repo access (`public/cardbacks/cardbacks.json`).

Custom (image-URL-based) card backs are **not** settable via a preset link — that's out
of scope for this feature. Upload one interactively in the editor after opening the
preset, using the same upload dialog available from the background picker.

## Rules text markup

`CardText` is plain text with a small set of formatting markers — not HTML, not
Markdown, not FABKIT's internal editor format. You never need to know anything about
FABKIT's rich-text editor to write it.

| Syntax | Result |
|---|---|
| `**text**` | **Bold** |
| `__text__` | <u>Underline</u> |
| `\n` (single newline) | Line break within the same paragraph |
| `\n\n` (blank line) | New paragraph |
| `:shortcode:` | A FAB keyword icon — see the list below |

**Icon shortcodes:** `:cost:` `:power:` `:defense:` `:life:` `:intellect:` `:tap:`
`:untap:` `:chi:`

Anything that doesn't match one of these — an unmatched `**`, an unrecognized
`:shortcode:` — is left as plain literal text. It's never an error.

```json
"CardText": "Deal 3 damage.\n\nGets **Dominate**.\n\n:power: Go again."
```

## Meld cards

Meld cards have two independent halves, `meldHalfA` and `meldHalfB`. Each takes a subset
of the top-level fields:

```json
{
  "CardType": "action",
  "CardName": "Heads",
  "CardClass": "ranger",
  "CardSecondaryClass": "none",
  "CardSubType": "Attack",
  "CardTalent": "lightning",
  "CardText": "Deal 2 damage."
}
```

Set the top-level `CardType` to `"meld"` for the card to render as a meld card at all;
`meldHalfA`/`meldHalfB` are ignored otherwise.

## Error handling

Every problem with a preset link — a malformed payload, an invalid field value, a stock
`CardBack` id that doesn't exist — is logged to the browser's JavaScript console with a
`[preset-link]` prefix, and then dropped. The card still opens with whatever *did* work.

If your preset link "does nothing" or looks wrong, open the browser console
(<kbd>F12</kbd> in most browsers) before clicking the link and look for `[preset-link]`
messages — they name the exact field that was rejected and why.
