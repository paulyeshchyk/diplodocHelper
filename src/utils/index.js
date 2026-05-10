// src/utils/index.js
const constants = require("./constants");
const files = require("./files");
const frontmatter = require("./frontmatter");
const section = require("./section");
const prompts = require("./prompts");
const templates = require("./templates");
const toc = require("./toc");

module.exports = {
  ...constants,
  ...files,
  ...frontmatter,
  ...section,
  ...prompts,
  ...templates,
  ...toc,
};