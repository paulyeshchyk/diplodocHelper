# Diplodoc Helper

[![Version](https://img.shields.io/vscode-marketplace/v/paulyestchick.diplodochelper.svg)](https://marketplace.visualstudio.com/items?itemName=paulyestchick.diplodochelper)
[![Changelog](https://img.shields.io/badge/Changelog-CHANGELOG.md-blue)](CHANGELOG.md)

Helper for technical writers who work with Diplodoc / YFM

It speeds up creating, updating, and refactoring documentation.

It removes routine work with sections, tables of contents, links, and indexing.

---

## Main features

- **Create sections** of any level (Part / Section / Chapter / Article)
- **Move sections** with automatic reindexing
- **Rename + change type** of a section and update all links
- **Smart work with links** (copy and paste with automatic relative path calculation)
- **Automatic generation**:
  - Short index (contexts)
  - Help Maps for the frontend
- **Reindex** all documentation
- **Breadcrumbs** on pages after build

---

## Installation

### marketplace

Install via [link](https://marketplace.visualstudio.com/items?itemName=paulyestchick.diplodochelper)

### git

#### clone

Run this command in the terminal

```bash
git clone https://github.com/paulyeshchyk/diplodocHelper.git
```

### build

Run these commands in the terminal

```bash
cd diplodocHelper
npm install gray-matter@^4.0.3
mkDir build
vsce package --out build/ --allow-missing-repository
```

### vsix install

Run this command in the terminal

```bash
code --install-extension diplodochelper-0.7.0.vsix
```

## Feature summary

| Applicability | Name                                                                  | Stage             |
| ------------- | --------------------------------------------------------------------- | ----------------- |
| Sections      |                                                                       |                   |
|               | Create section (diplodoc-helper.createSection)                        | Editing           |
|               | Delete section (diplodoc-helper.deleteSection)                        | Editing           |
|               | Rename section and change type (diplodoc-helper.renameSection)        | Editing           |
|               | Move section (diplodoc-helper.moveSection)                            | Editing           |
| Links         |                                                                       |                   |
|               | Links Copy link to article (diplodoc-helper.copyLink)                 | Editing           |
|               | Paste link to article (diplodoc-helper.pasteLink)                     | Editing           |
| Breadcrumbs   | Breadcrumbs (inject-breadcrumb.js)                                    | Building          |
| Utils         |                                                                       |                   |
|               | Reindex (diplodoc-helper.reindex)                                     | Editing, Building |
|               | Indexing Generate short index (diplodoc-helper.generateContexts)      | Editing, Building |
|               | Generate context list for frontend (diplodoc-helper.generateHelpMaps) | Editing, Building |

## Diplodoc Helper extension commands

1. Create section (diplodoc-helper.createSection)

   **Without the extension**
   You have to manually create a folder, inside it — index.md, index.yaml, toc.yaml, fill in frontmatter (title, sectionType, pureTitle, sectionIndex), then edit the parent toc.yaml — add a new items element with correct name, href, include. You need to remember the Diplodoc structure and YAML syntax.

   **With the extension**
   Just choose the section type (Part/Section/Chapter/Article), enter the name and (if needed) the index. The extension creates the folder with all service files, fills in the metadata, and adds an entry to the parent table of contents.

2. Delete section (diplodoc-helper.deleteSection)

   **Without the extension**
   You have to manually delete the section folder, then open the parent toc.yaml and delete the corresponding items block. With many sections, it is easy to miss something or leave garbage in the table of contents.

   **With the extension**
   Just right-click on the section in the explorer and choose "Delete section". The extension automatically removes the entry from the parent toc.yaml and only then permanently deletes the section folder. The table of contents stays clean.

3. Rename section and change type (diplodoc-helper.renameSection)

   **Without the extension**
   You have to manually rename the folder, edit title, pureTitle, sectionType, sectionIndex in index.md and index.yaml, change the heading in the section's toc.yaml, and then update links in the parent toc.yaml (folder name, displayed title) and possibly in the parent's index.yaml. This is very time‑consuming and error‑prone.

   **With the extension**
   Choose the new section type, enter the new name and (if needed) the index. The extension updates all metadata in all service files, renames the folder (if necessary), and corrects links in the parent toc.yaml and index.yaml.

4. Copy link to article (diplodoc-helper.copyLink)

   **Without the extension**
   You have to manually copy the file path (e.g., Part1.Introduction/index.md) and manually insert it into a Markdown link [text](path).

   **With the extension**
   Just right-click on any folder (section) or .md/.png/.jpg/.svg file and choose "Copy link to article". The extension saves a JSON object with the name and path to the clipboard. When pasting, a correct relative link is automatically created.

5. Paste link to article (diplodoc-helper.pasteLink)

   **Without the extension**
   You need to manually calculate the relative path from the current file you are editing to the target section or image, encode Cyrillic names, put them in square brackets and parentheses. For images, do not forget the exclamation mark.

   **With the extension**
   In the Markdown or YAML editor, just press "Paste link to article". The extension reads the data from the clipboard (copied by the copyLink command), calculates the relative path considering the current file, encodes URL segments, and inserts \[name\]\(relative\/path\) or \!\[name\]\(path\) for images.

6. Generate short index (diplodoc-helper.generateContexts)

   **Without the extension**
   To make a "Contexts" page (a list of terms with links to articles), you would have to manually go through all .md files, look for the context: tag, write down the terms, and for each term create a separate page with a list of links, generate index.md, toc.yaml, index.yaml. When adding new articles, you would have to maintain everything by hand.

   **With the extension**
   Just run the command. The extension scans the docs/ru and docs/en folders, finds all articles with the frontmatter field context:, collects unique terms, creates for each term a .md file with a list of links, generates index.md (alphabetical index), toc.yaml and index.yaml in the contexts folder. The index is always up‑to‑date.

7. Generate context list for frontend (diplodoc-helper.generateHelpMaps)

   **Without the extension**
   Frontend developers need a JSON file that maps an article's URL to its title, hint, and helptag tag for help integration. You would have to manually go through all .md files, read frontmatter, create an array of entries, and save it to build/app-help-contents.json. When documentation changes, the file quickly becomes outdated.

   **With the extension**
   The command automatically goes through all .md files in docs, extracts helptag, title, hint, creates an array of entries with url, title, hint, context, lang fields, and saves it to build/ (or separates by language with the --segregation flag). The frontend always has a fresh help map.

8. Reindex (diplodoc-helper.reindex)

   **Without the extension**
   When sections are moved, renamed, or their indexes change (e.g., "1.2. Introduction" -> "1.3. Introduction"), you have to manually edit sectionIndex in all index.md files, then update headings in index.yaml, the section's toc.yaml, and also fix links in parent toc.yaml. It is easy to forget to sync folder names with new indexes.

   **With the extension**
   Just run the command on the root documentation folder. The extension recursively goes through all sections, calculates new indexes based on folder order (or keeps manual indexes), updates all metadata in all service files, renames folders according to the new index and name, and then sorts entries in parent toc.yaml. The whole table of contents and links stay valid.

9. Breadcrumbs (inject-breadcrumb.js)

   **Without the extension**
   To show a navigation chain on every documentation page (e.g., "Home - Section 1 - Subsection"), you would have to manually edit build templates or write a custom script that extracts parent page titles from index.html and inserts an HTML structure. When the documentation structure changes, breadcrumbs must be rebuilt from scratch.

   **With the extension**
   The script (inject-breadcrumb.js) runs after building the documentation (@diplodoc/cli). It scans all index.html files in the build folder, collects parent segments from the path, extracts page titles from generated HTML files (from diplodoc-state or <title>), builds a navigation chain, and inserts a nav with breadcrumbs just before the main content of the page. Breadcrumbs update automatically on every build.

10. Move section (diplodoc-helper.moveSection)

**Without the extension**
To move a section (chapter, subsection, article) from one place in the documentation to another, a technical writer had to:

Cut the folder manually,

Delete its entry in the old parent's toc.yaml,

Add an entry in the new parent's toc.yaml (with correct name, href, include),

Update links in both parents' index.yaml,

Fix indexes in index.md and index.yaml both in the old and new places (especially painful when inserting "in the middle"),

Run reindex so that everything else does not break.

It is very easy to make a mistake, leave broken links, or break the index hierarchy.

**With the extension**
Just right-click on the desired section and choose "Move section".

The extension allows you to:

Select a target folder inside the current language (docs/ru),

Choose the exact insertion position (at the beginning, at the end, or after a specific section),

Automatically delete the entry from the old parent,

Add an entry to the new parent while keeping the correct include,

Rename the folder according to the new index and type (if needed),

Run reindex on the old and new parents,

Remove any empty folders that appear.

As a result, the documentation structure remains intact, and all links and indexes are up‑to‑date.

## How to start

### Basics

Start by downloading the standard diplodoc project from this link

Open the project and make sure that in the docs folder there are two subfolders en and ru

### Install this extension.

After installing the extension, you may need to restart VS Code. After restart, open the documentation-template project you downloaded in VS Code.

In the VS Code Explorer tree, find the docs folder and inside it either ru or en. If the extension from step 2 was installed, right-click. In the menu that appears, you should see a submenu diplodoc https://./readme_images/explorer-context.png

Choose the submenu Create section and follow the further instructions

type https://./readme_images/dialog-type.png

section name https://./readme_images/section-name.png

index https://./readme_images/index-value.png

As a result, you should be able to create a new subsection with automatic update of toc.yaml

### Copying

The Copy link to article function has a pair Paste link to article. Do not confuse it with the standard Copy-Paste mechanism.

P.S. The paste link to article function will only work in a document of type md or yaml

### Basic set of tasks that can be run in VS Code

1. Build documentation converts (builds) all md files into html files

2. Open (local server) converts (builds) all md files into html files and starts a local http‑server. The build result will be available at localhost:5050

3. docker: build image converts (builds) all md files into html files and packages them into a docker container

Ready list for adding to VS Code [tasks.json](./readme_images/tasks_en.json)
