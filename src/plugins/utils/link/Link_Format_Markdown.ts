export class Link_Format_Markdown {
    /**
     * Собирает итоговую строку ссылки.
     * @param text — видимый текст (или alt)
     * @param url — готовый (относительный или абсолютный) URL
     * @param isImage — true, если это картинка
     * @param isHtml — true, если нужен HTML-тег вместо MD
     */
    static format(text: string, url: string, isImage: boolean, isHtml: boolean): string {
        if (isHtml) {
            return isImage
                ? `<img src="${url}" alt="${text}">`
                : `<a href="${url}">${text}</a>`;
        }
        return isImage ? `![${text}](${url})` : `[${text}](${url})`;
    }
}