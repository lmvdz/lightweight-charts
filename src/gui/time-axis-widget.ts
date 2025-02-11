import { Binding as CanvasCoordinateSpaceBinding } from 'fancy-canvas/coordinate-space';

import { clearRect, drawScaled } from '../helpers/canvas-helpers';
import { Delegate } from '../helpers/delegate';
import { IDestroyable } from '../helpers/idestroyable';
import { ISubscription } from '../helpers/isubscription';
import { makeFont } from '../helpers/make-font';

import { CanvasRenderParams } from '../model/canvas-render-params';
import { IDataSource } from '../model/idata-source';
import { InvalidationLevel } from '../model/invalidate-mask';
import { LayoutOptionsInternal } from '../model/layout-options';
import { TextWidthCache } from '../model/text-width-cache';
import { TickMarkWeight } from '../model/time-data';
import { TimeMark } from '../model/time-scale';
import { TimeAxisViewRendererOptions } from '../renderers/itime-axis-view-renderer';

import { createBoundCanvas, getContext2D, Size } from './canvas-utils';
import { ChartWidget } from './chart-widget';
import { MouseEventHandler, MouseEventHandlers, MouseEventHandlerTouchEvent, TouchMouseEvent } from './mouse-event-handler';
import { PriceAxisStub, PriceAxisStubParams } from './price-axis-stub';

const enum Constants {
	BorderSize = 1,
	TickLength = 3,
}

const enum CursorType {
	Default,
	EwResize,
}

function markWithGreaterWeight(a: TimeMark, b: TimeMark): TimeMark {
	return a.weight > b.weight ? a : b;
}

export class TimeAxisWidget implements MouseEventHandlers, IDestroyable {
	private readonly _chart: ChartWidget;
	private readonly _options: LayoutOptionsInternal;
	private readonly _element: HTMLElement;
	private readonly _leftStubCell: HTMLElement;
	private readonly _rightStubCell: HTMLElement;
	private readonly _cell: HTMLElement;
	private readonly _dv: HTMLElement;
	private readonly _canvasBinding: CanvasCoordinateSpaceBinding;
	private readonly _topCanvasBinding: CanvasCoordinateSpaceBinding;
	private _leftStub: PriceAxisStub | null = null;
	private _rightStub: PriceAxisStub | null = null;
	private readonly _mouseEventHandler: MouseEventHandler;
	private _rendererOptions: TimeAxisViewRendererOptions | null = null;
	private _mouseDown: boolean = false;
	private _size: Size = new Size(0, 0);
	private readonly _sizeChanged: Delegate<Size> = new Delegate();
	private readonly _widthCache: TextWidthCache = new TextWidthCache(5);
	private _isSettingSize: boolean = false;

	public constructor(chartWidget: ChartWidget) {
		this._chart = chartWidget;
		this._options = chartWidget.options().layout;

		this._element = document.createElement('tr');

		this._leftStubCell = document.createElement('td');
		this._leftStubCell.style.padding = '0';

		this._rightStubCell = document.createElement('td');
		this._rightStubCell.style.padding = '0';

		this._cell = document.createElement('td');
		this._cell.style.height = '25px';
		this._cell.style.padding = '0';

		this._dv = document.createElement('div');
		this._dv.style.width = '100%';
		this._dv.style.height = '100%';
		this._dv.style.position = 'relative';
		this._dv.style.overflow = 'hidden';
		this._cell.appendChild(this._dv);

		this._canvasBinding = createBoundCanvas(this._dv, new Size(16, 16));
		this._canvasBinding.subscribeCanvasConfigured(this._canvasConfiguredHandler);
		const canvas = this._canvasBinding.canvas;
		canvas.style.position = 'absolute';
		canvas.style.zIndex = '1';
		canvas.style.left = '0';
		canvas.style.top = '0';

		this._topCanvasBinding = createBoundCanvas(this._dv, new Size(16, 16));
		this._topCanvasBinding.subscribeCanvasConfigured(this._topCanvasConfiguredHandler);
		const topCanvas = this._topCanvasBinding.canvas;
		topCanvas.style.position = 'absolute';
		topCanvas.style.zIndex = '2';
		topCanvas.style.left = '0';
		topCanvas.style.top = '0';

		this._element.appendChild(this._leftStubCell);
		this._element.appendChild(this._cell);
		this._element.appendChild(this._rightStubCell);

		this._recreateStubs();
		this._chart.model().priceScalesOptionsChanged().subscribe(this._recreateStubs.bind(this), this);

		this._mouseEventHandler = new MouseEventHandler(
			this._topCanvasBinding.canvas,
			this,
			{
				treatVertTouchDragAsPageScroll: () => true,
				treatHorzTouchDragAsPageScroll: () => false,
			}
		);
	}

	public destroy(): void {
		this._mouseEventHandler.destroy();
		if (this._leftStub !== null) {
			this._leftStub.destroy();
		}
		if (this._rightStub !== null) {
			this._rightStub.destroy();
		}

		this._topCanvasBinding.unsubscribeCanvasConfigured(this._topCanvasConfiguredHandler);
		this._topCanvasBinding.destroy();

		this._canvasBinding.unsubscribeCanvasConfigured(this._canvasConfiguredHandler);
		this._canvasBinding.destroy();
	}

	public getElement(): HTMLElement {
		return this._element;
	}

	public leftStub(): PriceAxisStub | null {
		return this._leftStub;
	}

	public rightStub(): PriceAxisStub | null {
		return this._rightStub;
	}

	public mouseDownEvent(event: TouchMouseEvent): void {
		if (this._mouseDown) {
			return;
		}

		this._mouseDown = true;
		const model = this._chart.model();
		if (model.timeScale().isEmpty() || !this._chart.options().handleScale.axisPressedMouseMove.time) {
			return;
		}

		model.startScaleTime(event.localX);
	}

	public touchStartEvent(event: MouseEventHandlerTouchEvent): void {
		this.mouseDownEvent(event);
	}

	public mouseDownOutsideEvent(): void {
		const model = this._chart.model();
		if (!model.timeScale().isEmpty() && this._mouseDown) {
			this._mouseDown = false;
			if (this._chart.options().handleScale.axisPressedMouseMove.time) {
				model.endScaleTime();
			}
		}
	}

	public pressedMouseMoveEvent(event: TouchMouseEvent): void {
		const model = this._chart.model();
		if (model.timeScale().isEmpty() || !this._chart.options().handleScale.axisPressedMouseMove.time) {
			return;
		}

		model.scaleTimeTo(event.localX);
	}

	public touchMoveEvent(event: MouseEventHandlerTouchEvent): void {
		this.pressedMouseMoveEvent(event);
	}

	public mouseUpEvent(): void {
		this._mouseDown = false;
		const model = this._chart.model();
		if (model.timeScale().isEmpty() && !this._chart.options().handleScale.axisPressedMouseMove.time) {
			return;
		}

		model.endScaleTime();
	}

	public touchEndEvent(): void {
		this.mouseUpEvent();
	}

	public mouseDoubleClickEvent(): void {
		if (this._chart.options().handleScale.axisDoubleClickReset) {
			this._chart.model().resetTimeScale();
		}
	}

	public doubleTapEvent(): void {
		this.mouseDoubleClickEvent();
	}

	public mouseEnterEvent(): void {
		if (this._chart.model().options().handleScale.axisPressedMouseMove.time) {
			this._setCursor(CursorType.EwResize);
		}
	}

	public mouseLeaveEvent(): void {
		this._setCursor(CursorType.Default);
	}

	public getSize(): Readonly<Size> {
		return this._size;
	}

	public sizeChanged(): ISubscription<Size> {
		return this._sizeChanged;
	}

	public setSizes(timeAxisSize: Size, leftStubWidth: number, rightStubWidth: number): void {
		if (!this._size || !this._size.equals(timeAxisSize)) {
			this._size = timeAxisSize;

			this._isSettingSize = true;
			this._canvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });
			this._topCanvasBinding.resizeCanvas({ width: timeAxisSize.w, height: timeAxisSize.h });
			this._isSettingSize = false;

			this._cell.style.minWidth = timeAxisSize.w + 'px';
			this._cell.style.width = timeAxisSize.w + 'px';
			this._cell.style.height = timeAxisSize.h + 'px';

			this._sizeChanged.fire(timeAxisSize);
		}

		if (this._leftStub !== null) {
			this._leftStub.setSize(new Size(leftStubWidth, timeAxisSize.h));
		}
		if (this._rightStub !== null) {
			this._rightStub.setSize(new Size(rightStubWidth, timeAxisSize.h));
		}
	}

	public optimalHeight(): number {
		const rendererOptions = this._getRendererOptions();
		return Math.ceil(
			// rendererOptions.offsetSize +
			rendererOptions.borderSize +
			rendererOptions.tickLength +
			rendererOptions.fontSize +
			rendererOptions.paddingTop +
			rendererOptions.paddingBottom
		);
	}

	public update(): void {
		// this call has side-effect - it regenerates marks on the time scale
		this._chart.model().timeScale().marks();
	}

	public getImage(): HTMLCanvasElement {
		return this._canvasBinding.canvas;
	}

	public paint(type: InvalidationLevel): void {
		if (type === InvalidationLevel.None) {
			return;
		}

		if (type !== InvalidationLevel.Cursor) {
			const ctx = getContext2D(this._canvasBinding.canvas);
			const renderParams = this._chart.paneWidgets()[0].canvasRenderParams(this._canvasBinding);

			this._drawBackground(ctx, renderParams);
			this._drawBorder(ctx, renderParams);

			this._drawSources(this._chart.model().dataSources(), ctx, renderParams, true);
			this._drawTickMarks(ctx, renderParams);
			this._drawSources(this._chart.model().dataSources(), ctx, renderParams);

			if (this._leftStub !== null) {
				this._leftStub.paint(type);
			}
			if (this._rightStub !== null) {
				this._rightStub.paint(type);
			}
		}

		const topCtx = getContext2D(this._topCanvasBinding.canvas);
		const renderParams = this._chart.paneWidgets()[0].canvasRenderParams(this._topCanvasBinding);
		const pixelRatio = this._topCanvasBinding.pixelRatio;

		topCtx.clearRect(0, 0, Math.ceil(this._size.w * pixelRatio), Math.ceil(this._size.h * pixelRatio));
		this._drawSources([this._chart.model().crosshairSource()], topCtx, renderParams);
	}

	private _drawBackground(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		drawScaled(ctx, renderParams.pixelRatio, () => {
			clearRect(ctx, 0, 0, this._size.w, this._size.h, this._chart.model().backgroundBottomColor());
		});
	}

	private _drawBorder(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		if (this._chart.options().timeScale.borderVisible) {
			ctx.save();

			ctx.fillStyle = this._lineColor();

			const pixelRatio = renderParams.pixelRatio;
			const borderSize = Math.max(1, Math.floor(this._getRendererOptions().borderSize * pixelRatio));

			ctx.fillRect(0, 0, Math.ceil(this._size.w * pixelRatio), borderSize);
			ctx.restore();
		}
	}

	private _drawTickMarks(ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams): void {
		const tickMarks = this._chart.model().timeScale().marks();

		if (!tickMarks || tickMarks.length === 0) {
			return;
		}

		const pixelRatio = renderParams.pixelRatio;
		let maxWeight = tickMarks.reduce(markWithGreaterWeight, tickMarks[0]).weight;

		// special case: it looks strange if 15:00 is bold but 14:00 is not
		// so if maxWeight > TickMarkWeight.Hour1 and < TickMarkWeight.Day reduce it to TickMarkWeight.Hour1
		if (maxWeight > TickMarkWeight.Hour1 && maxWeight < TickMarkWeight.Day) {
			maxWeight = TickMarkWeight.Hour1;
		}

		ctx.save();

		ctx.strokeStyle = this._lineColor();

		const rendererOptions = this._getRendererOptions();
		const yText = (
			rendererOptions.borderSize +
			rendererOptions.tickLength +
			rendererOptions.paddingTop +
			rendererOptions.fontSize -
			rendererOptions.baselineOffset
		);

		ctx.textAlign = 'center';
		ctx.fillStyle = this._lineColor();

		const borderSize = Math.floor(this._getRendererOptions().borderSize * pixelRatio);
		const tickWidth = Math.max(1, Math.floor(pixelRatio));
		const tickOffset = Math.floor(pixelRatio * 0.5);

		if (this._chart.model().timeScale().options().borderVisible) {
			ctx.beginPath();
			const tickLen = Math.round(rendererOptions.tickLength * pixelRatio);
			for (let index = tickMarks.length; index--;) {
				const x = Math.round(tickMarks[index].coord * pixelRatio);
				ctx.rect(x - tickOffset, borderSize, tickWidth, tickLen);
			}

			ctx.fill();
		}

		ctx.fillStyle = this._textColor();

		drawScaled(ctx, renderParams.pixelRatio, () => {
			// draw base marks
			ctx.font = this._baseFont();
			for (const tickMark of tickMarks) {
				if (tickMark.weight < maxWeight) {
					const coordinate = tickMark.needAlignCoordinate ? this._alignTickMarkLabelCoordinate(ctx, tickMark.coord, tickMark.label) : tickMark.coord;
					ctx.fillText(tickMark.label, coordinate, yText);
				}
			}
			ctx.font = this._baseBoldFont();
			for (const tickMark of tickMarks) {
				if (tickMark.weight >= maxWeight) {
					const coordinate = tickMark.needAlignCoordinate ? this._alignTickMarkLabelCoordinate(ctx, tickMark.coord, tickMark.label) : tickMark.coord;
					ctx.fillText(tickMark.label, coordinate, yText);
				}
			}
		});

		ctx.restore();
	}

	private _alignTickMarkLabelCoordinate(ctx: CanvasRenderingContext2D, coordinate: number, labelText: string): number {
		const labelWidth = this._widthCache.measureText(ctx, labelText);
		const labelWidthHalf = labelWidth / 2;
		const leftTextCoordinate = Math.floor(coordinate - labelWidthHalf) + 0.5;

		if (leftTextCoordinate < 0) {
			coordinate = coordinate + Math.abs(0 - leftTextCoordinate);
		} else if (leftTextCoordinate + labelWidth > this._size.w) {
			coordinate = coordinate - Math.abs(this._size.w - (leftTextCoordinate + labelWidth));
		}

		return coordinate;
	}

	private _drawSources(sources: readonly IDataSource[], ctx: CanvasRenderingContext2D, renderParams: CanvasRenderParams, background?: boolean): void {
		const rendererOptions = this._getRendererOptions();
		for (const source of sources) {
			for (const view of source.timeAxisViews()) {
				const renderer = view.renderer();
				ctx.save();

				if (background && renderer.drawBackground) {
					renderer.drawBackground(ctx, rendererOptions, renderParams);
				} else if (renderer.draw) {
					renderer.draw(ctx, rendererOptions, renderParams);
				}

				ctx.restore();
			}
		}
	}

	private _lineColor(): string {
		return this._chart.options().timeScale.borderColor;
	}

	private _textColor(): string {
		return this._options.textColor;
	}

	private _fontSize(): number {
		return this._options.fontSize;
	}

	private _baseFont(): string {
		return makeFont(this._fontSize(), this._options.fontFamily);
	}

	private _baseBoldFont(): string {
		return makeFont(this._fontSize(), this._options.fontFamily, 'bold');
	}

	private _getRendererOptions(): Readonly<TimeAxisViewRendererOptions> {
		if (this._rendererOptions === null) {
			this._rendererOptions = {
				borderSize: Constants.BorderSize,
				baselineOffset: NaN,
				paddingTop: NaN,
				paddingBottom: NaN,
				paddingHorizontal: NaN,
				tickLength: Constants.TickLength,
				fontSize: NaN,
				font: '',
				widthCache: new TextWidthCache(),
			};
		}

		const rendererOptions = this._rendererOptions;
		const newFont = this._baseFont();

		if (rendererOptions.font !== newFont) {
			const fontSize = this._fontSize();
			rendererOptions.fontSize = fontSize;
			rendererOptions.font = newFont;
			rendererOptions.paddingTop = Math.ceil(fontSize / 2.5);
			rendererOptions.paddingBottom = rendererOptions.paddingTop;
			rendererOptions.paddingHorizontal = Math.ceil(fontSize / 2);
			rendererOptions.baselineOffset = Math.round(this._fontSize() / 5);
			rendererOptions.widthCache.reset();
		}

		return this._rendererOptions;
	}

	private _setCursor(type: CursorType): void {
		this._cell.style.cursor = type === CursorType.EwResize ? 'ew-resize' : 'default';
	}

	private _recreateStubs(): void {
		const model = this._chart.model();
		const options = model.options();
		if (!options.leftPriceScale.visible && this._leftStub !== null) {
			this._leftStubCell.removeChild(this._leftStub.getElement());
			this._leftStub.destroy();
			this._leftStub = null;
		}
		if (!options.rightPriceScale.visible && this._rightStub !== null) {
			this._rightStubCell.removeChild(this._rightStub.getElement());
			this._rightStub.destroy();
			this._rightStub = null;
		}
		const rendererOptionsProvider = this._chart.model().rendererOptionsProvider();
		const params: PriceAxisStubParams = {
			rendererOptionsProvider: rendererOptionsProvider,
		};

		const borderVisibleGetter = () => {
			return options.leftPriceScale.borderVisible && model.timeScale().options().borderVisible;
		};

		const bottomColorGetter = () => model.backgroundBottomColor();

		if (options.leftPriceScale.visible && this._leftStub === null) {
			this._leftStub = new PriceAxisStub('left', options, params, borderVisibleGetter, bottomColorGetter);
			this._leftStubCell.appendChild(this._leftStub.getElement());
		}
		if (options.rightPriceScale.visible && this._rightStub === null) {
			this._rightStub = new PriceAxisStub('right', options, params, borderVisibleGetter, bottomColorGetter);
			this._rightStubCell.appendChild(this._rightStub.getElement());
		}
	}

	private readonly _canvasConfiguredHandler = () => {
		if (!this._isSettingSize) {
			this._chart.model().lightUpdate();
		}
	};

	private readonly _topCanvasConfiguredHandler = () => {
		if (!this._isSettingSize) {
			this._chart.model().lightUpdate();
		}
	};
}
