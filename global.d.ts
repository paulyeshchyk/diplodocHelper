// src/types/global.d.ts
declare module 'gray-matter' {
    interface GrayMatter {
        /**
         * Parse a string with front-matter
         */
        (str: string, options?: any): {
            data: Record<string, any>;
            content: string;
            excerpt?: string;
        };

        /**
         * Stringify an object with front-matter
         */
        stringify(content: string, data?: Record<string, any>, options?: any): string;
    }

    const matter: GrayMatter;
    export = matter;
}

interface IndexYamlMeta {
    title?: string;          // meta.title
    sectionType?: string;    // meta.sectionType
    noIndex?: boolean;       // meta.noIndex
    sectionIndex?: string;   // meta.sectionIndex
    [key: string]: any;      // для любых других полей
}

interface IndexYamlData {
    title?: string;          // корневой title
    description?: string;    // корневое описание
    sectionType?: string;    // корневой sectionType
    pureTitle?: string;      // корневой pureTitle
    sectionIndex?: string;   // корневой sectionIndex
    meta?: IndexYamlMeta;
    [key: string]: any;      // для других возможных полей
}