import { drawScaled } from '../helpers/canvas-helpers';

import { CanvasRenderParams } from '../model/canvas-render-params';

import { IPriceAxisViewRenderer, PriceAxisViewRendererOptions } from './iprice-axis-view-renderer';

export interface PriceAxisBackgroundRendererData {
	coordinate: number;
	color: string;
	height: number;
	visible: boolean;
}

export class PriceAxisBackgroundRenderer implements IPriceAxisViewRenderer {
	private _data: PriceAxisBackgroundRendererData | null;

	public constructor() {
		this._data = null;
	}

	public setData(data: PriceAxisBackgroundRendererData): void {
		this._data = data;
	}

	public drawBackground(ctx: CanvasRenderingContext2D, rendererOptions: PriceAxisViewRendererOptions, renderParams: CanvasRenderParams): void {
		if (this._data === null || this._data.visible === false) {
			return;
		}

		const { coordinate: y, height, color } = this._data;
		const width = ctx.canvas.clientWidth;

		drawScaled(ctx, renderParams.pixelRatio, () => {
			ctx.fillStyle = color;
			ctx.fillRect(0, y, width, height);
		});
	}
}
