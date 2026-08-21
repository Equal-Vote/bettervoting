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

## Previewing your changes locally

For a typo or a quick wording change, editing on GitHub as described above is the easiest way — you don't need any of this.

It's more useful when you're **adding a new page or moving things around**. GitHub's preview shows you Markdown, but not this site: it won't show where your page lands in the sidebar, and it won't tell you whether the ``parent:`` in your header matched. If you have Docker, you can run the whole documentation site on your own machine and see exactly what gets published.

Note that the docs are **not** part of the app's ``docker-compose.yml`` — that runs the website itself (backend, database, Keycloak), not this site. These pages are built by GitHub Pages straight from the ``docs/`` folder, so previewing them means running Jekyll yourself.

From inside the ``docs/`` directory, run:

```bash
docker run --rm -v "$PWD":/site -w /site -p 4000:4000 ruby:2.7 sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --port 4000"
```

Then open [http://localhost:4000](http://localhost:4000). Edit any ``.md`` file and Jekyll rebuilds it automatically — just refresh the page. Press ``Ctrl+C`` to stop the server.

The first run downloads and installs the gems, which takes a few minutes. To keep them between runs so later starts are quick, add a named volume:

```bash
docker run --rm -v "$PWD":/site -w /site -v bvdocs-gems:/usr/local/bundle -p 4000:4000 ruby:2.7 sh -c "bundle install && bundle exec jekyll serve --host 0.0.0.0 --port 4000"
```

The ``Gemfile`` in this directory installs the ``github-pages`` gem, which is the same gem GitHub Pages runs. That way what you see locally matches what gets published.

### Troubleshooting

* **"No repo name found. Specify using PAGES_REPO_NWO..."** — one of the Pages plugins needs to know which repository it's building. It usually reads that from your ``origin`` git remote, but the command above only mounts the ``docs/`` folder, and ``.git`` lives a level up outside the container. That's why ``_config.yml`` sets ``repository: Equal-Vote/bettervoting``. If you've removed that line or you're building a copy of this folder somewhere else, add ``-e PAGES_REPO_NWO=Equal-Vote/bettervoting`` to the ``docker run`` command instead.
* **Bundler says ``ffi`` is incompatible with your Ruby version** — make sure you're using ``ruby:2.7`` as shown above. The ``Gemfile`` pins ``ffi`` for exactly this reason, but a newer Ruby image will still pull in other gems that don't match Jekyll 3.9.
* **Don't use the ``jekyll/jekyll`` Docker images** — they're no longer maintained, and the tags you'd expect (like ``3.9``) don't exist anymore. The ``ruby:2.7`` image plus the ``github-pages`` gem is what this site actually builds with.

## Links between pages

Write links to other documentation pages using the **``.md`` filename**, like ``[Ties](ties.md)`` — a build plugin rewrites those to the published ``.html`` address automatically, and writing them this way means the link also works when someone reads the file on GitHub.

One catch worth knowing: that rewrite only happens when the target file **exists**. If you link to a page that has not been added yet — including one that is still sitting in an unmerged pull request — the link is left exactly as you wrote it and will not work on the published site. So add cross-links to a new page *after* it has been merged, not before.

## Renaming and moving pages

**Think twice before renaming a page that is already published.** A page's address comes from its filename, and several documentation links are built into the BetterVoting app itself, so a rename changes an address other things point at.

It is not a one-way door, though. The site is built with the ``jekyll-redirect-from`` plugin, which lets a renamed page keep its old address working. List the old address in the renamed file's header:

```yaml
---
layout: default
title: Ties
nav_order: 6
parent: BetterVoting Documentation
redirect_from:
  - /help/tie_breakers.html
---
```

The build then writes a small page at ``/help/tie_breakers.html`` that forwards to the new address, so existing links and bookmarks still arrive in the right place. Leave that line in permanently — the old address works for exactly as long as it is listed — and give a page one entry for every address it has ever had.

Two things a redirect does not cover. Renaming a **heading** changes the link to that heading, and two of the app's links point at one (``ties.html#random-tie-breakers`` is shown to voters when a tie is broken), so heading text is part of an address too. And links written inside other documentation pages are worth updating to the new filename anyway, so readers aren't bounced through a redirect.

You can reorganise the sidebar without any of this, because the navigation is built entirely from the ``parent`` and ``nav_order`` fields rather than from where files sit. Changing those moves a page in the menu while its address stays exactly the same.

## Curly braces

The engine that builds this site reads your page before it becomes HTML — including inside code blocks — and treats anything wrapped in double curly braces as a value to substitute. If your page means to *show* those characters, they disappear from the published page, and the only trace is a warning in the build log that nobody reads. This has silently broken a page here before.

To keep them, wrap that stretch of the page in a ``raw`` block. Everything between the two tags is published exactly as written:

<!-- The opening brace of each tag below is emitted as a string, so the build
     prints the tags instead of running them. Edit with care: written plainly,
     they would switch the engine off in the middle of this page. -->

```
{{ "{" }}% raw %}
Your total is {{ "{{" }} total }}
{{ "{" }}% endraw %}
```

## Tips

After you've added new documentation pages, it could be good to link to it from info bubbles so that your page will be more discoverable. Follow [the steps at 'updating website text'](2_updating_website_text#tips-and-info-bubbles) to learn more.