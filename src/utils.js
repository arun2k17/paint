export const ge = (id) => document.getElementById(id);

export function assignId(element, prefix, val) {
    if (!element) return;
    element.id = prefix + val;
    return assignIdChildren(element, prefix, val);
}

export function assignIdChildren(element, prefix, val) {
    for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        val = assignId(child, prefix, val + 1);
    }
    return val;
}
