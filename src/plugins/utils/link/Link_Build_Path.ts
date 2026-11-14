import * as path from 'node:path';
import { Path_ToPosix } from '../path/Path_ToPosix.ts';

export class Link_Build_Path {
    static buildRelative(fromFile: string, toPath: string, isDir: boolean): string {
        let target = toPath;
        if (isDir && !target.endsWith('.md')) {
            target = path.join(target, 'index.md');
        }
        let relPath = path.relative(path.dirname(fromFile), target);
        relPath = Path_ToPosix.convert(relPath);
        const encoded = relPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
        return encoded.startsWith('.') ? encoded : `./${encoded}`;
    }

    static assertInsideDocs(workspaceRoot: string, targetPath: string, docsDirName: string = 'docs'): void {
        const rel = Link_Build_Path._relFromWorkspace(workspaceRoot, targetPath);
        if (rel.startsWith('..')) {
            throw new Error(
                `Link_Build_Path: target outside workspace (${targetPath} not under ${workspaceRoot})`,
            );
        }
        if (rel !== docsDirName && !rel.startsWith(docsDirName + '/')) {
            throw new Error(
                `Link_Build_Path: target must be inside ${docsDirName}/ (got "${rel}")`,
            );
        }
    }

    static buildAbsolute(
        workspaceRoot: string,
        targetPath: string,
        isDirectory: boolean,
        docsDirName: string = 'docs',
    ): string {
        Link_Build_Path.assertInsideDocs(workspaceRoot, targetPath, docsDirName);

        const rel = Link_Build_Path._relFromWorkspace(workspaceRoot, targetPath);
        // Отрезаем docs/ или documents/
        const inner = rel === docsDirName ? '' : rel.slice(docsDirName.length + 1);

        let pathPart = inner;
        if (isDirectory) {
            pathPart = pathPart === '' ? 'index.html' : `${pathPart}/index.html`;
        } else {
            const ext = path.extname(pathPart).toLowerCase();
            if (ext === '.md') {
                pathPart = pathPart.slice(0, -3) + '.html';
            }
        }

        const segments = pathPart.split('/');
        const encoded = segments.map(seg => encodeURIComponent(seg)).join('/');
        return '/' + encoded;
    }

    private static _relFromWorkspace(workspaceRoot: string, targetPath: string): string {
        return Path_ToPosix.convert(path.relative(workspaceRoot, targetPath));
    }
}