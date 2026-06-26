// src/utils/constants.js

const FrontMatterMeta = {
    SECTIONTYPE: 'sectionType',
    PURETITLE: 'pureTitle',
    SECTIONINDEX: 'sectionIndex',
    DESCRIPTION: 'description',
    TITLE: 'title',
    META: 'meta',
    META_TITLE: 'title',
    META_NOINDEX: 'noIndex',
    META_SECTIONTYPE: 'sectionType',
};

const FrontMatterToc = {
    TITLE: 'title',
    HREF: 'href',
    ITEMS: 'items',
    ITEMS_NAME: 'name',
    ITEMS_HREF: 'href',
    ITEMS_INCLUDE: 'include',
    ITEMS_INCLUDE_PATH: 'path',
    ITEMS_INCLUDE_MODE: 'mode',
};

const FrontMatterFiles = {
    INDEX_MD: 'index.md',
    TOC_YAML: 'toc.yaml',
    INDEX_YAML: 'index.yaml',
};

const FrontMatterSectionTypes = {
    PAGE: 'Page',
    PART: 'Part',
    SECTION: 'Section',
    CHAPTER: 'Chapter',
};

const FrontMatterSectionTypesIndexed = [
    FrontMatterSectionTypes.PART,
    FrontMatterSectionTypes.SECTION,
    FrontMatterSectionTypes.CHAPTER,
];

module.exports = {
    FrontMatterMeta,
    FrontMatterToc,
    FrontMatterFiles,
    FrontMatterFilesDefaultList: [FrontMatterFiles.INDEX_MD, FrontMatterFiles.INDEX_YAML, FrontMatterFiles.TOC_YAML],
    FrontMatterSectionTypes,
    FrontMatterSectionTypesIndexed,
};
