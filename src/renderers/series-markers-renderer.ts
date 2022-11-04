import { ensureNever } from '../helpers/assertions';
import { makeFont } from '../helpers/make-font';

import { Coordinate } from '../model/coordinate';
import { SeriesMarkerAnchor, SeriesMarkerShape, SeriesMarkerStroke } from '../model/series-markers';
import { TextWidthCache } from '../model/text-width-cache';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { ScaledRenderer } from './scaled-renderer';
import { drawArrow } from './series-markers-arrow';
import { drawCircle } from './series-markers-circle';
import { drawSquare } from './series-markers-square';
import { drawText } from './series-markers-text';
import { drawTriangle } from './series-markers-triangle';

export interface SeriesMarkerText {
	content: string;
	y: Coordinate;
	width: number;
	height: number;
}

export interface SeriesMarkerRendererDataItem extends TimedValue {
	y: Coordinate;
	size: number;
	shape: SeriesMarkerShape;
	stroke?: SeriesMarkerStroke;
	anchor?: SeriesMarkerAnchor;
	rotation?: number;
	color: string;
	internalId: number;
	externalId?: string;
	text?: SeriesMarkerText;
}

export interface SeriesMarkerRendererData {
	items: SeriesMarkerRendererDataItem[];
	visibleRange: SeriesItemsIndexesRange | null;
}

export class SeriesMarkersRenderer extends ScaledRenderer {
	private _data: SeriesMarkerRendererData | null = null;
	private _textWidthCache: TextWidthCache = new TextWidthCache();
	private _fontSize: number = -1;
	private _fontFamily: string = '';
	private _font: string = '';

	public setData(data: SeriesMarkerRendererData): void {
		this._data = data;
	}

	public setParams(fontSize: number, fontFamily: string): void {
		if (this._fontSize !== fontSize || this._fontFamily !== fontFamily) {
			this._fontSize = fontSize;
			this._fontFamily = fontFamily;
			this._font = makeFont(fontSize, fontFamily);
			this._textWidthCache.reset();
		}
	}

	// TODO: iosif check if neeeded
	// public hitTest(point: Point): HoveredObject | null {
	// 	if (this._data === null || this._data.visibleRange === null) {
	// 		return null;
	// 	}

	// 	for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
	// 		const item = this._data.items[i];
	// 		if (hitTestItem(item, point.x, point.y)) {
	// 			return {
	// 				hitTestData: item.internalId,
	// 				externalId: item.externalId,
	// 			};
	// 		}
	// 	}

	// 	return null;
	// }

	protected _drawImpl(ctx: CanvasRenderingContext2D): void {
		if (this._data === null || this._data.visibleRange === null) {
			return;
		}

		ctx.textBaseline = 'middle';
		ctx.font = this._font;

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			if (item.text !== undefined) {
				item.text.width = this._textWidthCache.measureText(ctx, item.text.content);
				item.text.height = this._fontSize;
			}
			drawItem(item, ctx);
		}
	}
}

function drawItem(item: SeriesMarkerRendererDataItem, ctx: CanvasRenderingContext2D): void {
	const rotation = item.rotation || (item.anchor === 'bottom' ? 180 : item.anchor === 'right' ? 90 : item.anchor === 'left' ? -90 : 0);
	ctx.strokeStyle = item.stroke?.color || 'transparent';
	ctx.lineWidth = item.stroke?.width || 1;
	ctx.fillStyle = item.color;

	if (item.text !== undefined) {
		drawText(ctx, item.text.content, item.x - item.text.width / 2, item.text.y);
	}

	if (rotation) {
		ctx.save();
		ctx.translate(item.x, item.y);
		ctx.rotate(rotation * (Math.PI / 180));
		ctx.translate(-item.x, -item.y);
	}

	drawShape(item, ctx);

	if (rotation) {
		ctx.restore();
	}
}

function drawShape(item: SeriesMarkerRendererDataItem, ctx: CanvasRenderingContext2D): void {
	if (item.size === 0) {
		return;
	}

	switch (item.shape) {
		case 'triangle':
			drawTriangle(ctx, item.x, item.y, item.size);
			return;
		case 'arrowDown':
			drawArrow(false, ctx, item.x, item.y, item.size);
			return;
		case 'arrowUp':
			drawArrow(true, ctx, item.x, item.y, item.size);
			return;
		case 'circle':
			drawCircle(ctx, item.x, item.y, item.size);
			return;
		case 'square':
			drawSquare(ctx, item.x, item.y, item.size);
			return;
	}

	ensureNever(item.shape);
}

// TODO: iosif might not be needed
// function hitTestItem(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
// 	if (item.text !== undefined && hitTestText(item.x, item.text.y, item.text.width, item.text.height, x, y)) {
// 		return true;
// 	}

// 	return hitTestShape(item, x, y);
// }

// function hitTestShape(item: SeriesMarkerRendererDataItem, x: Coordinate, y: Coordinate): boolean {
// 	if (item.size === 0) {
// 		return false;
// 	}

// 	switch (item.shape) {
// 		case 'triangle':
// 			return hitTestTriangle(item.x, item.y, item.size, x, y);
// 		case 'arrowDown':
// 			return hitTestArrow(true, item.x, item.y, item.size, x, y);
// 		case 'arrowUp':
// 			return hitTestArrow(false, item.x, item.y, item.size, x, y);
// 		case 'circle':
// 			return hitTestCircle(item.x, item.y, item.size, x, y);
// 		case 'square':
// 			return hitTestSquare(item.x, item.y, item.size, x, y);
// 	}
// }
