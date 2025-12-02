import { Test, TestingModule } from '@nestjs/testing';
import { FizzbuzzController } from './fizzbuzz.controller';
import { FizzbuzzService } from './fizzbuzz.service';

describe('FizzbuzzController', () => {
  let controller: FizzbuzzController;
  let service: FizzbuzzService;
  let spy: jest.SpyInstance;
  const mockNumber = 15;
  const mockResult = 'FizzBuzz';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FizzbuzzController],
      providers: [FizzbuzzService],
    }).compile();

    controller = module.get<FizzbuzzController>(FizzbuzzController);
    service = module.get<FizzbuzzService>(FizzbuzzService);
    spy = jest.spyOn(service, 'fizzbuzz').mockReturnValue(mockResult);
  });

  it('should return the correct Fizz buzz word for the given number (using spyOn)', () => {
    const result = controller.fizzbuzz(mockNumber.toString());
    expect(spy).toHaveBeenCalledWith(mockNumber);
    expect(result).toBe(mockResult);
  });
});
