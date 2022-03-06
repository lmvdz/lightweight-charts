import { Delegate } from '../helpers/delegate';
import { IDestroyable } from '../helpers/idestroyable';
import { DeepPartial, merge } from '../helpers/strict-type-checks';

import { IPaneView } from '../views/pane/ipane-view';
import { IUpdatablePaneView } from '../views/pane/iupdatable-pane-view';
import { IPriceAxisView } from '../views/price-axis/iprice-axis-view';
import { LineToolPriceAxisView } from '../views/price-axis/line-tool-price-axis-view';
import { PriceAxisView } from '../views/price-axis/price-axis-view';
import { ITimeAxisView } from '../views/time-axis/itime-axis-view';
import { LineToolTimeAxisView } from '../views/time-axis/line-tool-time-axis-view';
import { TimeAxisView } from '../views/time-axis/time-axis-view';

import { ChartModel } from './chart-model';
import { DataSource } from './data-source';
import { IPriceDataSource } from './iprice-data-source';
import { LineToolOptionsCommon, LineToolOptionsMap, LineToolPartialOptionsMap, LineToolType } from './line-tool-options';
import { Pane, PaneCursorType } from './pane';
import { Point } from './point';
import { PriceScale } from './price-scale';
import { UTCTimestamp } from './time-data';
import { TimeScale } from './time-scale';

export interface LineToolPoint {
	price: number;
	timestamp: UTCTimestamp;
}

export interface State<T extends LineToolType = LineToolType> {
	id: string;
	type: LineToolType;
	options: LineToolOptionsInternal<T>;
}

export interface LineToolHitTestData {
	pointIndex: number;
	cursorType: PaneCursorType;
}

export type LineToolOptionsInternal<T extends LineToolType = LineToolType> = LineToolOptionsMap[T];
export type LineToolPartialOptionsInternal<T extends LineToolType = LineToolType> = LineToolPartialOptionsMap[T];

export abstract class LineTool<T extends LineToolType = LineToolType> extends DataSource implements IDestroyable {
	protected _pointChanged: Delegate = new Delegate();
	protected _pointAdded: Delegate = new Delegate();
	protected _priceAxisViews: PriceAxisView[] = [];
	protected _timeAxisViews: TimeAxisView[] = [];
	protected _paneViews: IUpdatablePaneView[] = [];

	protected readonly _options: LineToolOptionsInternal<T>;
	protected readonly _toolType!: T;

	protected _hovered: boolean = false;
	protected _selected: boolean = false;
	protected _editing: boolean = false;

	protected _ownerSource: IPriceDataSource | null;
	protected _points: LineToolPoint[] = [];
	protected _lastPoint?: LineToolPoint;
	protected _model: ChartModel;

	public constructor(model: ChartModel, options: LineToolOptionsInternal<T>, points: LineToolPoint[] = []) {
		super();
		this._model = model;
		this._points = points;
		this._options = options;

		for (let i = 0; i < this.pointsCount(); i++) {
			this._priceAxisViews.push(new LineToolPriceAxisView(this, i));
			this._timeAxisViews.push(new LineToolTimeAxisView(this, i));
		}
		// TODO: iosif change to use the ownerSourceId
		// this._ownerSource = model.serieses().find((series: IPriceDataSource) => series.id() === this._options.ownerSourceId) || null;
		this._ownerSource = model.serieses()[0];
	}

	public abstract pointsCount(): number;

	public points(): LineToolPoint[] {
		return [...this._points, ...(this._lastPoint ? [this._lastPoint] : [])];
	}

	public setPoints(points: LineToolPoint[], silent?: boolean): void {
		this._points = points;
		if (silent) { return; }

		this._paneViews.forEach((paneView: IUpdatablePaneView) => {
			paneView.update('data');
		});

		const sourcePane = this.model().paneForSource(this);
		this.model().recalculatePane(sourcePane);
		this.model().updateSource(this);
		this.model().lightUpdate();
	}

	public pointToScreenPoint(linePoint: LineToolPoint): Point | null {
		const baseValue = this.ownerSource()?.firstValue()?.value || 0;
		const priceScale = this.priceScale();
		const timeScale = this.timeScale();

		if (!priceScale || priceScale.isEmpty() || timeScale.isEmpty()) {
			return null;
		}

		const x = timeScale.timeToCoordinate({ timestamp: linePoint.timestamp });
		const y = priceScale.priceToCoordinate(linePoint.price, baseValue);

		return new Point(x, y);
	}

	public screenPointToPoint(point: Point): LineToolPoint | null {
		const baseValue = this.ownerSource()?.firstValue()?.value || 0;
		const priceScale = this.priceScale();
		const timeScale = this.timeScale();

		if (!priceScale) {
			return null;
		}

		const price = priceScale.coordinateToPrice(point.y, baseValue);
		const timestamp = timeScale.coordinateToTime(point.x).timestamp;

		return { price, timestamp };
	}

	public state(): State<T> {
		return { id: this.id(), type: this._toolType, options: this._options };
	}

	public override priceScale(): PriceScale | null {
		// TODO: iosif update to use the onwer source price scale
		return this._model.panes()[0].rightPriceScale();
		// return this._ownerSource ? this._ownerSource.priceScale() : null;
	}

	public timeScale(): TimeScale {
		return this._model.timeScale();
	}

	public ownerSource(): IPriceDataSource | null {
		return this._ownerSource;
	}

	public options(): LineToolOptionsInternal<T> {
		return this._options;
	}

	public applyOptions(options: LineToolPartialOptionsInternal<T> | DeepPartial<LineToolOptionsCommon>): void {
		merge(this._options, options);
		this.model().updateSource(this);

		this._paneViews.forEach((paneView: IUpdatablePaneView) => {
			paneView.update('options');
		});
	}

	public paneViews(pane?: Pane): readonly IPaneView[] {
		return this._paneViews;
	}

	public updateAllViews(): void {
		if (!this.options().visible) { return; }
		this._updateAllPaneViews();

		for (let i = 0; i < this._priceAxisViews.length; i++) {
			this._priceAxisViews[i].update();
		}

		for (let i = 0; i < this._timeAxisViews.length; i++) {
			this._timeAxisViews[i].update();
		}
	}

	public hovered(): boolean {
		return this._hovered;
	}

	public setHovered(hovered: boolean): boolean {
		const changed = hovered !== this._hovered;
		this._hovered = hovered;
		return changed;
	}

	public selected(): boolean {
		return this._selected;
	}

	public setSelected(selected: boolean): boolean {
		const changed = selected !== this._selected;
		this._selected = selected;

		this.updateAllViews();
		return changed;
	}

	public editing(): boolean {
		return this._editing;
	}

	public setEditing(editing: boolean): boolean {
		const changed = editing !== this._editing;
		this._editing = editing;
		return changed;
	}

	public model(): ChartModel {
		return this._model;
	}

	public toolType(): T {
		return this._toolType;
	}

	public destroy(): void {}

	public timeAxisPoints(): LineToolPoint[] {
		return this.points();
	}

	public priceAxisPoints(): LineToolPoint[] {
		return this.points();
	}

	public override timeAxisViews(): readonly ITimeAxisView[] {
		return this._timeAxisViews;
	}

	public override priceAxisViews(): readonly IPriceAxisView[] {
		return this._priceAxisViews;
	}

	protected _setPaneViews(paneViews: IUpdatablePaneView[]): void {
		this._paneViews = paneViews;
	}

	protected _updateAllPaneViews(): void {
		this._paneViews.forEach((paneView: IUpdatablePaneView) => {
			paneView.update();
		});
	}
}
