// src/plugins/utils/yaml-inline/utils.ts

export class Yaml_Read_Indent {
  static get(lineText: string): number {
    const m = lineText.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }
}

export class Yaml_Read_UnquotedColon {
  /** Первое двоеточие, не внутри '...' или "..." */
  static find(lineText: string, fromIdx = 0): number {
    let inSingle = false;
    let inDouble = false;
    for (let i = fromIdx; i < lineText.length; i++) {
      const c = lineText[i];
      if (c === "'" && !inDouble) inSingle = !inSingle;
      else if (c === '"' && !inSingle) inDouble = !inDouble;
      else if (c === ':' && !inSingle && !inDouble) return i;
    }
    return -1;
  }
}