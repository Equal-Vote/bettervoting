---
layout: default
title: 📚 Adding Documentation
nav_order: 4
parent: ✍ ️Writers
---

# Adding Documentation

Want to help improve the documentation on docs.bettervoting.com? Here's how!

TLDR, to update text on docs.bettervoting.com you can change the corresponding files under the [star-server/docs directory](https://github.com/Equal-Vote/bettervoting/tree/main/docs) using the steps described in GitHub 101.

## Markdown

Documentation is written in markdown. It's simliar to html as it allows you to define headers, bold text, hyperlinks, etc, except Markdown is significantly easier to read than HTML. 

Before making your edits review the [Markdown Cheatsheet](https://www.markdownguide.org/basic-syntax/) for a list of the features.

Note: Unlike the content in the en.yaml files, these documentation pages support full markdown

## Header

Each documentation page will start with a header similar to this one

```
---
layout: default
title: 📚 Adding Documentation
nav_order: 4
parent: ✍ ️Writers
---
```

These variables indicate the title of the document as well as where it's located in the hierarchy.

* ``layout: default`` is the same for all documents
* ``title: 📚 Adding Documentation`` let you specify the title (we like using emojis)
* ``nav_order: 4`` indicates how it should be ordred relative to the other files in the same "directory". This doesn't have to exactly correspond with it's placement. For example, you could have 3 files with nav order 2, 8, and 200. Then they would just be sorted into the 1st, 2nd, and 3rd slot.
* ``parent: ✍ ️Writers`` is the title field from the parent document. **Copy this value from the parent page rather than typing it** — titles can contain emoji, variation selectors and spacing you cannot see on screen, and if it does not match character-for-character your page will silently vanish from the navigation with no error anywhere.
* ``has_children: true`` is an optional field that should be added to documents that should be a folder for other documents

## Links between pages

Write links to other documentation pages using the **``.md`` filename**, like ``[Ties](ties.md)`` — a build plugin rewrites those to the published ``.html`` address automatically, and writing them this way means the link also works when someone reads the file on GitHub.

One catch worth knowing: that rewrite only happens when the target file **exists**. If you link to a page that has not been added yet — including one that is still sitting in an unmerged pull request — the link is left exactly as you wrote it and will not work on the published site. So add cross-links to a new page *after* it has been merged, not before.

## Renaming and moving pages

**Avoid it if the page is already published.** A page's address comes from its filename, several documentation links are built into the BetterVoting app itself, and there is currently no redirect from an old address to a new one — so a rename turns every existing link into a dead one.

You can reorganise the sidebar freely without this risk, because the navigation is built entirely from the ``parent`` and ``nav_order`` fields rather than from where files sit. Changing those moves a page in the menu while its address stays exactly the same.

## Curly braces

If you need to write literal double curly braces — ``{{`` and ``}}`` — wrap that part in ``{% raw %}`` and ``{% endraw %}``. The site's template engine reads those braces before the page is rendered and will otherwise swallow the text. This has silently broken a page before.

## Tips

After you've added new documentation pages, it could be good to link to it from info bubbles so that your page will be more discoverable. Follow [the steps at 'updating website text'](2_updating_website_text#tips-and-info-bubbles) to learn more.