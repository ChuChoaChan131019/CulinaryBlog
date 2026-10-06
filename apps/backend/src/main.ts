import './tracing';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          type: 'about:blank',
          title: 'Dữ liệu không hợp lệ',
          status: 400,
          detail: 'VALIDATION_ERROR',
          errors: Object.fromEntries(
            errors
              .filter((error) => error.constraints)
              .map((error) => [error.property, Object.values(error.constraints!)]),
          ),
        }),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CulinaryBlog API')
    .setDescription('API cho hệ thống CulinaryBlog')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // PORT (ép cứng trong docker-compose) phải được ưu tiên hơn BACKEND_PORT (chỉ
  // dùng cho cổng host khi chạy ngoài Docker) — nếu không container sẽ lắng
  // nghe nhầm cổng host, khiến Nginx upstream backend:5000 trả 502.
  await app.listen(process.env.PORT ?? process.env.BACKEND_PORT ?? 3000);
}
void bootstrap();
