/**
 * Card Export System
 *
 * Converts the live SVG card preview to a raster image using snapdom.
 * snapdom captures the DOM subtree with computed CSS applied, so the output
 * is pixel-accurate to what the user sees in the editor (WYSIWYG).
 *
 * ## How it works
 *
 * snapdom serialises the entire SVG element — including any `<foreignObject>`
 * elements containing Tiptap rich text — in a single pass through the browser's
 * own rendering pipeline. No multi-phase compositing is required.
 *
 * ## Scale Factor
 * The `scale` parameter controls output resolution:
 * - scale=1.0: Natural SVG size (~375x523px for standard cards)
 * - scale=2.0: 2x resolution for higher quality
 * - scale=0.4: Used for card thumbnails on save
 *
 * ## SVG Image Embedding
 * snapdom handles HTML <img> elements automatically but does not convert
 * SVG <image href="..."> URL references to data URLs. Once the SVG is
 * serialised to a data URL, absolute-path hrefs (card backs, rarity icons,
 * power/defense symbols) are blocked by browser security policy, so those
 * images vanish in the output — causing sharp corners and missing frame.
 *
 * We pre-embed all such references as data URLs before calling snapdom, then
 * restore the originals afterwards so the live preview is unaffected.
 */

import {type BlobType, preCache, snapdom} from "@zumer/snapdom";

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Fetches every SVG <image> whose href is a plain URL (not already a data: or
 * blob: URL) and replaces it with an embedded data URL in-place.
 *
 * Returns a cleanup function that restores every replaced href so the live
 * preview is unchanged after export.
 */
async function embedSVGImageHrefs(svg: SVGSVGElement): Promise<() => void> {
	const images = Array.from(svg.querySelectorAll("image"));
	const restoreMap = new Map<SVGImageElement, string>();

	await Promise.all(
		images.map(async (img) => {
			const href = img.getAttribute("href");
			if (!href || href.startsWith("data:") || href.startsWith("blob:")) return;

			restoreMap.set(img, href);
			const response = await fetch(href);
			const blob = await response.blob();
			const dataUrl = await blobToDataUrl(blob);
			img.setAttribute("href", dataUrl);
		}),
	);

	return () => {
		for (const [img, href] of restoreMap) {
			img.setAttribute("href", href);
		}
	};
}

/**
 * Converts an SVG card element to a raster image Blob.
 *
 * @param svg - SVG element containing the card preview
 * @param scale - Output scale multiplier (default 1.0, use 2.0+ for high-quality export)
 * @param type - The image format to use when converting to an image.
 * @returns Promise resolving to an image Blob of the type `type`.
 */
export async function convertToImage(
	svg: SVGSVGElement,
	scale = 1.0,
	type: BlobType = "png",
): Promise<Blob> {
	const restoreHrefs = await embedSVGImageHrefs(svg);
	try {
		console.info('Warming cache');
		await preCache(
			svg,
			{
				embedFonts: true
			}
		);

		console.info('Capturing...');
		const capture = await snapdom(svg, { scale, embedFonts: true });

		console.info('Rendering');
		return await capture.toBlob({ type });
	} finally {
		restoreHrefs();
	}
}
