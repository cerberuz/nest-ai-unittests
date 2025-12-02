import { Injectable } from '@nestjs/common';

@Injectable()
export class FizzbuzzService {
  fizzbuzz(number: number): string {
    if (number % 3 === 0 && number % 5 === 0) {
      return 'FizzBuzz';
    }
    if (number % 3 === 0) {
      return 'Fizz';
    }
    if (number % 5 === 0) {
      return 'Buzz';
    }
    return number.toString();
  }
}
