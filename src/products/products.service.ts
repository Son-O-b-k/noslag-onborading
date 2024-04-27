import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CreateProductDto, CreateUploadDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService, PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { ConfigService } from '@nestjs/config';
import { StockDto } from './dto/create-stock.dto';
import { ItemDto, VarianceDto } from './dto/create-variance.dto';
import { CreateItemGroupDto } from './dto/create-itemgroup.dto';
import {
  Category,
  Image,
  ItemGroup,
  Prisma,
  Supplier,
  SupplierType,
  User,
} from '@prisma/client';
import { UpdateStockDto } from './dto/update-stock.dto';
import { DateTime } from 'luxon';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logger: Logger,
  ) {}

  async createProduct(
    userId: number,
    createProductDto: CreateProductDto,
    files: Array<Express.Multer.File>,
    stockDto: StockDto,
    varianceDto: VarianceDto,
    itemDto: ItemDto,
  ) {
    try {
      // Check if the user exists with associated relationship
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const product = await this.prismaService.product.findFirst({
        where: { name: createProductDto.name, companyId },
      });
      if (product) {
        throw new HttpException(
          `Product with name ${createProductDto.name} already exist`,
          HttpStatus.BAD_REQUEST,
        );
      }

      let supplier;
      if (createProductDto.supplierId) {
        //Supplier error check
        supplier = await this.prismaService.supplier.findUnique({
          where: { id: createProductDto.supplierId, companyId },
        });
        if (!supplier) {
          throw new HttpException(
            'Please provide a valid supplier',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      //Warehouse error check
      const warehousePromises = (stockDto.stocks || []).map(async (stock) => {
        const warehouse = await this.prismaService.wareHouse.findFirst({
          where: {
            name: {
              equals: stock.warehouseName.trim(),
              mode: 'insensitive',
            },
            companyId,
          },
        });

        if (!warehouse) {
          throw new HttpException(
            `Warehouse not found for stock with warehouseName: ${stock.warehouseName}`,
            HttpStatus.NOT_FOUND,
          );
        }

        return warehouse;
      });

      const allWarehouses = await Promise.all(warehousePromises);

      let category = await this.prismaService.category.findFirst({
        where: {
          name: {
            equals: createProductDto.categoryName.trim(),
            mode: 'insensitive',
          },
          companyId,
        },
      });

      // If the category doesn't exist, create it
      if (!category) {
        category = await this.prismaService.category.create({
          data: {
            name: createProductDto.categoryName,
            companyId,
          },
        });
      }

      let imagesLinks = null;

      if (files) {
        imagesLinks = await this.cloudinaryService
          .uploadImages(files)
          .catch((error) => {
            throw new HttpException(error, HttpStatus.BAD_REQUEST);
          });
      }

      const stocks = await Promise.all(
        (stockDto.stocks || []).map(async (stock) => {
          // Find the warehouse for the current stock
          const warehouse = await this.prismaService.wareHouse.findFirst({
            where: {
              name: {
                equals: stock.warehouseName.trim(),
                mode: 'insensitive',
              },
              companyId,
            },
          });

          if (!warehouse) {
            throw new HttpException(
              `Warehouse not found for stock with warehouseName: ${stock.warehouseName}`,
              HttpStatus.NOT_FOUND,
            );
          }

          const batchNumber = await this.generateUniqueBatchNumber(
            warehouse.name,
            user.id,
          );

          // Create the stock with connection to the found warehouse
          return await this.prismaService.stock.create({
            data: {
              companyId,
              openingStock: stock.openingStock,
              openingStockValue: stock.openingStockValue,
              batchNumber,
              sales: stock.sales,
              purchase: stock.purchase,
              itemName: stock.itemName.trim(),
              warehouseName: stock.warehouseName.trim(),
              createdBy: user.primaryContactName,
              warehouses: {
                connect: { id: warehouse.id },
              },
            },
          });
        }),
      );
      // Calculate total opening stock value
      const totalOpeningStockValue = stocks.reduce(
        (total, stock) => total + Number(stock.openingStock),
        0,
      );

      // Check if the product has variances
      const createdVariances = [];

      // if (varianceDto.variances?.length) {
      //   // Create an array to store created variances

      //   // Create each variance in the array
      //   for (const varianceItem of varianceDto.variances) {
      //     const variance = await this.prismaService.variance.create({
      //       data: {
      //         attribute: varianceItem.attribute,
      //         options: varianceItem.options,
      //         companyId,
      //       },
      //     });

      //     // Add the created variance to the arrays
      //     createdVariances.push(variance);
      //   }
      // }
      let createdImages;
      if (files) {
        createdImages = await Promise.all(
          imagesLinks?.map(async (file) => {
            return await this.prismaService.image.create({
              data: {
                publicId: file?.public_id,
                url: file?.url,
                companyId,
              },
            });
          }) || [],
        );
      }

      // Create the product and associate it with the item group, variances, images, purchase info, and sales info
      const productItems = itemDto.items || [];

      const productWithGroupAndVariances =
        await this.prismaService.product.create({
          data: {
            companyId,
            name: createProductDto.name,
            unit: createProductDto.unit,
            description: createProductDto.description,
            dimensions: createProductDto.dimensions,
            volume: createProductDto.volume,
            unitType: createProductDto.unitType,
            qtyPKT: createProductDto.qtyPKT,
            weight: createProductDto.weight,
            inventoryTrack: createProductDto.inventoryTrack,
            inventoryAccount: createProductDto.inventoryAccount,
            setInventoryTrack: createProductDto.setInventoryTrack,
            setBaseline: createProductDto.setBaseline,
            baseline: createProductDto.baseline,
            productCode: createProductDto.productCode,
            purchase: createProductDto.purchase,
            sales: createProductDto.sales,
            brand: createProductDto.brand,
            primarySupplier: createProductDto.primarySupplier,
            manufacturer: createProductDto.manufacturer,
            createdBy: user.primaryContactName,
            totalStock: totalOpeningStockValue,
            wareHouses: {
              connect: allWarehouses.map((warehouse) => ({
                id: warehouse.id,
              })),
            },
            stocks: {
              connect: (stocks || [])?.map((stock) => ({
                id: stock.id,
              })),
            },
            image: {
              connect: createdImages?.length
                ? createdImages?.map((image) => ({
                    id: image?.id,
                  }))
                : [],
            },
            //sort: 'asc
            categories: {
              connect: { id: category?.id },
            },
            supplierId: supplier?.id ?? null,

            // variances: {
            //   connect: createdVariances?.map((variance) => ({
            //     id: variance?.id,
            //   })),
            // },

            items: {
              create: productItems?.map((item) => ({
                companyId,
                purchase: item?.purchase,
                sales: item?.sales,
                //itemName: item.itemName,
                //options: item.options,

                // stock: item?.stocks.map((stock) => ({
                //   openingStockValue: stock.openingStockValue,
                //   openingStock: stock.openingStock,
                //   warehouseName: stock.warehouseName,
                //   itemName: stock.itemName,
                // })),
              })),
            },
          },
          include: { stocks: true },
        });

      return {
        status: 'Success',
        message: 'Product created successfully',
        data: productWithGroupAndVariances,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /******************  UPLOAD START***********************/

  async uploadProductFile(
    userId: number,
    createProductDtos: CreateUploadDto[],
    stockDtos: StockDto[],
    itemDto: ItemDto,
  ) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const productMap = new Map<string, CreateUploadDto>();
      const stockMap = new Map<string, StockDto[]>();

      // Group products by name
      createProductDtos.forEach((createProductDto) => {
        const productName = createProductDto.name;
        productMap.set(productName, createProductDto);
      });

      // Group stocks by product name
      stockDtos.forEach((stockDto) => {
        stockDto.stocks.forEach((item) => {
          const productName = item.itemName;
          if (stockMap.has(productName)) {
            stockMap.get(productName).push(stockDto);
          } else {
            stockMap.set(productName, [stockDto]);
          }
        });
      });

      const results = [];
      let newProductsCreated = false; // Flag to track if any new products were created

      // Iterate over productMap entries
      for (const [productName, createProductDto] of productMap.entries()) {
        // Check if product with the same name already exists
        const existingProduct = await this.prismaService.product.findFirst({
          where: {
            name: {
              equals: productName.trim(),
              mode: 'insensitive',
            },
            companyId,
          },
        });

        if (!existingProduct) {
          // If product doesn't exist, proceed with creation
          let supplier;
          // Assume the supplier is the same for all products with the same name
          if (createProductDto.primarySupplier) {
            supplier = await this.prismaService.supplier.findFirst({
              where: {
                companyName: {
                  equals: createProductDto.primarySupplier.trim(),
                  mode: 'insensitive',
                },
                companyId,
              },
            });
            if (!supplier) {
              console.log('Supplier not found');
            }
          }

          // Check if the specified category already exists
          let category = await this.prismaService.category.findFirst({
            where: {
              name: {
                equals: createProductDto.categoryName.trim(),
                mode: 'insensitive',
              },
              companyId,
            },
          });

          // If the category doesn't exist, create it
          if (!category) {
            category = await this.prismaService.category.create({
              data: {
                name: createProductDto.categoryName.trim(),
                companyId,
              },
            });
          }

          const warehouses = [];

          // Get stocks for the current product
          const currentStockDtos = stockMap.get(productName);

          // Create stocks for the current product and warehouses
          const stocks = await Promise.all(
            currentStockDtos.map(async (stockDto) => {
              const uniqueWarehouses = new Map<string, boolean>(); // Map to store unique warehouses

              // Iterate over each stock within the stockDto
              for (const item of stockDto.stocks) {
                // Access the warehouse name from each item
                const { warehouseName, openingStock, openingStockValue } = item;

                // If warehouse doesn't exist in the uniqueWarehouses map, create it
                if (!uniqueWarehouses.has(warehouseName)) {
                  let warehouse = await this.prismaService.wareHouse.findFirst({
                    where: {
                      name: {
                        equals: warehouseName.trim(),
                        mode: 'insensitive',
                      },
                      companyId,
                    },
                  });

                  // If warehouse doesn't exist, create it
                  if (!warehouse) {
                    warehouse = await this.prismaService.wareHouse.create({
                      data: {
                        name: warehouseName.trim(),
                        companyId,
                      },
                    });
                  }
                  warehouses.push(warehouse);
                  uniqueWarehouses.set(warehouseName, true); // Mark warehouse as visited

                  // Create stock entries
                  const batchNumber = await this.generateUniqueBatchNumber(
                    warehouse.name,
                    user.id,
                  );
                  const stockCreationPromise = this.prismaService.stock.create({
                    data: {
                      companyId,
                      openingStock,
                      openingStockValue,
                      batchNumber,
                      itemName: item.itemName.trim(),
                      warehouseName: warehouseName.trim(),
                      createdBy: user.primaryContactName,
                      warehouses: {
                        connect: { id: warehouse.id },
                      },
                    },
                  });

                  return stockCreationPromise;
                }
              }

              return null; // Return null if no new stocks are created for this stockDto
            }),
          );

          // Filter out any null values (where no new stocks were created)
          const filteredStocks = stocks.filter((stock) => stock !== null);

          // Create the product
          const productWithGroupAndVariances =
            await this.prismaService.product.create({
              data: {
                companyId,
                name: productName,
                unit: createProductDto.unit,
                description: createProductDto.description,
                dimensions: createProductDto.dimensions,
                volume: createProductDto.volume,
                unitType: createProductDto.unitType,
                qtyPKT: createProductDto.qtyPKT,
                weight: createProductDto.weight,
                inventoryTrack: createProductDto.inventoryTrack,
                inventoryAccount: createProductDto.inventoryAccount,
                setInventoryTrack: createProductDto.setInventoryTrack,
                setBaseline: createProductDto.setBaseline,
                baseline: createProductDto.baseline,
                productCode: createProductDto.productCode,
                purchase: createProductDto.purchase,
                sales: createProductDto.sales,
                brand: createProductDto.brand,
                primarySupplier: supplier
                  ? createProductDto.primarySupplier
                  : null,
                manufacturer: createProductDto.manufacturer,
                createdBy: user.primaryContactName,
                totalStock: stocks
                  .flat()
                  .reduce(
                    (total, stock) => total + Number(stock.openingStock),
                    0,
                  ),
                wareHouses: {
                  connect: warehouses.flat().map((warehouse) => ({
                    id: warehouse.id,
                  })),
                },
                stocks: {
                  connect: stocks.flat().map((stock) => ({
                    id: stock.id,
                  })),
                },
                categories: {
                  connect: { id: category?.id },
                },
                supplierId: supplier?.id ?? null,
              },
              include: { stocks: true },
            });

          results.push(productWithGroupAndVariances);
          newProductsCreated = true;
        }
      }

      if (!newProductsCreated) {
        return {
          status: 'Success',
          message: 'No new products were created',
          data: [],
        };
      }

      return {
        status: 'Success',
        message: `${results.length} Products uploaded successfully`,
        data: results.length,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while uploading product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }
  /******************  UPLOAD ENDS***********************/
  async getAllProducts(userId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve all products based on companyId
      const products = await this.prismaService.product.findMany({
        where: {
          companyId: companyId,
        },
        include: {
          items: true,
          stocks: true,
          supplier: true,
          categories: true,
          image: true,
          wareHouses: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Products retrieved successfully',
        data: products,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while getting products',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteProduct(userId: number, productId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const product = await this.prismaService.product.findUnique({
        where: { id: productId, companyId },
        include: { stocks: true },
      });

      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      if (product.companyId !== companyId) {
        throw new HttpException(
          'You do not have permission to delete this product',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Delete the product from associated warehouses
      await Promise.all(
        product.stocks.map(async (stock) => {
          await this.prismaService.stock.delete({
            where: {
              id: stock.id,
            },
          });
        }),
      );

      await this.prismaService.product.delete({
        where: {
          id: product.id,
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Product deleted successfully',
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting products',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteAllProducts(userId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Find all products with associated stocks
      const productsWithStocks = await this.prismaService.product.findMany({
        where: {
          companyId,
        },
        include: {
          stocks: true,
        },
      });

      // Delete each stock associated with the products
      await Promise.all(
        productsWithStocks
          .flatMap((product) => product.stocks)
          .map((stock) =>
            this.prismaService.stock.delete({
              where: {
                id: stock.id,
              },
            }),
          ),
      );

      // Delete all products
      const { count } = await this.prismaService.product.deleteMany({
        where: {
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Products and associated stocks deleted successfully',
        count,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting products',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getProductById(userId: number, productId: number): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const product = await this.prismaService.product.findUnique({
        where: { id: productId, companyId },
        include: {
          image: true,
          items: true,
          stocks: true,
          categories: true,
          supplier: true,
          wareHouses: true,
          variances: true,
        },
      });

      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: product,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while getting product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateProduct(
    userId: number,
    productId: number,
    updateProductDto: any,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the product exists
      const existingProduct = await this.prismaService.product.findUnique({
        where: { id: productId, companyId },
      });

      if (!existingProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Update the product
      const updatedProduct = await this.prismaService.product.update({
        where: { id: productId, companyId },
        data: {
          companyId,
          sku: updateProductDto.sku,
          name: updateProductDto.name,
          volume: updateProductDto.volume,
          unitType: updateProductDto.unitType,
          qtyPKT: updateProductDto.qtyPKT,
          ...updateProductDto,
        },
        include: {
          categories: true,
          supplier: true,
        },
      });

      return {
        status: 'Success',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getItemGroups(userId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve all products based on companyId
      const itemGroup = await this.prismaService.itemGroup.findMany({
        where: {
          companyId: companyId,
        },
        include: {
          products: {
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      variances: true,
                      stocks: true,
                      wareHouses: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return {
        status: 'Success',
        message: 'item Groups retrieved successfully',
        data: itemGroup,
      };
    } catch (error) {
      throw error;
    }
  }

  async getVariances(userId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve all variances based on companyId
      const variances = await this.prismaService.variance.findMany({
        where: {
          companyId: companyId,
        },
        include: {
          product: {
            where: {
              companyId,
            },
          },
          groups: {
            where: {
              companyId,
            },
          },
        },
      });

      return {
        status: 'Success',
        message: 'Variance retrieved successfully',
        data: variances,
      };
    } catch (error) {
      throw error;
    }
  }

  async createItemGroup(
    userId: number,
    varianceDto: VarianceDto,
    createItemGroupDto: CreateItemGroupDto,
  ): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if the item group with the same name already exists
      const existingItemGroup = await this.prismaService.itemGroup.findFirst({
        where: {
          companyId,
          name: createItemGroupDto.name,
        },
      });

      if (existingItemGroup) {
        throw new HttpException(
          'Item group with the same name already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create an array to store created variances
      const createdVariances = [];

      // Create each variance in the array
      for (const varianceItem of varianceDto.variances || []) {
        const variance = await this.prismaService.variance.create({
          data: {
            attribute: varianceItem.attribute,
            options: varianceItem.options,
            companyId,
          },
        });

        // Add the created variance to the array
        createdVariances.push(variance);
      }

      // Create an item group if there are variances
      let itemGroup;
      if (createdVariances.length) {
        itemGroup = await this.prismaService.itemGroup.create({
          data: {
            name: createItemGroupDto.name,
            unit: createItemGroupDto.unit,
            companyId,
            variances: {
              connect: createdVariances.map((variance) => ({
                id: variance.id,
              })),
            },
          },
        });
      }

      return {
        status: 'Success',
        message: 'Item group created successfully',
        data: itemGroup,
      };
    } catch (error) {
      throw error;
    }
  }

  async getItemGroupWithVariances(
    userId: number,
    groupId: number,
  ): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve the specified item group with associated products and variances
      const itemGroup = await this.prismaService.itemGroup.findUnique({
        where: {
          id: groupId,
        },
        include: {
          variances: {
            where: {
              companyId,
            },
          },
        },
      });

      return {
        status: 'Success',
        message: 'Item group variance retrieved successfully',
        data: itemGroup,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateItemGroup(
    userId: number,
    groupId: number,
    productId: number,
    updateItemGroupDto,
  ): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve the specified item group
      const itemGroup = await this.prismaService.itemGroup.findUnique({
        where: {
          id: groupId,
        },
        include: {
          variances: {
            where: {
              companyId,
            },
          },
        },
      });

      if (!itemGroup) {
        throw new HttpException('Item group not found', HttpStatus.NOT_FOUND);
      }

      // Retrieve the specified product

      // Update the item group with the selected product and variances
      const updatedItemGroup = await this.prismaService.itemGroup.update({
        where: {
          id: groupId,
        },
        data: {
          products: {},
          variances: {
            connect: updateItemGroupDto.varianceIds.map((varianceId) => ({
              id: varianceId,
            })),
          },
        },
      });

      return {
        status: 'Success',
        message: 'Item group updated successfully',
        data: updatedItemGroup,
      };
    } catch (error) {
      throw error;
    }
  }

  async editProduct(
    userId: number,
    updateProductDto: UpdateProductDto,
    productId: number,
    files: Array<Express.Multer.File>,
    stockDto: UpdateStockDto,
    itemDto: ItemDto,
  ) {
    try {
      // Check if the user exists with associated relationship
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Retrieve the existing product
      const existingProduct = await this.prismaService.product.findUnique({
        where: { id: productId, companyId },
        include: {
          stocks: true,
          image: true,
          categories: true,
          supplier: true,
          items: true,
          wareHouses: true,
        },
      });

      if (!existingProduct) {
        throw new HttpException(
          `Product with id ${productId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      let supplier: Supplier;
      if (updateProductDto.supplierId) {
        supplier = await this.prismaService.supplier.findUnique({
          where: { id: updateProductDto.supplierId, companyId },
        });
        if (!supplier) {
          throw new HttpException(
            'Please provide a valid supplier',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      let category: Category;
      if (updateProductDto.categoryName) {
        category = await this.prismaService.category.findFirst({
          where: { name: updateProductDto.categoryName, companyId },
        });

        if (!category) {
          throw new HttpException(
            'Please provide a valid category',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const warehousePromises = (stockDto.stocks || []).map(async (stock) => {
        const warehouse = await this.prismaService.wareHouse.findFirst({
          where: { name: stock.warehouseName, companyId },
        });

        if (!warehouse) {
          throw new HttpException(
            `Warehouse not found for stock with warehouseName: ${stock.warehouseName}`,
            HttpStatus.NOT_FOUND,
          );
        }

        return warehouse;
      });

      const warehouses = await Promise.all(warehousePromises);

      // Extract contact IDs from existingSupplier
      const stockIds = existingProduct.stocks.map((stock) => stock.id);
      const itemIds = existingProduct.items.map((item) => item.id);

      // Update stocks
      const updatedStocksPromises = (stockDto.stocks || []).map(
        async (stock, index) => {
          await this.prismaService.stock.updateMany({
            where: { id: stockIds[index] },
            data: {
              companyId,
              openingStock: stock.openingStock,
              openingStockValue: stock.openingStockValue,
              itemName: stock.itemName,
              warehouseName: stock.warehouseName,
              createdBy: user.primaryContactName,
            },
          });
        },
      );

      await Promise.all(updatedStocksPromises);

      // Calculate total opening stock value
      const totalOpeningStockValue = (stockDto.stocks || []).reduce(
        (total, stock) => total + Number(stock.openingStock),
        0,
      );

      let existingImages: Image[] = [];
      if (existingProduct.image) {
        existingImages = Array.isArray(existingProduct.image)
          ? existingProduct.image
          : [existingProduct.image];
      }

      let imagesLinks = null;
      let createdImages: Image[] = [];

      if (files) {
        // console.log(files);
        imagesLinks = await this.cloudinaryService
          .uploadImages(files)
          .catch((error) => {
            throw new HttpException(error, HttpStatus.BAD_REQUEST);
          });

        // Delete the previous images if they exist
        let imageExist;
        for (const existingImage of existingImages) {
          // console.log(existingImage);
          await this.cloudinaryService.deleteImage(existingImage.publicId);

          // Check if image exists in the database
          imageExist = await this.prismaService.image.findMany({
            where: { id: existingImage.id },
          });
        }

        // Create or update the new images
        createdImages = await Promise.all(
          imagesLinks.map(async (file) => {
            if (imageExist) {
              // Update the existing image
              return await this.prismaService.image.update({
                where: { id: imageExist[0].id },
                data: {
                  publicId: file.public_id,
                  url: file.url,
                  companyId,
                },
              });
            } else {
              // Create a new image
              return await this.prismaService.image.create({
                data: {
                  publicId: file.public_id,
                  url: file.url,
                  companyId,
                },
              });
            }
          }),
        );
      }
      // Create the product and associate it with the item group, variances, images, purchase info, and sales info
      const productItems = itemDto.items || [];
      const productWithGroupAndVariances =
        await this.prismaService.product.update({
          where: { id: productId, companyId },
          data: {
            companyId,
            name: updateProductDto.name,
            unit: updateProductDto.unit,
            dimensions: updateProductDto.dimensions,
            weight: updateProductDto.weight,
            description: updateProductDto.description,
            volume: updateProductDto.volume,
            unitType: updateProductDto.unitType,
            qtyPKT: updateProductDto.qtyPKT,
            inventoryTrack: updateProductDto.inventoryTrack,
            inventoryAccount: updateProductDto.inventoryAccount,
            setInventoryTrack: updateProductDto.setInventoryTrack,
            setBaseline: updateProductDto.setBaseline,
            baseline: updateProductDto.baseline,
            productCode: updateProductDto.productCode,
            purchase: updateProductDto.purchase,
            sales: updateProductDto.sales,
            brand: updateProductDto.brand,
            primarySupplier: updateProductDto.primarySupplier,
            manufacturer: updateProductDto.manufacturer,
            createdBy: user.primaryContactName,
            totalStock: totalOpeningStockValue,
            wareHouses: {
              connect: warehouses.map((warehouse) => ({
                id: warehouse.id,
              })),
            },
            stocks: {
              connect: (existingProduct.stocks || []).map((stock) => ({
                id: stock.id,
              })),
            },
            image: {
              connect: createdImages?.length
                ? createdImages?.map((image) => ({
                    id: image?.id,
                  }))
                : [],
            },

            categories: {
              connect: { id: category?.id },
            },
            supplierId: supplier?.id ?? null,

            items: {
              updateMany: productItems?.map((item, index) => ({
                where: { id: itemIds[index], companyId },
                data: {
                  companyId,
                  //itemName: item.itemName,
                  // options: item.options,
                  purchase: item?.purchase,
                  sales: item?.sales,
                  // stock: item?.stocks.map((stock) => ({
                  //   openingStockValue: stock.openingStockValue,
                  //   openingStock: stock.openingStock,
                  //   warehouseName: stock.warehouseName,
                  //   itemName: stock.itemName,
                  // })),
                },
              })),
            },
          },
        });

      return {
        status: 'Success',
        message: 'Product update successfully',
        data: productWithGroupAndVariances,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createSupplier(
    user: User,
    companyId: number,
    serialNumber: string,
    primarySupplier: string,
  ) {
    try {
      const existingSupplier = await this.prismaService.supplier.findFirst({
        where: { serialNumber: serialNumber, companyId },
      });
      if (existingSupplier) {
        serialNumber = await this.generateUniqueSerialNumber('VEN', 8);
      }

      const supplier = await this.prismaService.supplier.create({
        data: {
          companyId,
          serialNumber: serialNumber,
          displayName: primarySupplier,
          companyName: primarySupplier,
          firstName: primarySupplier,
          registeredBy: user.primaryContactName,
          supplierType: SupplierType.WHOLESALER,
        },
      });

      return supplier;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating supplier',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async generateUniqueSerialNumber(
    name: string,
    length: number,
  ): Promise<string> {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = name.toUpperCase() + '-';

    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }

    return result;
  }

  private async generateUniqueBatchNumber(
    warehouseName: string,
    userId: number,
  ): Promise<string> {
    const timestamps = DateTime.local().toMillis().toString(36);
    const prefix = warehouseName.slice(0, 3).toUpperCase();
    const formattedDate = DateTime.local().toFormat('yyyyLLdd');
    const concatenated = prefix + formattedDate.replace(/-/g, '');
    const timestamp = Date.now().toString(36);
    const randomString = Math.random().toString(36).substring(2, 8);
    // const batchNumber = `${concatenated}-${timestamp}-${randomString}`;

    const batchNumber = await this.usersService.generateSerialNumber(
      concatenated,
      'batch',
      userId,
    );

    const existingStock = await this.prismaService.stock.findFirst({
      where: { batchNumber },
    });

    if (existingStock) {
      return this.generateUniqueBatchNumber(warehouseName, userId);
    }

    return batchNumber;
  }

  async uploadProducts(
    userId: number,
    createProductDtos: CreateUploadDto[],
    stockDtos: StockDto[],
    itemDto: ItemDto,
  ) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const results = [];

      for (let i = 0; i < createProductDtos.length; i++) {
        const createProductDto = createProductDtos[i];
        const currentStockDto = stockDtos[i];

        let supplier;
        if (createProductDto.primarySupplier) {
          supplier = await this.prismaService.supplier.findFirst({
            where: {
              companyName: createProductDto.primarySupplier.trim(),
              companyId,
            },
          });
          if (!supplier) {
            throw new HttpException(
              `Supplier with name ${createProductDto.primarySupplier} not found`,
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        const product = await this.prismaService.product.findFirst({
          where: { name: createProductDto.name, companyId },
        });

        if (product) {
          throw new HttpException(
            `Product with name ${createProductDto.name} already exists`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Check if the specified category already exists
        let category = await this.prismaService.category.findFirst({
          where: { name: createProductDto.categoryName, companyId },
        });

        // If the category doesn't exist, create it
        if (!category) {
          category = await this.prismaService.category.create({
            data: {
              name: createProductDto.categoryName,
              companyId,
            },
          });
        }

        const warehousePromises = currentStockDto.stocks.map(async (stock) => {
          // let warehouse = await this.prismaService.wareHouse.findFirst({
          //   where: { name: stock.warehouseName.trim(), companyId },
          // });

          let warehouse = await this.prismaService.wareHouse.findFirst({
            where: {
              name: {
                equals: stock.warehouseName.trim(),
                mode: 'insensitive',
              },
              companyId,
            },
          });

          // If warehouse doesn't exist, create it
          if (!warehouse) {
            warehouse = await this.prismaService.wareHouse.create({
              data: {
                name: stock.warehouseName.trim(),
                companyId,
              },
            });
          }

          return warehouse;
        });
        const allWarehouses = await Promise.all(warehousePromises);

        // Create stocks for the current product
        const stocks = await Promise.all(
          currentStockDto.stocks.map(async (stock) => {
            // Find the warehouse for the current stock
            const warehouse = await this.prismaService.wareHouse.findFirst({
              where: { name: stock.warehouseName, companyId },
            });

            if (!warehouse) {
              throw new HttpException(
                `Warehouse not found for stock with warehouseName: ${stock.warehouseName}`,
                HttpStatus.NOT_FOUND,
              );
            }

            const batchNumber = await this.generateUniqueBatchNumber(
              warehouse.name,
              user.id,
            );

            return await this.prismaService.stock.create({
              data: {
                companyId,
                openingStock: stock.openingStock,
                openingStockValue: stock.openingStockValue,
                batchNumber,
                itemName: stock.itemName,
                warehouseName: stock.warehouseName,
                createdBy: user.primaryContactName,
                warehouses: {
                  connect: { id: warehouse.id },
                },
              },
            });
          }),
        );

        // Calculate total opening stock value for the current product
        const totalOpeningStockValue = stocks.reduce(
          (total, stock) => total + Number(stock.openingStock),
          0,
        );

        const productItems = itemDto.items || [];
        const productWithGroupAndVariances =
          await this.prismaService.product.create({
            data: {
              companyId,
              name: createProductDto.name,
              unit: createProductDto.unit,
              description: createProductDto.description,
              dimensions: createProductDto.dimensions,
              volume: createProductDto.volume,
              unitType: createProductDto.unitType,
              qtyPKT: createProductDto.qtyPKT,
              weight: createProductDto.weight,
              inventoryTrack: createProductDto.inventoryTrack,
              inventoryAccount: createProductDto.inventoryAccount,
              setInventoryTrack: createProductDto.setInventoryTrack,
              setBaseline: createProductDto.setBaseline,
              baseline: createProductDto.baseline,
              productCode: createProductDto.productCode,
              purchase: createProductDto.purchase,
              sales: createProductDto.sales,
              brand: createProductDto.brand,
              primarySupplier: createProductDto.primarySupplier,
              manufacturer: createProductDto.manufacturer,
              createdBy: user.primaryContactName,
              totalStock: totalOpeningStockValue,
              wareHouses: {
                connect: allWarehouses.map((warehouse) => ({
                  id: warehouse.id,
                })),
              },
              stocks: {
                connect: (stocks || [])?.map((stock) => ({
                  id: stock.id,
                })),
              },

              categories: {
                connect: { id: category?.id },
              },
              supplierId: supplier?.id ?? null,

              items: {
                create: productItems?.map((item) => ({
                  companyId,
                  purchase: item?.purchase,
                  sales: item?.sales,
                })),
              },
            },
            include: { stocks: true },
          });
        results.push(productWithGroupAndVariances);
      }

      return {
        status: 'Success',
        message: 'Products uploaded successfully',
        data: results,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while uploading product',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /****************** OLD UPLOAD FOR YETUNDE STARTS***********************/
  // async uploadProducts(
  //   userId: number,
  //   createProductDtos: CreateUploadDto[],
  //   stockDtos: StockDto[],
  //   itemDto: ItemDto,
  // ) {
  //   try {
  //     const user = await this.usersService.findUserWithRelationships(userId);
  //     const companyId =
  //       user.adminCompanyId?.adminID || user.employeeId?.companyId;

  //     const results = [];

  //     for (let i = 0; i < createProductDtos.length; i++) {
  //       const createProductDto = createProductDtos[i];
  //       const currentStockDto = stockDtos[i];

  //       let supplier;
  //       if (createProductDto.primarySupplier) {
  //         supplier = await this.prismaService.supplier.findFirst({
  //           where: {
  //             companyName: createProductDto.primarySupplier.trim(),
  //             companyId,
  //           },
  //         });
  //         if (!supplier) {
  //           throw new HttpException(
  //             `Supplier with name ${createProductDto.primarySupplier} not found`,
  //             HttpStatus.BAD_REQUEST,
  //           );
  //         }
  //       }

  //       const product = await this.prismaService.product.findFirst({
  //         where: { name: createProductDto.product, companyId },
  //       });

  //       if (product) {
  //         throw new HttpException(
  //           `Product with name ${createProductDto.product} already exists`,
  //           HttpStatus.BAD_REQUEST,
  //         );
  //       }

  //       // Check if the specified category already exists
  //       let category = await this.prismaService.category.findFirst({
  //         where: { name: createProductDto.category, companyId },
  //       });

  //       // If the category doesn't exist, create it
  //       if (!category) {
  //         category = await this.prismaService.category.create({
  //           data: {
  //             name: createProductDto.category,
  //             companyId,
  //           },
  //         });
  //       }

  //       const warehousePromises = currentStockDto.stocks.map(async (stock) => {
  //         const warehouse = await this.prismaService.wareHouse.findFirst({
  //           where: { name: stock.warehouseName, companyId },
  //         });

  //         if (!warehouse) {
  //           throw new HttpException(
  //             `Warehouse not found for stock with warehouseName: ${stock.warehouseName}`,
  //             HttpStatus.NOT_FOUND,
  //           );
  //         }

  //         return warehouse;
  //       });
  //       const warehouses = await Promise.all(warehousePromises);

  //       // Create stocks for the current product
  //       const stocks = await Promise.all(
  //         currentStockDto.stocks.map(async (stock) => {
  //           return await this.prismaService.stock.create({
  //             data: {
  //               companyId,
  //               openingStock: stock.openingStock,
  //               openingStockValue: stock.openingStockValue,
  //               itemName: stock.itemName,
  //               warehouseName: stock.warehouseName,
  //               createdBy: user.primaryContactName,
  //               warehouses: {
  //                 connect: warehouses.map((warehouse) => ({
  //                   id: warehouse.id,
  //                 })),
  //               },
  //             },
  //           });
  //         }),
  //       );

  //       let volume;
  //       let qtyPKT;

  //       if (createProductDto.config) {
  //         const value = createProductDto.config.toLowerCase().split('x');
  //         volume = value[0].trim();
  //         qtyPKT = value[1];
  //       }
  //       // Calculate total opening stock value for the current product
  //       const totalOpeningStockValue = stocks.reduce(
  //         (total, stock) => total + Number(stock.openingStock),
  //         0,
  //       );

  //       const productItems = itemDto.items || [];
  //       const productWithGroupAndVariances =
  //         await this.prismaService.product.create({
  //           data: {
  //             companyId,
  //             name: createProductDto.product,
  //             volume: volume,
  //             unitType: 'PKT',
  //             unit: 'PKT',
  //             qtyPKT: qtyPKT,
  //             purchase: createProductDto.purchase,
  //             sales: createProductDto.sales,
  //             brand: createProductDto.brandOwner,
  //             primarySupplier: createProductDto.primarySupplier,
  //             manufacturer: createProductDto.brandOwner,
  //             createdBy: user.primaryContactName,
  //             totalStock: totalOpeningStockValue,
  //             wareHouses: {
  //               connect: warehouses.map((warehouse) => ({
  //                 id: warehouse.id,
  //               })),
  //             },
  //             stocks: {
  //               connect: (stocks || [])?.map((stock) => ({
  //                 id: stock.id,
  //               })),
  //             },

  //             categories: {
  //               connect: { id: category?.id },
  //             },
  //             supplierId: supplier?.id ?? null,

  //             items: {
  //               create: productItems?.map((item) => ({
  //                 companyId,
  //                 purchase: item?.purchase,
  //                 sales: item?.sales,
  //               })),
  //             },
  //           },
  //           include: { stocks: true },
  //         });
  //       results.push(productWithGroupAndVariances);
  //     }

  //     return {
  //       status: 'Success',
  //       message: 'Products uploaded successfully',
  //       data: results,
  //     };
  //   } catch (error) {
  //     if (error instanceof Prisma.PrismaClientValidationError) {
  //       throw new HttpException(
  //         'An error occurred while uploading product',
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }
  //     throw error;
  //   }
  // }

  /****************** OLD UPLOAD FOR YETUNDE END ***********************/
}
