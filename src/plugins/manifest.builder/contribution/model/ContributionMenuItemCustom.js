// src/manifest/models/ManifestMenuItemCustom.js

const ContributionMenuItem = require('./ContributionMenuItem');
const SeparatorPosition = require('./ContributionMenuSeparatorPosition');

/**
 * @param {string} command
 * @param {string|undefined} when
 * @param {string} groupName
 * @param {number} groupOrder
 * @param {number} order
 * @param {string} [separator=SeparatorPosition.NONE]
 * @returns {ContributionMenuItem}
 */
function menuItem(command, when, groupName, groupOrder, order, separator = SeparatorPosition.NONE) {
    return new ContributionMenuItem({ command, when, groupName, groupOrder, order, separator });
}

/**
 * @param {string} submenuId
 * @param {string|undefined} when
 * @param {string} groupName
 * @param {number} groupOrder
 * @param {number} order
 * @param {string} [separator=SeparatorPosition.NONE]
 * @returns {ContributionMenuItem}
 */
function submenuItem(submenuId, when, groupName, groupOrder, order, separator = SeparatorPosition.NONE) {
    return new ContributionMenuItem({ submenu: submenuId, when, groupName, groupOrder, order, separator });
}

exports.submenuItem = submenuItem;
exports.menuItem = menuItem;
