/* globals __dirname, module, process, require */

"use strict";

const Nightmare = require("nightmare");
const path = require("path");
const error = err =>
{
  console.error(err);
  process.exit(1);
};

// a list of functions to invoke
// once each previous one is done
module.exports.tests = [
  // function receives done and a url
  // pointing at the smoke file
  (done, url) =>
  {
    Nightmare({show: true})
      .goto(url)
      .wait('[role="option"]')
      .end(done)
      .catch(error);
  },
  (done, url) =>
  {
    Nightmare({show: true})
      .goto(url)
      .wait('[role="option"]')
      .screenshot(path.join(__dirname, "..", "smoke", "io-list-box.closed.png"))
      .evaluate(() => document.querySelector('[role="combobox"]').focus())
      .wait("io-list-box[expanded]")
      .wait(100)
      .screenshot(path.join(__dirname, "..", "smoke", "io-list-box.opened.png"))
      .click('[role="option"]')
      .wait("io-list-box:not([expanded])")
      .wait('[role="option"][aria-selected="true"]')
      .end(done)
      .catch(error);
  }
];
