import { Module } from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { EnvelhecimentoService } from './envelhecimento.service';
import { ExecutivoService } from './executivo.service';
import { GargalosService } from './gargalos.service';
import { JornadaService } from './jornada.service';
import { MetricsController } from './metrics.controller';
import { ProgressoService } from './progresso.service';
import { ResponsaveisService } from './responsaveis.service';

@Module({
  controllers: [MetricsController],
  providers: [
    ExecutivoService,
    JornadaService,
    EnvelhecimentoService,
    ProgressoService,
    ComercialService,
    GargalosService,
    ResponsaveisService,
  ],
})
export class MetricsModule {}
