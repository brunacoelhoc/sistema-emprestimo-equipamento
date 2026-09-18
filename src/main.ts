import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet()); // cabecalhos de seguranca HTTP padrao (CSP, X-Frame-Options, etc)
  app.enableCors(); // permite chamadas de origens diferentes (ex: um front-end futuro)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // aplica os @Exclude() dos DTOs de resposta (ex: senha) em qualquer rota
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  // padroniza o formato das respostas de erro (status, mensagem, etc) em portugues
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Empréstimo de Equipamentos')
    .setDescription('API da pré-avaliação: auth, equipamentos e empréstimos')
    .setVersion('1.0')
    .addBearerAuth() // habilita o botao "Authorize" pra colar o JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
