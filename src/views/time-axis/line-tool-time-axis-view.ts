import { LineTool } from '../../model/line-tool';
import { UTCTimestamp } from '../../model/time-data';

import { TimeAxisView } from './time-axis-view';

export class LineToolTimeAxisView extends TimeAxisView { //  extends s.TimeAxisView
	protected _active: boolean = false;
	protected _source: LineTool;
	protected _pointIndex: number;

	public constructor(lineTool: LineTool, pointIndex: number) {
		super(lineTool.model());
		this._active = false;
		this._source = lineTool;
		this._pointIndex = pointIndex;
	}

	public setActive(active: boolean): void {
		this._active = active;
	}

	protected _getBgColor(): string {
		return this._active ? '#143EB3' : '#2962FF';
	}

	protected _getTime(): UTCTimestamp | null {
		if (!this._source.selected()) { return null; }

		const points = this._source.timeAxisPoints();
		return points.length <= this._pointIndex ? null : points[this._pointIndex].timestamp;
	}
}
