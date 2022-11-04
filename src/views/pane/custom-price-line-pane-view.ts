import { CustomPriceLine } from '../../model/custom-price-line';
import { Series } from '../../model/series';

import { SeriesHorizontalLinePaneView } from './series-horizontal-line-pane-view';

export class CustomPriceLinePaneView extends SeriesHorizontalLinePaneView {
	private readonly _priceLine: CustomPriceLine;

	public constructor(series: Series, priceLine: CustomPriceLine) {
		super(series);
		this._priceLine = priceLine;
	}

	protected _updateImpl(height: number, width: number): void {
		const lineOptions = this._priceLine.options();
		const data = this._lineRendererData;
		data.visible = false;

<<<<<<< HEAD
		const lineOptions = this._priceLine.options();

		if (!this._series.visible() || !lineOptions.lineVisible) {
=======
		if (!this._series.visible() || !lineOptions.visible) {
>>>>>>> iosiftalmacel/master
			return;
		}

		const y = this._priceLine.yCoord();
		if (y === null) {
			return;
		}

<<<<<<< HEAD
		let x;

		if (lineOptions.index !== undefined) {
			x = this._model.timeScale().indexToCoordinate(lineOptions.index);
		}

=======
>>>>>>> iosiftalmacel/master
		data.visible = true;
		data.y = y;
		data.x = x;
		data.color = lineOptions.color;
		data.width = width;
		data.height = height;
		data.lineWidth = lineOptions.lineWidth;
		data.lineStyle = lineOptions.lineStyle;
	}
}
