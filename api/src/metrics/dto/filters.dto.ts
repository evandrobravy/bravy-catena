import { IsIn, IsOptional, IsString } from 'class-validator';

export class MetricsFilterDto {
  @IsOptional()
  @IsString()
  modelo?: string; // "1 Célula" | "2 Células" | "3 Células"

  @IsOptional()
  @IsIn(['ativo', 'concluido', 'paralisado'])
  macro?: 'ativo' | 'concluido' | 'paralisado';

  @IsOptional()
  @IsString()
  closer?: string;

  @IsOptional()
  @IsString()
  seminario?: string;
}
