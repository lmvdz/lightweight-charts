import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestResult, HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolOptionsInternal } from '../../model/line-tool';
import { BoxHorizontalAlignment, LineToolType } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { AnchorPoint } from '../../renderers/line-anchor-renderer';
import { SegmentRenderer } from '../../renderers/segment-renderer';
import { TextRenderer } from '../../renderers/text-renderer';

import { LineEnd } from '../..';
import { LineToolPaneView } from './line-tool-pane-view';

export class HorizontalLinePaneView extends LineToolPaneView {
	protected _lineRenderer: SegmentRenderer = new SegmentRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
		this._lineRenderer.setHitTest(new HitTestResult(HitTestType.MovePoint));
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(height: number, width: number): void {
		this._renderer = null;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();
		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }

		const points = this._source.points();
		if (points.length < 1) { return; }

		const startTime = timeScale.coordinateToTime(0 as Coordinate);
		const endTime = timeScale.coordinateToTime(width as Coordinate);
		const options = this._source.options() as LineToolOptionsInternal<'HorizontalLine'>;

		const { left, right } = options.line.extend || {};
		const isOutsideView = (!left && points[0].timestamp > endTime.timestamp) || (!right && points[0].timestamp < startTime.timestamp);

		if (!isOutsideView) {
			super._updateImpl();
			if (this._points.length < 1) { return; }

			const point = this._points[0];
			const start = left ? new AnchorPoint(0, point.y, 0) : new AnchorPoint(point.x, point.y, 0);
			const end = right ? new AnchorPoint(width, point.y, 1) : new AnchorPoint(point.x, point.y, 1);

			if (Math.floor(start.x) === Math.floor(end.x) || Math.max(start.x, end.x) <= 0 || end.x < start.x) { return; }

			if (left && right) {
				point.x = width / 2 as Coordinate;
				point.square = true;
			}

			const ends = { left: LineEnd.Normal, right: LineEnd.Normal };
			const compositeRenderer = new CompositeRenderer();
			this._lineRenderer.setData({ line: { ...deepCopy(options.line), end: ends }, points: [start, end] });

			compositeRenderer.append(this._lineRenderer);
			if (options.text.value) {
				const angle = Math.atan((end.y - start.y) / (end.x - start.x));
				const align = options.text.box.alignment.horizontal;
				const pivot = align === BoxHorizontalAlignment.Left
					? start.clone() : align === BoxHorizontalAlignment.Right
					? end.clone() : new Point((start.x + end.x) / 2, (start.y + end.y) / 2);

				const labelOptions = deepCopy(options.text);
				labelOptions.box = { ...labelOptions.box, angle };

				this._labelRenderer.setData({ text: labelOptions, points: [pivot] });
				compositeRenderer.append(this._labelRenderer);
			}

			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}
}
