import { IsEnum, IsOptional, Matches } from 'class-validator';

/** Periodos predefinidos admitidos por los endpoints de analítica. */
export enum AnalyticsPeriod {
  Day = '24h',
  Week = '7d',
  Month = '30d',
  Quarter = '90d',
}

/**
 * Query de los endpoints: `?period=7d` (preset) o `?start=YYYY-MM-DD&end=YYYY-MM-DD`
 * (rango personalizado). Si vienen `start` y `end`, tienen prioridad sobre `period`.
 */
export class PeriodQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod, {
    message: 'period debe ser uno de: 24h, 7d, 30d, 90d',
  })
  period: AnalyticsPeriod = AnalyticsPeriod.Week;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'start debe ser YYYY-MM-DD' })
  start?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'end debe ser YYYY-MM-DD' })
  end?: string;
}
