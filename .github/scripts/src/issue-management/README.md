# Issue Management Feature

Automated system to manage stale assigned issues using GitHub Actions.

## 📋 Overview

This feature automatically:

1. **Monitors** all assigned issues daily
2. **Warns** assignees after 5 weeks of inactivity  
3. **Unassigns** issues after 6 weeks of inactivity
4. **Preserves** issue history and allows reassignment

### How It Works

- **Daily Automation**: Runs every day at 9:00 AM UTC
- **Warning Phase (5 weeks)**: Posts a friendly warning comment, tags assignees, gives 1 week notice
- **Auto-Unassignment (6 weeks)**: Removes assignees, posts explanation, keeps issue open

## 🚀 Quick Start

### Simulation Mode (No GitHub API)

Want to see how it works without setting up GitHub tokens? Try the simulation:

```bash
cd .github/scripts
npm install
npm run build
npm run issue-mgmt:simulate
```

This runs a complete simulation with 8 mock issues in ~5 seconds, showing:
- ✅ 3 issues that would be unassigned (6+ weeks old)
- ✅ 2 issues that would get warnings (5+ weeks old)
- ✅ 3 active issues (no action needed)

No GitHub API calls, no tokens required!

### Local Testing with Real GitHub API

```bash
cd .github/scripts

# Setup
npm install
cp sample.env .env
# Edit .env and add your GitHub Personal Access Token

# Build
npm run build

# Run in dry-run mode (safe - no changes made)
npm run issue-mgmt:start

# Run in production mode (actually makes changes)
npm run issue-mgmt:prod
```

## ⚙️ Configuration

### Current Settings

- **Warning threshold**: 5 weeks of inactivity
- **Unassignment threshold**: 6 weeks of inactivity
- **Schedule**: Daily at 9:00 AM UTC
- **Scope**: All assigned issues in the repository

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TIME_UNIT` | Time unit: 'weeks', 'minutes', or 'seconds' | `weeks` |
| `WARNING_WEEKS` | Threshold for warning (in TIME_UNIT) | `5` |
| `UNASSIGN_WEEKS` | Threshold for unassignment (in TIME_UNIT) | `6` |
| `DRY_RUN` | Run without making changes | `false` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Required |
| `GITHUB_REPOSITORY` | Repository in format "owner/repo" | Required |

### Customizing Timeframes (Production)

**Important:** The warning and unassignment thresholds are hardcoded in the workflow file.

To change the production timeframes, edit `.github/workflows/issue-management.yml` in **two places**:

**1. Default values for manual triggers (lines ~25-28):**
```yaml
warning_weeks:
  default: '4'    # Change from '5' to '4'
unassign_weeks:
  default: '5'    # Change from '6' to '5'
```

**2. Fallback values for scheduled runs (lines ~73-74):**
```yaml
WARNING_WEEKS: ${{ ... || '4' }}    # Change from '5' to '4'
UNASSIGN_WEEKS: ${{ ... || '5' }}   # Change from '6' to '5'
```

After editing, commit and push the changes. The new values take effect on the next scheduled run.

### Changing the Schedule (Production)

To run more or less frequently, edit the cron expression in `.github/workflows/issue-management.yml` (line ~7):

```yaml
schedule:
  # Current: Daily at 9 AM UTC
  - cron: '0 9 * * *'

  # Every 3 days at 9 AM UTC
  - cron: '0 9 */3 * *'

  # Twice daily (9 AM and 9 PM UTC)
  - cron: '0 9,21 * * *'

  # Weekly on Mondays at 9 AM UTC
  - cron: '0 9 * * 1'
```

**Note:** Cron schedules only run on the default branch (main). Changes take effect on the next scheduled time after merging.

## 🧪 End-to-End Testing

Test the system on your repository with real GitHub issues.

### Quick Test - See All Behaviors

```bash
cd .github/scripts

# Run the complete test workflow (~2-3 minutes)
npm run issue-mgmt:test:workflow

# When done, clean up
npm run issue-mgmt:test:cleanup
```

This will:
1. ✅ Clean up any existing test issues
2. ✅ Create issues in 3 staggered batches with delays
3. ✅ Run the script at the perfect time
4. 📊 Show you **warnings AND unassignments** in the same run!

**Expected Results:**
- Batch 1 (~120 seconds old) → **Unassigned** ✅
- Batch 2 (~30 seconds old) → **Warning comments** ⚠️
- Batch 3 (just created) → **No action**

**Note:** The test issue creator automatically creates issues in staggered batches to ensure you can see all behaviors in one test run.

### 🚀 Testing with GitHub Actions

To test the complete end-to-end workflow using GitHub Actions:

```bash
npm run issue-mgmt:test:github
```

This script will:
1. ✅ Clean up old test issues
2. ✅ Create new test issues in staggered batches (~4-5 minutes)
3. ✅ Trigger the GitHub Actions workflow with correct parameters
4. ✅ Wait for the workflow to complete
5. ✅ Check and display the results
6. ✅ Verify expected behavior

**Requirements:**
- GitHub CLI (`gh`) must be installed and authenticated
- `.env.test` must be configured with your fork's repository
- You must have pushed the workflow file to your fork

**What it tests:**
- Complete GitHub Actions workflow execution
- TIME_UNIT parameter support (seconds/minutes/weeks)
- Proper environment variable passing
- Issue processing in a real GitHub environment

### Test Configuration

The test uses `.env.test` with these settings:

```bash
GITHUB_REPOSITORY=your-username/your-fork
DRY_RUN=false
TIME_UNIT=seconds       # Use seconds for fast testing
WARNING_WEEKS=40        # 40 seconds
UNASSIGN_WEEKS=200      # 200 seconds
```

### Manual Step-by-Step Testing

```bash
cd .github/scripts

# Step 1: Create test issues
npm run issue-mgmt:test:create

# Step 2: View the issues in GitHub
# Go to: https://github.com/your-repo/issues?q=is:issue+label:test

# Step 3: Run the script
npm run issue-mgmt:test:run

# Step 4: Review the output and check GitHub

# Step 5: Clean up when done
npm run issue-mgmt:test:cleanup
```

### Available Test Commands

| Command | Description | Time |
|---------|-------------|------|
| `npm run issue-mgmt:test:create` | Create 8 test issues | ~4-5 min |
| `npm run issue-mgmt:test:run` | Run script locally on test issues | ~5 sec |
| `npm run issue-mgmt:test:cleanup` | Close and clean up test issues | ~2 sec |
| `npm run issue-mgmt:test:workflow` | Full local workflow ⭐ | ~2-3 min |
| `npm run issue-mgmt:test:github` | Full GitHub Actions test 🚀 | ~5-10 min |

### Cleanup Modes

```bash
# Clean up all test issues (default)
npm run issue-mgmt:test:cleanup

# The cleanup script:
# - Fetches all issue states in parallel (fast!)
# - Skips already-closed issues
# - Shows clear summary of actions taken
```

## 🛠️ Development

### File Structure

```
src/issue-management/
├── check-stale-issues.ts           # Main script
├── simulate-stale-issues.ts        # Simulation mode
├── create-test-issues.ts           # Test issue creator (staggered batches)
├── cleanup-test-issues.ts          # Test cleanup
├── test-workflow.ts                # Local end-to-end test
├── test-github-workflow.ts         # GitHub Actions end-to-end test
└── README.md                       # This file
```

### Making Changes

1. Edit TypeScript files in `src/issue-management/`
2. Build: `npm run build`
3. Test with simulation: `npm run issue-mgmt:simulate`
4. Test with dry-run: `npm run issue-mgmt:start`
5. Run full test: `npm run issue-mgmt:test:workflow`

### Custom Messages

Edit the warning and unassignment messages in `check-stale-issues.ts`:

- `postWarningComment()` method for warning messages
- `unassignIssue()` method for unassignment messages

## 🎮 Manual Triggering (Production)

You can manually trigger the workflow from the GitHub Actions tab:

1. Go to **Actions** → **Issue Management**
2. Click **Run workflow**
3. **Configure the inputs:**

| Input | Default | Description |
|-------|---------|-------------|
| **dry_run** | `false` | ⚠️ **IMPORTANT:** Default is FALSE, meaning it WILL make real changes! Check this box to preview only. |
| **time_unit** | `weeks` | Time unit for thresholds (weeks/minutes/seconds) |
| **warning_weeks** | `5` | Threshold for warnings (in selected time unit) |
| **unassign_weeks** | `6` | Threshold for unassignments (in selected time unit) |

**⚠️ Warning:** Manual triggers with default settings will **actually post comments and unassign issues**. Always check the **dry_run** box if you just want to preview what would happen!

**Common use cases:**
- **Test after deployment:** Set `dry_run: true` to verify the workflow works
- **Force an immediate run:** Use defaults to run the automation right now instead of waiting for the scheduled time
- **Test with different thresholds:** Temporarily try different warning/unassign values

## 📊 Monitoring

### GitHub Actions Logs

- View execution logs in the **Actions** tab
- See detailed output for each run
- Monitor success/failure status
- Check the **Summary** section for configuration used

### Issue Comments

- All automated actions are documented in issue comments
- Comments are clearly marked as automated (🤖)
- Include explanations and next steps

## 🚨 Troubleshooting

### Common Issues

**"No test issues found"**
- Make sure you ran `npm run issue-mgmt:test:create` first
- Check that `.env.test` has the correct repository

**"Permission denied"**
- Verify your GitHub token has `repo` access
- Check that you have write access to the repository

**"Issues not triggering actions"**
- For testing: Verify `TIME_UNIT=seconds` in `.env.test`
- Check that issues are assigned to you
- Make sure `DRY_RUN=false` if you want real actions

**"Cleanup not working"**
- Check that issues have the `test` label
- Try running cleanup again - it's now parallel and much faster!

**Workflow not running**
- Check that GitHub Actions are enabled for the repository
- Verify the workflow file syntax is correct

**Rate limiting**
- The script includes delays to avoid GitHub API limits
- Large repositories may need longer delays

## 💡 Tips

1. **Start with simulation**: Always test with `npm run issue-mgmt:simulate` first
2. **Use dry-run**: Test with `DRY_RUN=true` before making real changes
3. **Test thoroughly**: Use `npm run issue-mgmt:test:workflow` for end-to-end testing
4. **Clean up regularly**: Don't leave test issues open
5. **Monitor logs**: Check GitHub Actions logs for any issues

## 🔒 Security & Permissions

### Required Permissions

- `issues: write` - To comment and modify issues
- `contents: read` - To access repository files

### Token Security

- Uses GitHub's built-in `GITHUB_TOKEN` in Actions
- No external tokens or secrets required
- Automatically scoped to the repository
- For local testing, use a Personal Access Token with `repo` scope
- For github actions testing, use a Personal Access Token with `repo` scope and `workflow` access

## 📝 Notes

### GitHub API Limitations

- **Cannot backdate timestamps**: All created issues appear as "just now"
- **Cannot delete issues**: Cleanup closes them but doesn't delete
- **Rate limits**: Script includes delays to avoid hitting limits

### Test Issue Markers

All test issues include:
- `[TEST]` prefix in title
- `test` label
- `<!-- TEST-ISSUE-MARKER -->` in body
- Documentation of expected behavior

This makes them easy to identify and clean up.

**Note:** The cron schedule only runs on the default branch (main). Once merged, no manual intervention is needed - the automation runs automatically!

Happy automating! 🚀
