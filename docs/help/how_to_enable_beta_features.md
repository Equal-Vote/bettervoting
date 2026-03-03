---
layout: default
title: How to enable beta features
nav_order: 99
parent: BetterVoting Documentation
---

# How to enable beta features

We have a lot of features in progress that are mostly ready, but aren't quite polished enough to be enabled by default yet.

These could be a variety of things including voting methods or advanced election admin features. It also includes features that make it easier for testers to run regression testing.

Here's how you enable these features

1. Make sure you're using a browser that's compatible with the chrome web store (like Google Chrome or Opera)
2. [Install the feature flags plugin](https://chromewebstore.google.com/detail/feature-flags/hmflgmhoghcbmckbbgahfmklegllkggn?pli=1)
3. Once it's installed you can select the plugin at the top-right of the screen to choose between the features

![](../images/feature_flags.png)

By default the flags to whatever the current default is for the website. If you'd like to return to the default you can toggle the Reset flag

NOTE: At the time of writing all the flags are set to false by default, but this will change as we release more features

## Security Note (Optional)

We generally trust this plugin, but if you prefer to be cautious, you can configure it to only run when you click on it:
1. Right-click the extension icon in Chrome
2. Select "Manage Extension"
3. Under "Site access", select "On click" instead of "On all sites"

This way, the extension will only activate when you explicitly click its icon.