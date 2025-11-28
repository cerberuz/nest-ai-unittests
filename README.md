### Comando para instalar dependnecias del proyecto

`pnpm i`

### Ejecutar las pruebas unitarias

`pnpm test`

### Prompts para presetanción

#### Prompt completo (cobertura exhaustiva)

```
Genera un archivo de pruebas unitarias completo para ProductsService con:
1. Setup con TestingModule y mocks del Repository
2. Tests para create() cubriendo:
   - Creación exitosa con todos los campos
   - Validaciones de categoría, precio premium, stock
   - Aplicación de descuentos automáticos según stock
   - Generación de SKU
3. Tests para findAll() verificando orden por createdAt DESC
4. Tests para findOne() con producto existente y NotFoundException
5. Tests para update() cubriendo:
   - Actualización parcial de campos
   - Recalculo de descuentos al actualizar precio/stock
   - Validaciones al actualizar
6. Tests para remove() con producto existente y NotFoundException
Usa describe/it, beforeEach para setup, y verifica todas las excepciones.
```

#### 2) Prompt para validaciones de negocio

```
Crea pruebas unitarias para ProductsService enfocadas en las validaciones de negocio:
- Validación de categorías permitidas (debe rechazar categorías no permitidas)
- Validación de precio mínimo para categorías premium (electronics, beauty requieren precio >= 50)
- Validación de stock negativo
- Validación de descuentos que resulten en precio <= 0
Incluye casos de éxito y casos que deben lanzar BadRequestException.
```

#### 3) Prompt para lógica de descuentos automáticos

```
Genera pruebas unitarias para la lógica de descuentos automáticos basados en stock:
- Productos con stock >= 500 deben tener 20% de descuento
- Productos con stock >= 100 deben tener 10% de descuento
- Productos con stock < 100 no deben tener descuento
- Verifica que el precio final se calcule correctamente y se redondee a 2 decimales
- Verifica que originalPrice y discountPercentage se guarden correctamente
```

### Some Prompts

#### 1) Prompt inicial (Cobertura básica)

```
Genera pruebas unitarias completas para ProductsService en NestJS usando Jest.
El servicio tiene métodos create, findAll, findOne, update y remove.
Usa mocks para el Repository de TypeORM.
Cubre casos exitosos y de error (NotFoundException, BadRequestException).

```

#### 2) Prompt para validaciones de negocio

```
Crea pruebas unitarias para ProductsService enfocadas en las validaciones de negocio:
- Validación de categorías permitidas (debe rechazar categorías no permitidas)
- Validación de precio mínimo para categorías premium (electronics, beauty requieren precio >= 50)
- Validación de stock negativo
- Validación de descuentos que resulten en precio <= 0
Incluye casos de éxito y casos que deben lanzar BadRequestException.
```

#### 3) Prompt para lógica de descuentos automáticos

```
Genera pruebas unitarias para la lógica de descuentos automáticos basados en stock:
- Productos con stock >= 500 deben tener 20% de descuento
- Productos con stock >= 100 deben tener 10% de descuento
- Productos con stock < 100 no deben tener descuento
- Verifica que el precio final se calcule correctamente y se redondee a 2 decimales
- Verifica que originalPrice y discountPercentage se guarden correctamente
```

#### 4) Prompt para generación de SKU

```
Crea pruebas unitarias para el método privado generateSKU (o prueba su comportamiento a través de create):
- Verifica que el SKU tenga el formato correcto: CATEGORIA-NOMBRE-TIMESTAMP
- Verifica que funcione con nombres cortos y largos
- Verifica que funcione con y sin categoría
- Verifica que los caracteres especiales se eliminen correctamente
```

#### 5) Prompt completo (cobertura exhaustiva)

```
Genera un archivo de pruebas unitarias completo para ProductsService con:
1. Setup con TestingModule y mocks del Repository
2. Tests para create() cubriendo:
   - Creación exitosa con todos los campos
   - Validaciones de categoría, precio premium, stock
   - Aplicación de descuentos automáticos según stock
   - Generación de SKU
3. Tests para findAll() verificando orden por createdAt DESC
4. Tests para findOne() con producto existente y NotFoundException
5. Tests para update() cubriendo:
   - Actualización parcial de campos
   - Recalculo de descuentos al actualizar precio/stock
   - Validaciones al actualizar
6. Tests para remove() con producto existente y NotFoundException
Usa describe/it, beforeEach para setup, y verifica todas las excepciones.
```

#### 6) Prompt para casos edge

```
Crea pruebas unitarias para casos edge y límites en ProductsService:
- Crear producto sin categoría
- Crear producto con stock = 0
- Actualizar solo un campo sin afectar otros
- Actualizar precio de categoría premium a valor menor al mínimo
- Descuentos que resulten en precios muy pequeños pero válidos
- Nombres de productos con caracteres especiales para SKU
```

#### 7) Prompt específico para integración de métodos privados

```
Genera pruebas que validen la integración de los métodos privados de ProductsService:
- validateCategory, validatePremiumPrice, validateStock
- calculateStockDiscount y applyStockDiscount
- validateDiscountResult
Verifica que estos métodos se llamen correctamente desde create() y update()
con los parámetros adecuados usando spies si es necesario.
```

#### 8) Prompt con estructura específica

```
Crea un archivo products.service.spec.ts siguiendo esta estructura:
- Usa @nestjs/testing para TestingModule
- Mock del Repository con jest.fn() para todos los métodos
- Organiza tests con describe blocks por método
- Usa beforeEach para setup común
- Verifica llamadas al repository con expect(mockRepository.method).toHaveBeenCalledWith(...)
- Cobertura mínima del 80%
```

### Recomendación

Empieza con el prompt #5 (completo). Luego usa el #2 (validaciones) y el #3 (descuentos) para profundizar en la lógica de negocio.
