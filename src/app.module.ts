import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { FizzbuzzModule } from './fizzbuzz/fizzbuzz.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User, Product],
      synchronize: true, // Solo para desarrollo, en producción usar migraciones
    }),
    UsersModule,
    ProductsModule,
    FizzbuzzModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
