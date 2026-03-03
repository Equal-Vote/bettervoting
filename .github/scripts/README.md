# GitHub Scripts

This directory contains automated scripts for repository management using GitHub Actions and TypeScript.

## 📁 Structure

```
.github/scripts/
├── src/                    # TypeScript source files
│   └── issue-management/   # Issue management feature
│       ├── *.ts           # TypeScript source
│       └── README.md      # Feature documentation
├── dist/                   # Compiled JavaScript (gitignored)
│   └── issue-management/
│       └── *.js
├── .env                    # Environment configuration (gitignored)
├── .env.test              # Test environment config (gitignored)
├── sample.env             # Sample environment template
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
cd .github/scripts

# Install dependencies
npm install

# Copy sample environment file
cp sample.env .env

# Edit .env and add your GitHub Personal Access Token
# (Required for local testing only - GitHub Actions uses GITHUB_TOKEN automatically)

# Build TypeScript
npm run build
```

## 🎯 Available Features

### Issue Management

Automatically manages stale assigned issues:
- Warns assignees after 5 weeks of inactivity
- Auto-unassigns after 6 weeks of inactivity
- Runs daily via GitHub Actions

**Documentation:** [src/issue-management/README.md](src/issue-management/README.md)

**Quick commands:**
```bash
# Simulate (no GitHub API calls)
npm run issue-mgmt:simulate

# Run in dry-run mode
npm run issue-mgmt:start

# Run tests
npm run issue-mgmt:test:workflow
```

## 🛠️ Development

### Building

```bash
# Build once
npm run build

# Watch mode (auto-rebuild on changes)
npm run build:watch

# Clean build artifacts
npm run clean
```

### Project Structure

- **Source files** go in `src/<feature-name>/`
- **Compiled output** goes to `dist/<feature-name>/` (gitignored)
- **Environment files** stay in the scripts root
- **Feature documentation** goes in `src/<feature-name>/README.md`

### Adding a New Feature

1. Create a new folder: `src/your-feature/`
2. Add TypeScript files: `src/your-feature/*.ts`
3. Add documentation: `src/your-feature/README.md`
4. Add npm scripts to `package.json`:
   ```json
   "your-feature:start": "node dist/your-feature/main.js"
   ```
5. Build and test: `npm run build && npm run your-feature:start`

## 📦 NPM Scripts

### Build Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode for development
- `npm run clean` - Remove build artifacts

### Issue Management Scripts
- `npm run issue-mgmt:start` - Run issue management (uses .env settings)
- `npm run issue-mgmt:simulate` - Simulation mode (no API calls)
- `npm run issue-mgmt:test:workflow` - Full end-to-end test
- See [issue-management README](src/issue-management/README.md) for all commands

## 🔧 Environment Configuration

Environment files are located in the scripts root:

- **`.env`** - Local development and manual testing (gitignored)
- **`.env.test`** - Automated testing on your fork (used by test scripts, gitignored)
- **`sample.env`** - Template with all available options

**When to use which:**
- Use `.env` for local development and manual script execution
- Use `.env.test` for automated end-to-end testing (referenced by `npm run issue-mgmt:test:*` commands)
- Both files use the same format - copy `sample.env` to get started

### Required Variables

```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPOSITORY=owner/repo
DRY_RUN=true
```

See `sample.env` for all available configuration options.

## 🧪 Testing

Each feature has its own testing setup. See feature-specific READMEs for details.

General testing workflow:
1. Build the project: `npm run build`
2. Run feature tests: `npm run <feature>:test:*`
3. Verify results in GitHub UI or terminal output

## 📚 Documentation

- **This file** - General scripts overview
- **Feature READMEs** - Detailed feature documentation in `src/<feature>/README.md`
- **sample.env** - Environment variable reference

## 🤝 Contributing

When adding or modifying scripts:

1. Write TypeScript in `src/<feature>/`
2. Build before committing: `npm run build`
3. Test thoroughly with dry-run mode
4. Update feature README with changes
5. Commit both `.ts` source and documentation

## 📝 Notes

- **Build artifacts** (`dist/`) are gitignored - they're generated during CI/CD
- **Environment files** (`.env`, `.env.test`) are gitignored for security
- **Source maps** are enabled for easier debugging
- **TypeScript strict mode** is enabled for better type safety

## 🔗 Related Files

- `.github/workflows/` - GitHub Actions workflows that use these scripts
- `src/issue-management/` - Issue management feature
