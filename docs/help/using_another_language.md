---
layout: default
title: Using BetterVoting in Another Language
nav_order: 21
parent: BetterVoting Documentation
---

# Using BetterVoting in Another Language

BetterVoting is available in several languages. This page explains how to choose one, what to expect, and what to do if you'd like to help add your own.

## It usually happens by itself

**BetterVoting reads the language setting from your browser and matches it if it can.** If your device is set to Spanish and Spanish is available, you'll see Spanish without doing anything.

So most people never need this page. If the site is already showing your language, nothing here applies to you.

## Choosing a language yourself

There is no language menu on the site. To pick a language, **add `?lng=` and the language code to the end of the address**:

```
https://bettervoting.com/your-election-id?lng=es
```

| Language | Code | Add to the address | |
|:---|:---|:---|:---|
| English | `en` | `?lng=en` | |
| Spanish · Español | `es` | `?lng=es` | |
| Polish · Polski | `pl` | `?lng=pl` | |
| Portuguese (Brazil) · Português | `pt-BR` | `?lng=pt-BR` | |
| German · Deutsch | `de` | `?lng=de` | *in review* |
| French · Français | `fr` | `?lng=fr` | *in review* |
| Italian · Italiano | `it` | `?lng=it` | *in review* |

Languages marked *in review* have been submitted and are being checked by a native speaker before going live — try the code and you'll see whether yours has landed yet.

More languages are added over time, so this list may be shorter than what's actually available. It costs nothing to try your own code and see.

{: .warning }
> **Your choice is remembered.** Once you've used `?lng=`, BetterVoting keeps showing you that language on later visits, even without the parameter. To switch back to English you have to say so explicitly, with `?lng=en` — clearing the parameter alone won't do it. This surprises people who were only trying a language out.

If your election link already has a `?` in it, join the language setting on with `&` instead:

```
https://bettervoting.com/your-election-id?something=1&lng=es
```

## Why some text is still in English

**This is expected, and it doesn't mean anything is broken.**

Translations cover the parts voters actually use — the ballot, the instructions for your voting method, the confirmation screen, and the main results. Administration screens and less-used pages are still English for most languages.

Anything not yet translated falls back to English rather than showing blank or breaking, so a page may legitimately be a mix of the two. Your ballot will be in your language; the deeper settings screens may not be.

**The election's own content is never translated.** Candidate names, race titles, the description written by whoever set the election up, and any message they emailed you all appear exactly as they wrote them. BetterVoting translates its own interface, not your organiser's words — so a Spanish interface can carry an English ballot question, and that's correct behaviour rather than a gap.

## If your language isn't listed

Two things worth knowing.

**Nothing is lost by using English.** Every voting method works identically in every language; the interface language changes no part of how your ballot is counted.

**You can add your language.** BetterVoting's translations are contributed by its users, and adding one needs no programming — it's a text file edited through the GitHub website. If you're comfortable in English and fluent in another language, you're qualified. See [Adding Translations](../contributions/writers/3_adding_translations.md) for the process.

Translators aren't expected to work alone or to be professional linguists. Every translation gets proof-read, and at least one proof-reader is a native speaker, so you're checked rather than trusted blindly. Helping proof-read an existing language is just as useful as starting a new one — and quite a bit quicker.

## For election administrators

**You can send voters a link that opens in their language.** Just append `?lng=` and the code to the voting link you share. That's worth doing for a group you know reads a particular language, since it removes any dependence on how their device happens to be configured.

Be aware of the two limits above when you do: the choice sticks in that person's browser afterwards, and **your own text stays in whatever language you wrote it in.** If you want your voters to read the ballot question in Spanish, you have to write it in Spanish — setting `?lng=es` translates the buttons around it, not your words.

For a mixed-language electorate, writing the important text in both languages inside the race description is more reliable than expecting the interface language to carry the meaning.
