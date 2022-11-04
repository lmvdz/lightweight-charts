import { generateContrastColors } from '../../helpers/color';

import { ChartModel } from '../../model/chart-model';
import { UTCTimestamp } from '../../model/time-data';
import { TimeAxisLabelRenderer, TimeAxisLabelRendererData } from '../../renderers/time-axis-label-renderer';

import { ITimeAxisView } from './itime-axis-view';

export abstract class TimeAxisLabelView implements ITimeAxisView {
	protected _renderer: TimeAxisLabelRenderer = new TimeAxisLabelRenderer();
	protected _invalidated: boolean = true;
	protected _model: ChartModel;

	protected _rendererData: TimeAxisLabelRendererData = {
		background: '',
		coordinate: 0,
		color: '',
		text: '',
		width: 0,
		visible: false,
		tickVisible: false,
	};

	public constructor(model: ChartModel) {
		this._model = model;
		this._renderer.setData(this._rendererData);
	}

	public update(): void {
		this._invalidated = true;
	}

	public renderer(): TimeAxisLabelRenderer {
		if (this._invalidated) { this._updateImpl(); }
		this._invalidated = false;
		return this._renderer;
	}

	protected abstract _getTime(): UTCTimestamp | null;
	protected abstract _getBackgroundColor(): string | null;

	protected _updateImpl(): void {
		this._rendererData.visible = false;
		if (this._model.timeScale().isEmpty()) { return; }

		const background = this._getBackgroundColor();
		if (background === null) { return; }

		const timestamp = this._getTime();
		if (timestamp === null) { return; }

		const colors = generateContrastColors(background);
		this._rendererData.background = colors.background;
		this._rendererData.color = colors.foreground;

		this._rendererData.coordinate = this._model.timeScale().timeToCoordinate({ timestamp });
		this._rendererData.text = this._model.timeScale().formatDateTime({ timestamp });
		this._rendererData.width = this._model.timeScale().width();
		this._rendererData.visible = true;
		this._invalidated = false;
	}
}
