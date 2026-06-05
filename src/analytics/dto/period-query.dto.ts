import { IsEnum, IsOptional } from 'class-validator';

/** Periodos predefinidos admitidos por los endpoints de analítica. */
export enum AnalyticsPeriod {
  Day = '24h',
  Week = '7d',
  Month = '30d',
  Quarter = '90d',
}

/** Query de los endpoints: ?period=7d (por defecto 7d). */
export class PeriodQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod, {
    message: 'period debe ser uno de: 24h, 7d, 30d, 90d',
  })
  period: AnalyticsPeriod = AnalyticsPeriod.Week;
}
