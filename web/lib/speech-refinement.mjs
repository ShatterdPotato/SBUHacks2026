// A second pass must not erase a substantial span already recognized live.
export function preferRefinedWords(live, refined) {
    if (!refined.length) return live;
    if (!live.length) return refined;
    const liveEnd=live.at(-1).end, refinedEnd=refined.at(-1).end;
    if (refined.length < live.length*.8 || refinedEnd < liveEnd-2) return live;
    return refined;
}
