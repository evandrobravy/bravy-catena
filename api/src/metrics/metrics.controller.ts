import { Controller, Get, Query } from '@nestjs/common';
import { ComercialService } from './comercial.service';
import { MetricsFilterDto } from './dto/filters.dto';
import { EnvelhecimentoService } from './envelhecimento.service';
import { ExecutivoService } from './executivo.service';
import { GargalosService } from './gargalos.service';
import { JornadaService } from './jornada.service';
import { ProgressoService } from './progresso.service';
import { ResponsaveisService } from './responsaveis.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly executivo: ExecutivoService,
    private readonly jornada: JornadaService,
    private readonly envelhecimento: EnvelhecimentoService,
    private readonly progresso: ProgressoService,
    private readonly comercial: ComercialService,
    private readonly gargalos: GargalosService,
    private readonly responsaveis: ResponsaveisService,
  ) {}

  @Get('executivo')
  getExecutivo(@Query() f: MetricsFilterDto) {
    return this.executivo.get(f);
  }

  @Get('jornada')
  getJornada(@Query() f: MetricsFilterDto) {
    return this.jornada.get(f);
  }

  @Get('envelhecimento')
  getEnvelhecimento(@Query() f: MetricsFilterDto) {
    return this.envelhecimento.get(f);
  }

  @Get('progresso')
  getProgresso(@Query() f: MetricsFilterDto) {
    return this.progresso.get(f);
  }

  @Get('comercial')
  getComercial(@Query() f: MetricsFilterDto) {
    return this.comercial.seminario(f);
  }

  @Get('closer')
  getCloser(@Query() f: MetricsFilterDto) {
    return this.comercial.closer(f);
  }

  @Get('reunioes')
  getReunioes(@Query() f: MetricsFilterDto) {
    return this.comercial.reunioes(f);
  }

  @Get('gargalos')
  getGargalos(@Query() f: MetricsFilterDto) {
    return this.gargalos.get(f);
  }

  @Get('responsaveis')
  getResponsaveis(@Query() f: MetricsFilterDto) {
    return this.responsaveis.get(f);
  }
}
