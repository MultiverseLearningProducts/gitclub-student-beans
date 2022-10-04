"use strict";

require("dotenv").config();

const express = require("express");
const nunjucks = require("nunjucks");

const app = express();
const port = process.env.PORT || 3000;

/**
 * Handle the / route.
 * @param {express.Request} req The Request object.
 * @param {express.Response} res The Response object.
 */
function index(req, res) {
  res.render("index");
}

nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.set("views", "./views");
app.set("view engine", "njk");

app.use(express.static("./public"));

app.get("/", index);

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port} ...`);
});
