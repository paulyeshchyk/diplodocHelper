/** @import {ContributionMenuItem} from ('./ContributionMenuItem') */

class ContributionManifestMenu {
    /**
     * @param {string} id
     */
    constructor(id) {
        this.id = id;
        /**
         * @type {ContributionMenuItem[]}
         */
        this.items = [];
    }
    /**
     * @param {ContributionMenuItem} item
     */
    addItem(item) {
        this.items.push(item);
        return this;
    }
    toJSON() {
        return { [this.id]: this.items.map(item => item.toJSON()) };
    }
}

module.exports = ContributionManifestMenu;
