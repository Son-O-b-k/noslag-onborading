import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { ItemRate, Prisma } from '@prisma/client';

@Injectable()
export class PriceListService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // async createPriceList(
  //   userId: number,
  //   createPriceListDto: CreatePriceListDto,
  // ) {
  //   try {
  //     const user = await this.usersService.findUserWithRelationships(userId);
  //     const companyId =
  //       user.adminCompanyId?.adminID || user.employeeId?.companyId;

  //     const price = await this.prismaService.priceList.findFirst({
  //       where: {
  //         name: createPriceListDto.name,
  //         companyId,
  //       },
  //     });
  //     if (price) {
  //       throw new HttpException(
  //         'PriceList with name already exist',
  //         HttpStatus.CONFLICT,
  //       );
  //     }

  //     let priceList;

  //     if (createPriceListDto.itemRate === ItemRate.MARK_UP_AND_DOWN) {
  //       // Create the price list for MARK_UP_AND_DOWN
  //       priceList = await this.prismaService.priceList.create({
  //         data: {
  //           name: createPriceListDto.name,
  //           customerType: createPriceListDto.customerType,
  //           description: createPriceListDto.description,
  //           itemRate: createPriceListDto.itemRate,
  //           percentage: createPriceListDto.percentage,
  //           type: createPriceListDto.type,
  //           companyId,
  //         },
  //       });
  //     } else if (createPriceListDto.itemRate === ItemRate.INDIVIDUAL_RATE) {
  //       // Validate productRates
  //       const products = await this.prismaService.product.findMany({
  //         where: {
  //           id: {
  //             in: createPriceListDto.productRates.map(
  //               ({ productId }) => productId,
  //             ),
  //           },
  //         },
  //       });

  //       const notFoundProductIds = createPriceListDto.productRates
  //         .filter(
  //           ({ productId }) =>
  //             !products.some((product) => product.id === productId),
  //         )
  //         .map(({ productId }) => {
  //           const product = products.find((u) => u.id === productId);
  //           return product
  //             ? product.name || `ID ${productId}`
  //             : `ID ${productId}`;
  //         });

  //       if (notFoundProductIds.length > 0) {
  //         throw new HttpException(
  //           `Products not found: ${notFoundProductIds.join(', ')}`,
  //           HttpStatus.NOT_FOUND,
  //         );
  //       }

  //       // Update the custom rate for each product
  //       const updatedProducts = await Promise.all(
  //         createPriceListDto.productRates.map(
  //           async ({ productId, customRate }) => {
  //             const product = await this.prismaService.product.findUnique({
  //               where: { id: productId },
  //             });

  //             if (!product) {
  //               throw new HttpException(
  //                 `Product with id ${productId} not found`,
  //                 HttpStatus.NOT_FOUND,
  //               );
  //             }

  //             // Update the custom rate for the existing product
  //             const updatedProduct = await this.prismaService.product.update({
  //               where: { id: productId },
  //               data: {
  //                 customRate,
  //               },
  //             });

  //             return updatedProduct;
  //           },
  //         ),
  //       );

  //       // Create the price list with the updated product custom rates
  //       priceList = await this.prismaService.priceList.create({
  //         data: {
  //           name: createPriceListDto.name,
  //           description: createPriceListDto.description,
  //           itemRate: createPriceListDto.itemRate,
  //           type: createPriceListDto.type,
  //           currency: createPriceListDto.currency,
  //           customerType: createPriceListDto.customerType,
  //           companyId,
  //           products: {
  //             connect: updatedProducts.map((product) => ({ id: product.id })),
  //           },
  //         },
  //         include: {
  //           products: { where: { companyId } },
  //         },
  //       });
  //     }

  //     return {
  //       status: 'Success',
  //       data: priceList,
  //     };
  //   } catch (error) {
  //     if (error instanceof Prisma.PrismaClientValidationError) {
  //       throw new HttpException(
  //         'An error occurred while fetching pricelist',
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }
  //     throw error;
  //   }
  // }

  async createPriceList(
    userId: number,
    createPriceListDto: CreatePriceListDto,
  ) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if a price list with the same name already exists for the company
      const existingPriceList = await this.prismaService.priceList.findFirst({
        where: { name: createPriceListDto.name, companyId },
      });

      if (existingPriceList) {
        throw new HttpException(
          `PriceList with name ${createPriceListDto.name} already exists`,
          HttpStatus.CONFLICT,
        );
      }

      let priceList;

      if (createPriceListDto.itemRate === ItemRate.MARK_UP_AND_DOWN) {
        // Create the price list for MARK_UP_AND_DOWN
        priceList = await this.createMarkUpAndDownPriceList(
          createPriceListDto,
          companyId,
        );
      } else if (createPriceListDto.itemRate === ItemRate.INDIVIDUAL_RATE) {
        // Create the price list for INDIVIDUAL_RATE
        priceList = await this.createIndividualRatePriceList(
          createPriceListDto,
          companyId,
        );
      }

      return { status: 'Success', data: priceList };
    } catch (error) {
      console.error('Error creating price list:', error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating price list',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createMarkUpAndDownPriceList(
    createPriceListDto: CreatePriceListDto,
    companyId: number,
  ) {
    return await this.prismaService.priceList.create({
      data: {
        name: createPriceListDto.name,
        description: createPriceListDto.description,
        itemRate: createPriceListDto.itemRate,
        percentage: createPriceListDto.percentage,
        type: createPriceListDto.type,
        companyId,
      },
    });
  }

  async createIndividualRatePriceList(
    createPriceListDto: CreatePriceListDto,
    companyId: number,
  ) {
    // Validate productRates
    const products = await this.prismaService.product.findMany({
      where: {
        id: {
          in: createPriceListDto.productRates.map(({ productId }) => productId),
        },
      },
    });

    const notFoundProductIds = createPriceListDto.productRates
      .filter(
        ({ productId }) =>
          !products.some((product) => product.id === productId),
      )
      .map(({ productId }) => productId);

    if (notFoundProductIds.length > 0) {
      throw new HttpException(
        `Products not found: ${notFoundProductIds.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Update custom rate for each product
    await Promise.all(
      createPriceListDto.productRates.map(async ({ productId, customRate }) => {
        await this.updateProductCustomRate(productId, customRate);
      }),
    );

    // Create the price list with the updated product custom rates
    return await this.prismaService.priceList.create({
      data: {
        name: createPriceListDto.name,
        description: createPriceListDto.description,
        itemRate: createPriceListDto.itemRate,
        type: createPriceListDto.type,
        currency: createPriceListDto.currency,
        customerType: createPriceListDto.customerType,
        companyId,
        products: {
          connect: createPriceListDto.productRates.map(({ productId }) => ({
            id: productId,
          })),
        },
      },
      include: { products: true },
    });
  }

  async updateProductCustomRate(productId: number, customRate: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new HttpException(
        `Product with id ${productId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return await this.prismaService.product.update({
      where: { id: productId },
      data: { customRate },
    });
  }

  async getPriceLists(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const priceList = await this.prismaService.priceList.findMany({
        where: { companyId },
        include: {
          products: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'PriceList retrieved successfully',
        data: priceList,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching pricelist',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPurchasePriceLists(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchasePriceLists = await this.prismaService.priceList.findMany({
        where: {
          companyId,
          type: 'PURCHASE', // Filter by type 'PURCHASE'
        },
        include: {
          products: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Purchase PriceLists retrieved successfully',
        data: purchasePriceLists,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching pricelist',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSalesPriceLists(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchasePriceLists = await this.prismaService.priceList.findMany({
        where: {
          companyId,
          type: 'SALES', // Filter by type 'SALES'
        },
        include: {
          products: { where: { companyId } },
        },
      });

      return {
        status: 'Success',
        message: 'Purchase PriceLists retrieved successfully',
        data: purchasePriceLists,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching pricelist',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPriceListById(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const pricelist = await this.prismaService.priceList.findUnique({
        where: { id, companyId },
        include: {
          products: { where: { companyId } },
        },
      });

      if (!pricelist) {
        throw new HttpException(
          `Pricelist order with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        message: 'Pricelist retrieved successfully',
        data: pricelist,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching pricelist',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async editPriceList(
    userId: number,
    priceListId: number,
    updatePriceListDto: UpdatePriceListDto,
  ) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      // Fetch the price list to be edited
      const priceList = await this.prismaService.priceList.findUnique({
        where: { id: priceListId, companyId },
        include: { products: true },
      });

      if (!priceList) {
        throw new HttpException('PriceList not found', HttpStatus.NOT_FOUND);
      }

      // Prepare the data for updating the price list
      const updateData: any = {
        name: updatePriceListDto.name || priceList.name,
        description: updatePriceListDto.description || priceList.description,
        itemRate: updatePriceListDto.itemRate || priceList.itemRate,
        percentage: updatePriceListDto.percentage || priceList.percentage,
        type: updatePriceListDto.type || priceList.type,
        currency: updatePriceListDto.currency || priceList.currency,
        customerType: updatePriceListDto.customerType || priceList.customerType,
      };

      // Update the custom rate for each product if provided in the DTO
      if (updatePriceListDto.productRates) {
        const updatedProducts = await Promise.all(
          updatePriceListDto.productRates.map(
            async ({ productId, customRate }) => {
              const updatedProduct = await this.updateProductCustomRate(
                productId,
                customRate,
              );
              return updatedProduct;
            },
          ),
        );
        updateData.products = {
          connect: updatedProducts.map((product) => ({ id: product.id })),
        };
      }

      // Update the price list
      const updatedPriceList = await this.prismaService.priceList.update({
        where: { id: priceListId },
        data: updateData,
        include: { products: true },
      });

      return {
        status: 'Success',
        message: 'PriceList updated successfully',
        data: updatedPriceList,
      };
    } catch (error) {
      console.error('Error editing price list:', error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while editing price list',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }
}
