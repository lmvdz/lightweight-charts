/* eslint-disable @typescript-eslint/naming-convention */
import { LineTool } from './line-tool';
import { LineToolType } from './line-tool-options';
import { LineToolTrendLine } from './line-tool-trend-line';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LineTools: Record<LineToolType, new(...args: any) => LineTool<LineToolType>> = {
	Trend: LineToolTrendLine,
};
