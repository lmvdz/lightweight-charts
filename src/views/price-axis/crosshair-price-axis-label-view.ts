import { generateContrastColors } from '../../helpers/color';

import { Crosshair, CrosshairPriceAndCoordinate } from '../../model/crosshair';
import { PriceScale } from '../../model/price-scale';
import { PriceAxisViewRendererCommonData, PriceAxisViewRendererData } from '../../renderers/price-axis-label-renderer';

import { PriceAxisLabelView } from './price-axis-label-view';

export type CrosshairPriceAxisLabelValueProvider = (priceScale: PriceScale) => CrosshairPriceAndCoordinate;

export class CrosshairPriceAxisLabelView extends PriceAxisLabelView {
	private _source: Crosshair;
	private readonly _priceScale: PriceScale;
	private readonly _valueProvider: CrosshairPriceAxisLabelValueProvider;

	public constructor(source: Crosshair, priceScale: PriceScale, valueProvider: CrosshairPriceAxisLabelValueProvider) {
		super();
		this._source = source;
		this._priceScale = priceScale;
		this._valueProvider = valueProvider;
	}

	protected _updateRendererData(
		axisRendererData: PriceAxisViewRendererData,
		paneRendererData: PriceAxisViewRendererData,
		commonRendererData: PriceAxisViewRendererCommonData
	): void {
		axisRendererData.visible = false;
		const options = this._source.options().horzLine;
		if (!options.labelVisible) {
			return;
		}

		const firstValue = this._priceScale.firstValue();
		if (!this._source.visible() || this._priceScale.isEmpty() || (firstValue === null)) {
			return;
		}

		const colors = generateContrastColors(options.labelBackgroundColor);
		commonRendererData.background = colors.background;
		commonRendererData.color = colors.foreground;

		const value = this._valueProvider(this._priceScale);
		commonRendererData.coordinate = value.coordinate;
		axisRendererData.text = this._priceScale.formatPrice(value.price, firstValue);
		axisRendererData.visible = true;
	}
}
