
export function stripIndents(strings: TemplateStringsArray, ...values: any[]): string {
    let result = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] !== undefined ? values[i] : '');
    }, '');

    const lines = result.split('\n');

    const minIndent = lines
        .filter(line => line.trim().length > 0)
        .reduce((min, line) => {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            return Math.min(min, indent);
        }, Infinity);

    if (minIndent !== Infinity && minIndent > 0) {
        result = lines
            .map(line => line.slice(minIndent))
            .join('\n');
    }

    return result.trim();
}

export function formatTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    return result;
}