import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        credentials: true,
    });

    await app.listen(3001);
    console.log(`🚀 Backend running on http://localhost:3001`);
}
bootstrap();
