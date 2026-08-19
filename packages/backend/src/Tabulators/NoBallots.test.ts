import { mapMethodInputs } from '../test/TestHelper'
import { VotingMethods } from './VotingMethodSelecter'

describe("Tabulating a race nobody has voted in", () => {
    // Election mkvb4f 500'd its results page: seven races, fifteen candidates each,
    // five seats each, and no ballots cast. IRV threw first, and once that was fixed
    // STAR_PR threw a different error further down the same page, so the endpoint is
    // only safe if every method can survive an empty ballot set. A race with no votes
    // yet is ordinary -- any open election with preliminary results public is in this
    // state until the first vote arrives.
    const candidates = Array.from({ length: 15 }, (_, i) => `Candidate ${i + 1}`)

    Object.keys(VotingMethods).forEach(method => {
        test(`${method} tabulates with no ballots`, () => {
            const [c, v] = mapMethodInputs(candidates, [])
            const results = (VotingMethods as any)[method](c, v, 5, {})

            expect(results).toBeDefined()
            expect(results.summaryData.nTallyVotes).toBe(0)
            // No votes means nobody can be preferred over anybody, so a method may
            // legitimately seat nobody. What it must not do is throw.
            expect(results.elected.length).toBeLessThanOrEqual(5)
        })
    })
})
