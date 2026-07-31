import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MetricsFilterDto } from './filters.dto';

export class DrillQueryDto extends MetricsFilterDto {
  @IsOptional()
  @IsString()
  etapa?: string;

  /** 0 = sem marco (stageDefId null). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(12)
  marcoId?: number;

  @IsOptional()
  @IsString()
  faixa?: string; // envelhecimento/progresso

  @IsOptional()
  @IsIn(['cliente', 'interno', 'orgao_cartorio'])
  origem?: 'cliente' | 'interno' | 'orgao_cartorio';

  @IsOptional()
  @IsString()
  responsavel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bucketDias?: number; // semEvolucao / onboarding > N dias

  @IsOptional()
  @IsString()
  lista?: string;

  @IsOptional()
  @IsIn(['SV', 'Projeto', 'Holding'])
  produto?: 'SV' | 'Projeto' | 'Holding';

  @IsOptional()
  @IsString()
  clientId?: string; // drill aninhado cliente → tarefas

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number; // default 100

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
