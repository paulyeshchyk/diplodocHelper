// src/config/diplodoc.config.model.ts

export interface DiplodocConfig {
    /** Префикс подписи под рисунком. */
    figureCaptionPrefix?: string;

    /** Префикс ссылки на рисунок. */
    figureReferenceCaptionPrefix?: string;

    /** Использовать пулинг для обновления контекстного меню. */
    usePollingForContext?: boolean;

    /** Интервал пулинга (мс). */
    contextPollingInterval?: number;

    /** Язык по умолчанию. */
    defaultLanguage: string;
}