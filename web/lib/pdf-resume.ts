import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Bundle a same-origin worker. Resume bytes never go to a parser service/CDN.
GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';

export async function readPdfResume(file: File): Promise<string> {
    if (!file.size || file.size > 2 * 1024 * 1024)
        throw new Error('Use a PDF between 1 byte and 2 MB.');
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()),
        useWasm: false, useSystemFonts: false,
        disableFontFace: true, useWorkerFetch: true,
        standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
        cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true });
    let passwordRequired = false;
    let timedOut = false;
    task.onPassword = () => { passwordRequired = true; void task.destroy(); };
    let timer: ReturnType<typeof setTimeout>;
    try {
        const reading = async () => {
        const pdf = await task.promise;
        if (pdf.numPages > 10) throw new Error('Use a resume of 10 pages or fewer.');
        let text = '';
        for (let index = 1; index <= pdf.numPages; index++) {
            const page = await pdf.getPage(index);
            const content = await page.getTextContent();
            text += content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('') + '\n';
            if (text.length > 18000) throw new Error('Keep resume text under 18,000 characters.');
            page.cleanup();
        }
        if (text.replace(/\s/g, '').length < 30)
            throw new Error('This PDF has no readable text. Export a text-based PDF or paste your resume text. Scanned-image PDFs need OCR first.');
        return text.trim();
        };
        return await Promise.race([reading(), new Promise<string>((_, reject) => {
            timer = setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, 30000);
        })]);
    } catch (error) {
        if (passwordRequired) throw new Error('Use an unlocked PDF; password-protected resumes cannot be read here.');
        if (timedOut) throw new Error('PDF reading took too long. Try a smaller PDF or paste its text.');
        if (error instanceof Error && (error.message.startsWith('Use a resume') || error.message.startsWith('Keep resume') || error.message.startsWith('This PDF')))
            throw error;
        throw new Error('This PDF could not be read. Export it as a standard PDF or upload a TXT copy.');
    } finally {
        clearTimeout(timer!);
        void task.destroy().catch(() => {});
    }
}
