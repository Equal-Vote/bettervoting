# BetterVoting

A platform for running voting-method elections — organizers set up an Election, voters cast Ballots, and the results are tabulated by the Race's chosen voting method.

## Language

**Election**:
A single voting event set up by an organizer, containing one or more Races. Voters interact with the Election as a whole — one Ballot per voter per Election, not per Race. The `term_type` setting lets an organizer label their Election as "Poll" instead of "Election" in the UI (an intentional, user-facing alias for a lightweight/informal Election) — this is display copy, not a distinct domain concept.
_Avoid_: Contest

**Race**:
A single decision within an Election — its own voting method, candidate list, and winner count. An Election with more than one Race lets voters decide multiple offices/questions on the same Ballot.
_Avoid_: Poll (an older, stale usage — some code comments still equate "poll" with Race, predating the introduction of "Race" as a term; the current, correct meaning of "Poll" is an alias for Election, see above), Contest

**Ballot**:
One voter's full submission for an Election. Contains one Vote per Race in that Election.

**Vote**:
One voter's scores for a single Race within their Ballot, identified by `race_id`.
