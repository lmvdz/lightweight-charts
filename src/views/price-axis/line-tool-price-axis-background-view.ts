import { ChartModel } from '../../model/chart-model';
import { LineTool, LineToolPoint } from '../../model/line-tool';
import { PriceAxisBackgroundRenderer, PriceAxisBackgroundRendererData } from '../../renderers/price-axis-background-renderer';

import { IPriceAxisView } from './iprice-axis-view';

export class LineToolPriceAxisBackgroundView implements IPriceAxisView {
	protected _renderer: PriceAxisBackgroundRenderer = new PriceAxisBackgroundRenderer();
	protected _invalidated: boolean = true;
	protected _source: LineTool;
	protected _model: ChartModel;

	protected _rendererData: PriceAxisBackgroundRendererData = {
		color: 'rgba(41, 98, 255, 0.25)',
		visible: false,
		coordinate: 0,
		height: 0,
	};

	public constructor(lineTool: LineTool) {
		this._source = lineTool;
		this._model = lineTool.model();
		this._renderer.setData(this._rendererData);
	}

	public update(): void {
		this._invalidated = true;
	}

	public renderer(): PriceAxisBackgroundRenderer {
		if (this._invalidated) { this._updateImpl(); }
		this._invalidated = false;
		return this._renderer;
	}

	protected _updateImpl(): void {
		this._rendererData.visible = false;
		const priceScale = this._source.priceScale();

		if (!priceScale || priceScale.isEmpty()) { return; }
		if (!this._source.selected()) { return; }

		const x = this._source.priceAxisPoints().map((point: LineToolPoint) => {
			return priceScale.priceToCoordinate(point.price, point.price);
		});

		const max = Math.max(...x);
		const min = Math.min(...x);

		this._rendererData.coordinate = min;
		this._rendererData.height = max - min;
		this._rendererData.visible = true;
		this._invalidated = false;
	}
}
