import { CanvasRenderParams } from '../../model/canvas-render-params';
import { ChartModel } from '../../model/chart-model';
import { IPriceDataSource } from '../../model/iprice-data-source';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { IPriceAxisViewRenderer, PriceAxisViewRendererOptions } from '../../renderers/iprice-axis-view-renderer';

import { PriceAxisLabelView } from '../price-axis/price-axis-label-view';
import { IPaneView } from './ipane-view';

class PanePriceAxisLabelRenderer implements IPaneRenderer {
	private _priceAxisViewRenderer: IPriceAxisViewRenderer | null = null;
	private _rendererOptions: PriceAxisViewRendererOptions | null = null;

	public setParams(
		priceAxisViewRenderer: IPriceAxisViewRenderer,
		rendererOptions: PriceAxisViewRendererOptions
	): void {
		this._priceAxisViewRenderer = priceAxisViewRenderer;
		this._rendererOptions = rendererOptions;
	}

	public draw(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		if (this._rendererOptions === null || this._priceAxisViewRenderer === null || !this._priceAxisViewRenderer.draw) {
			return;
		}

		this._priceAxisViewRenderer.draw(ctx, this._rendererOptions, renderParams);
	}
}

export class PanePriceAxisLabelView implements IPaneView {
	private _priceAxisLabelView: PriceAxisLabelView;
	private readonly _dataSource: IPriceDataSource;
	private readonly _chartModel: ChartModel;
	private readonly _renderer: PanePriceAxisLabelRenderer;

	public constructor(priceAxisView: PriceAxisLabelView, dataSource: IPriceDataSource, chartModel: ChartModel) {
		this._priceAxisLabelView = priceAxisView;
		this._dataSource = dataSource;
		this._chartModel = chartModel;
		this._renderer = new PanePriceAxisLabelRenderer();
	}

	public renderer(height: number, width: number): IPaneRenderer | null {
		const pane = this._chartModel.paneForSource(this._dataSource);
		if (pane === null) {
			return null;
		}

		// this price scale will be used to find label placement only (left, right, none)
		const priceScale = pane.isOverlay(this._dataSource) ? pane.defaultVisiblePriceScale() : this._dataSource.priceScale();
		if (priceScale === null) {
			return null;
		}

		const position = pane.priceScalePosition(priceScale);
		if (position === 'overlay') {
			return null;
		}

		const options = this._chartModel.priceAxisRendererOptions();
		options.align = position;

		this._renderer.setParams(this._priceAxisLabelView.paneRenderer(), options);
		return this._renderer;
	}
}
