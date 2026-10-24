/** Validate plain text before claiming a binary/renamed file is a resume. */
export function resumeText(value) {
    if (typeof value !== 'string' || !value.trim())
        throw new Error('This file is empty. Upload a resume with readable text.');
    if (value.length > 18000)
        throw new Error('Keep resume text under 18,000 characters.');
    if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(value) || value.includes('\ufffd'))
        throw new Error('This file contains unreadable or binary characters. Export it as UTF-8 TXT or a text-based PDF.');
    return value.replace(/\f/g, '\n').trim();
}
