import { colorFromBackground } from '../../helpers/color-helpers';

import { ChartModel } from '../../model/chart-model';
import { UTCTimestamp } from '../../model/time-data';
import { TimeAxisViewRenderer, TimeAxisViewRendererData } from '../../renderers/time-axis-view-renderer';

import { ITimeAxisView } from './itime-axis-view';

export abstract class TimeAxisView implements ITimeAxisView {
	protected _renderer: TimeAxisViewRenderer = new TimeAxisViewRenderer();
	protected _rendererData: TimeAxisViewRendererData;
	protected _invalidated: boolean = true;
	protected _model: ChartModel;

	public constructor(model: ChartModel) {
		this._rendererData = {
			background: '',
			coordinate: 0,
			color: '',
			text: '',
			width: 0,
			visible: false,
			tickVisible: false,
		};
		this._model = model;
		this._renderer.setData(this._rendererData);
	}

	public update(): void {
		this._invalidated = true;
	}

	public renderer(): TimeAxisViewRenderer {
		if (this._invalidated) { this._updateImpl(); }
		this._invalidated = false;
		return this._renderer;
	}

	public coordinate(): number {
		return this._rendererData.coordinate;
	}

	protected abstract _getTime(): UTCTimestamp | null;
	protected abstract _getBgColor(): string;

	protected _updateImpl(): void {
		this._rendererData.visible = false;
		if (this._model.timeScale().isEmpty()) { return; }

		const timestamp = this._getTime();
		if (null === timestamp) {return;}

		this._rendererData.background = this._getBgColor();
		this._rendererData.coordinate = this._model.timeScale().timeToCoordinate({ timestamp });
		this._rendererData.text = this._model.timeScale().formatDateTime({ timestamp });
		this._rendererData.color = colorFromBackground(this._rendererData.background);
		this._rendererData.width = this._model.timeScale().width();
		this._rendererData.visible = true;
		this._invalidated = false;
	}
}
