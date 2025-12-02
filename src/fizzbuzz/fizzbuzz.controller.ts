import { Controller, Get, Param } from '@nestjs/common';
import { FizzbuzzService } from './fizzbuzz.service';

@Controller('fizzbuzz')
export class FizzbuzzController {
  constructor(private readonly fizzbuzzService: FizzbuzzService) {}

  @Get(':number')
  fizzbuzz(@Param('number') number: string) {
    return this.fizzbuzzService.fizzbuzz(parseInt(number));
  }
}
