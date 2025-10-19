---
layout: default
title: 🌱 First time Local Setup
nav_order: 1
parent: 💻 Developers
---

# Set up BetterVoting locally

Follow these guidelines for setting up BetterVoting locally on your system. This is highly recommended if you want to contribute regularly.

Some of these contribution workflows – like fixing bugs in the codebase – need you to run BetterVoting locally on your computer.

> **What's the difference between star.vote and bettervoting.com ?**<br>
> The current star.vote is an old implementation with a separate codebase. bettervoting.com is a work in progress. Eventually the current star.vote will be moved to classic.star.vote and bettervoting.com will be the new default for star.vote. 

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

## Learning the Tech

Our stack uses typescript for both frontend and backend, and we use React to render the webpages. 

If haven't worked with those technologies before, I recommend following the crash courses before getting setup

### The basics
Here's some videos to quickly get up to speed on the core skills
 * [Javascript Crash Course](https://www.youtube.com/watch?v=FtaQSdrl7YA) : You'll need to understand Javascript before learning typescript. This crash course also does a great job of getting you onboarded to general web development as well as covering the javascript.
 * [Typescript Crash Course](https://www.youtube.com/watch?v=ahCwqrYpIuM) : Typescript adds a couple of features to Javascript. You can probably understand most of our code base with just Javascript knowledge, but it's also good to have the context on Typescript. This video is much shorter, just to give you a broad typescript overview. 
 * [React Crash Course](https://www.youtube.com/watch?v=Rh3tobg7hEo)
 * (Optional) Arend also found frontendexpert.io very helpful to give an overview of everything, but it does cost money

### Additional Reading

We compile our typescript using Vite, you can learn more in the [Vite](https://vitejs.dev/) and [Vite Awesome Repo](https://github.com/vitejs/awesome-vite).

To learn more React, check out the [React documentation](https://reactjs.org/).

## Fork the repository on GitHub

[Forking](https://help.github.com/articles/about-forks/) is a step where you get your own copy of BetterVoting's main repository (a.k.a _repo_) on GitHub.

This is essential, as it allows you to work on your own copy of BetterVoting on GitHub, or to download (clone) your repository to work on locally. Later, you will be able to request changes to be pulled into the main repository from your fork via a pull request (PR).

> The main repository at `https://github.com/Equal-Vote/bettervoting` is often referred to as the `upstream` repository.
>
> Your fork at `https://github.com/YOUR_USER_NAME/bettervoting` is often referred to as the `origin` repository. `YOUR_USER_NAME` would be replaced with your GitHub username.

**Follow these steps to fork the `https://github.com/Equal-Vote/bettervoting` repository:**

1. Go to the BetterVoting repository on GitHub: <https://github.com/Equal-Vote/bettervoting>

2. Click the "Fork" Button in the upper right-hand corner of the interface ([More Details Here](https://help.github.com/articles/fork-a-repo/))

3. After the repository has been forked, you will be taken to your copy of the BetterVoting repository at `https://github.com/YOUR_USER_NAME/bettervoting` (`YOUR_USER_NAME` would be replaced with your GitHub user name.)

## Clone your fork from GitHub

[Cloning](https://help.github.com/articles/cloning-a-repository/) is where you **download** a copy of a repository from a `remote` location that is either owned by you or by someone else. In your case, this remote location is your `fork` of BetterVoting's repository that should be available at `https://github.com/YOUR_USER_NAME/bettervoting`. (`YOUR_USER_NAME` would be replaced with your GitHub user name.)

Run these commands on your local machine:

1. Open a Terminal / Command Prompt / Shell in your projects directory

   _i.e.: `/yourprojectsdirectory/`_

2. Clone your fork of BetterVoting, replacing `YOUR_USER_NAME` with your GitHub Username

   ```
   git clone --depth=1 https://github.com/YOUR_USER_NAME/bettervoting.git
   ```

This will download the entire BetterVoting repository to your projects directory.

Note: `--depth=1` creates a shallow clone of your fork, with only the most recent history/commit.

## Set up syncing from parent

Now that you have downloaded a copy of your fork, you will need to set up an `upstream` remote to the parent repository.

[As mentioned earlier](#fork-the-repository-on-github), the main repository is referred `upstream` repository. Your fork referred to as the `origin` repository.

You need a reference from your local clone to the `upstream` repository in addition to the `origin` repository. This is so that you can sync changes from the main repository without the requirement of forking and cloning repeatedly.

1. Change directory to the new bettervoting directory:

   ```
   cd bettervoting
   ```

2. Add a remote reference to the main BetterVoting repository:

   ```
   git remote add upstream https://github.com/Equal-Vote/bettervoting.git
   ```

3. Ensure the configuration looks correct:

   ```
   git remote -v
   ```

   The output should look something like below (replacing `YOUR_USER_NAME` with your GitHub username):

   ```
   origin      https://github.com/YOUR_USER_NAME/bettervoting (fetch)
   origin      https://github.com/YOUR_USER_NAME/bettervoting (push)
   upstream        https://github.com/Equal-Vote/bettervoting (fetch)
   upstream        https://github.com/Equal-Vote/bettervoting (push)
   ```

## Running BetterVoting locally

Now that you have a local copy of BetterVoting, you can follow these instructions to run it locally.

This will allow you to:

- Preview edits to pages as they would appear on BetterVoting.
- Work on UI related issues and enhancements.
- Debug and fix issues with the application servers and client apps.

If you do run into issues, first perform a web search for your issue and see if it has already been answered. If you cannot find a solution, please search our [GitHub issues](https://github.com/Equal-Vote/bettervoting/issues) page for a solution and report the issue if it has not yet been reported.

And as always, feel free to ask questions on the [#_bettervoting slack channel](https://starvoting.slack.com/archives/C01EBAT283H).

> If you haven't joined the STAR Voting slack yet, you can [sign up with STAR Voting](https://starvoting.org/join) to received an invite link

### Three ways to run locally

You can loosly breakdown BetterVoting.com into 3 services: Frontend + Backend + Database

There's also 3 corresponding patterns for developing locally depending on how many of those services you want to replicate.

1. **Local Frontend + Production Backend** : You run the frontend locally, and proxy to the production backend. This is the quickest route for people who only need to make visual changes and don't need to make backend tweaks. This will be sufficient for the most volunteers.

1. **Local Frontend & Backend + Production Database** : You run the frontend and backend locally, but then configure your backend to use the production database. This is the easiest route for full stack development however it is also high risk, so it's not recommend unless you're comfortable with the database (and even then it's probably not a good idea). 

1. **Local Everything** : You replicate all 3 pieces locally. This is the safest option for full stack development, and it eliminates all risk of your changes having an impact production.

The the following three sections will cover how to run frontend, backend, and the database, but you can stop reading once you've finished the section for your respective pattern. 

### Frontend : Setup environment variables & run frontend

#### Step 1: Set up environment variable files

Copy sample environment variables to a .env file. These commands will apply for both frontend and backend.

<!-- Note: This tabs feature looks cool, we should look into it -->

<!-- tabs:start -->

#### **macOS/Linux**

```
cp packages/frontend/sample.env packages/frontend/.env
cp packages/backend/sample.env packages/backend/.env
```

#### **Windows**

```
copy packages/frontend/sample.env packages/frontend/.env
copy packages/backend/sample.env packages/backend/.env
```

<!-- tabs:end -->

#### Step 2: Setup Backend Connection

Now your packages/frontend/.env file should 2 sections for connecting to the backend. One for a production backend, and one for local

If you're running your own backend, then leave the default sample.env (which has the production backend commented out).

If you're proxying to the production backend, then comment out the variables for the local backend, and uncomment the production section.

#### Step 3: Install dependencies and start the BetterVoting frontend application

Now we can run the frontend

Build workspace & install dependencies

```bash
# Run these commands from the root of the project
# Installs dependencies for all workspaces
npm i -ws 
# Builds shared workspace
npm run build -w @equal-vote/star-vote-shared
```

Launch frontend (in a new terminal). 

```bash
# Run Frontend
npm run dev -w @equal-vote/star-vote-frontend
```

**Verification Steps**

There will probably be lots of red in the terminal, but your frontend should be live at localhost:3000

### Database(s) : Run postgresql database and keycloak service

Note: Most of you will need to setup the databases, but if you have production credentials in your .env then you can skip this step. Email elections@star.vote if you need access to the production databases.

The database(s) inclue a postgresql database for storing all the election data, and a keycloak service which stores and manages all the user data. Both are defined within docker-compose, and can be started with some docker commands. 

Luckily, all the commands here should only need to be ran once. After that the services should be available for all future dev sessions.  

#### Installing Docker
Follow the instructions [here](https://docs.docker.com/engine/install/) to install docker, check system requirements for turning on WSL if using Windows. After installed start Docker Desktop.

#### Running docker-compose

Once you have docker setup run the following command to launch your server

```bash
# Run postgres database
docker compose  -f "docker-compose.yml" up -d --build my-db 
# Run keycloak service
docker compose  -f "docker-compose.yml" up -d --build keycloak
```

Note: You shouldn't need to configure .env variables, since sample.env is configured to connect to a docker composed database by default

**Verification Steps**

You can run ``docker ps`` to confirm both services started properly. The output should look as follows

```
$ docker ps
CONTAINER ID   IMAGE                              COMMAND                  CREATED         STATUS          PORTS                              NAMES
6682eb490f13   quay.io/keycloak/keycloak:23.0.1   "/opt/keycloak/bin/k…"   3 seconds ago   Up 2 seconds    0.0.0.0:8080->8080/tcp, 8443/tcp   bettervoting-keycloak-1
f443236f9609   postgres                           "docker-entrypoint.s…"   5 days ago      Up 53 seconds   0.0.0.0:5432->5432/tcp             bettervoting-my-db-1
```

Also the Keycloak UI should be running at http://localhost:8080/

#### Migrating database

Your database is running, but all the tables still need to be created. The following steps will ensure all the table are properly initialized.

```bash
npm run build -w @equal-vote/star-vote-backend
npm run migrate:latest -w @equal-vote/star-vote-backend
```

**Verification Steps**

You should see a series of migration success messages

```
migration "2023_07_03_Initial" was executed successfully
migration "2024_01_27_Create_Date" was executed successfully
migration "2024_01_29_pkeys_and_heads" was executed successfully
```


**Verification Steps**
It's tricky to verify at the moment, but once you have the backend running you should be able to register with a username and password via your frontend at localhost:3000.

NOTE: login with google won't work yet

### Backend : Run the backend

Running your own backend is optional, if you only plan to work in the frontend then you can setup your .env to reference the live backend instead of running your own .

Open a new terminal, and start the backend as follows

```bash
# NOTE: The below command assumes that the workspace, and shared package were both built in the previous step
# Launch the backend workspace 
npm run dev -w @equal-vote/star-vote-backend
```

**Verification Steps**

A successful command will have a message starting with "Server started on port" somewhere in the logs. 

You should be able to create elections using the quick poll.

Congratulations, you got the whole service running locally!! 🥳🥳


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

2. Sync the latest changes from the bettervoting upstream `main` branch to your local main branch:

   > [!WARNING]
   > If you have any outstanding pull request that you made from the `main` branch of your fork, you will lose them at the end of this step.
   >
   > You should ensure your pull request is merged by a moderator before performing this step. To avoid this scenario, you should **always** work on a branch other than the `main`.

   This step **will sync the latest changes** from the main repository of bettervoting. It is important that you rebase your branch on top of the latest `upstream/main` as often as possible to avoid conflicts later.

   Update your local copy of the bettervoting upstream repository:

   ```
   git fetch upstream
   ```

   Hard reset your main branch with the BetterVoting main:

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

   Working on a separate branch for each issue helps you keep your local work copy clean. You should never work on the `main`. This will soil your copy of bettervoting and you may have to start over with a fresh clone or fork.

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

5. Once you are happy with the changes you should optionally run bettervoting locally to preview the changes.

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

### `npm run dev -w @equal-vote/star-vote-backend`
Runs a dev server for the backend which restarts on local changes.

### `npm run dev -w @equal-vote/star-vote-frontend`
Runs a dev server for the frontend with hot module replacement and proxys API calls to the local backend dev server.

### `npm run clean`
Deletes the node_modules in the root directory.

### `npm run clean:ws`
Deletes the node_modules and build artifacts for the entire project.

### `npm start -w @equal-vote/star-vote-frontend`

Runs the frontend in preview mode (which serves the locally built and bundled artifacts without hot module replacement.



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

If you are stuck and need help, feel free to ask questions on the [#_bettervoting slack channel](https://starvoting.slack.com/archives/C01EBAT283H).

> If you haven't joined the STAR Voting slack yet, you can follow the instructions [here](https://www.starvoting.us/get_involved) to get added

There might be an error in the console of your browser or in Bash / Terminal / Command Line that will help identify the problem. Provide this error message in your problem description so others can more easily identify the issue and help you find a resolution.
