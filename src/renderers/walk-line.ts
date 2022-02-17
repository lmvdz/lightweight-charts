import { SeriesItemsIndexesRange } from '../model/time-data';

import { LineType } from './draw-line';
import { LineItem } from './line-renderer';

/**
 * BEWARE: The method must be called after beginPath and before stroke/fill/closePath/etc
 */
export function walkLine(
	ctx: CanvasRenderingContext2D,
	points: readonly LineItem[],
	lineType: LineType,
	visibleRange: SeriesItemsIndexesRange
): void {
	if (points.length === 0) {
		return;
	}

	const colorUsedMap: Record<string, boolean> = {};

	for (let j = visibleRange.from; j < visibleRange.to; ++j) {
		const currentColor = points[j].color;
		if (colorUsedMap[currentColor || 'undefiend']) {
			continue;
		}

		if (Object.keys(colorUsedMap).length) {
			ctx.stroke();
			ctx.closePath();
			ctx.beginPath();
		}

		const x = points[j].x as number;
		const y = points[j].y as number;
		ctx.moveTo(x, y);

		ctx.strokeStyle = currentColor ?? ctx.strokeStyle;
		colorUsedMap[currentColor || 'undefiend'] = true;

		for (let i = j + 1; i < visibleRange.to; ++i) {
			const currItem = points[i];

			//  x---x---x   or   x---x   o   or   start
			if (points[i - 1].color === currentColor) {
				if (lineType === LineType.WithSteps) {
					const prevY = points[i - 1].y;
					const currX = currItem.x;
					ctx.lineTo(currX, prevY);
				} else if (lineType === LineType.WithStepsUpsideDown) {
					const prevX = points[i - 1].x;
					const currY = currItem.y;
					ctx.lineTo(prevX, currY);
				}

				ctx.lineTo(currItem.x, currItem.y);
			} else {
				ctx.moveTo(currItem.x, currItem.y);
			}
		}
	}
}
