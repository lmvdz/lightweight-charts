import { ChartModel } from '../../model/chart-model';
import { Crosshair, TimeAndCoordinateProvider } from '../../model/crosshair';
import { UTCTimestamp } from '../../model/time-data';

import { TimeAxisLabelView } from './time-axis-label-view';

export class CrosshairTimeAxisLabelView extends TimeAxisLabelView {
	protected readonly _crosshair: Crosshair;
	protected readonly _valueProvider: TimeAndCoordinateProvider;

	public constructor(crosshair: Crosshair, model: ChartModel, valueProvider: TimeAndCoordinateProvider) {
		super(model);
		this._crosshair = crosshair;
		this._valueProvider = valueProvider;
	}

	protected _getTime(): UTCTimestamp | null {
		const currentTime = this._model.timeScale().floatIndexToTime(this._crosshair.appliedIndex());
		return currentTime as UTCTimestamp | null;
	}

	protected _getBackgroundColor(): string {
		return '#4c525e';
	}

	protected override _updateImpl(): void {
		this._rendererData.visible = false;
		const options = this._crosshair.options().vertLine;

		if (!options.labelVisible) {
			return;
		}

		super._updateImpl();
	}
}
