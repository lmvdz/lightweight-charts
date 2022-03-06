import { IInputEventListener, MouseEventType, TouchMouseEvent } from '../../gui/mouse-event-handler';
import { PaneWidget } from '../../gui/pane-widget';

import { ensureNotNull } from '../../helpers/assertions';

import { BarPrice } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { HitTestResult, HitTestType } from '../../model/hit-test-result';
import { LineTool, LineToolHitTestData, LineToolPoint } from '../../model/line-tool';
import { LineToolType } from '../../model/line-tool-options';
import { Pane, PaneCursorType } from '../../model/pane';
import { Point } from '../../model/point';
import { CompositeRenderer } from '../../renderers/composite-renderer';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import { AnchorPoint, LineAnchorRenderer } from '../../renderers/line-anchor-renderer';

import { IPaneView } from './ipane-view';

export interface CreateAnchorData {
	points: AnchorPoint[];
	pointsCursorType?: PaneCursorType[];
}

export abstract class LineSourcePaneView implements IPaneView, IInputEventListener {
	protected readonly _source: LineTool<LineToolType>;
	protected readonly _model: ChartModel;
	protected _points: AnchorPoint[] = [];

	protected _invalidated: boolean = true;
	protected _lastMovePoint: Point | null = null;
	protected _editedPointIndex: number | null = null;
	protected _lineAnchorRenderers: LineAnchorRenderer[] = [];
	protected _renderer: IPaneRenderer | null = null;

	public constructor(source: LineTool<LineToolType>, model: ChartModel) {
		this._source = source;
		this._model = model;
	}

	public onInputEvent(paneWidget: PaneWidget, eventType: MouseEventType, event?: TouchMouseEvent): void {
		if (!event || !this._renderer || !this._renderer.hitTest) { return; }

		const crossHair = this._model.crosshairSource();
		const appliedPoint = new Point(crossHair.appliedX(), crossHair.appliedY());
		const originPoint = new Point(crossHair.originCoordX(), crossHair.originCoordY());

		const changed = eventType === MouseEventType.PressedMouseMove
			? this._onPressedMouseMove(paneWidget, originPoint, appliedPoint)
			: eventType === MouseEventType.MouseMove
			? this._onMouseMove(paneWidget, originPoint)
			: eventType === MouseEventType.MouseDown
			? this._onMouseDown(paneWidget, originPoint)
			: eventType === MouseEventType.MouseUp
			? this._onMouseUp()
			: false;

		event.consumed ||= this._source.editing();
		if (changed || this._source.hovered() || this._source.editing()) {
			this.updateLineAnchors();
		}
	}

	public renderer(height: number, width: number, pane: Pane): IPaneRenderer | null {
		if (this._invalidated) { this._updateImpl(); }
		return this._renderer;
	}

	public priceToCoordinate(price: BarPrice): Coordinate | null {
		const priceScale = this._source.priceScale();
		const ownerSource = this._source.ownerSource();

		if (priceScale === null) { return null; }

		const basePrice = ownerSource !== null ? ownerSource.firstValue() : null;
		return basePrice === null ? null : priceScale.priceToCoordinate(price, basePrice.value);
	}

	public currentPoint(): Point {
		const crossHair = this._model.crosshairSource();
		return new Point(crossHair.originCoordX(), crossHair.originCoordY());
	}

	public editedPointIndex(): number | null {
		return this._editedPointIndex;
	}

	public areAnchorsVisible(): boolean {
		return (this._source.hovered() || this._source.selected() || this._source.editing());
	}

	public update(): void {
		this._invalidated = true;
	}

	public addAnchors(renderer: CompositeRenderer): void {
		renderer.append(this.createLineAnchor({ points: this._points }, 0));
	}

	public updateLineAnchors(): void {
		this._lineAnchorRenderers.forEach((renderer: LineAnchorRenderer) => {
			renderer.updateData({
				points: this._points,
				selected: this._source.selected(),
				visible: this.areAnchorsVisible(),
				currentPoint: this.currentPoint(),
				editedPointIndex: this._editedPointIndex,
			});
		});
		this._model.updateSource(this._source);
	}

	public createLineAnchor(data: CreateAnchorData, index: number): LineAnchorRenderer {
		const renderer = this._getLineAnchorRenderer(index);
		renderer.setData({
			...data,
			radius: 6,
			strokeWidth: 2,
			color: '#1E53E5',
			selectedStrokeWidth: 4,
			selected: this._source.selected(),
			visible: this.areAnchorsVisible(),
			currentPoint: this.currentPoint(),
			backgroundColors: this._lineAnchorColors(data.points),
			editedPointIndex: this._source.editing() ? this.editedPointIndex() : null,
			hitTestType: HitTestType.CHANGEPOINT,
		});

		return renderer;
	}

	protected _onMouseUp(): boolean {
		if (this._source.editing()) {
			this._model.magnet().disable();
			this._updateSourcePoints();
			this._editedPointIndex = null;
			this._source.setEditing(false);
			return true;
		}
		return false;
	}

	protected _onPressedMouseMove(paneWidget: PaneWidget, originPoint: Point, appliedPoint: Point): boolean {
		if (!this._source.editing()) {
			const hitResult = this._hitTest(paneWidget, originPoint);
			const hitData = hitResult?.data();
			this._source.setEditing(!!hitResult);

			this._lastMovePoint = appliedPoint;
			this._editedPointIndex = hitData?.pointIndex ?? null;

			if (hitData) { this._model.magnet().enable(); }
		} else {
			paneWidget.setCursor(this._editedPointIndex !== null ? PaneCursorType.Default : PaneCursorType.Grabbing);

			if (this._editedPointIndex !== null) {
				this._points[this._editedPointIndex].x = appliedPoint.x;
				this._points[this._editedPointIndex].y = appliedPoint.y;
			} else if (this._lastMovePoint) {
				const diff = appliedPoint.subtract(this._lastMovePoint);
				this._lastMovePoint = appliedPoint;

				this._points.forEach((point: Point) => {
					point.x = (point.x + diff.x) as Coordinate;
					point.y = (point.y + diff.y) as Coordinate;
				});
			}

			this._updateSourcePoints(true);
		}
		return false;
	}

	protected _onMouseMove(paneWidget: PaneWidget, originPoint: Point): boolean {
		const hitResult = this._hitTest(paneWidget, originPoint);
		const changed = this._source.setHovered(hitResult !== null);

		if (this._source.hovered()) {
			paneWidget.setCursor(hitResult?.data()?.cursorType || PaneCursorType.Pointer);
		}
		return changed;
	}

	protected _onMouseDown(paneWidget: PaneWidget, originPoint: Point): boolean {
		const hitResult = this._hitTest(paneWidget, originPoint);
		return this._source.setSelected(hitResult !== null);
	}

	protected _updateSourcePoints(silent?: boolean): void {
		this._source.setPoints(this._points.map((point: Point) => this._source.screenPointToPoint(point) as LineToolPoint), silent);
	}

	protected _hitTest(paneWidget: PaneWidget, point: Point): HitTestResult<LineToolHitTestData> | null {
		if (!this._renderer?.hitTest) { return null; }
		const renderParams = paneWidget.canvasRenderParams();
		return this._renderer.hitTest(point, renderParams) as HitTestResult<LineToolHitTestData> | null;
	}

	protected _lineAnchorColors(points: AnchorPoint[]): string[] {
		const height = ensureNotNull(this._model.paneForSource(this._source)).height();
		return points.map((point: AnchorPoint) => this._model.backgroundColorAtYPercentFromTop(point.y / height));
	}

	protected _updateImpl(): void {
		this._invalidated = false;

		if (this._model.timeScale().isEmpty() || this._source.editing()) {return;}
		if (!this._validatePriceScale()) {return;}

		this._points = [] as AnchorPoint[];
		const sourcePoints = this._source.points();
		for (let i = 0; i < sourcePoints.length; i++) {
			const point = this._source.pointToScreenPoint(sourcePoints[i]) as AnchorPoint;
			if (!point) { return; }
			point.data = i;
			this._points.push(point);
		}
	}

	protected _validatePriceScale(): boolean {
		const priceScale = this._source.priceScale();
		return null !== priceScale && !priceScale.isEmpty();
	}

	protected _getLineAnchorRenderer(index: number): LineAnchorRenderer {
		for (; this._lineAnchorRenderers.length <= index;) {this._lineAnchorRenderers.push(new LineAnchorRenderer());}
		return this._lineAnchorRenderers[index];
	}
}
