/** @import {ContextMap} from '../core/types' */

const INDEX_MD_DEFAULT_CONTENT = (/** @type {string} */ title) =>
  ["---", `title: ${title}`, `sectionType: Page`, "---"].join("\n");

/**
 * @param {{ term: any; slug: any; }} i
 */
function TOC_YAML_LINK_TEMPLATE(i) {
  return `  - name: ${i.term}\n    href: ${i.slug}.md`;
}

/**
 * @param {string} title
 * @param {string} tocItems
 */
function TOC_YAML_LINKS_TEMPLATE(title, tocItems) {
  return `title: ${title}\nhref: index.md\nitems:\n${tocItems}`;
}

/**
 * @param {string} title
 * @param {string} linksYaml
 */
function INDEX_TAML_LINKS_TEMPLATE(title, linksYaml) {
  return `title: ${title}\nlinks:\n${linksYaml}`;
}

/**
 * @param {{ term: any; slug: any; }} i
 * @param {ContextMap} contextMap
 */
function INDEX_YAML_LINK_TEMPLATE(i, contextMap) {
  return `- title: ${i.term}\n  description: "Rank: ${contextMap[i.term].rank}"\n  href: ${i.slug}.md`;
}

module.exports = {
  INDEX_MD_DEFAULT_CONTENT,
  INDEX_YAML_LINK_TEMPLATE,
  INDEX_TAML_LINKS_TEMPLATE,
  TOC_YAML_LINKS_TEMPLATE,
  TOC_YAML_LINK_TEMPLATE,
};
