import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    category: 'electronics',
    imageUrl: 'http://example.com/image.jpg',
    sku: 'ELE-TEST-123456',
    originalPrice: 99.99,
    discountPercentage: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'New Product',
        description: 'New Description',
        price: 149.99,
        stock: 50,
        category: 'electronics',
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);

      expect(mockProductsService.create).toHaveBeenCalledWith(createProductDto);
      expect(mockProductsService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const products = [mockProduct];
      mockProductsService.findAll.mockResolvedValue(products);

      const result = await controller.findAll();

      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(products);
    });

    it('should return an empty array when no products exist', async () => {
      mockProductsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single product by id', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(1);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(mockProductsService.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        price: 199.99,
      };

      const updatedProduct = { ...mockProduct, ...updateProductDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(1, updateProductDto);

      expect(mockProductsService.update).toHaveBeenCalledWith(
        1,
        updateProductDto,
      );
      expect(mockProductsService.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedProduct);
    });

    it('should update only the stock of a product', async () => {
      const updateProductDto: UpdateProductDto = {
        stock: 100,
      };

      const updatedProduct = { ...mockProduct, stock: 100 };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(1, updateProductDto);

      expect(mockProductsService.update).toHaveBeenCalledWith(
        1,
        updateProductDto,
      );
      expect(result.stock).toBe(100);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(mockProductsService.remove).toHaveBeenCalledWith(1);
      expect(mockProductsService.remove).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });
});
