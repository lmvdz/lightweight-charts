import { LineTool } from '../../model/line-tool';
import { UTCTimestamp } from '../../model/time-data';

import { TimeAxisLabelView } from './time-axis-label-view';

export class LineToolTimeAxisLabelView extends TimeAxisLabelView {
	protected _source: LineTool;
	protected _pointIndex: number;

	public constructor(lineTool: LineTool, pointIndex: number) {
		super(lineTool.model());
		this._source = lineTool;
		this._pointIndex = pointIndex;
	}

	protected _getBackgroundColor(): string | null {
		return this._source.timeAxisLabelColor();
	}

	protected _getTime(): UTCTimestamp | null {
		const points = this._source.timeAxisPoints();
		return points.length <= this._pointIndex ? null : points[this._pointIndex].timestamp as UTCTimestamp;
	}
}
