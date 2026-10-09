// Renders printable STAR ballots to a PDF in the browser, using the Typst templates in the
// bettervoting-typst submodule (packages/shared/bettervoting-typst) and typst.ts, the Typst
// compiler built for WebAssembly.
//
// This module is large (the compiler is a ~25 MB WebAssembly file, plus fonts), so it is
// only ever loaded with a dynamic import() when someone asks for ballots.
// Deep imports on purpose: the package's main entry also pulls in its renderer, which we
// don't use and don't install.
import { createTypstCompiler, type TypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';

import confTyp from '@bettervoting-typst/conf.typ?url';
import ballotsTyp from '@bettervoting-typst/ballots.typ?url';
import zebraLib from '@bettervoting-typst/vendor/zebra-0.1.0/src/lib.typ?url';
import zebraGeneric from '@bettervoting-typst/vendor/zebra-0.1.0/src/generic.typ?url';
import zebraWasm from '@bettervoting-typst/vendor/zebra-0.1.0/src/zebra.wasm?url';
import zebraToml from '@bettervoting-typst/vendor/zebra-0.1.0/typst.toml?url';
import logo from '@bettervoting-typst/images/STAR_Voting_Logo-black.png?url';
import bubble0 from '@bettervoting-typst/images/bubble-score_0.svg?url';
import bubble1 from '@bettervoting-typst/images/bubble-score_1.svg?url';
import bubble2 from '@bettervoting-typst/images/bubble-score_2.svg?url';
import bubble3 from '@bettervoting-typst/images/bubble-score_3.svg?url';
import bubble4 from '@bettervoting-typst/images/bubble-score_4.svg?url';
import bubble5 from '@bettervoting-typst/images/bubble-score_5.svg?url';
import star0 from '@bettervoting-typst/images/star-score_0.svg?url';
import star1 from '@bettervoting-typst/images/star-score_1.svg?url';
import star2 from '@bettervoting-typst/images/star-score_2.svg?url';
import star3 from '@bettervoting-typst/images/star-score_3.svg?url';
import star4 from '@bettervoting-typst/images/star-score_4.svg?url';
import star5 from '@bettervoting-typst/images/star-score_5.svg?url';
import fontRegular from '@bettervoting-typst/fonts/OpenDyslexic-Regular.otf?url';
import fontBold from '@bettervoting-typst/fonts/OpenDyslexic-Bold.otf?url';

// Every file the templates read, keyed by its path inside the template directory.
const TEMPLATE_FILES: Record<string, string> = {
    'conf.typ': confTyp,
    'ballots.typ': ballotsTyp,
    'vendor/zebra-0.1.0/src/lib.typ': zebraLib,
    'vendor/zebra-0.1.0/src/generic.typ': zebraGeneric,
    'vendor/zebra-0.1.0/src/zebra.wasm': zebraWasm,
    'vendor/zebra-0.1.0/typst.toml': zebraToml,
    'images/STAR_Voting_Logo-black.png': logo,
    'images/bubble-score_0.svg': bubble0,
    'images/bubble-score_1.svg': bubble1,
    'images/bubble-score_2.svg': bubble2,
    'images/bubble-score_3.svg': bubble3,
    'images/bubble-score_4.svg': bubble4,
    'images/bubble-score_5.svg': bubble5,
    'images/star-score_0.svg': star0,
    'images/star-score_1.svg': star1,
    'images/star-score_2.svg': star2,
    'images/star-score_3.svg': star3,
    'images/star-score_4.svg': star4,
    'images/star-score_5.svg': star5,
};

export interface PaperBallot {
    id: string; // printed on the ballot
    qr: string; // encoded in the QR code
}

const fetchBytes = async (url: string): Promise<Uint8Array> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
};

// Set up the compiler and load the template files once per page load.
let ready: Promise<TypstCompiler> | null = null;
const prepare = (): Promise<TypstCompiler> => {
    ready ??= (async () => {
        const [regular, bold] = await Promise.all([fetchBytes(fontRegular), fetchBytes(fontBold)]);
        const compiler = createTypstCompiler();
        await compiler.init({
            getModule: () => compilerWasmUrl,
            // Only the bundled OpenDyslexic fonts; `assets: false` stops typst.ts from also
            // downloading its default fonts from a CDN.
            beforeBuild: [loadFonts([regular, bold], { assets: false })],
        });
        await Promise.all(Object.entries(TEMPLATE_FILES).map(async ([path, url]) => {
            compiler.mapShadow(`/${path}`, await fetchBytes(url));
        }));
        return compiler;
    })().catch((err) => {
        ready = null; // let a later attempt retry
        throw err;
    });
    return ready;
};

export interface BallotBatch {
    title: string;    // shown on the cover page
    printed: string;  // the print date, shown on the cover page
    candidates: string[];
    ballots: PaperBallot[];
}

// A PDF with a cover page listing every ballot ID, then one STAR ballot per entry in
// `ballots`, each showing its ID and QR code.
export async function renderStarBallotsPdf(batch: BallotBatch): Promise<Uint8Array> {
    const compiler = await prepare();
    const options = { mainFilePath: '/ballots.typ', inputs: { data: JSON.stringify(batch) } };
    // runWithWorld frees the compiled document afterwards, so repeated prints don't leak.
    const { result, diagnostics } = await compiler.runWithWorld(options, async (world) => world.pdf({ diagnostics: 'unix' }));
    if (!result) throw new Error(`The ballot template produced no PDF: ${(diagnostics ?? []).join('; ')}`);
    return result;
}
