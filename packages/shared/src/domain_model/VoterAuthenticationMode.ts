import { ElectionSettings, VoterAccess, InvitationType, authentication } from "./ElectionSettings";

// The six canonical shapes an election's voter-authentication settings can take.
// These are the *only* combinations the UI produces and the *only* combinations
// accepted by electionSettingsValidation. Any other combination — including
// latent fields like phone/address/registration_data — is rejected.
export const VoterAuthenticationModes = [
  'open_unique_cookie',
  'open_unique_keycloak',
  'open_unique_ip_address',
  'open_open',
  'closed_admin_managed_ids',
  'closed_bv_managed_ids',
] as const;
export type VoterAuthenticationMode = typeof VoterAuthenticationModes[number];

interface ModeShape {
  voter_access: VoterAccess;
  voter_authentication: authentication;
  invitation?: InvitationType;
}

const MODE_SHAPES: Record<VoterAuthenticationMode, ModeShape> = {
  open_unique_cookie:       { voter_access: 'open',   voter_authentication: { voter_id: true } },
  open_unique_keycloak:     { voter_access: 'open',   voter_authentication: { email: true } },
  open_unique_ip_address:   { voter_access: 'open',   voter_authentication: { ip_address: true } },
  open_open:                { voter_access: 'open',   voter_authentication: {} },
  closed_admin_managed_ids: { voter_access: 'closed', voter_authentication: { voter_id: true } },
  closed_bv_managed_ids:    { voter_access: 'closed', voter_authentication: { voter_id: true }, invitation: 'email' },
};

function authMatches(actual: authentication | undefined, expected: authentication): boolean {
  if (!actual) return false;
  // Reject any latent field the canonical shapes never use.
  if (actual.phone !== undefined) return false;
  if (actual.address !== undefined) return false;
  if (actual.registration_data !== undefined) return false;
  if (actual.registration_api_endpoint !== undefined) return false;
  const flag = (v: boolean | undefined) => v === true;
  return flag(actual.voter_id)   === flag(expected.voter_id)
      && flag(actual.email)      === flag(expected.email)
      && flag(actual.ip_address) === flag(expected.ip_address);
}

export function getVoterAuthenticationMode(settings: ElectionSettings): VoterAuthenticationMode {
  for (const mode of VoterAuthenticationModes) {
    const shape = MODE_SHAPES[mode];
    if (settings.voter_access !== shape.voter_access) continue;
    if (settings.invitation !== shape.invitation) continue;
    if (!authMatches(settings.voter_authentication, shape.voter_authentication)) continue;
    return mode;
  }
  throw new Error(
    `Election settings do not match any canonical voter authentication mode `
    + `(voter_access=${JSON.stringify(settings.voter_access)}, `
    + `invitation=${JSON.stringify(settings.invitation)}, `
    + `voter_authentication=${JSON.stringify(settings.voter_authentication)})`
  );
}

export function setVoterAuthenticationMode(
  settings: ElectionSettings,
  mode: VoterAuthenticationMode,
): ElectionSettings {
  const shape = MODE_SHAPES[mode];
  return {
    ...settings,
    voter_access: shape.voter_access,
    voter_authentication: { ...shape.voter_authentication },
    invitation: shape.invitation,
  };
}
