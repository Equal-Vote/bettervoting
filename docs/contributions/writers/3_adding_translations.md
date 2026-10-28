---
layout: default
title: 🔡 Adding Translations
nav_order: 3
parent: ✍ ️Writers
---

# Adding Translations

So you want to help add more languages to bettervoting.com? Amazing! You've come to the right place.

This will walk you though how to add your translations and get them approved.

## Who should be translating?

People adding translations don't necessarily need to be native speakers, but they should at least be proficient in the language. 

The translator should also have proof readers to help verify the quality of the translation, and at least one of them will need to be a native speaker. 

Translators are encouraged to help recruit people for the proof reading process if they know someone who could be a good fit.

## Adding (or updating) translated text

All localizations are stored in the [i18n folder on the project](https://github.com/Equal-Vote/star-server/tree/main/packages/frontend/src/i18n). We have one yaml file per language, and an ``i18n.ts`` file for connecting the files to the app.

> **Please Only Translate Priority 0!** Priority 0 represents the majority of the text that a voter will see. The rest of the English text is still subject to change so in order to avoid excessive revisions we ask that translators limit themselves to Priority 0 for now.

Follow these steps to add a new translation file

1. Select the ``en.yaml`` file (which has the english text), and copy the priority 0 section (at time of writing that would be the first 300 lines).
1. Paste it in your local file editor and apply your translations. (It will probably be helpful to review [Updating Website Text](2_updating_website_text) to make sure you understand the structure).
1. Search for your language code using [wikipedia's language code list](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes) for reference.
1. Go back to the i18n folder, and [add the file](1_github_101#adding-a-file) using ``<your language code>.yaml`` as the file name or [edit the file](1_github_101#editing-a-file) if it already exists..
1. Select ``Fork this repository`` (if prompted).
1. Paste your translated text.
1. [Create a Pull Request](1_github_101#creating-a-pull-request)
1. Once your pull request is created a maintainer will review it shortly (ping [jackson@equal.vote](mailto:jackson@equal.vote) if it's not reviewed within a few days).

## Review Process

The reviewer on the pull request will merge as long as there are no technical issues with the file. They will also deploy an update to i18n.ts so that your file will be linked to the code. Once that's complete it will be live on the bettervoting.com 🥳. The maintainer will also add you to the bettervoting.com/about page since you're now officially a BetterVoting contributor!

## Viewing your changes on the site

You can view the site in your language by adding ``?lng=<your language code>`` at the end of the URL. Keep in mind that **the site will remember your selection**, so make sure to add ``?lng=en`` to the end of the URL if you ever want to change it back to English.

One or two other contributors will then proof read your translations as a quality check. The creator of the pull request doesn't necessarily need to be a native speaker, but at least one of the proof readers should be a native speaker. 

And that's it. Congratulations your language is now officially supported by BetterVoting!

Let us know if you're interested in doing more translations. We can reach out to you in the future, when we're ready for the next phase.