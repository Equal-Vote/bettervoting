---
layout: default
title: 🌱 First time Local Setup
nav_order: 1
parent: Contribution Guide
---

# Set up star.vote locally

<!-- Most of this setup was shamelessly copied from https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/docs/how-to-setup-freecodecamp-locally.md-->

Follow these guidelines for setting up star.vote locally on your system. This is highly recommended if you want to contribute regularly.

Some of these contribution workflows – like fixing bugs in the codebase – need you to run star.vote locally on your computer.

> **What's the difference between star.vote and dev.star.vote ?**<br>
> The current star.vote is an old implementation with a separate codebase. dev.star.vote is a work in progress, and will eventually become the new star.vote. When I mention star.vote in the guide I'm referring to the new star.vote

## Prepare your local machine

Start by installing the prerequisite software for your operating system.

### Prerequisites:

| Prerequisite                                                                                  | Version    | Notes                                                                                       |
| --------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| [Node.js](http://nodejs.org)                                                                  | `20.x`     | -                                                                                           |
| npm (comes bundled with Node)                                                                 | `10.x`     | -                                                                                           |

> If you have a different version, please install the recommended version. We can only support installation issues for recommended versions. See [troubleshooting](#troubleshooting) for details.

If Node.js is already installed on your machine, run the following commands to validate the versions:

```
node -v
npm -v
```

> We highly recommend updating to the latest stable releases of the software listed above, also known as Long Term Support (LTS) releases.

Once you have the prerequisites installed, you need to prepare your development environment. This is common for many development workflows, and you will only need to do this once.

### Follow these steps to get your development environment ready:

1. Install [Git](https://git-scm.com/) or your favorite Git client, if you haven't already. Update to the latest version; the version that came bundled with your OS may be outdated.

1. Install a code editor of your choice.

   We highly recommend using [Visual Studio Code](https://code.visualstudio.com/).

4. Set up linting for your code editor. (NOTE: we don't actually have this yet, but we should at some point so I'm leaving the instructions here)

   You should have [ESLint running in your editor](http://eslint.org/docs/user-guide/integrations.html), and it will highlight anything that doesn't conform to [freeCodeCamp's JavaScript Style Guide](http://forum.freecodecamp.org/t/free-code-camp-javascript-style-guide/19121).

   > Please do not ignore any linting errors. They are meant to **help** you and to ensure a clean and simple codebase.

## Fork the repository on GitHub

[Forking](https://help.github.com/articles/about-forks/) is a step where you get your own copy of star.vote's main repository (a.k.a _repo_) on GitHub.

This is essential, as it allows you to work on your own copy of star.vote on GitHub, or to download (clone) your repository to work on locally. Later, you will be able to request changes to be pulled into the main repository from your fork via a pull request (PR).

> The main repository at `https://github.com/Equal-Vote/star-server` is often referred to as the `upstream` repository.
>
> Your fork at `https://github.com/YOUR_USER_NAME/star-server` is often referred to as the `origin` repository. `YOUR_USER_NAME` would be replaced with your GitHub username.

**Follow these steps to fork the `https://github.com/Equal-Vote/star-server` repository:**

1. Go to the star.vote repository on GitHub: <https://github.com/Equal-Vote/star-server>

2. Click the "Fork" Button in the upper right-hand corner of the interface ([More Details Here](https://help.github.com/articles/fork-a-repo/))

3. After the repository has been forked, you will be taken to your copy of the star.vote repository at `https://github.com/YOUR_USER_NAME/star-server` (`YOUR_USER_NAME` would be replaced with your GitHub user name.)

<details>
   <summary>
      How to fork on GitHub (screenshot)
   </summary>
   <br>
   <img src="https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/docs/images/github/how-to-fork-freeCodeCamp.gif">
</details>

## Clone your fork from GitHub

[Cloning](https://help.github.com/articles/cloning-a-repository/) is where you **download** a copy of a repository from a `remote` location that is either owned by you or by someone else. In your case, this remote location is your `fork` of star.vote's repository that should be available at `https://github.com/YOUR_USER_NAME/star-server`. (`YOUR_USER_NAME` would be replaced with your GitHub user name.)

Run these commands on your local machine:

1. Open a Terminal / Command Prompt / Shell in your projects directory

   _i.e.: `/yourprojectsdirectory/`_

2. Clone your fork of star.vote, replacing `YOUR_USER_NAME` with your GitHub Username

   ```
   git clone --depth=1 https://github.com/YOUR_USER_NAME/star-server.git
   ```

This will download the entire star.vote repository to your projects directory.

Note: `--depth=1` creates a shallow clone of your fork, with only the most recent history/commit.

## Set up syncing from parent

Now that you have downloaded a copy of your fork, you will need to set up an `upstream` remote to the parent repository.

[As mentioned earlier](#fork-the-repository-on-github), the main repository is referred `upstream` repository. Your fork referred to as the `origin` repository.

You need a reference from your local clone to the `upstream` repository in addition to the `origin` repository. This is so that you can sync changes from the main repository without the requirement of forking and cloning repeatedly.

1. Change directory to the new star-server directory:

   ```
   cd star-server
   ```

2. Add a remote reference to the main star.vote repository:

   ```
   git remote add upstream https://github.com/Equal-Vote/star-server.git
   ```

3. Ensure the configuration looks correct:

   ```
   git remote -v
   ```

   The output should look something like below (replacing `YOUR_USER_NAME` with your GitHub username):

   ```
   origin      https://github.com/YOUR_USER_NAME/star-server (fetch)
   origin      https://github.com/YOUR_USER_NAME/star-server (push)
   upstream        https://github.com/Equal-Vote/star-server (fetch)
   upstream        https://github.com/Equal-Vote/star-server (push)
   ```

## Running star.vote locally

Now that you have a local copy of star.vote, you can follow these instructions to run it locally.

This will allow you to:

- Preview edits to pages as they would appear on star.vote.
- Work on UI related issues and enhancements.
- Debug and fix issues with the application servers and client apps.

If you do run into issues, first perform a web search for your issue and see if it has already been answered. If you cannot find a solution, please search our [GitHub issues](https://github.com/Equal-Vote/star-server/issues) page for a solution and report the issue if it has not yet been reported.

And as always, feel free to ask questions on the [#_software-dev slack channel](https://starvoting.slack.com/archives/C01EBAT283H).

> If you haven't joined the STAR Voting slack yet, you can follow the instructions [here](https://www.starvoting.us/get_involved) to get added

> You may skip running star.vote locally if you are simply editing files. For instance, performing a `rebase`, or resolving `merge` conflicts.
>
> You can always return to this part of the instructions later. You should **only** skip this step if you do not need to run the apps on your machine.
>
> [Skip to making changes](#making-changes-locally).

### Configuring dependencies

#### Step 1: Set up the backend environment variable file

Copy dev access credentials for the server.  After obtaining access, copy the "Sample.env (Azure)" section of the [dev credentials doc](https://docs.google.com/document/d/1D4CJ9l6lnR39YYPUvw_HbeUVXNR-tAbNF6eT89oxEuk) to `./backend/.env` (you will have to create this file).



#### Step 2: Set up the frontend environment variable file
Copy default environment variables for the frontend by running one of the following commands in the root of the frontend source directory `./frontend`.
<!-- Note: This tabs feature looks cool, we should look into it -->

<!-- tabs:start -->

#### **macOS/Linux**

```
cp sample.env .env
```

#### **Windows**

```
copy sample.env .env
```

<!-- tabs:end -->

#### Step 3: Install dependencies and start the star.vote client application and API server

You can now start up the API server and the client applications.

Install and build dependencies

```bash
npm i -ws
npm run build -w shared
```

Launch backend 

```bash
npm run dev -w backend
```

Launch frontend (in a new terminal). If you want to just run the web client without setting up the server you can add `PROXY_URL=dev.star.vote` in packages/frontend/.env.

```bash
npm run dev -w star-vote
```

## Hosting database and Keycloak locally

If you want to make changes to database schemas or keycloak settings, or don't have access to dev credentials, you can host the database and keycloak server locally with Docker.

Follow the instructions [here](https://docs.docker.com/engine/install/) to install docker, check system requirements for turning on WSL if using Windows. After installed start Docker Desktop.

docker-compose.yml in the project directory contains the configuration launching the server, database, and keycloak. Not much work has been done yet on running all three together, however you can launch the database with

```bash
docker compose  -f "docker-compose.yml" up -d --build my-db 
```

Next, update the database variables in your backend .env with 

```bash
DATABASE_URL=postgresql://postgres:ChangeMeOrDontTest2020@localhost:5432/postgres
DEV_DATABASE=FALSE
```

and run the commands

```bash
cd backend
npm run build
npm run migrate:latest
```

Migrate:latest will initialize the database tables with the latest migrations.

To run keycloak:

```bash
docker compose  -f "docker-compose.yml" up -d --build keycloak
```

You can then access keycloak at http://localhost:8080/ 

See the keycloak [deployment](contributions/Infrastructure/10_keycloak_deployment.md) and [configuration](contributions/Infrastructure/11_keycloak_configuration.md) documentation for next steps.


## Login

Deploying to localhost still uses the same KeyCloak userbase as production (at least for now). If you want to login to the production keycloak make sure you followed the keycloak step in [the environment variable setup](#step-1-set-up-the-environment-variable-file). That said logging in through localhost does require some extra steps, so be sure to follow these additional steps

1. Click the login button
2. Login with your standard credentials (i.e. not admin)

## Making changes locally

You can now make changes to files and commit your changes to your local clone of your fork.

Follow these steps:

1. Validate that you are on the `main` branch:

   ```
   git status
   ```

   You should get an output like this:

   ```
   On branch main
   Your branch is up-to-date with 'origin/main'.

   nothing to commit, working directory clean
   ```

   If you are not on main or your working directory is not clean, resolve any outstanding files/commits and checkout `main`:

   ```
   git checkout main
   ```

2. Sync the latest changes from the star-server upstream `main` branch to your local main branch:

   > [!WARNING]
   > If you have any outstanding pull request that you made from the `main` branch of your fork, you will lose them at the end of this step.
   >
   > You should ensure your pull request is merged by a moderator before performing this step. To avoid this scenario, you should **always** work on a branch other than the `main`.

   This step **will sync the latest changes** from the main repository of star-server. It is important that you rebase your branch on top of the latest `upstream/main` as often as possible to avoid conflicts later.

   Update your local copy of the star-server upstream repository:

   ```
   git fetch upstream
   ```

   Hard reset your main branch with the star.vote main:

   ```
   git reset --hard upstream/main
   ```

   Push your main branch to your origin to have a clean history on your fork on GitHub:

   ```
   git push origin main --force
   ```

   You can validate your current main matches the upstream/main by performing a diff:

   ```
   git diff upstream/main
   ```

   The resulting output should be empty.

3. Create a fresh new branch:

   Working on a separate branch for each issue helps you keep your local work copy clean. You should never work on the `main`. This will soil your copy of star-server and you may have to start over with a fresh clone or fork.

   Check that you are on `main` as explained previously, and branch off from there:

   ```
   git checkout -b fix/update-guide-for-xyz
   ```

   Your branch name should start with a `fix/`, `feat/`, `docs/`, etc. Avoid using issue numbers in branches. Keep them short, meaningful and unique.

   Some examples of good branch names are:

   ```md
   fix/update-challenges-for-react
   fix/update-guide-for-html-css
   fix/platform-bug-sign-in-issues
   feat/add-guide-article-for-javascript
   translate/add-spanish-basic-html
   ```

4. Edit pages and work on code in your favorite text editor.

5. Once you are happy with the changes you should optionally run star-server locally to preview the changes.

6. Make sure you fix any errors and check the formatting of your changes.

7. Check and confirm the files you are updating:

   ```
   git status
   ```

   This should show a list of `unstaged` files that you have edited.

   ```
   On branch feat/documentation
   Your branch is up to date with 'upstream/feat/documentation'.

   Changes were not staged for commit:
   (use "git add/rm <file>..." to update what will be committed)
   (use "git checkout -- <file>..." to discard changes in the working directory)

       modified:   CONTRIBUTING.md
       modified:   docs/README.md
       modified:   docs/how-to-work-on-guide-articles.md
   ...
   ```

8. Stage the changes and make a commit:

   In this step, you should only mark files that you have edited or added yourself. You can perform a reset and resolve files that you did not intend to change if needed.

   ```
   git add path/to/my/changed/file.ext
   ```

   Or you can add all the `unstaged` files to the staging area:

   ```
   git add .
   ```

   Only the files that were moved to the staging area will be added when you make a commit.

   ```
   git status
   ```

   Output:

   ```
   On branch feat/documentation
   Your branch is up to date with 'upstream/feat/documentation'.

   Changes to be committed:
   (use "git reset HEAD <file>..." to unstage)

       modified:   CONTRIBUTING.md
       modified:   docs/README.md
       modified:   docs/how-to-work-on-guide-articles.md
   ```

   Now, you can commit your changes with a short message like so:

   ```
   git commit -m "fix: my short commit message"
   ```

   Some examples:

   ```md
   fix: update guide article for Java - for loop
   feat: add guide article for alexa skills
   ```

   Optional:

   We highly recommend making a conventional commit message. This is a good practice that you will see on some of the popular Open Source repositories. As a developer, this encourages you to follow standard practices.

   Some examples of conventional commit messages are:

   ```md
   fix: update HTML guide article
   fix: update build scripts for Travis-CI
   feat: add article for JavaScript hoisting
   docs: update contributing guidelines
   ```

   Keep these short, not more than 50 characters. You can always add additional information in the description of the commit message.

   This does not take any additional time than an unconventional message like 'update file' or 'add index.md'

   You can learn more about why you should use conventional commits [here](https://www.conventionalcommits.org/en/v1.0.0-beta.2/#why-use-conventional-commits).

9. If you realize that you need to edit a file or update the commit message after making a commit you can do so after editing the files with:

   ```
   git commit --amend
   ```

   This will open up a default text editor like `nano` or `vi` where you can edit the commit message title and add/edit the description.

10. Next, you can push your changes to your fork:

    ```
    git push origin branch/name-here
    ```

## Proposing a Pull Request (PR)

After you've committed your changes, check here for [how to open a Pull Request](2_how_to_open_a_pull_request.md).

## Available NPM Scripts

### `npm run build -ws`
Builds all of the packages in the project.

### `npm run dev -w backend`
Runs a dev server for the backend which restarts on local changes.

### `npm run dev -w star-vote`
Runs a dev server for the frontend with hot module replacement and proxys API calls to the local backend dev server.

### `npm run clean`
Deletes the node_modules in the root directory.

### `npm run clean:ws`
Deletes the node_modules and build artifacts for the entire project.

### `npm start -w star-vote`

Runs the frontend in preview mode (which serves the locally built and bundled artifacts without hot module replacement.

## Learn More

You can learn more in the [Vite](https://vitejs.dev/) and [Vite Awesome Repo](https://github.com/vitejs/awesome-vite).

To learn React, check out the [React documentation](https://reactjs.org/).

## Troubleshooting

### Issues installing dependencies

If you get errors while installing the dependencies, please make sure that you are not in a restricted network or your firewall settings do not prevent you from accessing resources.

The first time setup can take a while depending on your network bandwidth. Be patient, and if you are still stuck we recommend using GitPod instead of an offline setup.

> [!NOTE]
> If you are using Apple Devices with M1 Chip to run the application locally, it is suggested to use Node v14.7 or above. You might run into issues with dependencies like Sharp otherwise.

### Backend: too many connections for role "abcd..."

This happens when the development database exceeds it's limit of 10k rows. This mainly happens because our pgboss cron job fills up the database over time. Those jobs are supposed to expire but that's an issue we're working on. This issue is not present with production becasue the row limit is much higher (10 million)

For now we've been fixing the issue by clearing the dev database periodically. Ping @mikefraze on slack if it needs to be cleared

## Getting Help

If you are stuck and need help, feel free to ask questions on the [#_software-dev slack channel](https://starvoting.slack.com/archives/C01EBAT283H).

> If you haven't joined the STAR Voting slack yet, you can follow the instructions [here](https://www.starvoting.us/get_involved) to get added

There might be an error in the console of your browser or in Bash / Terminal / Command Line that will help identify the problem. Provide this error message in your problem description so others can more easily identify the issue and help you find a resolution.
