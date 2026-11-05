import { describe, test, expect } from 'vitest';
import { ElectionSettings, electionSettingsValidation, getBallotChannels, setBallotChannels } from "./ElectionSettings";
import { setVoterAuthenticationMode } from "./VoterAuthenticationMode";

describe("electionSettingsValidation — allowed_submit_types", () => {
    test("accepts undefined (no field set, defaults apply)", () => {
        const settings: ElectionSettings = { voter_access: "open", voter_authentication: {} };
        expect(electionSettingsValidation(settings)).toBeNull();
    });

    test("accepts a non-empty array of valid types", () => {
        const settings: ElectionSettings = {
            voter_access: "open",
            voter_authentication: {},
            allowed_submit_types: ["submitted_via_admin"],
        } as ElectionSettings;
        expect(electionSettingsValidation(settings)).toBeNull();
    });

    test("accepts all three valid types", () => {
        const settings: ElectionSettings = {
            voter_access: "open",
            voter_authentication: {},
            allowed_submit_types: ["submitted_via_browser", "submitted_via_admin", "submitted_via_discord"],
        } as ElectionSettings;
        expect(electionSettingsValidation(settings)).toBeNull();
    });

    test("rejects an explicitly empty allowed_submit_types array", () => {
        const settings: ElectionSettings = {
            voter_access: "open",
            voter_authentication: {},
            allowed_submit_types: [],
        } as ElectionSettings;
        const err = electionSettingsValidation(settings);
        expect(err).not.toBeNull();
        expect(err).toContain("empty");
    });

    test("rejects an array containing an invalid type string", () => {
        const settings = {
            voter_access: "open",
            voter_authentication: {},
            allowed_submit_types: ["submitted_via_browser", "submitted_via_pigeon"],
        } as unknown as ElectionSettings;
        const err = electionSettingsValidation(settings);
        expect(err).not.toBeNull();
    });
});

describe("electionSettingsValidation — ballot updates and uploaded ballots", () => {
    // ballot_updates is only allowed on email list elections, so that's the only place the two can meet
    const emailList = { voter_access: "closed", voter_authentication: { voter_id: true }, invitation: "email" } as const;

    test("allows ballot updates without uploads", () => {
        expect(electionSettingsValidation({ ...emailList, ballot_updates: true } as ElectionSettings)).toBeNull();
    });

    test("allows uploads without ballot updates", () => {
        expect(electionSettingsValidation({
            ...emailList,
            allowed_submit_types: ["submitted_via_browser", "submitted_via_admin"],
        } as ElectionSettings)).toBeNull();
    });

    test("rejects ballot updates together with uploads", () => {
        const err = electionSettingsValidation({
            ...emailList,
            ballot_updates: true,
            allowed_submit_types: ["submitted_via_browser", "submitted_via_admin"],
        } as ElectionSettings);
        expect(err).toContain("cannot be combined with uploaded paper ballots");
    });
});

describe("ballot channels", () => {
    const base: ElectionSettings = { voter_access: "open", voter_authentication: {} };

    test("round-trips each choice through allowed_submit_types", () => {
        expect(getBallotChannels(base)).toBe("online");
        for (const c of ["online", "online_and_uploads", "uploads_only"] as const) {
            expect(getBallotChannels(setBallotChannels(base, c))).toBe(c);
        }
        expect(setBallotChannels(base, "uploads_only").allowed_submit_types).toEqual(["submitted_via_admin"]);
    });

    test("uploads only accepts no voter limit, or a voter list with ids the admin manages", () => {
        const uploadsOnly = setBallotChannels(base, "uploads_only");
        expect(electionSettingsValidation(setVoterAuthenticationMode(uploadsOnly, "open_open"))).toBeNull();
        expect(electionSettingsValidation(setVoterAuthenticationMode(uploadsOnly, "closed_admin_managed_ids"))).toBeNull();
    });

    test("uploads only refuses an email list", () => {
        const s = setVoterAuthenticationMode(setBallotChannels(base, "uploads_only"), "closed_bv_managed_ids");
        expect(electionSettingsValidation(s)).toContain("need voter IDs you manage");
    });

    test("uploads only refuses a one-vote-per limit", () => {
        for (const m of ["open_unique_cookie", "open_unique_keycloak", "open_unique_ip_address"] as const) {
            const s = setVoterAuthenticationMode(setBallotChannels(base, "uploads_only"), m);
            expect(electionSettingsValidation(s)).toContain("cannot limit voters");
        }
    });

    test("online with uploads keeps every voter option", () => {
        const s = setVoterAuthenticationMode(setBallotChannels(base, "online_and_uploads"), "closed_bv_managed_ids");
        expect(electionSettingsValidation(s)).toBeNull();
    });
});
