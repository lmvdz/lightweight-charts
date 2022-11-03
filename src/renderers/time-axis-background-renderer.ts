import { drawScaled } from '../helpers/canvas-helpers';

import { CanvasRenderParams } from '../model/canvas-render-params';

import { ITimeAxisViewRenderer, TimeAxisViewRendererOptions } from './itime-axis-view-renderer';

export interface TimeAxisBackgroundRendererData {
	coordinate: number;
	color: string;
	width: number;
	visible: boolean;
}

export class TimeAxisBackgroundRenderer implements ITimeAxisViewRenderer {
	private _data: TimeAxisBackgroundRendererData | null;

	public constructor() {
		this._data = null;
	}

	public setData(data: TimeAxisBackgroundRendererData): void {
		this._data = data;
	}

	public drawBackground(ctx: CanvasRenderingContext2D, rendererOptions: TimeAxisViewRendererOptions, renderParams: CanvasRenderParams): void {
		if (this._data === null || this._data.visible === false) {
			return;
		}

		const { coordinate: x, width, color } = this._data;
		const height = ctx.canvas.clientHeight;

		drawScaled(ctx, renderParams.pixelRatio, () => {
			ctx.fillStyle = color;
			ctx.fillRect(x, 0, width, height);
		});
	}
}
