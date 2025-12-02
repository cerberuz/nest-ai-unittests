import { Test, TestingModule } from '@nestjs/testing';
import { FizzbuzzService } from './fizzbuzz.service';

describe('FizzbuzzService', () => {
  let service: FizzbuzzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FizzbuzzService],
    }).compile();

    service = module.get<FizzbuzzService>(FizzbuzzService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fizzbuzz', () => {
    it('should return "FizzBuzz" when number is divisible by 3 and 5', () => {
      expect(service.fizzbuzz(15)).toBe('FizzBuzz');
      expect(service.fizzbuzz(30)).toBe('FizzBuzz');
      expect(service.fizzbuzz(45)).toBe('FizzBuzz');
    });

    it('should return "Fizz" when number is divisible only by 3', () => {
      expect(service.fizzbuzz(3)).toBe('Fizz');
      expect(service.fizzbuzz(6)).toBe('Fizz');
      expect(service.fizzbuzz(9)).toBe('Fizz');
    });

    it('should return "Buzz" when number is divisible only by 5', () => {
      expect(service.fizzbuzz(5)).toBe('Buzz');
      expect(service.fizzbuzz(10)).toBe('Buzz');
      expect(service.fizzbuzz(20)).toBe('Buzz');
    });

    it('should return the number as string when not divisible by 3 or 5', () => {
      expect(service.fizzbuzz(1)).toBe('1');
      expect(service.fizzbuzz(2)).toBe('2');
      expect(service.fizzbuzz(7)).toBe('7');
      expect(service.fizzbuzz(11)).toBe('11');
    });
  });
});
