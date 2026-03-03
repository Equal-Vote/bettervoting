---
layout: default
title: Security Options
nav_order: 7
parent: BetterVoting Documentation
---

# BetterVoting Security Options

BetterVoting offers a spectrum options to fit your needs, whether it's a highly secure election, or a highly accessible informal poll.

This article reviews the security options on BetterVoting, and at the end we also answer some common compliance questions.

## Restricted Elections (those with a voter list)

Restricting to a voter list is ideal for high stakes elections where you want to guarantee each voter is validated before voting. BetterVoting supports Email Lists or ID Lists.

### Email List (Recommended)

Using an email list is recommended as the most secure method. The flow will proceed as follows:

1. Add a list of emails to your voter roll.
1. Finalize the election.
1. Draft a message to your voters announcing the start of the election.
1. BetterVoting will send voters an email with your message, as well as a button with their unique voting link.
1. After voting voters receive a receipt in their email confirming that the ballot was counted, and giving them the option to view their ballot.
1. As voters fill out their ballot, you can track which voters have cast their ballot and which ones still need to vote. 
1. You can send any number of email blasts during the election, and these can be filtered to only target voters who still need to vote.
1. Once the election is complete you also use the email blast tool to notify voters of the results.

> *What if a voter doesn't receive an email?*: If a user is having trouble receiving their email for any reason, then the election admin also has the ability to obtain the unique voting url and share it with the voter directly. These actions get tracked in the audit log for full transparency in case any of anything need to be verified later.

> *Most of my voters have emails, but there's some exceptions. Could I still use this option?*: Yes! As a workaround, you can give them dummy emails using a + in a staff email (so noreply+1@name.org , noreply+2@name.org, etc). That lets you create separate email entries without actually creating multiple emails. Then during the election, you can reveal the voting urls for those voters and then manually distribute them.

### ID List

If you don't have a full list of emails, then the ID list is also available as a flexible option. The flow will proceed as follows:

1. Add a list of voter ids to your voter roll.
1. Finalize the election.
1. Distribute voter ids and the shared vote link to voters.
1. Voters can enter their voter id on the voting page, to authenticate themselves.
1. As voters fill out their ballot, you can track which voters have cast their ballot and which ones still need to vote. 

## Unrestricted Elections (those without voter List)

For more casual elections, like online polls, you won't have a voter list available, but BetterVoting still offers some security options to fit your needs.

### One vote per device

Stores a cookie to ensure voter can't vote multiple times while using the same browser. This is default option when trying to ensure one person, one vote for casual elections. It provides a great user experience, while also ensuring basic security.

### One vote per user 

Only allow votes from people who have created a BetterVoting account and verified their email address. Great for maximizing security for anonymous public Elections.

### One vote per Network

Only allows one vote per IP address. This makes it harder to vote multiple times on the same device, but it won't allow for multiple voters if they're sharing the same WiFi network. Great for adding security in anonymous public Elections, without impacting the user experience.

### No Limit

Allows unlimited votes per device. Great for demos or where all your voters are sharing the same device.

## Other Security FAQ

 * **How does BetterVoting ensure Ballot Secrecy?**: BetterVoting maintains a link between voters and their ballot, however this information is hidden from the election admin. In rare scenarios where this link need to be revealled, then this action will be logged to the audit log for transparency. 
 * **How does BetterVoting handle credentialing?**: This is beyond the scope of the tool, and BetterVoting will assume that any inputted lists have already been credentialled for the election. Check out the [Paper Ballots](https://docs.bettervoting.com/help/paper_ballots.html) to learn more about our recommendations for credentialling.
 * **How long are elections preserved?**: By default BetterVoting will keep election results preserved indefinitely. 
 * **How does BetterVoting meet observability requirements?**: Some regulations require an option for candidates to have observers at the polls, or during the tally. How this applies to an online voting platform can vary depending on the wording, but BetterVoting is [open source](https://github.com/Equal-Vote/bettervoting?tab=AGPL-3.0-1-ov-file), and we're also working on including more auditing features for further transparency.
 * **I have more security and compliance questions!**: No problem! Please reach out to our team at elections@equal.vote and we're happy to provide more context.