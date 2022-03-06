import { ensureDefined, ensureNotNull } from '../helpers/assertions';
import { drawScaled } from '../helpers/canvas-helpers';
import { DeepPartial } from '../helpers/strict-type-checks';

import { CanvasRenderParams } from '../model/canvas-render-params';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { pointInBox, pointInPolygon } from '../model/interesection';
import { BoxHorizontalAlignment, BoxVerticalAlignment, LineToolText, TextAlignment } from '../model/line-tool-options';
import { Box, Point, Rect } from '../model/point';

import { LineStyle, setLineStyle } from './draw-line';
import { drawRoundRect } from './draw-rect';
import { IPaneRenderer } from './ipane-renderer';

interface LinesInfo {
	lines: string[];
	linesMaxWidth: number;
}

interface FontInfo {
	fontSize: number;
	fontStyle: string;
}

interface BoxSize {
	width: number;
	height: number;
}

interface InternalData {
	boxLeft: number;
	boxTop: number;
	boxWidth: number;
	boxHeight: number;
	textStart: number;
	textTop: number;
	textAlign: TextAlignment;
}

export type TextRendererData = DeepPartial<LineToolText> & { points?: Point[] };

export class TextRenderer implements IPaneRenderer {
	protected _internalData: InternalData | null = null;
	protected _polygonPoints: Point[] | null = null;
	protected _linesInfo: LinesInfo | null = null;
	protected _fontInfo: FontInfo | null = null;
	protected _boxSize: BoxSize | null = null;
	protected _data: TextRendererData | null = null;

	protected _hitTest: HitTestResult<void>;

	public constructor(data?: TextRendererData, hitTest?: HitTestResult<void>) {
		this._hitTest = hitTest || new HitTestResult(HitTestType.MOVEPOINT);
		if (data !== undefined) { this.setData(data); }
	}

	public setData(data: TextRendererData): void {
		// eslint-disable-next-line complexity
		function checkUnchanged(before: TextRendererData | null, after: TextRendererData | null): boolean {
			if (null === before || null === after) { return null === before === (null === after);}
			if (before.points === undefined !== (after.points === undefined)) { return false; }

			if (before.points !== undefined && after.points !== undefined) {
				if (before.points.length !== after.points.length) { return false; }

				for (let i = 0; i < before.points.length; ++i) {
					if (before.points[i].x !== after.points[i].x || before.points[i].y !== after.points[i].y) { return false; }
				}
			}

			return before.forceCalculateMaxLineWidth === after.forceCalculateMaxLineWidth
                && before.forceTextAlign === after.forceTextAlign
                && before.wordWrapWidth === after.wordWrapWidth
                && before.padding === after.padding
                && before.value === after.value
                && before.alignment === after.alignment
                && before.font?.bold === after.font?.bold
                && before.font?.size === after.font?.size
                && before.font?.family === after.font?.family
                && before.font?.italic === after.font?.italic
                && before.box?.angle === after.box?.angle
                && before.box?.scale === after.box?.scale
                && before.box?.offset?.x === after.box?.offset?.x
                && before.box?.offset?.y === after.box?.offset?.y
                && before.box?.maxHeight === after.box?.maxHeight
                && before.box?.padding?.x === after.box?.padding?.x
                && before.box?.padding?.y === after.box?.padding?.y
                && before.box?.alignment?.vertical === after.box?.alignment?.vertical
                && before.box?.alignment?.horizontal === after.box?.alignment?.horizontal
                && before.box?.background?.inflation?.x === after.box?.background?.inflation?.x
                && before.box?.background?.inflation?.y === after.box?.background?.inflation?.y
                && before.box?.border?.highlight === after.box?.border?.highlight
                && before.box?.border?.radius === after.box?.border?.radius
                && before.box?.shadow?.offset === after.box?.shadow?.offset
                && before.box?.shadow?.color === after.box?.shadow?.color
                && before.box?.shadow?.blur === after.box?.shadow?.blur;
		}

		if (checkUnchanged(this._data, data)) {
			this._data = data;
		} else {
			this._data = data;
			this._polygonPoints = null;
			this._internalData = null;
			this._linesInfo = null;
			this._fontInfo = null;
			this._boxSize = null;
		}
	}

	public hitTest(point: Point): HitTestResult<void> | null {
		if (this._data === null || this._data.points === undefined || this._data.points.length === 0) {
			return null;
		} else if (pointInPolygon(point, this._getPolygonPoints())) {
			return this._hitTest;
		} else {
			return null;
		}
	}

	public doesIntersectWithBox(box: Box): boolean {
		if (this._data === null || this._data.points === undefined || this._data.points.length === 0) {
			return false;
		} else {
			return pointInBox(this._data.points[0], box);
		}
	}

	public measure(): BoxSize {
		if (this._data === null) { return { width: 0, height: 0 }; }
		return this._getBoxSize();
	}

	public rect(): Rect {
		if (this._data === null) { return { x: 0, y: 0, width: 0, height: 0 }; }
		const internalData = this._getInternalData();
		return { x: internalData.boxLeft, y: internalData.boxTop, width: internalData.boxWidth, height: internalData.boxHeight };
	}

	public isOutOfScreen(width: number, height: number): boolean {
		if (null === this._data || void 0 === this._data.points || 0 === this._data.points.length) { return true; }

		const internalData = this._getInternalData();
		if (internalData.boxLeft + internalData.boxWidth < 0 || internalData.boxLeft > width) {
			const screenBox = new Box(new Point(0, 0), new Point(width, height));
			return this._getPolygonPoints().every((point: Point) => !pointInBox(point, screenBox));
		}

		return false;
	}

	public setPoints(points: Point[], hitTest: HitTestResult<void>): void {
		ensureNotNull(this._data).points = points;
		this._hitTest = hitTest || new HitTestResult(HitTestType.MOVEPOINT);
	}

	public fontStyle(): string {
		return this._data === null ? '' : this._getFontInfo().fontStyle;
	}

	public wordWrap(test: string, wrapWidth?: number, font?: string): string[] {
		return textWrap(test, font || this.fontStyle(), wrapWidth);
	}

    // eslint-disable-next-line complexity
	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		if (this._data === null || this._data.points === undefined || this._data.points.length === 0) { return; }
		if (this.isOutOfScreen(renderParams.cssWidth, renderParams.cssHeight)) { return; }

		const pixelRatio = renderParams.pixelRatio;
		const internalData = this._getInternalData();
		const pivot = this._getRotationPoint().scaled(pixelRatio);

		ctx.save();
		ctx.translate(pivot.x, pivot.y);
		ctx.rotate(this._data.box?.angle || 0);
		ctx.translate(-pivot.x, -pivot.y);

		const fontSize = this._getFontInfo().fontSize;
		ctx.textAlign = internalData.textAlign;
		ctx.textBaseline = 'middle';
		ctx.font = this.fontStyle();

		const scaledTop = Math.round(internalData.boxTop * pixelRatio);
		const scaledLeft = Math.round(internalData.boxLeft * pixelRatio);
		const scaledRight = scaledLeft + Math.round(internalData.boxWidth * pixelRatio);
		const scaledBottom = scaledTop + Math.round(internalData.boxHeight * pixelRatio);

		if (this._data.box?.background?.color || this._data.box?.border?.color || this._data.box?.border?.highlight && this._data.wordWrapWidth) {
			const borderWidth = Math.round((this._data.box?.border?.width || Math.max(fontSize / 12, 1)) * pixelRatio);
			const halfBorderWidth = borderWidth / 2;
			let ctxUpdated = false;

			if (this._data.box?.shadow) {
				const { color, blur, offset } = this._data.box?.shadow;
				ctx.save();
				ctx.shadowColor = color as string;
				ctx.shadowBlur = blur as number;
				ctx.shadowOffsetX = offset?.x || 0;
				ctx.shadowOffsetY = offset?.y || 0;
				ctxUpdated = true;
			}

			if (this._data.box.border?.radius) {
				if (this._data.box.background?.color) {
					const radius = this._data.box?.border?.radius * pixelRatio;
					drawRoundRect(ctx, scaledLeft, scaledTop, scaledRight - scaledLeft, scaledBottom - scaledTop, radius);
					ctx.fillStyle = this._data.box?.background?.color;
					ctx.fill();
					if (ctxUpdated) { ctx.restore(); ctxUpdated = false; }
				}

				if (this._data.box.border?.color) {
					const radius = this._data.box?.border?.radius * pixelRatio + borderWidth;
					drawRoundRect(ctx, scaledLeft - halfBorderWidth, scaledTop - halfBorderWidth, scaledRight - scaledLeft + borderWidth, scaledBottom - scaledTop + borderWidth, radius);
					ctx.strokeStyle = this._data.box.border.color;
					ctx.lineWidth = borderWidth;
					if (ctxUpdated) { ctx.restore(); ctxUpdated = false; }
				}
			} else if (this._data.box.background?.color) {
				ctx.fillStyle = this._data.box.background.color;
				ctx.fillRect(scaledLeft, scaledTop, scaledRight - scaledLeft, scaledBottom - scaledTop);
				if (ctxUpdated) { ctx.restore(); ctxUpdated = false; }
			} else if (this._data.box?.border?.color || this._data.box?.border?.highlight) {
				let usedBorderWidth;
				if (this._data.box?.border?.color) {
					ctx.strokeStyle = this._data.box?.border?.color;
					usedBorderWidth = borderWidth;
				} else {
					ctx.strokeStyle = this._data.font?.color as string;
					setLineStyle(ctx, LineStyle.Dashed);
					usedBorderWidth = Math.max(1, Math.floor(pixelRatio));
				}

				ctx.lineWidth = usedBorderWidth;

				ctx.beginPath();
				ctx.moveTo(scaledLeft - usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
				ctx.lineTo(scaledLeft - usedBorderWidth / 2, scaledBottom + usedBorderWidth / 2);
				ctx.lineTo(scaledRight + usedBorderWidth / 2, scaledBottom + usedBorderWidth / 2);
				ctx.lineTo(scaledRight + usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
				ctx.lineTo(scaledLeft - usedBorderWidth / 2, scaledTop - usedBorderWidth / 2);
				ctx.stroke();

				if (ctxUpdated) { ctx.restore(); }
			}
		}

		ctx.fillStyle = this._data.font?.color as string;
		const { lines } = this._getLinesInfo();
		const extraSpace = 0.05 * fontSize;
		const linePadding = getScaledPadding(this._data);
		const x = (scaledLeft + Math.round(internalData.textStart * pixelRatio)) / pixelRatio;
		let y = (scaledTop + Math.round((internalData.textTop + extraSpace) * pixelRatio)) / pixelRatio;

		for (const line of lines) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			drawScaled(ctx, pixelRatio, () => ctx.fillText(line, x, y));
			y += fontSize + linePadding;
		}
		ctx.restore();
	}

    // eslint-disable-next-line complexity
	private _getInternalData(): InternalData {
		if (this._internalData !== null) { return this._internalData; }
		const data = ensureNotNull(this._data);

		const paddingX = getScaledBoxPaddingX(data);
		const paddingY = getScaledBoxPaddingY(data);
		const inflationPaddingX = getScaledBackgroundInflationX(data) + paddingX;
		const inflationPaddingY = getScaledBackgroundInflationY(data) + paddingY;

		const anchor = ensureDefined(data.points)[0];
		const boxSize = this._getBoxSize();
		const boxWidth = boxSize.width;
		const boxHeight = boxSize.height;
		let anchorY = anchor.y as number;
		let anchorX = anchor.x as number;

		switch (data.box?.alignment?.vertical) {
			case BoxVerticalAlignment.Bottom:
				anchorY -= boxHeight + (data.box?.offset?.y || 0);
				break;
			case BoxVerticalAlignment.Middle:
				anchorY -= boxHeight / 2;
				break;
			case BoxVerticalAlignment.Top:
				anchorY += (data.box?.offset?.y || 0);
		}

		const textY = anchorY + (inflationPaddingY) + getScaledFontSize(data) / 2;
		let textAlign = TextAlignment.Start;
		let textX = 0;

		switch (data.box?.alignment?.horizontal) {
			case BoxHorizontalAlignment.Left:
				anchorX += (data.box?.offset?.x || 0);
				break;
			case BoxHorizontalAlignment.Center:
				anchorX -= boxWidth / 2;
				break;
			case BoxHorizontalAlignment.Right:
				anchorX -= boxWidth + (data.box?.offset?.x || 0);
		}
		switch (ensureDefined(data.alignment)) {
			case TextAlignment.Left: {
				textAlign = TextAlignment.Start;
				textX = anchorX + inflationPaddingX;

				if (isRtl()) {
					if (data.forceTextAlign) {
						textAlign = TextAlignment.Left;
					} else {
						textX = anchorX + boxWidth - inflationPaddingX;
						textAlign = TextAlignment.Right;
					}
				}
				break;
			}
			case TextAlignment.Center:
				textAlign = TextAlignment.Center;
				textX = anchorX + boxWidth / 2;
				break;
			case TextAlignment.Right:
				textAlign = TextAlignment.End;
				textX = anchorX + boxWidth - inflationPaddingX;
				if (isRtl() && data.forceTextAlign) {
					textAlign = TextAlignment.Right;
				}
				break;
		}

		this._internalData = {
			boxLeft: anchorX,
			boxTop: anchorY,
			boxWidth: boxWidth,
			boxHeight: boxHeight,
			textAlign: textAlign,
			textTop: textY - anchorY,
			textStart: textX - anchorX,
		};

		return this._internalData;
	}

	private _getLinesMaxWidth(lines: string[]): number {
		if (!cacheCanvas) { createCacheCanvas(); }
		cacheCanvas.textBaseline = 'alphabetic';
		cacheCanvas.font = this.fontStyle();

		if (this._data !== null && this._data.wordWrapWidth && !this._data.forceCalculateMaxLineWidth) {
			return this._data.wordWrapWidth * getFontAwareScale(this._data);
		}

		let maxWidth = 0;
		for (const line of lines) {
			maxWidth = Math.max(maxWidth, cacheCanvas.measureText(line).width);
		}
		return maxWidth;
	}

	private _getLinesInfo(): LinesInfo {
		if (null === this._linesInfo) {
			const data = ensureNotNull(this._data);
			let lines = this.wordWrap(data.value || '', data.wordWrapWidth);

			if (data.box?.maxHeight !== undefined) {
				const maxHeight = ensureDefined(data.box?.maxHeight);
				const scaledFontSize = getScaledFontSize(data);
				const scaledPadding = getScaledPadding(data);
				const maxLines = Math.floor((maxHeight + scaledPadding) / (scaledFontSize + scaledPadding));
				if (lines.length > maxLines) { lines = lines.slice(0, maxLines); }
			}

			this._linesInfo = { linesMaxWidth: this._getLinesMaxWidth(lines), lines };
		}
		return this._linesInfo;
	}

	private _getFontInfo(): FontInfo {
		if (this._fontInfo === null) {
			const data = ensureNotNull(this._data);
			const fontSize = getScaledFontSize(data);
			const i = (data.font?.bold ? 'bold ' : '') + (data.font?.italic ? 'italic ' : '') + fontSize + 'px ' + data.font?.family;
			this._fontInfo = {
				fontStyle: i,
				fontSize: fontSize,
			};
		}
		return this._fontInfo;
	}

	private _getBoxSize(): BoxSize {
		if (null === this._boxSize) {
			const linesInfo = this._getLinesInfo();
			const data = ensureNotNull(this._data);
			this._boxSize = {
				width: getBoxWidth(data, linesInfo.linesMaxWidth),
				height: getBoxHeight(data, linesInfo.lines.length),
			};
		}
		return this._boxSize;
	}

	private _getPolygonPoints(): Point[] {
		if (null !== this._polygonPoints) {return this._polygonPoints;}
		if (null === this._data) {return [];}

		const { boxLeft, boxTop, boxWidth, boxHeight } = this._getInternalData();
		const pivot = this._getRotationPoint();
		const angle = this._data.box?.angle || 0;
		this._polygonPoints = [
			rotatePoint(new Point(boxLeft, boxTop), pivot, angle),
			rotatePoint(new Point(boxLeft + boxWidth, boxTop), pivot, angle),
			rotatePoint(new Point(boxLeft + boxWidth, boxTop + boxHeight), pivot, angle),
			rotatePoint(new Point(boxLeft, boxTop + boxHeight), pivot, angle),
		];

		return this._polygonPoints;
	}

	private _getRotationPoint(): Point {
		const { boxLeft, boxTop, boxWidth, boxHeight } = this._getInternalData();
		const { horizontal, vertical } = ensureDefined(this._data?.box?.alignment);
		let x = 0;
		let y = 0;

		switch (horizontal) {
			case BoxHorizontalAlignment.Center:
				x = boxLeft + boxWidth / 2;
				break;
			case BoxHorizontalAlignment.Left:
				x = boxLeft;
				break;
			case BoxHorizontalAlignment.Right:
				x = boxLeft + boxWidth;
		}
		switch (vertical) {
			case BoxVerticalAlignment.Middle:
				y = boxTop + boxHeight / 2;
				break;
			case BoxVerticalAlignment.Top:
				y = boxTop;
				break;
			case BoxVerticalAlignment.Bottom:
				y = boxTop + boxHeight;
		}
		return new Point(x, y);
	}
}

// eslint-disable-next-line complexity
function textWrap(text: string, font: string, lineWrapWidth: number | string | undefined): string[] {
	if (!cacheCanvas) {createCacheCanvas();}
	lineWrapWidth = Object.prototype.toString.call(lineWrapWidth) === '[object String]' ? parseInt(lineWrapWidth as string) : lineWrapWidth as number;
	text += '';
	const lines = !Number.isInteger(lineWrapWidth) || !isFinite(lineWrapWidth) || lineWrapWidth <= 0
        ? text.split(/\r\n|\r|\n|$/)
        : text.split(/[^\S\r\n]*(?:\r\n|\r|\n|$)/);

	if (!lines[lines.length - 1]) { lines.pop(); }
	if (!Number.isInteger(lineWrapWidth) || !isFinite(lineWrapWidth) || lineWrapWidth <= 0) { return lines; }

	cacheCanvas.font = font;
	const wrappedLines = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineWidth = cacheCanvas.measureText(line).width;
		if (lineWidth <= lineWrapWidth) {
			wrappedLines.push(line);
			continue;
		}

		const splitedLine = line.split(/([-)\]},.!?:;])|(\s+)/);
		for (; splitedLine.length;) {
			let space = Math.floor(lineWrapWidth / lineWidth * (splitedLine.length + 2) / 3);

			if (space <= 0 || cacheCanvas.measureText(splitedLine.slice(0, 3 * space - 1).join('')).width <= lineWrapWidth) {
				for (; cacheCanvas.measureText(splitedLine.slice(0, 3 * (space + 1) - 1).join('')).width <= lineWrapWidth;) {space++;}
			} else {
				// eslint-disable-next-line no-empty
				for (; space > 0 && cacheCanvas.measureText(splitedLine.slice(0, 3 * --space - 1).join('')).width > lineWrapWidth;) {}
			}

			if (space > 0) {
				wrappedLines.push(splitedLine.slice(0, 3 * space - 1).join(''));
				splitedLine.splice(0, 3 * space);
			} else {
				const paragraph = splitedLine[0] + (splitedLine[1] || '');
				let subspace = Math.floor(lineWrapWidth / cacheCanvas.measureText(paragraph).width * paragraph.length);

				if (cacheCanvas.measureText(paragraph.substring(0, subspace)).width <= lineWrapWidth) {
					for (; cacheCanvas.measureText(paragraph.substring(0, subspace + 1)).width <= lineWrapWidth;) {subspace++;}
				} else {
					// eslint-disable-next-line no-empty
					for (; subspace > 1 && cacheCanvas.measureText(paragraph.substring(0, --subspace)).width > lineWrapWidth;) {}
				}

				subspace = Math.max(1, subspace);
				wrappedLines.push(paragraph.substring(0, subspace));
				splitedLine[0] = paragraph.substring(subspace);
				splitedLine[1] = '';
			}

			if (cacheCanvas.measureText(splitedLine.join('')).width <= lineWrapWidth) {
				wrappedLines.push(splitedLine.join(''));
				break;
			}
		}
	}
	return wrappedLines;
}

let cacheCanvas: CanvasRenderingContext2D;
function createCacheCanvas(): void {
	const canvas = document.createElement('canvas');
	canvas.width = 0;
	canvas.height = 0;
	cacheCanvas = ensureNotNull(canvas.getContext('2d'));
}

function rotatePoint(point: Point, pivot: Point, angle: number): Point {
	if (0 === angle) { return point.clone(); }
	const x = (point.x - pivot.x) * Math.cos(angle) - (point.y - pivot.y) * Math.sin(angle) + pivot.x;
	const y = (point.x - pivot.x) * Math.sin(angle) + (point.y - pivot.y) * Math.cos(angle) + pivot.y;
	return new Point(x, y);
}

function getBoxWidth(data: TextRendererData, maxLineWidth: number): number {
	return maxLineWidth + 2 * getScaledBackgroundInflationX(data) + 2 * getScaledBoxPaddingX(data);
}

function getBoxHeight(data: TextRendererData, linesCount: number): number {
	return getScaledFontSize(data) * linesCount + getScaledPadding(data) * (linesCount - 1) + 2 * getScaledBackgroundInflationY(data) + 2 * getScaledBoxPaddingY(data);
}

function getScaledBoxPaddingY(data: TextRendererData): number {
	return data.box?.padding?.y !== undefined ? data.box?.padding?.y * getFontAwareScale(data) : getScaledFontSize(data) / 3;
}

function getScaledBoxPaddingX(data: TextRendererData): number {
	return data.box?.padding?.x ? data.box?.padding?.x * getFontAwareScale(data) : getScaledFontSize(data) / 3;
}

function getScaledBackgroundInflationY(data: TextRendererData): number {
	return (data.box?.background?.inflation?.y || 0) * getFontAwareScale(data);
}

function getScaledBackgroundInflationX(data: TextRendererData): number {
	return (data.box?.background?.inflation?.x || 0) * getFontAwareScale(data);
}

function getScaledPadding(data: TextRendererData): number {
	return (data.padding || 0) * getFontAwareScale(data);
}

function getScaledFontSize(data: TextRendererData): number {
	return Math.ceil(getFontSize(data) * getFontAwareScale(data));
}

function getFontSize(data: TextRendererData): number {
	return data.font?.size || 30;
}

function getFontAwareScale(data: TextRendererData): number {
	const scale = Math.min(1, Math.max(0.2, data.box?.scale || 1));
	if (scale === 1) {return scale;}
	const fontSize = getFontSize(data);
	return Math.ceil(scale * fontSize) / fontSize;
}

function isRtl(): boolean {
	return 'rtl' === window.document.dir;
}
