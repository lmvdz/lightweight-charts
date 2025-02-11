import { generateContrastColors } from '../../helpers/color';

import { CustomPriceLine } from '../../model/custom-price-line';
import { Series } from '../../model/series';
import {
	PriceAxisViewRendererCommonData,
	PriceAxisViewRendererData,
} from '../../renderers/price-axis-label-renderer';

import { PriceAxisLabelView } from './price-axis-label-view';

export class CustomPriceLinePriceAxisLabelView extends PriceAxisLabelView {
	private readonly _series: Series;
	private readonly _priceLine: CustomPriceLine;

	public constructor(series: Series, priceLine: CustomPriceLine) {
		super();
		this._series = series;
		this._priceLine = priceLine;
	}

	protected _updateRendererData(
		axisRendererData: PriceAxisViewRendererData,
		paneRendererData: PriceAxisViewRendererData,
		commonData: PriceAxisViewRendererCommonData
	): void {
		axisRendererData.visible = false;
		paneRendererData.visible = false;

		const options = this._priceLine.options();
		const labelVisible = options.axisLabelVisible;
		const showPaneLabel = options.title !== '';

		const series = this._series;

		if (!labelVisible || !options.visible || !series.visible()) {
			return;
		}

		const y = this._priceLine.yCoord();
		if (y === null) {
			return;
		}

		if (showPaneLabel) {
			paneRendererData.text = options.title;
			paneRendererData.visible = true;
		}

		paneRendererData.borderColor = series.model().backgroundColorAtYPercentFromTop(y / series.priceScale().height());

		axisRendererData.text = series.priceScale().formatPriceAbsolute(options.price);
		axisRendererData.visible = true;

		const colors = generateContrastColors(options.color);
		commonData.background = colors.background;
		commonData.color = colors.foreground;
		commonData.coordinate = y;
	}
}
