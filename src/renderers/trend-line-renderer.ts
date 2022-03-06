import { ensureNotNull } from '../helpers/assertions';

import { CanvasRenderParams } from '../model/canvas-render-params';
import { HitTestResult, HitTestType } from '../model/hit-test-result';
import { distanceToSegment } from '../model/interesection';
import { LineToolLine } from '../model/line-tool-options';
import { Point } from '../model/point';

import { drawArrowCap, drawCircleCap, drawHorizontalLine, drawLine, drawVerticalLine, extendAndClipLineSegment, LineCap, setLineStyle } from './draw-line';
import { IPaneRenderer } from './ipane-renderer';
import { AnchorPoint } from './line-anchor-renderer';
import { interactionTolerance } from './optimal-bar-width';

export type TrendLineRendererData = LineToolLine & { points?: AnchorPoint[] };

export class TrendLineRenderer implements IPaneRenderer {
	protected _hitTest: HitTestResult<void>;
	protected _data: TrendLineRendererData | null;

	public constructor() {
		this._data = null;
		this._hitTest = new HitTestResult(HitTestType.MOVEPOINT);
	}

	public setData(data: TrendLineRendererData): void {
		this._data = data;
	}

	public setHitTest(hitTest: HitTestResult<void>): void {
		this._hitTest = hitTest;
	}

	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		if (!this._data || this._data.points === undefined || this._data.points.length < 2) { return; }

		const pixelRatio = renderParams.pixelRatio;
		ctx.lineWidth = Math.max(1, Math.floor(this._data.width * pixelRatio));
		ctx.strokeStyle = this._data.color;
		ctx.lineCap = 'butt';

		setLineStyle(ctx, this._data.style);
		const point0 = this._data.points[0];
		const point1 = this._data.points[1];

		this._drawEnds(ctx, [point0, point1], this._data.width, pixelRatio);
		const line = this._extendAndClipLineSegment(point0, point1, renderParams);

		if (line !== null && this._data.width > 0) {
			if (line[0].x === line[1].x) {
				drawVerticalLine(ctx, Math.round(line[0].x * pixelRatio), line[0].y * pixelRatio, line[1].y * pixelRatio);
			} else if (line[0].y === line[1].y) {
				drawHorizontalLine(ctx, Math.round(line[0].y * pixelRatio), line[0].x * pixelRatio, line[1].x * pixelRatio);
			} else {
				drawLine(ctx, line[0].x * pixelRatio, line[0].y * pixelRatio, line[1].x * pixelRatio, line[1].y * pixelRatio);
			}
		}
	}

	public hitTest(point: Point, renderParams: CanvasRenderParams): HitTestResult<void> | null {
		if (null === this._data) { return null; }
		if (this._data.points === undefined || this._data.points.length < 2) { return null; }

		const tolerance = interactionTolerance.line;
		const point0 = this._data.points[0];
		const point1 = this._data.points[1];
		const line = this._extendAndClipLineSegment(point0, point1, renderParams);

		if (null !== line && distanceToSegment(line[0], line[1], point).distance <= tolerance) {
			return this._hitTest;
		}
		return null;
	}

	private _extendAndClipLineSegment(point0: Point, point1: Point, renderParams: CanvasRenderParams): Point[] | null {
		const data = ensureNotNull(this._data);
		return extendAndClipLineSegment(point0, point1, renderParams.cssWidth, renderParams.cssHeight, data.extend.left, data.extend.right);
	}

	private _drawEnds(ctx: CanvasRenderingContext2D, points: Point[], width: number, pixelRatio: number): void {
		const point0 = points[0];
		const point1 = points[1];
		const data = ensureNotNull(this._data);
		switch (data.cap.left) {
			case LineCap.Arrow:
				drawArrowCap(point1, point0, ctx, width, pixelRatio);
				break;
			case LineCap.Circle:
				drawCircleCap(point0, ctx, width, pixelRatio);
		}
		switch (data.cap.right) {
			case LineCap.Arrow:
				drawArrowCap(point0, point1, ctx, width, pixelRatio);
				break;
			case LineCap.Circle:
				drawCircleCap(point1, ctx, width, pixelRatio);
		}
	}
}
