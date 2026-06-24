class ContributionCommand {
    /**
     * @param {string} command - идентификатор команды (например, "diplodoc-helper.link.addAnchor")
     * @param {string} title - название команды (может быть локализованным, вида "%key%")
     */
    constructor(command, title) {
        this.command = command;
        this.title = title;
    }

    toJSON() {
        return {
            command: this.command,
            title: this.title,
        };
    }
}

module.exports = ContributionCommand;
