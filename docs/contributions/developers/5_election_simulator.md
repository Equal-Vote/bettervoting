---
layout: default
title: Election Simulator
nav_order: 5
parent: 💻 Developers
grand_parent: Contribution Guide
---

# Election Simulator

This simulator allows you to test and understand the complete election lifecycle without making any backend calls. It faithfully captures every possible state of an election, including credential flows, time-based transitions, and all user actions.

<style>
.simulator-container {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.simulator-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fff;
}

.simulator-panel h3 {
  margin-top: 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.control-group select,
.control-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-success {
  background: #059669;
  color: white;
}

.btn-warning {
  background: #d97706;
  color: white;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.state-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.state-draft { background: #fef3c7; color: #92400e; }
.state-finalized { background: #dbeafe; color: #1e40af; }
.state-open { background: #d1fae5; color: #065f46; }
.state-closed { background: #fee2e2; color: #991b1b; }
.state-archived { background: #e5e7eb; color: #374151; }

.log-container {
  background: #1f2937;
  color: #d1d5db;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  margin-bottom: 4px;
}

.log-entry.error { color: #f87171; }
.log-entry.success { color: #4ade80; }
.log-entry.info { color: #60a5fa; }
.log-entry.warning { color: #fbbf24; }

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}

.ballot-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.ballot-item {
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.ballot-item:last-child {
  border-bottom: none;
}

.info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.warning-box {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.error-box {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.time-display {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 4px;
  margin-bottom: 12px;
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-badge {
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.permission-badge.granted {
  background: #d1fae5;
  color: #065f46;
}
</style>

<div class="simulator-container" id="simulator">
  <div class="simulator-panel">
    <h3>⏰ Simulated Time Control</h3>
    <div class="time-display" id="current-time">Loading...</div>
    <div class="control-group">
      <label>Advance Time By:</label>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" onclick="advanceTime(1)">+1 Hour</button>
        <button class="btn btn-secondary" onclick="advanceTime(6)">+6 Hours</button>
        <button class="btn btn-secondary" onclick="advanceTime(24)">+1 Day</button>
        <button class="btn btn-secondary" onclick="advanceTime(168)">+1 Week</button>
      </div>
    </div>
    <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
      Time only moves forward. Used to test election start/end time behavior.
    </p>
  </div>

  <div class="two-column">
    <div>
      <div class="simulator-panel">
        <h3>👤 Credential Simulation</h3>
        <div class="control-group">
          <label>Current User Type:</label>
          <select id="user-type" onchange="updateUserType()">
            <option value="anonymous">Anonymous (No credentials)</option>
            <option value="temp_id_new">Temp ID - New (will receive claim_key)</option>
            <option value="temp_id_finalized">Temp ID - Finalized (no claim_key notification)</option>
            <option value="logged_in_owner">Logged In - Election Owner</option>
            <option value="logged_in_admin">Logged In - Admin</option>
            <option value="logged_in_auditor">Logged In - Auditor</option>
            <option value="logged_in_voter">Logged In - Regular Voter</option>
          </select>
        </div>
        <div id="claim-key-section" style="display: none;">
          <div class="warning-box">
            <strong>⚠️ Claim Key Available</strong><br>
            <span id="claim-key-display"></span><br>
            <small>Use this to claim the election after logging in.</small>
          </div>
          <button class="btn btn-primary" onclick="simulateClaimElection()">Claim Election</button>
        </div>
        <div class="control-group">
          <label>Current Permissions:</label>
          <div class="permissions-list" id="permissions-display"></div>
        </div>
      </div>

      <div class="simulator-panel">
        <h3>🗳️ Election Settings</h3>
        <div class="control-group">
          <label>Election Title:</label>
          <input type="text" id="election-title" value="Sample Election" onchange="updateElectionSettings()">
        </div>
        <div class="control-group">
          <label>Voter Access:</label>
          <select id="voter-access" onchange="updateElectionSettings()">
            <option value="open">Open (anyone can vote)</option>
            <option value="closed">Closed (email list only)</option>
            <option value="registration">Registration (requires approval)</option>
          </select>
        </div>
        <div class="control-group">
          <label>Voter Authentication:</label>
          <select id="voter-authentication" onchange="updateElectionSettings()">
            <option value="none">None (unlimited votes)</option>
            <option value="voter_id" selected>Device ID (one vote per browser)</option>
            <option value="email">Email (requires login)</option>
            <option value="ip_address">IP Address (one vote per IP)</option>
          </select>
          <p style="font-size: 11px; color: #6b7280; margin-top: 4px;" id="voter-auth-help">
            Uses browser storage to track if device has voted.
          </p>
        </div>
        <div class="control-group">
          <label>Start Time (optional):</label>
          <input type="datetime-local" id="start-time" onchange="updateElectionSettings()">
        </div>
        <div class="control-group">
          <label>End Time (optional):</label>
          <input type="datetime-local" id="end-time" onchange="updateElectionSettings()">
        </div>
        <div class="control-group">
          <label>
            <input type="checkbox" id="public-results" onchange="updateElectionSettings()">
            Public Results (show results before close)
          </label>
        </div>
        <div class="control-group">
          <label>
            <input type="checkbox" id="ballot-updates" onchange="updateElectionSettings()">
            Allow Ballot Updates
          </label>
        </div>
      </div>
    </div>

    <div>
      <div class="simulator-panel">
        <h3>📊 Election State</h3>
        <div style="text-align: center; margin-bottom: 16px;">
          <span class="state-badge" id="election-state-badge">DRAFT</span>
        </div>
        <div id="state-info-box"></div>
        
        <h4>State Transitions</h4>
        <div id="state-actions">
          <!-- Populated dynamically -->
        </div>
      </div>

      <div class="simulator-panel">
        <h3>🗳️ Voter Actions</h3>
        <div id="voter-actions">
          <!-- Populated dynamically -->
        </div>
        <div id="vote-status" style="margin-top: 12px;"></div>
      </div>

      <div class="simulator-panel">
        <h3>📋 Ballots (<span id="ballot-count">0</span>)</h3>
        <div class="ballot-list" id="ballot-list">
          <div class="ballot-item" style="color: #9ca3af;">No ballots cast yet</div>
        </div>
      </div>
    </div>
  </div>

  <div class="simulator-panel">
    <h3>📜 Event Log</h3>
    <button class="btn btn-secondary" onclick="clearLog()" style="float: right; margin-top: -8px;">Clear Log</button>
    <div class="log-container" id="event-log">
      <div class="log-entry info">Simulator initialized</div>
    </div>
  </div>
</div>

<script>
// ============================================
// Election Simulator State
// ============================================

const SimulatorState = {
  // Simulated current time (starts at real time)
  currentTime: new Date(),
  
  // User credentials
  userType: 'anonymous',
  userId: null,
  tempId: null,
  claimKey: null,
  
  // Voter authentication simulation
  // Tracks which "devices" and "emails" have voted
  votedDeviceIds: new Set(),  // For voter_id auth
  votedEmails: new Set(),     // For email auth  
  votedIpAddresses: new Set(), // For ip_address auth
  currentDeviceId: 'device_' + Math.random().toString(36).substring(2, 11),
  currentIpAddress: '192.168.1.' + Math.floor(Math.random() * 255),
  
  // Election state
  election: {
    election_id: 'sim_' + Math.random().toString(36).substring(2, 11),
    title: 'Sample Election',
    state: 'draft', // draft, finalized, open, closed, archived
    owner_id: null,
    admin_ids: [],
    audit_ids: [],
    credential_ids: [],
    start_time: null,
    end_time: null,
    create_date: new Date(),
    settings: {
      voter_access: 'open',
      // voter_authentication mirrors the backend model exactly:
      // { voter_id?: boolean, email?: boolean, ip_address?: boolean }
      voter_authentication: { voter_id: true },
      public_results: false,
      ballot_updates: false,
    },
    races: [{
      race_id: 'race_1',
      title: 'Best Candidate',
      voting_method: 'STAR',
      num_winners: 1,
      candidates: [
        { candidate_id: 'c1', candidate_name: 'Alice' },
        { candidate_id: 'c2', candidate_name: 'Bob' },
        { candidate_id: 'c3', candidate_name: 'Carol' },
      ]
    }]
  },
  
  // Ballots
  ballots: [],
  
  // Current user's vote status
  hasVoted: false,
  
  // TEMPORARY_ACCESS_HOURS from shared config
  TEMPORARY_ACCESS_HOURS: 10,
};

// ============================================
// Permission System
// ============================================

const Permissions = {
  canEditElectionRoles: ['system_admin', 'owner'],
  canViewElection: ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
  canEditElection: ['system_admin', 'owner', 'admin'],
  canDeleteElection: ['system_admin', 'owner'],
  canEditElectionRoll: ['system_admin', 'owner'],
  canAddToElectionRoll: ['system_admin', 'owner', 'admin'],
  canViewElectionRoll: ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
  canFlagElectionRoll: ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
  canApproveElectionRoll: ['system_admin', 'owner', 'admin', 'credentialer'],
  canUnflagElectionRoll: ['system_admin', 'owner', 'admin'],
  canInvalidateElectionRoll: ['system_admin', 'owner', 'admin'],
  canDeleteElectionRoll: ['system_admin', 'owner'],
  canViewElectionRollIDs: ['system_admin', 'auditor'],
  canViewBallots: ['system_admin', 'owner', 'admin', 'auditor'],
  canDeleteAllBallots: ['system_admin', 'owner', 'admin'],
  canViewBallot: ['system_admin'],
  canEditBallot: ['system_admin', 'owner'],
  canFlagBallot: ['system_admin', 'owner', 'admin', 'auditor'],
  canInvalidateBallot: ['system_admin', 'owner'],
  canEditElectionState: ['system_admin', 'owner'],
  canClaimElection: ['system_admin', 'owner'],
  canViewPreliminaryResults: ['system_admin', 'owner', 'admin', 'auditor'],
  canSendEmails: ['system_admin', 'owner', 'admin'],
};

function getUserRoles() {
  const { userType, tempId, election } = SimulatorState;
  const roles = [];
  
  if (userType === 'anonymous') {
    return [];
  }
  
  // Temp ID users who own the election (and not expired)
  if (userType.startsWith('temp_id') && tempId && election.owner_id === tempId) {
    const hoursSinceCreate = (SimulatorState.currentTime - new Date(election.create_date)) / (1000 * 60 * 60);
    if (hoursSinceCreate <= SimulatorState.TEMPORARY_ACCESS_HOURS) {
      roles.push('owner');
    }
  }
  
  // Logged in users
  if (userType === 'logged_in_owner') {
    roles.push('owner');
  } else if (userType === 'logged_in_admin') {
    roles.push('admin');
  } else if (userType === 'logged_in_auditor') {
    roles.push('auditor');
  }
  
  return roles;
}

function getUserPermissions() {
  const roles = getUserRoles();
  const permissions = [];
  
  for (const [permission, allowedRoles] of Object.entries(Permissions)) {
    if (roles.some(role => allowedRoles.includes(role))) {
      permissions.push(permission);
    }
  }
  
  return permissions;
}

function hasPermission(permission) {
  return getUserPermissions().includes(permission);
}

// ============================================
// Time Management
// ============================================

function advanceTime(hours) {
  SimulatorState.currentTime = new Date(SimulatorState.currentTime.getTime() + hours * 60 * 60 * 1000);
  log(`Time advanced by ${hours} hour(s)`, 'info');
  
  // Check if election should auto-open or auto-close
  checkTimeBasedTransitions();
  updateUI();
}

function checkTimeBasedTransitions() {
  const { election, currentTime } = SimulatorState;
  
  // Auto-open if start_time has passed and election is finalized
  if (election.state === 'finalized' && election.start_time) {
    if (currentTime >= new Date(election.start_time)) {
      election.state = 'open';
      log('Election automatically opened (start time reached)', 'success');
    }
  }
  
  // Auto-close if end_time has passed and election is open
  if (election.state === 'open' && election.end_time) {
    if (currentTime >= new Date(election.end_time)) {
      election.state = 'closed';
      log('Election automatically closed (end time reached)', 'warning');
    }
  }
  
  // Check temporary access expiration
  if (SimulatorState.userType.startsWith('temp_id') && SimulatorState.tempId) {
    const hoursSinceCreate = (currentTime - new Date(election.create_date)) / (1000 * 60 * 60);
    if (hoursSinceCreate > SimulatorState.TEMPORARY_ACCESS_HOURS) {
      const wasExpired = SimulatorState._tempAccessExpiredLogged;
      if (!wasExpired) {
        log(`Temporary access expired (${SimulatorState.TEMPORARY_ACCESS_HOURS}h limit reached)`, 'error');
        SimulatorState._tempAccessExpiredLogged = true;
      }
    }
  }
}

function formatDateTime(date) {
  if (!date) return 'Not set';
  return new Date(date).toLocaleString();
}

// ============================================
// User Type Management
// ============================================

function updateUserType() {
  const userType = document.getElementById('user-type').value;
  SimulatorState.userType = userType;
  SimulatorState.hasVoted = false; // Reset vote status when changing user
  SimulatorState._tempAccessExpiredLogged = false;
  
  if (userType === 'temp_id_new') {
    // Generate new temp ID and claim key
    SimulatorState.tempId = 'temp_' + Math.random().toString(36).substring(2, 11);
    SimulatorState.claimKey = 'claim_' + Math.random().toString(36).substring(2, 18);
    SimulatorState.election.owner_id = SimulatorState.tempId;
    SimulatorState.election.create_date = new Date(SimulatorState.currentTime);
    log(`Created election with Temp ID: ${SimulatorState.tempId}`, 'info');
    log(`Claim key generated: ${SimulatorState.claimKey}`, 'warning');
  } else if (userType === 'temp_id_finalized') {
    // Temp ID user who already finalized (no claim key notification)
    SimulatorState.tempId = 'temp_' + Math.random().toString(36).substring(2, 11);
    SimulatorState.claimKey = null; // Already used/not shown
    SimulatorState.election.owner_id = SimulatorState.tempId;
    SimulatorState.election.create_date = new Date(SimulatorState.currentTime);
    log(`Temp ID (finalized, no claim key shown): ${SimulatorState.tempId}`, 'info');
  } else if (userType === 'logged_in_owner') {
    SimulatorState.userId = 'user_' + Math.random().toString(36).substring(2, 11);
    SimulatorState.tempId = null;
    SimulatorState.claimKey = null;
    SimulatorState.election.owner_id = SimulatorState.userId;
    log(`Logged in as owner: ${SimulatorState.userId}`, 'success');
  } else if (userType === 'logged_in_admin') {
    SimulatorState.userId = 'admin_' + Math.random().toString(36).substring(2, 11);
    SimulatorState.tempId = null;
    SimulatorState.claimKey = null;
    SimulatorState.election.admin_ids = [SimulatorState.userId];
    log(`Logged in as admin: ${SimulatorState.userId}`, 'success');
  } else if (userType === 'logged_in_auditor') {
    SimulatorState.userId = 'auditor_' + Math.random().toString(36).substring(2, 13);
    SimulatorState.tempId = null;
    SimulatorState.claimKey = null;
    SimulatorState.election.audit_ids = [SimulatorState.userId];
    log(`Logged in as auditor: ${SimulatorState.userId}`, 'success');
  } else if (userType === 'logged_in_voter') {
    SimulatorState.userId = 'voter_' + Math.random().toString(36).substring(2, 11);
    SimulatorState.tempId = null;
    SimulatorState.claimKey = null;
    log(`Logged in as voter: ${SimulatorState.userId}`, 'success');
  } else {
    SimulatorState.userId = null;
    SimulatorState.tempId = null;
    SimulatorState.claimKey = null;
    log('Switched to anonymous user', 'info');
  }
  
  updateUI();
}

function simulateClaimElection() {
  if (!SimulatorState.claimKey) {
    log('No claim key available', 'error');
    return;
  }
  
  // Simulate the claim process
  SimulatorState.userId = 'user_' + Math.random().toString(36).substring(2, 11);
  SimulatorState.election.owner_id = SimulatorState.userId;
  SimulatorState.claimKey = null; // Claim key is consumed
  SimulatorState.userType = 'logged_in_owner';
  SimulatorState.tempId = null;
  
  document.getElementById('user-type').value = 'logged_in_owner';
  
  log(`Election claimed! New owner: ${SimulatorState.userId}`, 'success');
  updateUI();
}

// ============================================
// Election Settings
// ============================================

function updateElectionSettings() {
  const election = SimulatorState.election;
  
  election.title = document.getElementById('election-title').value;
  election.settings.voter_access = document.getElementById('voter-access').value;
  election.settings.public_results = document.getElementById('public-results').checked;
  election.settings.ballot_updates = document.getElementById('ballot-updates').checked;
  
  // Handle voter authentication - mirrors backend model exactly
  const authType = document.getElementById('voter-authentication').value;
  const authHelpEl = document.getElementById('voter-auth-help');
  
  // Reset authentication object (exactly as backend does)
  election.settings.voter_authentication = {};
  
  switch (authType) {
    case 'voter_id':
      election.settings.voter_authentication = { voter_id: true };
      authHelpEl.textContent = 'Uses browser storage to track if device has voted.';
      break;
    case 'email':
      election.settings.voter_authentication = { email: true };
      authHelpEl.textContent = 'Requires user to log in with their email address.';
      break;
    case 'ip_address':
      election.settings.voter_authentication = { ip_address: true };
      authHelpEl.textContent = 'Tracks IP address to prevent multiple votes.';
      break;
    case 'none':
    default:
      election.settings.voter_authentication = {};
      authHelpEl.textContent = 'No vote limiting - anyone can vote multiple times.';
      break;
  }
  
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;
  
  election.start_time = startTime ? new Date(startTime) : null;
  election.end_time = endTime ? new Date(endTime) : null;
  
  // Validate settings
  if (election.settings.ballot_updates) {
    if (election.settings.public_results && !['closed', 'archived'].includes(election.state)) {
      log('Warning: Public results not permitted with ballot updates while open', 'warning');
    }
    if (election.settings.voter_access === 'open') {
      log('Warning: Ballot updates not permitted on open access elections', 'warning');
    }
  }
  
  log('Election settings updated', 'info');
  updateUI();
}

// ============================================
// State Transitions
// ============================================

function finalizeElection() {
  const { election, userType } = SimulatorState;
  
  if (!hasPermission('canEditElectionState')) {
    log('Permission denied: Cannot finalize election', 'error');
    return;
  }
  
  if (election.state !== 'draft') {
    log('Can only finalize elections in draft state', 'error');
    return;
  }
  
  if (!election.title || election.title.length < 3) {
    log('Election title must be at least 3 characters', 'error');
    return;
  }
  
  // If start_time is set and in the past, or not set, open immediately
  const now = SimulatorState.currentTime;
  if (!election.start_time || now >= new Date(election.start_time)) {
    election.state = 'open';
    log('Election finalized and opened (no future start time)', 'success');
  } else {
    election.state = 'finalized';
    log('Election finalized (will open at start time)', 'success');
  }
  
  // If using temp_id_new, the claim_key was shown at creation
  // After finalize, user won't see claim_key notification anymore
  if (userType === 'temp_id_new') {
    log('Note: After finalize, claim_key notification would not be shown on page refresh', 'info');
  }
  
  updateUI();
}

function openElection() {
  if (!hasPermission('canEditElectionState')) {
    log('Permission denied: Cannot open election', 'error');
    return;
  }
  
  const { election } = SimulatorState;
  
  if (election.state !== 'closed') {
    log('Can only re-open closed elections (without start/end times)', 'error');
    return;
  }
  
  if (election.start_time || election.end_time) {
    log('Cannot manually open/close elections with scheduled times', 'error');
    return;
  }
  
  election.state = 'open';
  log('Election manually opened', 'success');
  updateUI();
}

function closeElection() {
  if (!hasPermission('canEditElectionState')) {
    log('Permission denied: Cannot close election', 'error');
    return;
  }
  
  const { election } = SimulatorState;
  
  if (election.state !== 'open') {
    log('Can only close open elections', 'error');
    return;
  }
  
  if (election.start_time || election.end_time) {
    log('Cannot manually open/close elections with scheduled times', 'error');
    return;
  }
  
  election.state = 'closed';
  log('Election manually closed', 'success');
  updateUI();
}

function archiveElection() {
  if (!hasPermission('canEditElectionState')) {
    log('Permission denied: Cannot archive election', 'error');
    return;
  }
  
  const { election } = SimulatorState;
  
  if (election.state === 'archived') {
    log('Election is already archived', 'error');
    return;
  }
  
  election.state = 'archived';
  log('Election archived', 'success');
  updateUI();
}

function togglePublicResults() {
  if (!hasPermission('canEditElectionState')) {
    log('Permission denied: Cannot toggle public results', 'error');
    return;
  }
  
  const { election } = SimulatorState;
  
  // Check if allowed based on state and ballot_updates
  if (election.settings.ballot_updates && 
      election.state === 'open' &&
      !election.settings.public_results) {
    log('Cannot enable public results while ballot updates enabled and election open', 'error');
    return;
  }
  
  election.settings.public_results = !election.settings.public_results;
  document.getElementById('public-results').checked = election.settings.public_results;
  
  log(`Public results ${election.settings.public_results ? 'enabled' : 'disabled'}`, 'success');
  updateUI();
}

// ============================================
// Voter Actions
// ============================================

function castBallot() {
  const { election, userType, currentTime, hasVoted } = SimulatorState;
  const auth = election.settings.voter_authentication;
  
  if (election.state !== 'open' && election.state !== 'draft') {
    log('Cannot vote: Election is not open', 'error');
    return;
  }
  
  // Check voter access (closed elections require email list)
  if (election.settings.voter_access === 'closed' && userType === 'anonymous') {
    log('Cannot vote: Closed election requires voter to be on email list', 'error');
    return;
  }
  
  // Check voter authentication based on type
  // This mimics how the backend validates voting eligibility
  
  if (auth.voter_id) {
    // Device ID authentication - check if this device has voted
    if (SimulatorState.votedDeviceIds.has(SimulatorState.currentDeviceId)) {
      if (!election.settings.ballot_updates) {
        log(`Cannot vote: This device (${SimulatorState.currentDeviceId}) has already voted`, 'error');
        return;
      }
    }
  }
  
  if (auth.email) {
    // Email authentication - requires logged in user with a userId
    // Temp ID users don't have userId, so they can't vote with email auth
    if (userType === 'anonymous' || !SimulatorState.userId) {
      log('Cannot vote: Email authentication requires you to log in with an email account', 'error');
      return;
    }
    const userEmail = `${SimulatorState.userId}@example.com`;
    if (SimulatorState.votedEmails.has(userEmail)) {
      if (!election.settings.ballot_updates) {
        log(`Cannot vote: Email ${userEmail} has already voted`, 'error');
        return;
      }
    }
  }
  
  if (auth.ip_address) {
    // IP address authentication - check if this IP has voted
    if (SimulatorState.votedIpAddresses.has(SimulatorState.currentIpAddress)) {
      if (!election.settings.ballot_updates) {
        log(`Cannot vote: IP address ${SimulatorState.currentIpAddress} has already voted`, 'error');
        return;
      }
    }
  }
  
  // Check legacy hasVoted flag (for no-auth elections)
  if (hasVoted && !election.settings.ballot_updates && !auth.voter_id && !auth.email && !auth.ip_address) {
    log('Cannot vote: Already voted and ballot updates not enabled', 'error');
    return;
  }
  
  // Generate a simulated ballot
  const ballotId = 'ballot_' + Math.random().toString(36).substring(2, 11);
  const ballot = {
    ballot_id: ballotId,
    election_id: election.election_id,
    date_submitted: currentTime.getTime(),
    status: 'submitted',
    votes: election.races.map(race => ({
      race_id: race.race_id,
      scores: race.candidates.map(c => ({
        candidate_id: c.candidate_id,
        score: Math.floor(Math.random() * 6) // Random 0-5 for STAR
      }))
    }))
  };
  
  // Track the vote based on authentication method
  if (auth.voter_id) {
    SimulatorState.votedDeviceIds.add(SimulatorState.currentDeviceId);
  }
  if (auth.email && SimulatorState.userId) {
    const userEmail = `${SimulatorState.userId}@example.com`;
    SimulatorState.votedEmails.add(userEmail);
  }
  if (auth.ip_address) {
    SimulatorState.votedIpAddresses.add(SimulatorState.currentIpAddress);
  }
  
  const isUpdate = hasVoted && election.settings.ballot_updates;
  if (isUpdate) {
    log(`Ballot updated: ${ballotId}`, 'success');
  } else {
    SimulatorState.ballots.push(ballot);
    SimulatorState.hasVoted = true;
    log(`Ballot cast: ${ballotId}`, 'success');
  }
  
  updateUI();
}

function viewResults() {
  const { election, currentTime } = SimulatorState;
  
  const canViewPreliminary = hasPermission('canViewPreliminaryResults');
  const isPublic = election.settings.public_results;
  const isClosed = ['closed', 'archived'].includes(election.state);
  
  if (!canViewPreliminary && !isPublic && !isClosed) {
    log('Cannot view results: Not public and election not closed', 'error');
    return;
  }
  
  log(`Viewing results: ${SimulatorState.ballots.length} ballots cast`, 'info');
  
  // Show simple tally
  if (SimulatorState.ballots.length > 0) {
    const race = election.races[0];
    const totals = {};
    race.candidates.forEach(c => totals[c.candidate_name] = 0);
    
    SimulatorState.ballots.forEach(ballot => {
      ballot.votes[0].scores.forEach(score => {
        const candidate = race.candidates.find(c => c.candidate_id === score.candidate_id);
        if (candidate) {
          totals[candidate.candidate_name] += score.score;
        }
      });
    });
    
    const resultsStr = Object.entries(totals)
      .map(([name, score]) => `${name}: ${score}`)
      .join(', ');
    log(`Results - ${resultsStr}`, 'success');
  }
  
  updateUI();
}

function viewBallots() {
  if (!hasPermission('canViewBallots')) {
    log('Permission denied: Cannot view ballots', 'error');
    return;
  }
  
  log(`Viewing ${SimulatorState.ballots.length} ballots (admin view)`, 'info');
  updateUI();
}

// ============================================
// UI Updates
// ============================================

function updateUI() {
  updateTimeDisplay();
  updateStateDisplay();
  updateClaimKeySection();
  updatePermissionsDisplay();
  updateStateActions();
  updateVoterActions();
  updateBallotList();
}

function updateTimeDisplay() {
  document.getElementById('current-time').textContent = 
    'Simulated Time: ' + SimulatorState.currentTime.toLocaleString();
}

function updateStateDisplay() {
  const state = SimulatorState.election.state;
  const badge = document.getElementById('election-state-badge');
  badge.textContent = state.toUpperCase();
  badge.className = `state-badge state-${state}`;
  
  // Update state info box
  const infoBox = document.getElementById('state-info-box');
  const election = SimulatorState.election;
  
  let info = '';
  
  if (state === 'draft') {
    info = '<div class="info-box">Election is in draft mode. Settings can be changed. Test ballots can be cast.</div>';
  } else if (state === 'finalized') {
    if (election.start_time) {
      info = `<div class="info-box">Election finalized. Voting will begin at: ${formatDateTime(election.start_time)}</div>`;
    }
  } else if (state === 'open') {
    if (election.end_time) {
      info = `<div class="info-box">Election is open for voting. Will close at: ${formatDateTime(election.end_time)}</div>`;
    } else {
      info = '<div class="info-box">Election is open for voting. Must be manually closed.</div>';
    }
  } else if (state === 'closed') {
    info = '<div class="warning-box">Election is closed. No more votes accepted. Results available.</div>';
  } else if (state === 'archived') {
    info = '<div class="info-box">Election is archived. Read-only state.</div>';
  }
  
  // Add temporary access warning if applicable
  if (SimulatorState.userType.startsWith('temp_id') && SimulatorState.tempId) {
    const hoursSinceCreate = (SimulatorState.currentTime - new Date(election.create_date)) / (1000 * 60 * 60);
    const hoursRemaining = SimulatorState.TEMPORARY_ACCESS_HOURS - hoursSinceCreate;
    
    if (hoursRemaining > 0) {
      info += `<div class="warning-box">⚠️ Temporary Access: ${hoursRemaining.toFixed(1)} hours remaining. Sign in to keep access!</div>`;
    } else {
      info += `<div class="error-box">⚠️ Temporary Access Expired! You no longer have admin access.</div>`;
    }
  }
  
  infoBox.innerHTML = info;
}

function updateClaimKeySection() {
  const section = document.getElementById('claim-key-section');
  const display = document.getElementById('claim-key-display');
  
  if (SimulatorState.claimKey && SimulatorState.userType === 'temp_id_new') {
    section.style.display = 'block';
    display.textContent = SimulatorState.claimKey;
  } else {
    section.style.display = 'none';
  }
}

function updatePermissionsDisplay() {
  const container = document.getElementById('permissions-display');
  const permissions = getUserPermissions();
  
  const allPermissions = Object.keys(Permissions);
  
  container.innerHTML = allPermissions.map(p => {
    const granted = permissions.includes(p);
    return `<span class="permission-badge ${granted ? 'granted' : ''}">${p.replace('can', '')}</span>`;
  }).join('');
}

function updateStateActions() {
  const container = document.getElementById('state-actions');
  const { election } = SimulatorState;
  const canEdit = hasPermission('canEditElectionState');
  
  // Check temporary access expiration
  let tempAccessExpired = false;
  if (SimulatorState.userType.startsWith('temp_id') && SimulatorState.tempId) {
    const hoursSinceCreate = (SimulatorState.currentTime - new Date(election.create_date)) / (1000 * 60 * 60);
    tempAccessExpired = hoursSinceCreate > SimulatorState.TEMPORARY_ACCESS_HOURS;
  }
  
  const effectiveCanEdit = canEdit && !tempAccessExpired;
  
  let html = '';
  
  if (election.state === 'draft') {
    html += `<button class="btn btn-success" onclick="finalizeElection()" ${!effectiveCanEdit ? 'disabled' : ''}>
      Finalize Election
    </button>`;
  }
  
  if (election.state === 'open' && !election.start_time && !election.end_time) {
    html += `<button class="btn btn-warning" onclick="closeElection()" ${!effectiveCanEdit ? 'disabled' : ''}>
      Close Election
    </button>`;
  }
  
  if (election.state === 'closed' && !election.start_time && !election.end_time) {
    html += `<button class="btn btn-success" onclick="openElection()" ${!effectiveCanEdit ? 'disabled' : ''}>
      Re-open Election
    </button>`;
  }
  
  if (!['closed', 'archived'].includes(election.state) || 
      (election.state === 'open' && !election.settings.ballot_updates)) {
    html += `<button class="btn btn-primary" onclick="togglePublicResults()" ${!effectiveCanEdit ? 'disabled' : ''}>
      ${election.settings.public_results ? 'Disable' : 'Enable'} Public Results
    </button>`;
  }
  
  if (election.state !== 'archived') {
    html += `<button class="btn btn-danger" onclick="archiveElection()" ${!effectiveCanEdit ? 'disabled' : ''}>
      Archive Election
    </button>`;
  }
  
  container.innerHTML = html || '<p style="color: #6b7280;">No state transitions available</p>';
}

function updateVoterActions() {
  const container = document.getElementById('voter-actions');
  const statusContainer = document.getElementById('vote-status');
  const { election, hasVoted, userType } = SimulatorState;
  const auth = election.settings.voter_authentication;
  
  let html = '';
  let status = '';
  
  // Determine if user can vote based on authentication type
  let canVote = (election.state === 'open' || election.state === 'draft');
  let blockReason = '';
  
  if (canVote) {
    // Check voter access (closed = email list only)
    if (election.settings.voter_access === 'closed' && userType === 'anonymous') {
      canVote = false;
      blockReason = 'Closed election - requires being on voter list';
    }
    
    // Check authentication-specific blocks
    if (canVote && auth.voter_id) {
      if (SimulatorState.votedDeviceIds.has(SimulatorState.currentDeviceId) && !election.settings.ballot_updates) {
        canVote = false;
        blockReason = `Device ${SimulatorState.currentDeviceId} has already voted`;
      }
    }
    
    if (canVote && auth.email) {
      // Email auth requires logged in user with userId (not temp_id users)
      if (userType === 'anonymous' || !SimulatorState.userId) {
        canVote = false;
        blockReason = 'Email authentication requires login with email account';
      } else {
        const userEmail = `${SimulatorState.userId}@example.com`;
        if (SimulatorState.votedEmails.has(userEmail) && !election.settings.ballot_updates) {
          canVote = false;
          blockReason = `Email ${userEmail} has already voted`;
        }
      }
    }
    
    if (canVote && auth.ip_address) {
      if (SimulatorState.votedIpAddresses.has(SimulatorState.currentIpAddress) && !election.settings.ballot_updates) {
        canVote = false;
        blockReason = `IP ${SimulatorState.currentIpAddress} has already voted`;
      }
    }
  }
  
  html += `<button class="btn btn-primary" onclick="castBallot()" ${!canVote ? 'disabled' : ''}>
    ${hasVoted && election.settings.ballot_updates ? 'Update Ballot' : 'Cast Ballot'}
  </button>`;
  
  // View results button
  const canViewResults = hasPermission('canViewPreliminaryResults') ||
                         election.settings.public_results ||
                         ['closed', 'archived'].includes(election.state);
  
  html += `<button class="btn btn-secondary" onclick="viewResults()" ${!canViewResults ? 'disabled' : ''}>
    View Results
  </button>`;
  
  // View ballots (admin)
  if (hasPermission('canViewBallots')) {
    html += `<button class="btn btn-secondary" onclick="viewBallots()">
      View All Ballots (Admin)
    </button>`;
  }
  
  container.innerHTML = html;
  
  // Status message - show authentication info
  status = '';
  
  // Show current "identity" based on auth type
  if (auth.voter_id || auth.email || auth.ip_address) {
    let identityInfo = '<div class="info-box" style="font-size: 12px;"><strong>Your voting identity:</strong><br>';
    if (auth.voter_id) {
      identityInfo += `Device ID: <code>${SimulatorState.currentDeviceId}</code><br>`;
    }
    if (auth.email && SimulatorState.userId) {
      identityInfo += `Email: <code>${SimulatorState.userId}@example.com</code><br>`;
    } else if (auth.email) {
      identityInfo += `Email: <em>Login required to vote</em><br>`;
    }
    if (auth.ip_address) {
      identityInfo += `IP Address: <code>${SimulatorState.currentIpAddress}</code><br>`;
    }
    identityInfo += '</div>';
    status += identityInfo;
  }
  
  if (hasVoted) {
    status += '<div class="info-box">✓ You have submitted a ballot</div>';
    if (election.settings.ballot_updates && election.state === 'open') {
      status += '<div class="info-box">Ballot updates are enabled - you can change your vote</div>';
    }
  } else if (blockReason) {
    status += `<div class="error-box">🚫 ${blockReason}</div>`;
  } else if (election.state === 'open') {
    status += '<div class="info-box">You have not yet voted</div>';
  } else if (election.state === 'draft') {
    status += '<div class="warning-box">This is a test ballot (draft mode)</div>';
  }
  
  // Show no-auth warning
  if (!auth.voter_id && !auth.email && !auth.ip_address && election.state === 'open') {
    status += '<div class="warning-box">⚠️ No vote limiting enabled - anyone can vote unlimited times!</div>';
  }
  
  statusContainer.innerHTML = status;
}

function updateBallotList() {
  const container = document.getElementById('ballot-list');
  const count = document.getElementById('ballot-count');
  
  count.textContent = SimulatorState.ballots.length;
  
  if (SimulatorState.ballots.length === 0) {
    container.innerHTML = '<div class="ballot-item" style="color: #9ca3af;">No ballots cast yet</div>';
    return;
  }
  
  container.innerHTML = SimulatorState.ballots.map(ballot => {
    const date = new Date(ballot.date_submitted).toLocaleString();
    return `<div class="ballot-item">
      <strong>${ballot.ballot_id}</strong><br>
      <small>Submitted: ${date}</small>
    </div>`;
  }).join('');
}

// ============================================
// Logging
// ============================================

function log(message, type = 'info') {
  const container = document.getElementById('event-log');
  const timestamp = SimulatorState.currentTime.toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function clearLog() {
  const container = document.getElementById('event-log');
  container.innerHTML = '<div class="log-entry info">Log cleared</div>';
}

// ============================================
// Initialization
// ============================================

function initialize() {
  // Set default datetime inputs
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Don't pre-fill dates, let user set them
  
  // Initialize UI
  updateUI();
  log('Election simulator ready!', 'success');
  log('Select a user type to begin testing different credential scenarios', 'info');
}

// Start the simulator
document.addEventListener('DOMContentLoaded', initialize);
if (document.readyState !== 'loading') {
  initialize();
}
</script>

## How to Use This Simulator

### Credential Flows

1. **Anonymous**: No special permissions. Can only vote in open access elections.

2. **Temp ID - New (with claim_key)**: Simulates creating an election without logging in.
   - User receives a `temp_id` stored in a cookie
   - A `claim_key` is generated and shown (yellow warning)
   - User has owner permissions for a limited time (10 hours)
   - User can claim the election by logging in with the claim_key

3. **Temp ID - Finalized (no claim_key)**: After finalizing, the claim_key notification is not shown.
   - If user refreshes the page after finalize, they won't see the claim_key prompt
   - This simulates the case where user might lose access if they don't log in

4. **Logged In Users**: Full authentication with various roles:
   - **Owner**: Full control over the election
   - **Admin**: Can edit election settings and manage voters
   - **Auditor**: Can view ballots and rolls, flag issues
   - **Voter**: Regular authenticated voter

### Election States

- **Draft**: Initial state. All settings editable. Test ballots allowed.
- **Finalized**: Locked settings. Waiting for start time (if set).
- **Open**: Accepting votes. Closes at end time or manually.
- **Closed**: No more votes. Results viewable.
- **Archived**: Read-only historical record.

### Time-Based Behavior

Use the time controls to:
- See elections auto-open when start_time is reached
- See elections auto-close when end_time is reached
- See temporary access expire after 10 hours

### Things to Test

1. Create an election as anonymous user (temp_id flow)
2. Try to finalize without logging in
3. Observe the claim_key warning
4. Advance time past the temporary access window
5. Set up scheduled elections with start/end times
6. Test ballot updates with different voter access settings
7. Try viewing results with different permission levels
