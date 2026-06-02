# Diplodoc Helper

[![Version](https://img.shields.io/vscode-marketplace/v/paulyestchick.diplodochelper.svg)](https://marketplace.visualstudio.com/items?itemName=paulyestchick.diplodochelper)
[![Changelog](https://img.shields.io/badge/Changelog-CHANGELOG.md-blue)](CHANGELOG.md)

A helper for technical writers who work with Diplodoc / YFM.

It makes creating, updating, and refactoring documentation much faster.

It removes routine tasks when working with sections, tables of contents, links, and indexing.

![Screenshot of section creation](./readme_images/section-creation-result.png)

---

## Main features

- **Create sections** of any level (Part / Section / Chapter / Article)
- **Move sections** with automatic reindexing
- **Rename + change type** of a section and update all links
- **Smart link handling** (copy and paste with automatic relative path calculation)
- **Automatic generation** of:
    - A quick index (contexts)
    - Help Maps for the frontend
- **Reindex** the whole documentation
- **Breadcrumbs** on pages after the build

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

| Where it works | Name                                                                                                                                           | Stage             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Sections       | [Create section (`diplodoc-helper.createSection`)](#1-create-section-diplodoc-helpercreatesection)                                             | Editing           |
|                | [Delete section (`diplodoc-helper.deleteSection`)](#2-delete-section-diplodoc-helperdeletesection))                                            | Editing           |
|                | [Rename section and change type (`diplodoc-helper.renameSection`)](#3-rename-section-and-change-type-diplodoc-helperrenamesection)             | Editing           |
|                | [Move section (`diplodoc-helper.moveSection`)](#4-move-section-diplodoc-helpermovesection)                                                     | Editing           |
| Links          | [Copy link (`diplodoc-helper.copyLink`)](#5-copy-link-diplodoc-helpercopylink)                                                                 | Editing           |
|                | [Paste link (`diplodoc-helper.pasteLink`)](#6-paste-link-diplodoc-helperpastelink)                                                             | Editing           |
|                | [Paste image from clipboard (`diplodoc-helper.pasteImageFromClipboard`)](#7-paste-image-from-clipboard-diplodoc-helperpasteimagefromclipboard) | Editing           |
|                | [Paste image from list (`diplodoc-helper.pasteImageFromList`)](#8-paste-image-from-list-diplodoc-helperpasteimagefromlist)                     | Editing           |
| Contexts       | [Work with `context`](#9-work-with-context)                                                                                                    | Editing, Building |
|                | [Work with `helptag`](#10-work-with-helptag)                                                                                                   | Editing, Building |
| Indexing       | [Generate "Contexts" page (`diplodoc-helper.generateContexts`)](#11-generate-contexts-page-diplodoc-helpergeneratecontexts)                    | Editing, Building |
|                | [Generate Help Map for frontend (`diplodoc-helper.generateHelpMaps`)](#12-generate-help-map-for-frontend-diplodoc-helpergeneratehelpmaps)      | Editing, Building |
|                | [Reindex (`diplodoc-helper.reindexDirectories`)](#13-reindex-diplodoc-helperreindex)                                                           | Editing, Building |
|                | [Reindex figures (`diplodoc-helper.reindexFigures`)](#14-reindex-figures-diplodoc-helperreindexfigures)                                        | Editing, Building |
| Breadcrumbs    | [Breadcrumbs (`inject-breadcrumb.js`)](#16-generate-breadcrumbs-diplodoc-helpergeneratebreadcrumbs)                                            | Building          |

## Diplodoc Helper extension commands

### 1. Create section (`diplodoc-helper.createSection`)

**Without the extension**

You must manually create a folder, then inside it — `index.md`, `index.yaml`, `toc.yaml`, fill in the frontmatter (`title`, `sectionType`, `pureTitle`, `sectionIndex`), then manually edit the parent `toc.yaml` — add a new `items` entry with the correct `name`, `href`, `include`.

**With the extension**

Just right-click on a folder and select **Diplodoc → Create section**.  
The extension will ask for the section type and name, automatically calculate the index, create all necessary files, and add an entry to the parent table of contents.

---

### 2. Delete section (`diplodoc-helper.deleteSection`)

**Without the extension**

You have to manually delete the section folder, then open the parent `toc.yaml` and remove the corresponding `items` block. It’s easy to leave “garbage” in the table of contents.

**With the extension**

Right-click on the section → **Diplodoc → Delete section**.  
The extension automatically removes the entry from the parent `toc.yaml` and then deletes the folder. The table of contents stays clean.

---

### 3. Rename section and change type (`diplodoc-helper.renameSection`)

**Without the extension**

You have to manually rename the folder, edit `title`, `pureTitle`, `sectionType`, `sectionIndex` in `index.md` and `index.yaml`, update the heading in `toc.yaml` and parent files, and also update all links.

**With the extension**

Right-click → **Diplodoc → Set new type and name**.  
The extension lets you change the type and name, updates all metadata, renames the folder (if needed), corrects links, and sorts `toc.yaml`.

---

### 4. Move section (`diplodoc-helper.moveSection`)

**Without the extension**

To move a section (chapter, subsection, article) from one place to another in the documentation, a technical writer had to:

- Cut the folder manually,
- Delete its entry in the old parent’s toc.yaml,
- Add an entry to the new parent’s toc.yaml (with correct name, href, include),
- Update links in the index.yaml of both parents,
- Fix indices in index.md and index.yaml both in the old and new location (especially painful when inserting “in the middle”),
- Run reindexing so everything else doesn’t break.

**With the extension**

Right-click → **Diplodoc → Move section**.  
Just right-click on the section and choose “Move section”.

The extension lets you:

- Choose a target folder inside the current language (docs/ru),
- Specify the exact insertion position (at the beginning, at the end, or after a specific section),
- Automatically remove the entry from the old parent,
- Add the entry to the new parent while keeping the correct include,
- Rename the folder according to the new index and type (if required)

---

### 5. Copy link (`diplodoc-helper.copyLink`)

**Without the extension**

You have to manually copy the file/folder path and create a Markdown link.

**With the extension**

Right-click on a folder, `.md` file, or image → **Diplodoc → Copy link to document**.  
The extension saves JSON with the name and path to the clipboard for easy pasting later.

---

### 6. Paste link (`diplodoc-helper.pasteLink`)

**Without the extension**

You need to manually calculate the relative path, encode Cyrillic characters, and write `[]()` or `![]()` correctly.

**With the extension**

In a Markdown file, run the command **Paste link to document**.  
The extension reads data from the clipboard, calculates the correct relative path, and inserts a ready-to-use link.

---

### 7. Paste image from clipboard (`diplodoc-helper.pasteImageFromClipboard`)

**Without the extension**

You have to save the image manually into the `images` folder, come up with a name, and write `![alt](path)`.

**With the extension**

In an open `.md` file, run the command **Paste image from clipboard**.  
The extension saves the image to the `images/` folder, suggests a name, and inserts a ready figure block with an identifier.

---

### 8. Paste image from list (`diplodoc-helper.pasteImageFromList`)

**With the extension**

Shows all images in the project and lets you quickly choose and paste the one you need.

---

### 9. Work with `context`

**Add / Edit** (`diplodoc-helper.context.Update`)  
**Delete** (`diplodoc-helper.context.Delete`)

**With the extension**  
A convenient interface to manage the `context:` field in the section’s frontmatter.

---

### 10. Work with `helptag`

**Add / Edit** (`diplodoc-helper.helptag.Update`)  
**Delete** (`diplodoc-helper.helptag.Delete`)

**With the extension**  
A simple way to manage the `helptag:` field for frontend integration.

---

### 11. Generate "Contexts" page (`diplodoc-helper.generateContexts`)

**Without the extension**

You have to manually collect all `context:` entries, create pages, and keep them up to date.

**With the extension**

Command **Create contexts page**.  
The extension automatically scans the documentation, creates a `contexts/` folder with an alphabetical index and separate pages for each term.

---

### 12. Generate Help Map for frontend (`diplodoc-helper.generateHelpMaps`)

**Without the extension**

Manually build JSON with `url`, `title`, `hint`, `helptag`, `context`.

**With the extension**

Command **Create key map (helptag)**.  
Creates `build/app-help-contents.json` (or per language) — ready data for tooltips in the application.

---

### 13. Reindex (`diplodoc-helper.reindex`)

**Without the extension**

After changes to the structure, you have to manually fix indices, folder names, and all related files.

**With the extension**

Command **Reindex folders**.  
Completely recalculates indices, updates metadata, renames folders, and synchronizes the whole structure.

---

### 14. Reindex figures (`diplodoc-helper.reindexFigures`)

Updates identifiers and links for all figures and images in the documentation.

---

### 15. Delete empty folders (`diplodoc-helper.wipeEmptyDirectories`)

**With the extension**  
Command **Delete empty folders** — useful after reindexing and moving.

---

### 16. Generate breadcrumbs (`diplodoc-helper.generateBreadcrumbs`)

**With the extension**  
After building the project (`@diplodoc/cli`), run the command **Generate breadcrumbs**.  
Automatically inserts a navigation chain (breadcrumb) on every page in `build/`.

---

## Recommended workflow

1. Create structure (`Create section`)
2. Fill in `context` and `helptag`
3. Move/rename if needed
4. **Reindex**
5. Generate **Contexts** and **Help Map**
6. Build project → **Breadcrumbs**

---

As a result, the documentation structure stays consistent, all links and indices are up to date.

**The extension significantly speeds up working with Diplodoc documentation and minimizes routine mistakes.**

## How to start

### Basics

Start by downloading the standard diplodoc project from this [link](https://github.com/diplodoc-platform/documentation-template)

---

Open the project, making sure that the `docs` folder contains two subfolders: `en` and `ru`

---

Install this extension.

---

After installing the extension, you may need to restart VS Code. After restart, open the documentation-template project you downloaded.

---

In the VS Code folder tree (Explorer), find the `docs` folder and inside it either `ru` or `en`. If the extension from step 2 was installed, right-click. In the menu that appears, you should see a submenu `diplodoc` ![diplodoc](./readme_images/explorer-context.png)

---

Select the submenu `Create section` and follow the instructions

- type ![type](./readme_images/dialog-type.png)
- section name ![section](./readme_images/section-name.png)
- index ![index](./readme_images/index-value.png)

---

As a result, you should be able to create a new subsection with automatic update of toc.yaml

### Copying

The `Copy link to article` function has a pair `Paste link to article`. Do not confuse it with the standard `Copy-Paste` mechanism.

P.S. The paste link to article function will only work in a document of type md or yaml.

[result](./readme_images/section-creation-result.png)

## Basic set of tasks in VS Code

- `1. Build documentation` converts (builds) all md files into html files
- `2. Open (local server)` converts (builds) all md files into html files and starts a local http-server. The build result will be available at `localhost:5050`
- `5. docker: build image` converts (builds) all md files into html files and packages them into a docker container

Ready list to add to VS Code [tasks.json](./readme_images/tasks_en.json)
