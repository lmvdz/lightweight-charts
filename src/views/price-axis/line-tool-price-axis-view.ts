import { colorFromBackground } from '../../helpers/color-helpers';

import { LineTool } from '../../model/line-tool';
import { PriceAxisViewRendererCommonData, PriceAxisViewRendererData } from '../../renderers/iprice-axis-view-renderer';

import { PriceAxisView } from './price-axis-view';

export class LineToolPriceAxisView extends PriceAxisView {
	protected _active: boolean = false;
	protected _source: LineTool;
	protected _pointIndex: number;

	public constructor(lineTool: LineTool, pointIndex: number) {
		super();
		this._active = false;
		this._source = lineTool;
		this._pointIndex = pointIndex;
	}

	public setActive(active: boolean): void {
		this._active = active;
	}

	protected _updateRendererData(
		axisRenderData: PriceAxisViewRendererData,
		paneRenderData: PriceAxisViewRendererData,
		commonRendererData: PriceAxisViewRendererCommonData
	): void {
		axisRenderData.visible = false;
		const chartModel = this._source.model();
		if (!chartModel.timeScale() || chartModel.timeScale().isEmpty()) {return;}

		const priceScale = this._source.priceScale();
		if (priceScale === null || priceScale.isEmpty()) {return;}

		if (!this._source.selected()) {return;}
		if (chartModel.timeScale().visibleStrictRange() === null) {return;}

		const points = this._source.priceAxisPoints();
		if (points.length <= this._pointIndex) {return;}

		const point = points[this._pointIndex];
		if (!isFinite(point.price)) {return;}

		const ownerSource = this._source.ownerSource();
		const firstValue = null !== ownerSource ? ownerSource.firstValue() : null;
		if (null === firstValue) {return;}

		commonRendererData.background = this._getBgColor();
		commonRendererData.color = colorFromBackground(commonRendererData.background);
		commonRendererData.coordinate = priceScale.priceToCoordinate(point.price, firstValue.value);
		axisRenderData.text = this._source.priceScale()?.formatPrice(point.price, firstValue.value) || '';
		axisRenderData.visible = true;
	}

	protected _getBgColor(): string {
		return this._active ? '#143EB3' : '#2962FF';
	}
}
