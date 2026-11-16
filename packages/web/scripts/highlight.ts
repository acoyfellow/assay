export type Lang = "sh" | "json" | "ts" | "text";

type Rule = readonly [RegExp, string];

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tokenize = (code: string, rules: ReadonlyArray<Rule>) => {
  const sticky = rules.map(
    ([pattern, kind]) => [new RegExp(pattern.source, `${pattern.flags.replace("y", "")}y`), kind] as const,
  );
  let html = "";
  let plain = "";
  let index = 0;
  while (index < code.length) {
    let matched = false;
    for (const [pattern, kind] of sticky) {
      pattern.lastIndex = index;
      const found = pattern.exec(code);
      if (found && found[0].length > 0) {
        html += escapeHtml(plain);
        plain = "";
        html += kind ? `<span class="t-${kind}">${escapeHtml(found[0])}</span>` : escapeHtml(found[0]);
        index += found[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      plain += code[index];
      index += 1;
    }
  }
  return html + escapeHtml(plain);
};

const lineStart = ["(?<=", "^", "|\\n", "|&&\\s|\\|\\s|;\\s)"].join("");
const dash = String.fromCharCode(45);

const shRules: ReadonlyArray<Rule> = [
  [new RegExp(`${String.fromCharCode(35)}.*`), "comment"],
  [/"(?:[^"\\]|\\.)*"|'[^']*'/, "string"],
  [/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/, "var"],
  [new RegExp(`${lineStart}(?:export\\s+)?[A-Za-z_][A-Za-z0-9_]*(?==)`), "var"],
  [new RegExp(`${lineStart}[a-z][\\w.${dash}]*`), "cmd"],
  [new RegExp(`(?<=\\s)${dash}{1,2}[A-Za-z][\\w${dash}]*`), "flag"],
  [/[|&;>]+/, "punct"],
];

const jsonRules: ReadonlyArray<Rule> = [
  [/"(?:[^"\\]|\\.)*"(?=\s*:)/, "key"],
  [/"(?:[^"\\]|\\.)*"/, "string"],
  [/-?\d+(?:\.\d+)?/, "number"],
  [/\b(?:true|false|null)\b/, "keyword"],
  [/[{}[\],:]/, "punct"],
];

const tsRules: ReadonlyArray<Rule> = [
  [new RegExp(`${String.fromCharCode(47, 47)}.*`), "comment"],
  [/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/, "string"],
  [
    /\b(?:import|from|export|const|let|type|interface|return|async|await|new|if|else|for|of|function|class|extends|yield|true|false|null|undefined)\b/,
    "keyword",
  ],
  [/\b[A-Z][A-Za-z0-9]*\b/, "type"],
  [/\b\d+(?:\.\d+)?\b/, "number"],
  [/[A-Za-z_$][\w$]*(?=\s*\()/, "fn"],
  [/[{}()[\];,.:=<>+\-|&?!]+/, "punct"],
];

const textRules: ReadonlyArray<Rule> = [
  [/\b(?:PASS|LAND|pass)\b/, "pass"],
  [/\b(?:FAIL|SKIP|fail)\b|killed by [\w ]+/, "fail"],
  [/\$\d+(?:\.\d+)?/, "number"],
  [new RegExp(`${lineStart}(?:assay|fleet|done|branch)\\b.*`), "head"],
];

const rulesFor: Record<Lang, ReadonlyArray<Rule>> = {
  sh: shRules,
  json: jsonRules,
  ts: tsRules,
  text: textRules,
};

export const languageOf = (lang: string | undefined, code: string): Lang => {
  const name = (lang ?? "").toLowerCase();
  if (["sh", "bash", "shell", "zsh"].includes(name)) return "sh";
  if (["json", "jsonc"].includes(name)) return "json";
  if (["ts", "typescript", "js", "javascript", "tsx"].includes(name)) return "ts";
  if (name === "text" || name === "txt") return "text";
  if (/^\s*[{[]/.test(code)) return "json";
  return "sh";
};

export const highlight = (code: string, lang: Lang) => tokenize(code, rulesFor[lang]);
