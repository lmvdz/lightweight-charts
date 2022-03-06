import { deepCopy } from '../../helpers/deep-copy';

import { ChartModel } from '../../model/chart-model';
import { LineTool } from '../../model/line-tool';
import { BoxHorizontalAlignment, LineToolType } from '../../model/line-tool-options';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { TextRenderer, TextRendererData } from '../../renderers/text-renderer';
import { TrendLineRenderer, TrendLineRendererData } from '../../renderers/trend-line-renderer';

import { LineSourcePaneView } from './line-source-pane-view';

export class TrendLinePaneView extends LineSourcePaneView {
	protected _trendRenderer: TrendLineRenderer = new TrendLineRenderer();
	protected _labelRenderer: TextRenderer = new TextRenderer();

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		super(source, model);
		this._renderer = null;
	}

	// eslint-disable-next-line complexity
	protected override _updateImpl(): void {
		this._renderer = null;
		this._invalidated = false;

		const priceScale = this._source.priceScale();
		const timeScale = this._model.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) { return; }
		const strictRange = timeScale.visibleTimeRange();
		if (strictRange === null) { return; }
		const points = this._source.points();
		if (points.length < 2) { return; }

		const options = this._source.options();
		const timestamp0 = points[0].timestamp;
		const timestamp1 = points[1].timestamp;
		const isOutsideView = Math.max(timestamp0, timestamp1) < strictRange.from.timestamp;

		if (!isOutsideView || options.line.extend.left || options.line.extend.right) {
			super._updateImpl();

			if (this._points.length < 2) { return; }
			const compositeRenderer = new CompositeRenderer();
			const trendOptions = deepCopy(options.line);
			const trendData: TrendLineRendererData = { ...trendOptions, points: this._points };
			this._trendRenderer.setData(trendData);

			compositeRenderer.append(this._trendRenderer);
			if (options.text.value) {
				const point0 = this._points[0];
				const point1 = this._points[1];
				const start = point0.x < point1.x ? point0 : point1;
				const end = start === point0 ? point1 : point0;

				const angle = Math.atan((end.y - start.y) / (end.x - start.x));
				const align = options.text.box.alignment.horizontal;
				const pivot = align === BoxHorizontalAlignment.Left
					? start.clone() : align === BoxHorizontalAlignment.Right
					? end.clone() : new Point((point0.x + point1.x) / 2, (point0.y + point1.y) / 2);

				const labelOptions = deepCopy(options.text);
				labelOptions.box = { ...labelOptions.box, angle };

				const labelData: TextRendererData = { ...labelOptions, points: [pivot] };
				this._labelRenderer.setData(labelData);
				compositeRenderer.append(this._labelRenderer);
			}

			this.addAnchors(compositeRenderer);
			this._renderer = compositeRenderer;
		}
	}
}
