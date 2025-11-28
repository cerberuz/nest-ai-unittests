import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  // Categorías permitidas
  private readonly ALLOWED_CATEGORIES = [
    'electronics',
    'clothing',
    'food',
    'books',
    'toys',
    'sports',
    'home',
    'beauty',
  ];

  // Categorías premium que requieren precio mínimo
  private readonly PREMIUM_CATEGORIES = ['electronics', 'beauty'];
  private readonly PREMIUM_MIN_PRICE = 50;

  // Umbrales de stock para aplicar descuentos
  private readonly HIGH_STOCK_THRESHOLD = 100;
  private readonly VERY_HIGH_STOCK_THRESHOLD = 500;
  private readonly HIGH_STOCK_DISCOUNT = 10; // 10%
  private readonly VERY_HIGH_STOCK_DISCOUNT = 20; // 20%

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Genera un SKU único basado en el nombre y categoría del producto
   */
  private generateSKU(name: string, category?: string): string {
    const namePrefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4)
      .padEnd(4, 'X');

    const categoryPrefix = category
      ? category.toUpperCase().substring(0, 3).padEnd(3, 'X')
      : 'GEN';

    const timestamp = Date.now().toString().slice(-6);

    return `${categoryPrefix}-${namePrefix}-${timestamp}`;
  }

  /**
   * Valida que la categoría esté en la lista de categorías permitidas
   */
  private validateCategory(category?: string): void {
    if (category && !this.ALLOWED_CATEGORIES.includes(category.toLowerCase())) {
      throw new BadRequestException(
        `Categoría '${category}' no permitida. Categorías permitidas: ${this.ALLOWED_CATEGORIES.join(', ')}`,
      );
    }
  }

  /**
   * Valida el precio para categorías premium
   */
  private validatePremiumPrice(
    category: string | undefined,
    price: number,
  ): void {
    if (category && this.PREMIUM_CATEGORIES.includes(category.toLowerCase())) {
      if (price < this.PREMIUM_MIN_PRICE) {
        throw new BadRequestException(
          `Los productos de la categoría '${category}' requieren un precio mínimo de $${this.PREMIUM_MIN_PRICE}`,
        );
      }
    }
  }

  /**
   * Valida que el stock no sea negativo
   */
  private validateStock(stock: number | undefined): void {
    if (stock !== undefined && stock < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }
  }

  /**
   * Valida que el descuento no resulte en un precio negativo o cero
   */
  private validateDiscountResult(
    originalPrice: number,
    finalPrice: number,
    discountPercentage: number,
  ): void {
    if (finalPrice <= 0) {
      throw new BadRequestException(
        `El descuento del ${discountPercentage}% no puede resultar en un precio menor o igual a cero. Precio original: $${originalPrice}`,
      );
    }
    if (finalPrice > originalPrice) {
      throw new BadRequestException(
        `El precio final ($${finalPrice}) no puede ser mayor al precio original ($${originalPrice})`,
      );
    }
  }

  /**
   * Calcula el descuento automático basado en el stock
   */
  private calculateStockDiscount(stock: number): number {
    if (stock >= this.VERY_HIGH_STOCK_THRESHOLD) {
      return this.VERY_HIGH_STOCK_DISCOUNT;
    } else if (stock >= this.HIGH_STOCK_THRESHOLD) {
      return this.HIGH_STOCK_DISCOUNT;
    }
    return 0;
  }

  /**
   * Aplica descuento al precio si el stock es alto
   */
  private applyStockDiscount(
    price: number,
    stock: number,
  ): {
    finalPrice: number;
    discountPercentage: number;
  } {
    const discount = this.calculateStockDiscount(stock);

    if (discount > 0) {
      const finalPrice = price * (1 - discount / 100);
      return {
        finalPrice: Math.round(finalPrice * 100) / 100, // Redondear a 2 decimales
        discountPercentage: discount,
      };
    }

    return {
      finalPrice: price,
      discountPercentage: 0,
    };
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const stock = createProductDto.stock ?? 0;
    const category = createProductDto.category?.toLowerCase();

    // Validaciones de negocio
    this.validateCategory(createProductDto.category);
    this.validatePremiumPrice(category, createProductDto.price);
    this.validateStock(createProductDto.stock);

    // Generar SKU único
    const sku = this.generateSKU(createProductDto.name, category);

    // Aplicar descuentos automáticos basados en stock
    const { finalPrice, discountPercentage } = this.applyStockDiscount(
      createProductDto.price,
      stock,
    );

    // Validar que el descuento no resulte en precio negativo o cero
    this.validateDiscountResult(
      createProductDto.price,
      finalPrice,
      discountPercentage,
    );

    // Crear el producto con toda la lógica aplicada
    const product = this.productRepository.create({
      ...createProductDto,
      category: category,
      stock,
      sku,
      originalPrice: createProductDto.price,
      price: finalPrice,
      discountPercentage,
    });

    return await this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Validar stock negativo si se está actualizando
    if (updateProductDto.stock !== undefined) {
      this.validateStock(updateProductDto.stock);
    }

    // Validar categoría si se está actualizando
    if (updateProductDto.category !== undefined) {
      this.validateCategory(updateProductDto.category);
    }

    // Validar precio premium si se está actualizando categoría o precio
    if (
      updateProductDto.category !== undefined ||
      updateProductDto.price !== undefined
    ) {
      const category =
        updateProductDto.category?.toLowerCase() ||
        product.category?.toLowerCase();
      const price = updateProductDto.price ?? product.price;
      this.validatePremiumPrice(category, price);
    }

    // Si se actualiza precio o stock, recalcular descuentos
    if (
      updateProductDto.price !== undefined ||
      updateProductDto.stock !== undefined
    ) {
      const newPrice =
        updateProductDto.price ?? product.originalPrice ?? product.price;
      const newStock = updateProductDto.stock ?? product.stock;

      const { finalPrice, discountPercentage } = this.applyStockDiscount(
        newPrice,
        newStock,
      );

      // Validar que el descuento no resulte en precio negativo o cero
      this.validateDiscountResult(newPrice, finalPrice, discountPercentage);

      Object.assign(product, {
        ...updateProductDto,
        originalPrice: newPrice,
        price: finalPrice,
        discountPercentage,
      });
    } else {
      Object.assign(product, updateProductDto);
    }

    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
