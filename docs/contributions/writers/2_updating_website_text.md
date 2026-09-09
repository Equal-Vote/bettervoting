---
layout: default
title: 📰 Updating Website Text
nav_order: 2
parent: ✍ ️Writers
---

# Updating Website Text

Did you find a typo on BetterVoting.com? Or may there's some paragraphs that need to be rewritten? Follow this guide to learn about to make these changes yourself!

TLDR, to update text on the website you can file changes to [en.yaml](https://github.com/Equal-Vote/star-server/blob/main/packages/frontend/src/i18n/en.yaml) using the steps described in GitHub 101.

If you're looking for specific text, and it's not in ``en.yaml`` then you may need to [Search the repo](1_github_101#search-the-repo) to find it.

This article will go over a few more quirks of the ``en.yaml`` file.

## YAML File Type

All of the BetterVoting text is stored in a YAML format. This stores text as a series of variables (also called key value pairs), and YAML in particular is designed to be very human readable (as opposed to similar formats such as JSON or XML).

An example line of YAML is ``first_name: Arend``. So ``first_name`` is the variable name, and ``Arend`` is the content. As a writer, you need to be careful to only edit the content portions of the YAML files, as the variable names are important for the software to identify the text.

That's all you need to know but [here's a yaml tutorial](https://www.youtube.com/watch?v=cdLNKUoMc6c) in case you want a deeper dive.

## Templated Text

Here's the current first line from ``en.yaml``. 

```
start_time: '{% raw %}{{capital_election}} begins on {{datetime, datetime}}{% endraw %}'
```

Any text that's wrapped in the ``{% raw %}{{...}}{% endraw %}`` are templated variables. Those variables can reference different things depending on what the software inputs, however they're usually referencing the keyword section lower in the file. You can search ``keyword:`` to find it.

In particular there's a different set of terminology depending on if the election is configured as a "election" or a "poll". Also if you prefix ``capital_`` at the beginning of the template variable then it'll capitalize the first letter.

With that knowledge if we refer back to the example, ``{% raw %}{{capital_election}}{% endraw %}`` will become either "Election" or "Poll" since these are the capitalize versions of the ``election:`` terms under ``keyword:``. ``{% raw %}{{datetime, dateime}}{% endraw %}`` will be the date of the election, however since there's no ``datetime:`` field under ``keyword:`` you can assume that the content is just supplied from the codebase.

``$t(methods.ranked_robin.short_name)`` is a much rarer form of templated text. It operates similarly except that it references the yaml structure directly. 

## Tips and Info Bubbles

It's a good habit to add lots of info bubbles across the site. This can also be achieved just by making edits to en.yaml.

Adding ``!tip(star)`` to the end of one of your entries, will add an info bubble referencing the STAR tip. 

If you search for ``tips:``. You can find the text for star below it. Each entry will have a title and a description, along with an optional learn_link. The learn link will be displayed as "learn more" at the end of the tip, and it's a good place to redirect to a more specific article on docs.bettervoting.com, starvoting.org or elsewhere.

## Markdown

When adding content you can also use a couple of markdown conventions. Markdown is a formatting language similar to HTML where you can format bold text, add links, etc.

### Links

```
Ties are broken using the [Offical Tiebreaker Protocol](https://starvoting.org/ties) whenever possible.
```

The above example will render as follows:

Ties are broken using the [Offical Tiebreaker Protocol](https://starvoting.org/ties) whenever possible.

You can use the ``[ text ]( url )`` pattern whenever you want to include hyperlinks

### Bold

```
voting_end: '**Voting ends on {% raw %}{{datetime, datetime}}{% endraw %}**'
```

The above example bolds the text by adding ``** ... **`` around it

### Full Markdown

Those are the only formatting features we support at the moment, but you can reference the [Markdown Cheatsheet](https://www.markdownguide.org/basic-syntax/) for other markdown features and file a feature request if it would be helpful for bettervoting to support more features. 
