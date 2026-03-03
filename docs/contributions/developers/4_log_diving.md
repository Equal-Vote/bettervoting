---
layout: default
title: 🤿 Log Diving
nav_order: 4
parent: 💻 Developers
---

# Log Diving

Production logs for BetterVoting and all other Equal Vote services are available at logs.prod.equal.vote. This is critical for quickly debugging and resolving issues when they occur on production.

## Gaining Access

Reach out to Arend on slack for login credentials, then login at logs.prod.equal.vote . 

 > Checkout [#1190](https://github.com/Equal-Vote/bettervoting/issues/1190) to join the discussion for better password management practices

## Using Loki/Grafana

**Loki**: This is a service for backing up logs. This ensures that old logs are still available even when the server crashes.

**Grafana**: This is the web end point for viewing those logs, and it's what you'll interact with at 

## Grafana Query Examples

Open the Hamburger Menu then click Explore to enter queries.


You can use code mode to run some of the example queries:

**Show all logs for the star-server backend**

```
{pod=~"star-server-app-.*"}
```

**Find all 500 Errors**

```
{pod=~"star-server-app-.*"} |~ "status:50.+"
```

**Trace a specific API request**

```
{pod=~"star-server-app-.*"} |~ "ctx:c09a38fc"
```

 > For a specific api request, I recommend switching from the default sorting to newest first

**500 Errors w/o robots.txt**

```
{pod=~"star-server-app-.*"} |~ "status:50.+" != "robots.txt"
```

**Query Discord Logs**

```
{pod=~"discord-bot-app-.*"}
```