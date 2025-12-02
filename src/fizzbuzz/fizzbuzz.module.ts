import { Module } from '@nestjs/common';
import { FizzbuzzService } from './fizzbuzz.service';
import { FizzbuzzController } from './fizzbuzz.controller';

@Module({
  providers: [FizzbuzzService],
  controllers: [FizzbuzzController],
})
export class FizzbuzzModule {}
