import { describe, test, expect } from 'vitest';
import { ElectionSettings, electionSettingsValidation, DEFAULT_ALLOWED_SUBMIT_TYPES } from "./ElectionSettings";

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
