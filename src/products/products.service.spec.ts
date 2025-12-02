/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    stock: 10,
    category: 'electronics',
    imageUrl: 'http://example.com/image.jpg',
    sku: 'ELE-TEST-123456',
    originalPrice: 100,
    discountPercentage: 0,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================
  // Tests para create()
  // =========================================
  describe('create', () => {
    describe('successful creation', () => {
      it('should create a product with all fields', async () => {
        const createProductDto: CreateProductDto = {
          name: 'New Product',
          description: 'New Description',
          price: 100,
          stock: 10,
          category: 'electronics',
          imageUrl: 'http://example.com/image.jpg',
        };

        mockRepository.create.mockReturnValue(mockProduct);
        mockRepository.save.mockResolvedValue(mockProduct);

        const result = await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockProduct);
      });

      it('should create a product with default stock of 0 when not provided', async () => {
        const createProductDto: CreateProductDto = {
          name: 'New Product',
          price: 100,
          category: 'books',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ stock: 0 }),
        );
        expect(result.stock).toBe(0);
      });

      it('should create a product without category (uses GEN prefix for SKU)', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Generic Product',
          price: 25,
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            sku: expect.stringMatching(/^GEN-GENE-\d{6}$/),
          }),
        );
      });
    });

    describe('SKU generation', () => {
      it('should generate SKU with category prefix and name prefix', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Laptop Gaming',
          price: 1000,
          category: 'electronics',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            sku: expect.stringMatching(/^ELE-LAPT-\d{6}$/),
          }),
        );
      });

      it('should pad short names with X', async () => {
        const createProductDto: CreateProductDto = {
          name: 'TV',
          price: 500,
          category: 'electronics',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            sku: expect.stringMatching(/^ELE-TVXX-\d{6}$/),
          }),
        );
      });
    });

    describe('category validation', () => {
      it('should throw BadRequestException for invalid category', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Test Product',
          price: 100,
          category: 'invalid_category',
        };

        await expect(service.create(createProductDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(createProductDto)).rejects.toThrow(
          /Categoría 'invalid_category' no permitida/,
        );
      });

      it('should accept valid categories (case insensitive)', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Test Product',
          price: 100,
          category: 'ELECTRONICS',
        };

        mockRepository.create.mockReturnValue(mockProduct);
        mockRepository.save.mockResolvedValue(mockProduct);

        await expect(service.create(createProductDto)).resolves.not.toThrow();
      });
    });

    describe('premium price validation', () => {
      it('should throw BadRequestException for electronics with price below $50', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Cheap Electronics',
          price: 30,
          category: 'electronics',
        };

        await expect(service.create(createProductDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(createProductDto)).rejects.toThrow(
          /requieren un precio mínimo de \$50/,
        );
      });

      it('should throw BadRequestException for beauty with price below $50', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Cheap Beauty',
          price: 25,
          category: 'beauty',
        };

        await expect(service.create(createProductDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should allow non-premium categories with any price', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Cheap Book',
          price: 5,
          category: 'books',
        };

        mockRepository.create.mockReturnValue(mockProduct);
        mockRepository.save.mockResolvedValue(mockProduct);

        await expect(service.create(createProductDto)).resolves.not.toThrow();
      });
    });

    describe('stock validation', () => {
      it('should throw BadRequestException for negative stock', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Test Product',
          price: 100,
          stock: -5,
          category: 'books',
        };

        await expect(service.create(createProductDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(createProductDto)).rejects.toThrow(
          /El stock no puede ser negativo/,
        );
      });
    });

    describe('automatic stock discounts', () => {
      it('should apply 10% discount when stock >= 100', async () => {
        const createProductDto: CreateProductDto = {
          name: 'High Stock Product',
          price: 100,
          stock: 150,
          category: 'books',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalPrice: 100,
            price: 90,
            discountPercentage: 10,
          }),
        );
      });

      it('should apply 20% discount when stock >= 500', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Very High Stock Product',
          price: 100,
          stock: 600,
          category: 'books',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalPrice: 100,
            price: 80,
            discountPercentage: 20,
          }),
        );
      });

      it('should not apply discount when stock < 100', async () => {
        const createProductDto: CreateProductDto = {
          name: 'Low Stock Product',
          price: 100,
          stock: 50,
          category: 'books',
        };

        mockRepository.create.mockImplementation((data) => ({
          ...mockProduct,
          ...data,
        }));
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        await service.create(createProductDto);

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalPrice: 100,
            price: 100,
            discountPercentage: 0,
          }),
        );
      });
    });
  });

  // =========================================
  // Tests para findAll()
  // =========================================
  describe('findAll', () => {
    it('should return an array of products ordered by createdAt DESC', async () => {
      const products = [
        { ...mockProduct, id: 2, createdAt: new Date('2024-01-02') },
        { ...mockProduct, id: 1, createdAt: new Date('2024-01-01') },
      ];

      mockRepository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(products);
    });

    it('should return empty array when no products exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // =========================================
  // Tests para findOne()
  // =========================================
  describe('findOne', () => {
    it('should return a product when it exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });
  });

  // =========================================
  // Tests para update()
  // =========================================
  describe('update', () => {
    describe('partial updates', () => {
      it('should update only the name of a product', async () => {
        const updateProductDto: UpdateProductDto = {
          name: 'Updated Name',
        };

        mockRepository.findOne.mockResolvedValue({ ...mockProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.name).toBe('Updated Name');
      });

      it('should update only the description of a product', async () => {
        const updateProductDto: UpdateProductDto = {
          description: 'Updated Description',
        };

        mockRepository.findOne.mockResolvedValue({ ...mockProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.description).toBe('Updated Description');
      });
    });

    describe('discount recalculation on price/stock update', () => {
      it('should recalculate discount when stock is updated to >= 100', async () => {
        const existingProduct = {
          ...mockProduct,
          stock: 50,
          price: 100,
          originalPrice: 100,
          discountPercentage: 0,
        };

        const updateProductDto: UpdateProductDto = {
          stock: 150,
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.price).toBe(90);
        expect(result.discountPercentage).toBe(10);
      });

      it('should recalculate discount when stock is updated to >= 500', async () => {
        const existingProduct = {
          ...mockProduct,
          stock: 50,
          price: 100,
          originalPrice: 100,
          discountPercentage: 0,
        };

        const updateProductDto: UpdateProductDto = {
          stock: 500,
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.price).toBe(80);
        expect(result.discountPercentage).toBe(20);
      });

      it('should recalculate discount when price is updated', async () => {
        const existingProduct = {
          ...mockProduct,
          stock: 150,
          price: 90,
          originalPrice: 100,
          discountPercentage: 10,
        };

        const updateProductDto: UpdateProductDto = {
          price: 200,
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.originalPrice).toBe(200);
        expect(result.price).toBe(180);
        expect(result.discountPercentage).toBe(10);
      });

      it('should remove discount when stock drops below 100', async () => {
        const existingProduct = {
          ...mockProduct,
          stock: 150,
          price: 90,
          originalPrice: 100,
          discountPercentage: 10,
        };

        const updateProductDto: UpdateProductDto = {
          stock: 50,
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });
        mockRepository.save.mockImplementation((product) =>
          Promise.resolve(product),
        );

        const result = await service.update(1, updateProductDto);

        expect(result.price).toBe(100);
        expect(result.discountPercentage).toBe(0);
      });
    });

    describe('validations on update', () => {
      it('should throw BadRequestException for negative stock on update', async () => {
        const updateProductDto: UpdateProductDto = {
          stock: -10,
        };

        mockRepository.findOne.mockResolvedValue({ ...mockProduct });

        await expect(service.update(1, updateProductDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.update(1, updateProductDto)).rejects.toThrow(
          /El stock no puede ser negativo/,
        );
      });

      it('should throw BadRequestException for invalid category on update', async () => {
        const updateProductDto: UpdateProductDto = {
          category: 'invalid',
        };

        mockRepository.findOne.mockResolvedValue({ ...mockProduct });

        await expect(service.update(1, updateProductDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException when updating electronics price below $50', async () => {
        const existingProduct = {
          ...mockProduct,
          category: 'electronics',
        };

        const updateProductDto: UpdateProductDto = {
          price: 30,
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });

        await expect(service.update(1, updateProductDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException when changing to premium category with low price', async () => {
        const existingProduct = {
          ...mockProduct,
          category: 'books',
          price: 30,
        };

        const updateProductDto: UpdateProductDto = {
          category: 'electronics',
        };

        mockRepository.findOne.mockResolvedValue({ ...existingProduct });

        await expect(service.update(1, updateProductDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException when product does not exist', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  // =========================================
  // Tests para remove()
  // =========================================
  describe('remove', () => {
    it('should remove a product when it exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.remove.mockResolvedValue(mockProduct);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });
  });
});
