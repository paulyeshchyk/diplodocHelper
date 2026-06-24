// src/manifest/models/ManifestMenuItem.js

const ContributionSeparatorPosition = require('./ContributionMenuSeparatorPosition');

class ContributionMenuItem {
    /**
     * @param {Object} params
     * @param {string} [params.command]
     * @param {string} [params.submenu]
     * @param {string} [params.when]
     * @param {string} [params.group] - готовая строка (приоритет)
     * @param {string} [params.groupName] - имя группы
     * @param {number} [params.groupOrder] - порядок группы (число, влияет на сортировку между группами)
     * @param {number} [params.order] - порядок внутри группы
     * @param {string} [params.separator=SeparatorPosition.NONE]
     */
    constructor({
        command,
        submenu,
        when,
        group,
        groupName,
        groupOrder,
        order,
        separator = ContributionSeparatorPosition.NONE,
    }) {
        if (!command && !submenu) {
            throw new Error('MenuItem must have either "command" or "submenu"');
        }
        this.command = command;
        this.submenu = submenu;
        this.when = when;

        if (group) {
            this.group = group;
        } else {
            if (!groupName || groupOrder === undefined || order === undefined) {
                throw new Error('If group is not provided, groupName, groupOrder, and order are required');
            }
            this.groupName = groupName;
            this.groupOrder = groupOrder;
            this.order = order;
            this.separator = separator;
        }
    }

    toJSON() {
        const result = {};
        if (this.command) result.command = this.command;
        if (this.submenu) result.submenu = this.submenu;
        if (this.when) result.when = this.when;

        if (this.group) {
            result.group = this.group;
        } else if (this.groupName !== undefined && this.groupOrder !== undefined && this.order !== undefined) {
            let prefix = '';
            if (this.separator === ContributionSeparatorPosition.BOTTOM) {
                prefix = 'z';
            } else if (this.separator === ContributionSeparatorPosition.TOP) {
                prefix = '0';
            }
            result.group = `${prefix}${this.groupOrder}.${this.groupName}@${this.order}`;
        }
        return result;
    }

    /**
     * @param {{ command?: string | undefined; submenu?: string | undefined; when?: string | undefined; group?: string | undefined; groupName?: string | undefined; groupOrder?: number | undefined; order?: number | undefined; separator?: string | undefined; }} obj
     */
    static fromObject(obj) {
        return new ContributionMenuItem(obj);
    }
}

module.exports = ContributionMenuItem;
