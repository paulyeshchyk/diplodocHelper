export const SECTION_TYPES = {
    SECTION_PREFIX: 'Раздел',
    CHAPTER_PREFIX: 'Глава',
} as const;

export const SECTION_LABELS = {
    NO_SECTION: 'Без раздела',
    NO_CHAPTER: 'Без главы',
    SECTION_CONTENT: 'Текст раздела',
    OTHER: 'Прочее',
} as const;

export const FILE_NAMES = {
    INDEX_MD: 'index.md',
    INDEX_HTML: 'index.html',
    INDEX: 'index',
} as const;

export const FILE_EXTENSIONS = {
    HTML: '.html',
    MARKDOWN: '.md',
} as const;

export const STATUS_THRESHOLDS = {
    MIN_SIZE: 490,
    PARTIAL_RATIO: 0.5,
    FULL_RATIO: 0.8,
    EXCESS_RATIO: 1.2,
} as const;

export const ARTICLE_STATUS = {
    EMPTY: 'empty',
    MINIMUM: 'minimum',
    PARTIAL: 'partial',
    FULL: 'full',
    EXCESS: 'excess',
} as const;

export type ArticleStatus = (typeof ARTICLE_STATUS)[keyof typeof ARTICLE_STATUS];