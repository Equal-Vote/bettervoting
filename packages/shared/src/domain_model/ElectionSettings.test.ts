import { describe, test, expect } from 'vitest';
import { ElectionSettings, electionSettingsValidation } from "./ElectionSettings";

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
