---
layout: default
title: ✔️ Testing
nav_order: 5
parent: 💻 Developers
---

# Testing

## Types of Testing

Here are the types of testing for BetterVoting.

* **Backend Unit Tests**: These are written using Jest. Among other areas it ensures that the tabulation algorithms are implemented correctly. These are ideal for verifying specific functions or files on the backend.
* **End-to-end tests**: These are created with Playwright. This deploys a local version of the full service (frontend + backend), and simulate actions from the user. These are ideal for verifying common user patterns on the app. E2E tests tend to require more maintence that other tests, so we limit this to a smaller suite of happy path tests. 
* **Frontend Unit Tests**: These haven't been implemented yet, but they would cover UI edge cases more thoroughly than we would see from the end-to-end tests. This is ideal for verifying interactions on individual UI components. 

# Backend Unit Tests

### Run the tests

TODO

### Add tests

TODO

### Working with mocks

# End-to-end Tests

### Setup

Before running or adding tests locally double check the following:

* Navigate to the testing directory in your command line.
* Have the full stack running locally from the [local setup guide](https://docs.bettervoting.com/contributions/developers/1_local_setup.html)

### Running the tests

All E2E tests should be run from the `testing` directory.

Run all tests:

```
npx playwright test
```

Run a specific test:

```
npx playwright test --grep "<test name>" --project=chromium
```

Playwright supports 3 browsers: Firefox, Chromium, and Webkit. Running all the tests will run on multiple browsers but if you're just testing a specific test we recommend limiting to chromium so that it runs faster.

Viewing detailed report of previous run:

```
npx playwright show-result
```

### Add Tests

When writing new tests I highly recommend using the codegen feature. This will record actions on your browser and generate a good starting point for your test.

```
npx playwright codegen localhost:3000
```

After that you can copy the test into one of the scripts within the ``testing/tests`` directory.

### Timeout best practices

Setting good timeouts are a tricky balance when writing end-to-end tests. It can be tempting to increase them to account for flaky tests, but doing that too often will make the tests unnecessarily slow. Playwright has some features to account for this, but we're still working on identifying best practices.

# Frontend Unit Tests

These haven't been implemented yet, [follow issue #1246](https://github.com/Equal-Vote/bettervoting/issues/1246) for details.


