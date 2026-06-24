// src/manifest/contributes/contributesBuilder.js

/**
 * @param {import("./model/ContributionMenu")[]} rootMenus
 * @param {import("./model/ContributionSubmenu")[]} allSubmenus
 * @param {import("./model/ContributionCommand")[]} commands
 */
function buildContributes(rootMenus, allSubmenus, commands) {
    const contributes = {};

    // Команды
    contributes.commands = commands.map(cmd => cmd.toJSON());

    // Подменю (список {id, label})
    contributes.submenus = allSubmenus.map(sub => sub.toJSON());

    // Меню – объединяем корневые меню и пункты самих подменю
    /** @type {Record<string, ReturnType<import("./model/ContributionMenuItem")['toJSON']>[]>} */
    const menus = {};

    // 1) Добавляем корневые меню (editor/context, explorer/context)
    for (const menu of rootMenus) {
        Object.assign(menus, menu.toJSON());
    }
    // 2) Добавляем пункты для каждого подменю
    for (const sub of allSubmenus) {
        menus[sub.id] = sub.getItemsJSON();
    }

    contributes.menus = menus;
    return contributes;
}

module.exports = { buildContributes };
