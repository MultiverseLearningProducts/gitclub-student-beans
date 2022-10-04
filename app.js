"use strict";

require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const nunjucks = require("nunjucks");
const session = require("express-session");
const { randomUUID } = require("crypto");
const { default: axios } = require("axios");

const app = express();
const port = process.env.PORT || 3000;
const stateKey = "github_auth_state";

const sessionSettings = {
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
};

/**
 * Handle the / route.
 * @param {express.Request} req The Request object.
 * @param {express.Response} res The Response object.
 */
function index(req, res) {
  res.render("index");
}

/**
 * Handle the /login route.
 * @param {express.Request} _req The Request object.
 * @param {express.Response} res The Response object.
 */
function login(_req, res) {
  const state = randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    scope: "repo",
    state,
  });

  res.cookie(stateKey, state);
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

/**
 * Handle the /callback route.
 * @param {express.Request} req The Request object.
 * @param {express.Response} res The Response object.
 * @param {express.NextFunction} next The next function in the request-response cycle.
 */
async function callback(req, res, next) {
  const { code, state } = req.query;
  const savedState = req.cookies[stateKey];

  // If the states don't match, then a third party created the request,
  // and we should abort the process.
  if (!state || state !== savedState) {
    res.redirect("/");
    return;
  }

  // Regenerate the session, which is good practice to help
  // guard against forms of session fixation.
  req.session.regenerate(async (error) => {
    if (error) next(error);

    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
    });

    const requestConfig = {
      method: "post",
      headers: { Accept: "application/json" },
      url: `https://github.com/login/oauth/access_token?${params.toString()}`,
    };

    res.clearCookie(stateKey);

    try {
      const { data } = await axios(requestConfig);
      req.session.token = data.access_token;
      req.session.save((error) => {
        if (error) {
          next(error);
        } else {
          res.redirect("/repos");
        }
      });
    } catch (error) {
      console.error("Something went wrong:", error);
      res.redirect("/");
    }
  });
}

nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.set("views", "./views");
app.set("view engine", "njk");

app.use(express.static("./public"));
app.use(session(sessionSettings));

app.get("/", index);
app.get("/login", login);
app.get("/callback", cookieParser(), callback);

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port} ...`);
});
