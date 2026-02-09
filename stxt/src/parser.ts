export function parseSTXT(text: string) {
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
        const lineNumber = index;

        console.log(`${index}: ${line}`);
    });    
}