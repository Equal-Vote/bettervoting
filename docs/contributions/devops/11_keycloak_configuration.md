---
layout: default
title: 🔑 Configure Keycloak
nav_order: 11
parent: ☁️ DevOps
grand_parent: Contribution Guide
---

# Keycloak Configuration Guide

At this point you should have a keycloak endpoint, next we're going to configure it

## Regenerating dev-realm-export.json

Here's how we copy the prod configuration to be used as the development configuration

1. Export production configuration, and save it as dev-realm-export.json
2. Find replace s/Beta/Dev , s/Prod/Dev
3. Clear the identityProviders and identityProviderMappers (removes google)
4. Add "secret": "DefaultKeycloakSecret", under web client
5. Set verifyEmail to false
6. Upload to Arend's Software directory on google drive

Production runs with `verifyEmail` **on**, and the backend depends on it: it only trusts an
email address when the id token carries `email_verified: true` (the "email verified" mapper
in the `email` client scope). An account without a verified email can't send election emails,
upload images, vote in "one vote per user" elections, or use roles granted to its address.
In a dev realm with `verifyEmail` off, mark your test user's email as verified in the Keycloak
admin console (Users → the user → Email verified) to exercise those features.

The remainder of the article is pretty stale

## Keycloak Overview

### Realms

A keycloak realm specifies a grouping of users as well a configuration to determine how they login

We're going to have 3 realms

 * **master realm**: This is the default realm, and it will contain the pool of keycloak administration users
 * **STAR Voting realm**: The primary production realm, all users who login through the website will be stored in this realm
 * **STAR Voting Dev realm**: This will be identical to the STAR Voting realm, except it's intended for development puproses. We'll use this realm to store mocked users and experiment with new keycloak features

### Clients

Each realm can have multiple clients, and each client represents a login endpoint. For example the mobile and webapp could access the same realm through a different client

We'll use just have one star_vote_web client per realm (excluding master) for now

### Open ID Connect

The STAR Voting website will interact with Keycloak using the Open ID Connect protocol. Here's a good overview

https://www.youtube.com/watch?v=t18YB3xDfXI

Having a high level understanding of OIDC will make the setup process more clear

## Update Admin password

We deployed the service with the password set to password, let's change that

1. Navigate to the keycloak endpoint (https://auth.star.vote:8443), and login using username: admin and password: password
1. Click "Users"
1. Click "View all users" and open the first one
1. Go to "Credentials" tab, and reset the password

[more details](https://kb.vmware.com/s/article/88512)

## Create Admin users

We shouldn't ever need to use the root admin user, instead we should create seperate admin users for everyone who needs admin access

1. Click "Users"
1. Click "Add User" 
1. Fill out all the fields
1. Include "Update password" in required user actions
1. Hit "Save"
1. Under "Credentials" specify a placeholder password   
1. Under "Role Mappings" add "admin" to the assigned roles
1. Repeat for all the users you want to add

## Create New Realms

Repeat all the the following steps for the STAR Voting realm and the STAR Voting Dev realm

1. Hover over "Master" in the top left, and click "Add Realm"
1. Give it a name (STARVoting or STARVotingDev), and hit create
1. Under "Realm Settings"
    * Set the display name to include spaces
    * Enable User-Managed Access
1. Under "Realm Settings" > "Login". Enable the following
    * User Registration
    * Forgot password
    * Remember me
    * Verify email
1. Under "Realm Settings" > "Email". Set the following (this assumes you setup sendgrid seperately)
    * Host: smtp.sendgrid.net
    * Port: 465
    * From: elections@star.vote
    * Enable SSL: ON
    * Enable Authenticaion: ON
    * Authentication Username: apikey
    * Authentication Password: Use SENDGRID_API_KEY from [drive](https://docs.google.com/document/d/1D4CJ9l6lnR39YYPUvw_HbeUVXNR-tAbNF6eT89oxEuk)
1. Under "Realm Settings" > "Token Settings". Set the following
    * SSO Session Max: 10 Days
    * Access Token Lifespan: 5 Days
    * (there might be more, if user sessions are expiring too quickly you can come back to make tweaks)
1. Under "Clients", select "Create" and specify the following and hit "Save"
    * Client ID: star_vote_web
1. Under "Clients" > "star_vote_web" > "Settings" set the following and hit "Save"
    * Name: Star Vote Website Client
    * Access Type: confidential (public might be more correct? but our process is setup assuming confidential [link](https://oauth.net/2/client-types/#:~:text=Confidential%20clients%20are%20applications%20that,or%20on%20a%20mobile%20device.))
    * Service Accounts Enabled: OFF (this was ON in the previous setup but I don't think we need it?)
    * Valid Redirect URISs: (these are all the websites that can use this login endpoint)
        * https://bettervoting.com
        * https://bettervoting.com/*
        * http://localhost:3000 (this is useful for testing)
1. Under "clients" > "star_vote_web" > "Credentials" set the following and hit "Save"
    * Client Authenticator: Client Id and Secret


## Add login with Google

We have all google api stuff under mike@equal.vote 

Follow the guide here to set that up

https://keycloakthemes.com/blog/how-to-setup-sign-in-with-google-using-keycloak

## Point website to new endpoint

The dev and production environments need to be updated to point to the new keycloak service. You'll need the endpoint and secret for this

 * **endpoint**: The OIDC endpoint would be https://auth.star.vote:8443/realms/STARVotingDev/protocol/openid-connect (remove the Dev for the production environment)
 * **secret**: Copy this from "Clients" > "star_vote_web" > "Credentials" 

 > NOTE: Aside from the domain the endpoint structure is slightly different from the previous pattern due to a recent keycloak update [more info](https://stackoverflow.com/questions/48056418/keycloak-returns-404-not-found-page)

### Dev Environment
For the development realm, update the credentials in [drive](https://docs.google.com/document/d/1D4CJ9l6lnR39YYPUvw_HbeUVXNR-tAbNF6eT89oxEuk/edit#)

### Production Environment
For production you'll need to access heroku and update the KEYCLOAK_SECRET and KEYCLOAK_URL environment variables

### Frontend
For now the endpoint is still hardcoded on the front end side, you'll need to go into ``frontend/src/App.tsx`` and apply the endpoint there

> WARNING: The front end does not need the secret. This is by design. The front end code can be accessed by anyone, so OIDC is setup to only use the secret from the backend

## Done

and you're all set, congratulations!