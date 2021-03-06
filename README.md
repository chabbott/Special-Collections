# Documentation

This repository contains the code for the Special Collections app, which
consists of a server component, using express.js and a front-end web app using
React.

Omeka S is used as the data store and the app can be configured to use any
instance, locally or remotely.

## Omeka S accounts

The application routes requests to Omeka S using role specific accounts.
Currently, we have guest, contrib(utor) and admin(istrator) roles. Each should
have a separate authentication key in Omeka S with access levels compatible with
said roles.

## Configuration

The server uses environment variables to provide authentication of app users and
to connect to Omeka S. The following environment variables should be set for
proper execution:

- OMEKA_PROTOCOL: the protocol ("http" or "https") used to access Omeka.
- OMEKA_URL: the URL address of Omeka (omitting the protocol).
- OMEKA_(ADMIN|CONTRIB|GUEST)_ID: the id that should be used to connect to Omeka
  for the role.
- OMEKA_(ADMIN|CONTRIB|GUEST)_CREDENTIAL: the access key that should be used to
  connect to Omeka for the role.
- SERVER_PORT: the port where the Special Collections web server should use.
- BASE_URL: the base url of the Special Collections site.
- JWT_SECRET: the secret key used in the JSON Web Token signing and
  verification. The documentation for the package we use can be found
  [here](https://www.npmjs.com/package/jsonwebtoken). A strong key should be
  generated (a randomly generated long password will work).
- JWT_EXPIRATION_HOURS: determines for how long an authentication token is
  considered valid. A short expiration time will force logged users to re-enter
  their credentials (and this might happen when they are trying to make a query
  or edit some record, which can be disruptive).

For local debugging, it is possible to create a .env file in the root folder
(see the .env.example file for an example). Our .gitignore prevents the
development .env files from being pushed into the repo and accidentally
revealing secret keys.

## Users

The current implementation is based on a very simple .users.csv file present at
the root folder. This CSV contains the table of all users with a login name,
role, and the salted and hashed password. For convenience, the file
.users.csv.example can be copied into .users.csv and manually edited. The
password for the *example* user is "123456".

Our .gitignore file will ensure that the users file is not pushed into the
repository.

In order to add new users or change passwords, run the app (see section below)
and use the API as follows:

- */auth* this entry point generates a JWT whenever the POST data contains valid
  user credentials in the format { userName: "...", password: "plain text
  password[^1]" }.
- */adduser* requires a JWT associated with an admin role and POST data in the
  format { userName: "new user", role: "guest|contrib|admin" }. The response
  will yield a random password generated for the new user (which should be
  changed by the user).
- */changepassword* allows the authenticated user to change her own password,
  the POST data is simply { password: "plain text password[^1]" }.
- */resetpassword* allows the admin to reset a password for an existing user so
  that a new random password is generated and returned.
- */changerole* allows the admin to change the role of an existing user (editing
  the CSV directly also works).
- there is no deleteuser API yet, however, deletion can be done directly on the
  CSV file by simply deleting the user's role.
- similarly, there is no renameuser API, but the CSV can be edited direcly (e.g.
  to change the example user when bootstrapping the app).

[^1]: Note that the only way to ensure a secure operation here is to use HTTPS,
  otherwise the plain text password will be exposed in transit.

To invoke the APIs directly, there are browser extensions such as Firefox
RESTClient. Alternatively, the curl command line tool can be used.

## Running the app

Once configured, the React app has to be built (transpiled) with the command

```
npm run build
```

This will package the React app into a build folder (which is excluded in
.gitignore). The built app can now be served by our express.js server:

```
npm run express
```