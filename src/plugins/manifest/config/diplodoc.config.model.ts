// src/config/model/diplodoc.config.model.ts

export interface DiplodocConfig {
    /**
     * %extension.settings.figureCaptionPrefix.description%
     * @default "Рисунок "
     */
    figureCaptionPrefix?: string;

    /**
     * %extension.settings.figureReferenceCaptionPrefix.description%
     * @default "( рис. {0})"
     */
    figureReferenceCaptionPrefix?: string;

    /**
     * %extension.settings.usePollingForContext.description%
     * @default true
     */
    usePollingForContext?: boolean;

    /**
     * %extension.settings.contextPollingInterval.description%
     * @default 800
     */
    contextPollingInterval?: number;

    /**
     * @default ru
     */
    defaultLanguage: string
}
