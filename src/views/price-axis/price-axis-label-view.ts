import { IPriceAxisViewRenderer, PriceAxisViewRendererOptions } from '../../renderers/iprice-axis-view-renderer';
import {
	PriceAxisViewRenderer,
	PriceAxisViewRendererCommonData as PriceAxisLabelRendererCommonData,
	PriceAxisViewRendererData as PriceAxisLabelRendererData,
} from '../../renderers/price-axis-label-renderer';

import { IPriceAxisView } from './iprice-axis-view';

type IPriceAxisLabelRendererConstructor = new(data: PriceAxisLabelRendererData, commonData: PriceAxisLabelRendererCommonData) => PriceAxisViewRenderer;
export abstract class PriceAxisLabelView implements IPriceAxisView {
	private readonly _commonRendererData: PriceAxisLabelRendererCommonData = {
		coordinate: 0,
		color: '#FFF',
		background: '#000',
	};

	private readonly _axisRendererData: PriceAxisLabelRendererData = {
		text: '',
		visible: false,
		tickVisible: false,
		moveTextToInvisibleTick: false,
		borderColor: '',
	};

	private readonly _paneRendererData: PriceAxisLabelRendererData = {
		text: '',
		visible: false,
		tickVisible: false,
		moveTextToInvisibleTick: true,
		borderColor: '',
	};

	private readonly _axisRenderer: PriceAxisViewRenderer;
	private readonly _paneRenderer: PriceAxisViewRenderer;
	private _invalidated: boolean = true;

	public constructor(ctor?: IPriceAxisLabelRendererConstructor) {
		this._axisRenderer = new (ctor || PriceAxisViewRenderer)(this._axisRendererData, this._commonRendererData);
		this._paneRenderer = new (ctor || PriceAxisViewRenderer)(this._paneRendererData, this._commonRendererData);
	}

	public text(): string {
		return this._axisRendererData.text;
	}

	public coordinate(): number {
		this._updateRendererDataIfNeeded();
		return this._commonRendererData.coordinate;
	}

	public update(): void {
		this._invalidated = true;
	}

	public height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean = false): number {
		return Math.max(
			this._axisRenderer.height(rendererOptions, useSecondLine),
			this._paneRenderer.height(rendererOptions, useSecondLine)
		);
	}

	public getFixedCoordinate(): number {
		return this._commonRendererData.fixedCoordinate || 0;
	}

	public setFixedCoordinate(value?: number): void {
		this._commonRendererData.fixedCoordinate = value;
	}

	public isVisible(): boolean {
		this._updateRendererDataIfNeeded();
		return this._axisRendererData.visible || this._paneRendererData.visible;
	}

	public renderer(): IPriceAxisViewRenderer {
		this._updateRendererDataIfNeeded();

		this._axisRenderer.setData(this._axisRendererData, this._commonRendererData);
		this._paneRenderer.setData(this._paneRendererData, this._commonRendererData);

		return this._axisRenderer;
	}

	public paneRenderer(): IPriceAxisViewRenderer {
		this._updateRendererDataIfNeeded();
		this._axisRenderer.setData(this._axisRendererData, this._commonRendererData);
		this._paneRenderer.setData(this._paneRendererData, this._commonRendererData);

		return this._paneRenderer;
	}

	protected abstract _updateRendererData(
		axisRendererData: PriceAxisLabelRendererData,
		paneRendererData: PriceAxisLabelRendererData,
		commonData: PriceAxisLabelRendererCommonData
	): void;

	private _updateRendererDataIfNeeded(): void {
		if (this._invalidated) {
			this._axisRendererData.tickVisible = false;
			this._paneRendererData.tickVisible = false;
			this._updateRendererData(this._axisRendererData, this._paneRendererData, this._commonRendererData);
		}
	}
}
