export const RULE_HEADER = / \[(?:Next-Action|header:([!#$%&'*+.^_`|~\w-]+))=([^\]]+)\]$/;
export const ACTION_NAME = / \[Next-Action-Name=([^\]]+)\]$/;

export function validateAllowWrites(rules, label) {
  for (const rule of rules) {
    if (typeof rule !== 'string' || !rule) throw new Error(`${label}: allowWrites entry ${JSON.stringify(rule)} must be a non-empty string`);
    const m = rule.match(RULE_HEADER) ?? rule.match(ACTION_NAME);
    const target = m ? rule.slice(0, m.index) : rule;
    if (!m && /\s\[[^\]=]*=[^\]]*\]$/.test(rule)) throw new Error(`${label}: allowWrites entry ${JSON.stringify(rule)} must end in " [Next-Action=<id>]", " [Next-Action-Name=<name>]" or " [header:<name>=<value>]" after the path`);
    if (!target) throw new Error(`${label}: allowWrites entry ${JSON.stringify(rule)} needs a path before its header condition`);
    if (target.startsWith('re:')) {
      try { new RegExp(target.slice(3)); } catch (err) { throw new Error(`${label}: allowWrites entry ${JSON.stringify(rule)} is not a valid regex: ${err.message}`); }
    }
  }
}
