 
const ContributionMenuItem = require('./ContributionMenuItem');

class ContributionSubmenu {
    /**
     * @param {string} id - уникальный идентификатор подменю
     * @param {string} label - отображаемое название (может быть локализованным)
     */
    constructor(id, label) {
        this.id = id;
        this.label = label;
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
        return { id: this.id, label: this.label };
    }

    getItemsJSON() {
        return this.items.map(item => item.toJSON());
    }
}

module.exports = ContributionSubmenu;
