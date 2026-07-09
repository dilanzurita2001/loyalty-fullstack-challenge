import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Verifica que el servicio y la base de datos estén disponibles' })
  @ApiOkResponse({ description: 'El servicio y la base de datos responden correctamente' })
  @ApiServiceUnavailableResponse({ description: 'No se pudo establecer conexión con la base de datos' })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
