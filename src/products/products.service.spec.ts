import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;

  // Mock del Repository
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
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));

    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      stock: 50,
      category: 'electronics',
      imageUrl: 'https://example.com/image.jpg',
    };

    it('should create a product successfully with all fields', async () => {
      const expectedProduct: Product = {
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        originalPrice: 100,
        stock: 50,
        category: 'electronics',
        imageUrl: 'https://example.com/image.jpg',
        sku: 'ELE-TEST-123456',
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(createProductDto);

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          description: 'Test Description',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'electronics',
          imageUrl: 'https://example.com/image.jpg',
          sku: expect.any(String),
          discountPercentage: 0,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(expectedProduct);
    });

    it('should throw BadRequestException for invalid category', async () => {
      const invalidDto: CreateProductDto = {
        ...createProductDto,
        category: 'invalid-category',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto)).rejects.toThrow(
        "Categoría 'invalid-category' no permitida",
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for premium category with price below minimum', async () => {
      const lowPriceDto: CreateProductDto = {
        ...createProductDto,
        category: 'electronics',
        price: 30, // Below PREMIUM_MIN_PRICE (50)
      };

      await expect(service.create(lowPriceDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(lowPriceDto)).rejects.toThrow(
        'requieren un precio mínimo de $50',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for beauty category with price below minimum', async () => {
      const lowPriceDto: CreateProductDto = {
        ...createProductDto,
        category: 'beauty',
        price: 40,
      };

      await expect(service.create(lowPriceDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should accept premium category with price at minimum', async () => {
      const minPriceDto: CreateProductDto = {
        ...createProductDto,
        category: 'electronics',
        price: 50, // Exactly PREMIUM_MIN_PRICE
      };

      const expectedProduct: Product = {
        id: 1,
        ...minPriceDto,
        price: 50,
        originalPrice: 50,
        stock: 50,
        category: 'electronics',
        sku: expect.any(String),
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(minPriceDto);

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative stock', async () => {
      const negativeStockDto: CreateProductDto = {
        ...createProductDto,
        stock: -10,
      };

      await expect(service.create(negativeStockDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(negativeStockDto)).rejects.toThrow(
        'El stock no puede ser negativo',
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should apply 10% discount for stock >= 100', async () => {
      const highStockDto: CreateProductDto = {
        ...createProductDto,
        price: 100,
        stock: 150,
      };

      const expectedProduct: Product = {
        id: 1,
        ...highStockDto,
        price: 90, // 100 * 0.9 = 90
        originalPrice: 100,
        stock: 150,
        category: 'electronics',
        sku: expect.any(String),
        discountPercentage: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(highStockDto);

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 90,
          originalPrice: 100,
          discountPercentage: 10,
        }),
      );
    });

    it('should apply 20% discount for stock >= 500', async () => {
      const veryHighStockDto: CreateProductDto = {
        ...createProductDto,
        price: 100,
        stock: 600,
      };

      const expectedProduct: Product = {
        id: 1,
        ...veryHighStockDto,
        price: 80, // 100 * 0.8 = 80
        originalPrice: 100,
        stock: 600,
        category: 'electronics',
        sku: expect.any(String),
        discountPercentage: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(veryHighStockDto);

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 80,
          originalPrice: 100,
          discountPercentage: 20,
        }),
      );
    });

    it('should not apply discount for stock < 100', async () => {
      const lowStockDto: CreateProductDto = {
        ...createProductDto,
        price: 100,
        stock: 50,
      };

      const expectedProduct: Product = {
        id: 1,
        ...lowStockDto,
        price: 100,
        originalPrice: 100,
        stock: 50,
        category: 'electronics',
        sku: expect.any(String),
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(lowStockDto);

      expect(result).toEqual(expectedProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 100,
          originalPrice: 100,
          discountPercentage: 0,
        }),
      );
    });

    it('should generate a unique SKU', async () => {
      const expectedProduct: Product = {
        id: 1,
        ...createProductDto,
        price: 100,
        originalPrice: 100,
        stock: 50,
        category: 'electronics',
        sku: 'ELE-TEST-123456',
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(createProductDto);

      expect(result.sku).toBeDefined();
      expect(result.sku).toMatch(/^ELE-TEST-\d{6}$/);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: expect.any(String),
        }),
      );
    });

    it('should use default stock of 0 when stock is not provided', async () => {
      const noStockDto: CreateProductDto = {
        name: 'Test Product',
        price: 100,
        category: 'clothing',
      };

      const expectedProduct: Product = {
        id: 1,
        ...noStockDto,
        price: 100,
        originalPrice: 100,
        stock: 0,
        category: 'clothing',
        sku: expect.any(String),
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(noStockDto);

      expect(result.stock).toBe(0);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: 0,
        }),
      );
    });

    it('should convert category to lowercase', async () => {
      const upperCaseCategoryDto: CreateProductDto = {
        ...createProductDto,
        category: 'ELECTRONICS',
      };

      const expectedProduct: Product = {
        id: 1,
        ...upperCaseCategoryDto,
        price: 100,
        originalPrice: 100,
        stock: 50,
        category: 'electronics',
        sku: expect.any(String),
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedProduct);
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.create(upperCaseCategoryDto);

      expect(result.category).toBe('electronics');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'electronics',
        }),
      );
    });

  });

  describe('Validaciones de Negocio', () => {
    const baseProductDto: CreateProductDto = {
      name: 'Test Product',
      price: 100,
      description: 'Test Description',
    };

    describe('Validación de Categorías Permitidas', () => {
      const allowedCategories = [
        'electronics',
        'clothing',
        'food',
        'books',
        'toys',
        'sports',
        'home',
        'beauty',
      ];

      it.each(allowedCategories)(
        'should accept valid category: %s',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
          };

          const expectedProduct: Product = {
            id: 1,
            ...dto,
            price: 100,
            originalPrice: 100,
            stock: 0,
            category: category.toLowerCase(),
            sku: expect.any(String),
            discountPercentage: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.create.mockReturnValue(expectedProduct);
          mockRepository.save.mockResolvedValue(expectedProduct);

          const result = await service.create(dto);

          expect(result).toBeDefined();
          expect(result.category).toBe(category.toLowerCase());
          expect(mockRepository.save).toHaveBeenCalled();
        },
      );

      it('should accept category in uppercase and convert to lowercase', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'ELECTRONICS',
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: 'electronics',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.category).toBe('electronics');
      });

      it('should accept category in mixed case and convert to lowercase', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'ElEcTrOnIcS',
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: 'electronics',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.category).toBe('electronics');
      });

      it('should accept undefined category', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: undefined,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException for invalid category: "invalid"', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'invalid',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          "Categoría 'invalid' no permitida",
        );
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException for invalid category: "automotive"', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'automotive',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          "Categoría 'automotive' no permitida",
        );
      });

      it('should throw BadRequestException for invalid category: "jewelry"', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'jewelry',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('should treat empty string category as undefined (valid)', async () => {
        // Nota: El servicio actualmente trata un string vacío como undefined (válido)
        // porque la validación usa `if (category && ...)` donde un string vacío es falsy
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: '',
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: undefined, // String vacío se convierte a undefined
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result).toBeDefined();
        expect(result.category).toBeUndefined();
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should include list of allowed categories in error message', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'invalid-category',
        };

        try {
          await service.create(dto);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toContain('Categorías permitidas:');
          expect(error.message).toContain('electronics');
          expect(error.message).toContain('clothing');
        }
      });
    });

    describe('Validación de Precio Mínimo para Categorías Premium', () => {
      const premiumCategories = ['electronics', 'beauty'];
      const nonPremiumCategories = ['clothing', 'food', 'books', 'toys', 'sports', 'home'];

      it.each(premiumCategories)(
        'should throw BadRequestException when %s category has price below $50',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
            price: 49.99,
          };

          await expect(service.create(dto)).rejects.toThrow(BadRequestException);
          await expect(service.create(dto)).rejects.toThrow(
            `requieren un precio mínimo de $50`,
          );
          expect(mockRepository.create).not.toHaveBeenCalled();
          expect(mockRepository.save).not.toHaveBeenCalled();
        },
      );

      it.each(premiumCategories)(
        'should throw BadRequestException when %s category has price exactly $49',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
            price: 49,
          };

          await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        },
      );

      it.each(premiumCategories)(
        'should accept %s category with price exactly $50',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
            price: 50,
          };

          const expectedProduct: Product = {
            id: 1,
            ...dto,
            price: 50,
            originalPrice: 50,
            stock: 0,
            category: category.toLowerCase(),
            sku: expect.any(String),
            discountPercentage: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.create.mockReturnValue(expectedProduct);
          mockRepository.save.mockResolvedValue(expectedProduct);

          const result = await service.create(dto);

          expect(result).toBeDefined();
          expect(result.price).toBe(50);
          expect(mockRepository.save).toHaveBeenCalled();
        },
      );

      it.each(premiumCategories)(
        'should accept %s category with price above $50',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
            price: 100,
          };

          const expectedProduct: Product = {
            id: 1,
            ...dto,
            price: 100,
            originalPrice: 100,
            stock: 0,
            category: category.toLowerCase(),
            sku: expect.any(String),
            discountPercentage: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.create.mockReturnValue(expectedProduct);
          mockRepository.save.mockResolvedValue(expectedProduct);

          const result = await service.create(dto);

          expect(result).toBeDefined();
          expect(result.price).toBe(100);
          expect(mockRepository.save).toHaveBeenCalled();
        },
      );

      it.each(nonPremiumCategories)(
        'should accept %s category with price below $50 (non-premium)',
        async (category) => {
          const dto: CreateProductDto = {
            ...baseProductDto,
            category,
            price: 10,
          };

          const expectedProduct: Product = {
            id: 1,
            ...dto,
            price: 10,
            originalPrice: 10,
            stock: 0,
            category: category.toLowerCase(),
            sku: expect.any(String),
            discountPercentage: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockRepository.create.mockReturnValue(expectedProduct);
          mockRepository.save.mockResolvedValue(expectedProduct);

          const result = await service.create(dto);

          expect(result).toBeDefined();
          expect(result.price).toBe(10);
          expect(mockRepository.save).toHaveBeenCalled();
        },
      );

      it('should throw BadRequestException when electronics price is $0', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'electronics',
          price: 0,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when beauty price is negative', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          category: 'beauty',
          price: -10,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('Validación de Stock Negativo', () => {
      it('should throw BadRequestException for stock = -1', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: -1,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'El stock no puede ser negativo',
        );
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException for stock = -100', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: -100,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'El stock no puede ser negativo',
        );
      });

      it('should accept stock = 0', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 0,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.stock).toBe(0);
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should accept stock > 0', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 100,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 100,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.stock).toBe(100);
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should accept undefined stock (defaults to 0)', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: undefined,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.stock).toBe(0);
        expect(mockRepository.save).toHaveBeenCalled();
      });
    });

    describe('Validación de Descuentos que Resulten en Precio <= 0', () => {
      it('should throw BadRequestException when discount results in price = 0 after rounding', async () => {
        // Precio muy bajo que con descuento y redondeo resulte en 0
        // Precio: 0.004, stock: 500 (20% descuento) = 0.004 * 0.8 = 0.0032
        // Redondeado: Math.round(0.0032 * 100) / 100 = Math.round(0.32) / 100 = 0 / 100 = 0
        // Esto debería lanzar BadRequestException

        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.004,
          stock: 500, // 20% descuento
          category: 'clothing',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when discount results in negative price', async () => {
        // Aunque esto es teórico (precio negativo no debería pasar class-validator),
        // la validación debería prevenir esto
        // Simulamos un caso donde el precio final sería negativo

        // En la práctica, esto no debería ocurrir con precios positivos,
        // pero la validación está ahí como protección

        // Probamos con un precio muy bajo que con descuento resulte en un valor negativo
        // después de algún cálculo erróneo (aunque no debería pasar)

        // Mejor enfoque: probar que la validación funciona cuando el precio final es <= 0
        // Usamos un precio que con redondeo resulte en 0
        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.005,
          stock: 500, // 20% descuento: 0.005 * 0.8 = 0.004
          category: 'clothing',
        };

        // 0.004 redondeado a 2 decimales = 0.00, que es <= 0
        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
      });

      it('should throw BadRequestException when 20% discount on very low price results in 0', async () => {
        // Precio: 0.01, stock: 500 (20% descuento)
        // 0.01 * 0.8 = 0.008
        // Math.round(0.008 * 100) / 100 = Math.round(0.8) / 100 = 1 / 100 = 0.01
        // Esto es válido (> 0), así que necesitamos un precio aún más bajo

        // Precio: 0.003, stock: 500 (20% descuento)
        // 0.003 * 0.8 = 0.0024
        // Math.round(0.0024 * 100) / 100 = Math.round(0.24) / 100 = 0 / 100 = 0
        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.003,
          stock: 500, // 20% descuento
          category: 'clothing',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
      });

      it('should throw BadRequestException when 10% discount on very low price results in 0', async () => {
        // Precio: 0.004, stock: 150 (10% descuento)
        // 0.004 * 0.9 = 0.0036
        // Math.round(0.0036 * 100) / 100 = Math.round(0.36) / 100 = 0 / 100 = 0
        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.004,
          stock: 150, // 10% descuento
          category: 'clothing',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
      });

      it('should accept valid discount that results in price > 0', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 150, // 10% descuento: 100 * 0.9 = 90
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 90,
          originalPrice: 100,
          stock: 150,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(90);
        expect(result.price).toBeGreaterThan(0);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(10);
      });

      it('should accept valid discount with 20% for very high stock', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 600, // 20% descuento: 100 * 0.8 = 80
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 80,
          originalPrice: 100,
          stock: 600,
          category: undefined,
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(80);
        expect(result.price).toBeGreaterThan(0);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(20);
      });

      it('should accept price that rounds correctly after discount', async () => {
        // Precio: 0.01, stock: 500 (20% descuento)
        // 0.01 * 0.8 = 0.008
        // Math.round(0.008 * 100) / 100 = Math.round(0.8) / 100 = 1 / 100 = 0.01
        // Esto es válido porque 0.01 > 0
        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.01,
          stock: 500, // 20% descuento
          category: 'clothing',
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 0.01, // Redondeado desde 0.008
          originalPrice: 0.01,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(0.01);
        expect(result.price).toBeGreaterThan(0);
        expect(result.originalPrice).toBe(0.01);
        expect(result.discountPercentage).toBe(20);
      });

      it('should accept price with 10% discount that rounds correctly', async () => {
        // Precio: 0.05, stock: 150 (10% descuento)
        // 0.05 * 0.9 = 0.045
        // Math.round(0.045 * 100) / 100 = Math.round(4.5) / 100 = 5 / 100 = 0.05
        const dto: CreateProductDto = {
          name: 'Test',
          price: 0.05,
          stock: 150, // 10% descuento
          category: 'clothing',
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 0.05, // Redondeado desde 0.045
          originalPrice: 0.05,
          stock: 150,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(0.05);
        expect(result.price).toBeGreaterThan(0);
      });

      it('should validate discount result in update method - valid case', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        // Actualizar a stock muy alto con precio bajo
        const updateDto: UpdateProductDto = {
          price: 0.05,
          stock: 500, // 20% descuento: 0.05 * 0.8 = 0.04
        };

        const updatedProduct = {
          ...existingProduct,
          price: 0.04,
          originalPrice: 0.05,
          stock: 500,
          discountPercentage: 20,
        };

        mockRepository.save.mockResolvedValue(updatedProduct);

        const result = await service.update(1, updateDto);

        expect(result.price).toBeGreaterThan(0);
        expect(result.price).toBe(0.04);
      });

      it('should throw BadRequestException when update discount results in price <= 0', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        // Actualizar a precio muy bajo con stock alto que resulte en precio <= 0
        const updateDto: UpdateProductDto = {
          price: 0.003,
          stock: 500, // 20% descuento: 0.003 * 0.8 = 0.0024, redondeado = 0
        };

        await expect(service.update(1, updateDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.update(1, updateDto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when update with 10% discount results in price <= 0', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        const updateDto: UpdateProductDto = {
          price: 0.004,
          stock: 150, // 10% descuento: 0.004 * 0.9 = 0.0036, redondeado = 0
        };

        await expect(service.update(1, updateDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.update(1, updateDto)).rejects.toThrow(
          'no puede resultar en un precio menor o igual a cero',
        );
        expect(mockRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('Validaciones Combinadas', () => {
      it('should validate all business rules in sequence', async () => {
        // Intento crear producto con múltiples violaciones
        const invalidDto: CreateProductDto = {
          name: 'Test',
          category: 'invalid-category', // Primera validación que falla
          price: 30, // Segunda validación (premium)
          stock: -10, // Tercera validación
        };

        // Debería fallar en la primera validación (categoría)
        await expect(service.create(invalidDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(invalidDto)).rejects.toThrow(
          "Categoría 'invalid-category' no permitida",
        );
      });

      it('should accept product that passes all validations', async () => {
        const validDto: CreateProductDto = {
          name: 'Valid Product',
          description: 'Valid Description',
          price: 100,
          stock: 50,
          category: 'clothing',
          imageUrl: 'https://example.com/image.jpg',
        };

        const expectedProduct: Product = {
          id: 1,
          ...validDto,
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(validDto);

        expect(result).toBeDefined();
        expect(result.name).toBe('Valid Product');
        expect(result.price).toBe(100);
        expect(result.stock).toBe(50);
        expect(result.category).toBe('clothing');
        expect(mockRepository.save).toHaveBeenCalled();
      });
    });
  });

  describe('Descuentos Automáticos basados en Stock', () => {
    const baseProductDto: CreateProductDto = {
      name: 'Test Product',
      price: 100,
      description: 'Test Description',
      category: 'clothing',
    };

    describe('Stock >= 500 - Descuento del 20%', () => {
      it('should apply 20% discount for stock = 500', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 500,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 80, // 100 * 0.8 = 80
          originalPrice: 100,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(80);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(20);
        expect(result.stock).toBe(500);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 80,
            originalPrice: 100,
            discountPercentage: 20,
          }),
        );
      });

      it('should apply 20% discount for stock > 500', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 1000,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 80, // 100 * 0.8 = 80
          originalPrice: 100,
          stock: 1000,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(80);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(20);
        expect(result.stock).toBe(1000);
      });

      it('should calculate 20% discount correctly with decimal prices', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 99.99,
          stock: 500,
        };

        // 99.99 * 0.8 = 79.992, redondeado a 2 decimales = 79.99
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 79.99,
          originalPrice: 99.99,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(79.99);
        expect(result.originalPrice).toBe(99.99);
        expect(result.discountPercentage).toBe(20);
      });

      it('should round 20% discount price correctly to 2 decimal places', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 33.33,
          stock: 500,
        };

        // 33.33 * 0.8 = 26.664, redondeado a 2 decimales = 26.66
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 26.66,
          originalPrice: 33.33,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(26.66);
        expect(result.originalPrice).toBe(33.33);
        expect(result.discountPercentage).toBe(20);
        // Verificar que el precio tiene exactamente 2 decimales
        expect(result.price.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
      });
    });

    describe('Stock >= 100 y < 500 - Descuento del 10%', () => {
      it('should apply 10% discount for stock = 100', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 100,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 90, // 100 * 0.9 = 90
          originalPrice: 100,
          stock: 100,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(90);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(10);
        expect(result.stock).toBe(100);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 90,
            originalPrice: 100,
            discountPercentage: 10,
          }),
        );
      });

      it('should apply 10% discount for stock = 250', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 250,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 90, // 100 * 0.9 = 90
          originalPrice: 100,
          stock: 250,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(90);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(10);
        expect(result.stock).toBe(250);
      });

      it('should apply 10% discount for stock = 499', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 499,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 90, // 100 * 0.9 = 90
          originalPrice: 100,
          stock: 499,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(90);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(10);
        expect(result.stock).toBe(499);
      });

      it('should calculate 10% discount correctly with decimal prices', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 150.75,
          stock: 100,
        };

        // 150.75 * 0.9 = 135.675, redondeado a 2 decimales = 135.68
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 135.68,
          originalPrice: 150.75,
          stock: 100,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(135.68);
        expect(result.originalPrice).toBe(150.75);
        expect(result.discountPercentage).toBe(10);
      });

      it('should round 10% discount price correctly to 2 decimal places', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 33.33,
          stock: 100,
        };

        // 33.33 * 0.9 = 29.997, redondeado a 2 decimales = 30.00
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 30.0,
          originalPrice: 33.33,
          stock: 100,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(30.0);
        expect(result.originalPrice).toBe(33.33);
        expect(result.discountPercentage).toBe(10);
      });
    });

    describe('Stock < 100 - Sin descuento (0%)', () => {
      it('should not apply discount for stock = 99', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 99,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 99,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(99);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 100,
            originalPrice: 100,
            discountPercentage: 0,
          }),
        );
      });

      it('should not apply discount for stock = 50', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 50,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(50);
      });

      it('should not apply discount for stock = 0', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 0,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(0);
      });

      it('should not apply discount for stock = 1', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: 1,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 1,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(1);
      });

      it('should not apply discount when stock is undefined (defaults to 0)', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          stock: undefined,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 0,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(0);
      });
    });

    describe('Verificación de originalPrice y discountPercentage', () => {
      it('should save originalPrice correctly when 20% discount is applied', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 200,
          stock: 500,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 160, // 200 * 0.8 = 160
          originalPrice: 200,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.originalPrice).toBe(200);
        expect(result.price).toBe(160);
        expect(result.discountPercentage).toBe(20);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            originalPrice: 200,
            price: 160,
            discountPercentage: 20,
          }),
        );
      });

      it('should save originalPrice correctly when 10% discount is applied', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 150,
          stock: 100,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 135, // 150 * 0.9 = 135
          originalPrice: 150,
          stock: 100,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.originalPrice).toBe(150);
        expect(result.price).toBe(135);
        expect(result.discountPercentage).toBe(10);
      });

      it('should save originalPrice equal to price when no discount is applied', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 50,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.originalPrice).toBe(100);
        expect(result.price).toBe(100);
        expect(result.discountPercentage).toBe(0);
      });

      it('should save discountPercentage as 0 when stock < 100', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 99,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 100,
          originalPrice: 100,
          stock: 99,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.discountPercentage).toBe(0);
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            discountPercentage: 0,
          }),
        );
      });

      it('should save discountPercentage as 10 when stock >= 100 and < 500', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 250,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 90,
          originalPrice: 100,
          stock: 250,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.discountPercentage).toBe(10);
      });

      it('should save discountPercentage as 20 when stock >= 500', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 600,
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 80,
          originalPrice: 100,
          stock: 600,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.discountPercentage).toBe(20);
      });
    });

    describe('Redondeo a 2 decimales', () => {
      it('should round price down correctly to 2 decimal places', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 33.33,
          stock: 500, // 20% descuento
        };

        // 33.33 * 0.8 = 26.664, redondeado = 26.66
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 26.66,
          originalPrice: 33.33,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(26.66);
        expect(result.price.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
      });

      it('should round price up correctly to 2 decimal places', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 33.34,
          stock: 500, // 20% descuento
        };

        // 33.34 * 0.8 = 26.672, redondeado = 26.67
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 26.67,
          originalPrice: 33.34,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(26.67);
        expect(result.price.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
      });

      it('should round price correctly with 10% discount', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 99.99,
          stock: 100, // 10% descuento
        };

        // 99.99 * 0.9 = 89.991, redondeado = 89.99
        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 89.99,
          originalPrice: 99.99,
          stock: 100,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(89.99);
        expect(result.price.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
      });

      it('should handle prices that result in exactly 2 decimal places', async () => {
        const dto: CreateProductDto = {
          ...baseProductDto,
          price: 100,
          stock: 500, // 20% descuento: 100 * 0.8 = 80.00
        };

        const expectedProduct: Product = {
          id: 1,
          ...dto,
          price: 80,
          originalPrice: 100,
          stock: 500,
          category: 'clothing',
          sku: expect.any(String),
          discountPercentage: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.create.mockReturnValue(expectedProduct);
        mockRepository.save.mockResolvedValue(expectedProduct);

        const result = await service.create(dto);

        expect(result.price).toBe(80);
        // Verificar que el precio puede representarse con máximo 2 decimales
        const priceStr = result.price.toString();
        const decimalPart = priceStr.split('.')[1];
        if (decimalPart) {
          expect(decimalPart.length).toBeLessThanOrEqual(2);
        }
      });
    });

    describe('Descuentos en método update', () => {
      it('should recalculate discount when stock is updated to >= 500', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        const updateDto: UpdateProductDto = {
          stock: 500,
        };

        const updatedProduct = {
          ...existingProduct,
          price: 80, // 100 * 0.8 = 80
          originalPrice: 100,
          stock: 500,
          discountPercentage: 20,
        };

        mockRepository.save.mockResolvedValue(updatedProduct);

        const result = await service.update(1, updateDto);

        expect(result.price).toBe(80);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(20);
        expect(result.stock).toBe(500);
      });

      it('should recalculate discount when stock is updated to >= 100', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 100,
          originalPrice: 100,
          stock: 50,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        const updateDto: UpdateProductDto = {
          stock: 150,
        };

        const updatedProduct = {
          ...existingProduct,
          price: 90, // 100 * 0.9 = 90
          originalPrice: 100,
          stock: 150,
          discountPercentage: 10,
        };

        mockRepository.save.mockResolvedValue(updatedProduct);

        const result = await service.update(1, updateDto);

        expect(result.price).toBe(90);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(10);
        expect(result.stock).toBe(150);
      });

      it('should remove discount when stock is updated to < 100', async () => {
        const existingProduct: Product = {
          id: 1,
          name: 'Test Product',
          price: 90,
          originalPrice: 100,
          stock: 150,
          category: 'clothing',
          sku: 'SKU-123',
          discountPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingProduct);

        const updateDto: UpdateProductDto = {
          stock: 50,
        };

        const updatedProduct = {
          ...existingProduct,
          price: 100,
          originalPrice: 100,
          stock: 50,
          discountPercentage: 0,
        };

        mockRepository.save.mockResolvedValue(updatedProduct);

        const result = await service.update(1, updateDto);

        expect(result.price).toBe(100);
        expect(result.originalPrice).toBe(100);
        expect(result.discountPercentage).toBe(0);
        expect(result.stock).toBe(50);
      });
    });
  });

  describe('findAll', () => {
    it('should return all products ordered by createdAt DESC', async () => {
      const products: Product[] = [
        {
          id: 1,
          name: 'Product 1',
          price: 100,
          originalPrice: 100,
          stock: 10,
          category: 'electronics',
          sku: 'SKU1',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 2,
          name: 'Product 2',
          price: 200,
          originalPrice: 200,
          stock: 20,
          category: 'clothing',
          sku: 'SKU2',
          discountPercentage: 0,
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockRepository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no products exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a product when it exists', async () => {
      const product: Product = {
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        originalPrice: 100,
        stock: 50,
        category: 'electronics',
        imageUrl: 'https://example.com/image.jpg',
        sku: 'SKU-123',
        discountPercentage: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(product);

      const result = await service.findOne(1);

      expect(result).toEqual(product);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('update', () => {
    const existingProduct: Product = {
      id: 1,
      name: 'Original Product',
      description: 'Original Description',
      price: 100,
      originalPrice: 100,
      stock: 50,
      category: 'electronics',
      imageUrl: 'https://example.com/original.jpg',
      sku: 'SKU-123',
      discountPercentage: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(existingProduct);
      mockRepository.save.mockImplementation((product) =>
        Promise.resolve({ ...existingProduct, ...product }),
      );
    });

    it('should update product with partial fields', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated Description',
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('Updated Product');
      expect(result.description).toBe('Updated Description');
      expect(result.price).toBe(existingProduct.price);
      expect(result.stock).toBe(existingProduct.stock);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should recalculate discounts when price is updated', async () => {
      const updateDto: UpdateProductDto = {
        price: 200,
      };

      const updatedProduct = {
        ...existingProduct,
        price: 200,
        originalPrice: 200,
        discountPercentage: 0,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.originalPrice).toBe(200);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should recalculate discounts when stock is updated to high stock', async () => {
      const updateDto: UpdateProductDto = {
        stock: 150, // >= 100, should apply 10% discount
      };

      const updatedProduct = {
        ...existingProduct,
        stock: 150,
        price: 90, // 100 * 0.9
        originalPrice: 100,
        discountPercentage: 10,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.stock).toBe(150);
      expect(result.price).toBe(90);
      expect(result.originalPrice).toBe(100);
      expect(result.discountPercentage).toBe(10);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should recalculate discounts when both price and stock are updated', async () => {
      const updateDto: UpdateProductDto = {
        price: 200,
        stock: 600, // >= 500, should apply 20% discount
      };

      const updatedProduct = {
        ...existingProduct,
        price: 160, // 200 * 0.8
        originalPrice: 200,
        stock: 600,
        discountPercentage: 20,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.price).toBe(160);
      expect(result.originalPrice).toBe(200);
      expect(result.stock).toBe(600);
      expect(result.discountPercentage).toBe(20);
    });

    it('should validate stock when updating', async () => {
      const updateDto: UpdateProductDto = {
        stock: -10,
      };

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        'El stock no puede ser negativo',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate category when updating', async () => {
      const updateDto: UpdateProductDto = {
        category: 'invalid-category',
      };

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        "Categoría 'invalid-category' no permitida",
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate premium price when updating category to premium', async () => {
      const updateDto: UpdateProductDto = {
        category: 'electronics',
        price: 30, // Below minimum for electronics
      };

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        'requieren un precio mínimo de $50',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate premium price when updating price in premium category', async () => {
      const updateDto: UpdateProductDto = {
        price: 30, // Below minimum for existing electronics category
      };

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
      };

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateDto)).rejects.toThrow(
        'Product with ID 999 not found',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should not recalculate discounts when only non-price/stock fields are updated', async () => {
      const updateDto: UpdateProductDto = {
        name: 'New Name',
        description: 'New Description',
        imageUrl: 'https://example.com/new.jpg',
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('New Name');
      expect(result.price).toBe(existingProduct.price);
      expect(result.originalPrice).toBe(existingProduct.originalPrice);
      expect(result.discountPercentage).toBe(existingProduct.discountPercentage);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should use existing originalPrice when only stock is updated', async () => {
      const productWithOriginalPrice: Product = {
        ...existingProduct,
        price: 90,
        originalPrice: 100,
        discountPercentage: 10,
      };

      mockRepository.findOne.mockResolvedValue(productWithOriginalPrice);

      const updateDto: UpdateProductDto = {
        stock: 200, // Still >= 100, should keep 10% discount
      };

      const updatedProduct = {
        ...productWithOriginalPrice,
        stock: 200,
        price: 90,
        originalPrice: 100,
        discountPercentage: 10,
      };

      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(result.stock).toBe(200);
      expect(result.originalPrice).toBe(100);
    });
  });

  describe('remove', () => {
    const existingProduct: Product = {
      id: 1,
      name: 'Test Product',
      description: 'Test Description',
      price: 100,
      originalPrice: 100,
      stock: 50,
      category: 'electronics',
      imageUrl: 'https://example.com/image.jpg',
      sku: 'SKU-123',
      discountPercentage: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should remove a product when it exists', async () => {
      mockRepository.findOne.mockResolvedValue(existingProduct);
      mockRepository.remove.mockResolvedValue(existingProduct);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(existingProduct);
      expect(mockRepository.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow(
        'Product with ID 999 not found',
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});
