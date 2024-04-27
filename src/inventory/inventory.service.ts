import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AdjustInventoryDto, DebtorsReport } from './dto/adjust-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { MailService, PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import {
  AdjustmentType,
  PaymentMode,
  PaymentStatus,
  Prisma,
  RequestState,
  StockRequest,
} from '@prisma/client';
import { TransferDto } from './dto/warehouse-transfer.dto';
import { UpdateRequestDto } from './dto/update-warehouse-transfer.dto';
import { DateTime } from 'luxon';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersservice: UsersService,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}

  async createAdjustInventory(
    userId: number,
    adjustInventoryDto: AdjustInventoryDto,
  ) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const warehouse = await this.validateWarehouse(
        adjustInventoryDto,
        companyId,
      );
      const adjustedInventory = await this.adjustInventory(
        companyId,
        user.primaryContactName,
        adjustInventoryDto,
        warehouse,
      );

      const successMessage =
        adjustInventoryDto.type === AdjustmentType.QUANTITY
          ? 'Quantity successfully adjusted'
          : 'Value successfully adjusted';

      return {
        status: 'Success',
        message: successMessage,
        data: adjustedInventory,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'Internal Server Error',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async validateWarehouse(
    adjustInventoryDto: AdjustInventoryDto,
    companyId: number,
  ) {
    if (adjustInventoryDto.type === AdjustmentType.QUANTITY) {
      const warehouse = await this.prismaService.wareHouse.findUnique({
        where: {
          id: adjustInventoryDto.warehouseId,
          name: adjustInventoryDto.warehouseName,
        },
      });

      if (!warehouse) {
        throw new HttpException('Warehouse not found', HttpStatus.NOT_FOUND);
      }

      return warehouse;
    }
  }

  private async adjustInventory(
    companyId: number,
    adjustedBy: string,
    adjustInventoryDto: AdjustInventoryDto,
    warehouse: any,
  ) {
    const itemDetails = this.mapItemDetails(adjustInventoryDto);
    const adjustedInventory = await this.prismaService.adjustInventory.create({
      data: {
        companyId,
        // productId:,
        adjustedBy,
        type: adjustInventoryDto.type,
        dateAdjusted: adjustInventoryDto.dateAdjusted,
        reason: adjustInventoryDto.reason,
        account: adjustInventoryDto.account,
        wareHouse: warehouse.name,
        itemDetails,
      },
    });

    const changeType = await this.updateInventory(
      itemDetails,
      adjustInventoryDto.type,
    );
    return { ...adjustedInventory, changeType };
  }

  private mapItemDetails(adjustInventoryDto: AdjustInventoryDto) {
    return adjustInventoryDto.itemDetails.map((item) => {
      const {
        productId,
        qtyAvailable,
        qtyOnHand,
        qtyAdjusted,
        purchasePrice,
        costPrice,
        itemName,
        currentValue,
        valueAdjusted,
        warehouseName,
      } = item;
      return adjustInventoryDto.type === AdjustmentType.QUANTITY
        ? {
            productId,
            qtyAvailable,
            qtyOnHand,
            qtyAdjusted,
            purchasePrice,
            costPrice,
            itemName,
            warehouseName,
          }
        : {
            productId,
            currentValue: currentValue,
            changedValue: qtyAdjusted,
            valueAdjusted: valueAdjusted,
            itemName,
          };
    });
  }

  private async updateInventory(itemDetails: any, type: AdjustmentType) {
    try {
      const productIds = itemDetails.map((item) => item.productId);
      const products = await this.prismaService.product.findMany({
        where: { id: { in: productIds } },
        include: { stocks: true },
      });

      let changeType;
      for (const item of itemDetails) {
        //console.log(item);
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }

        if (type === AdjustmentType.QUANTITY) {
          changeType = await this.adjustQuantity(product, item);
        }

        // Logic for value adjustment (if needed)
      }
      return { changeType };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating inventory',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async adjustQuantity(product: any, item: any) {
    // Find the stock for the given warehouse
    const stock = product.stocks.find(
      (stock) => stock.warehouseName === item.warehouseName,
    );
    if (!stock) {
      throw new Error(
        `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
      );
    }

    // Convert quantities to numbers
    const updatedQuantity = Number(item.qtyOnHand);
    const previousQuantity = Number(stock.openingStock);

    // Calculate the change in stock
    const changeInStock = updatedQuantity - previousQuantity;

    // Determine the type of change (increase or decrease)
    const changeType = changeInStock > 0 ? 'increase' : 'decrease';

    // Update the opening stock with the new quantity
    await this.updateStockOpeningQuantity(stock.id, updatedQuantity);

    // Adjust the total stock based on the change in stock level
    const totalStock = this.calculateTotalStock(
      product.totalStock,
      changeType,
      Math.abs(changeInStock),
    );

    // Update the product with the adjusted total stock
    await this.updateProductTotalStock(product.id, totalStock);

    return {
      changeInStock,
      changeType,
      updatedQuantity,
      previousQuantity,
      initialStockQty: product.totalStock,
      finalStockQty: totalStock,
    };
  }

  private async updateStockOpeningQuantity(
    stockId: number,
    updatedQuantity: number,
  ) {
    await this.prismaService.stock.update({
      where: { id: stockId },
      data: { openingStock: String(updatedQuantity) },
    });
  }

  private calculateTotalStock(
    previousTotalStock: number,
    changeType: string,
    changeInStock: number,
  ) {
    if (changeType === 'increase') {
      return previousTotalStock + changeInStock;
    } else {
      return Math.max(previousTotalStock - changeInStock, 0); // Ensure total stock never goes below 0
    }
  }

  private async updateProductTotalStock(productId: number, totalStock: number) {
    await this.prismaService.product.update({
      where: { id: productId },
      data: { totalStock },
    });
  }

  async getAdjustInventoryById(userId: number, id: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const inventory = await this.prismaService.adjustInventory.findUnique({
        where: { id, companyId },
        include: {
          product: { where: { companyId } },
        },
      });

      if (!inventory) {
        throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: inventory,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'Error retrieving AdjustInventory',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAdjustInventory(userId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const inventory = await this.prismaService.adjustInventory.findMany({
        where: { companyId },
        include: {
          product: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!inventory) {
        throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: inventory,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'Error retrieving AdjustInventory',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async transferRequest(
    userId: number,
    transferDto: TransferDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requestExist = await this.prismaService.stockRequest.findFirst({
        where: { requestNumber: transferDto.requestNumber, companyId },
      });

      if (requestExist) {
        throw new HttpException(
          `Request with serial number ${transferDto.requestNumber} already exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      await Promise.all(
        transferDto.itemDetails.map(async (item) => {
          const product = await this.prismaService.product.findUnique({
            where: { id: Number(item.productId) },
            include: { stocks: true },
          });

          if (!product) {
            throw new HttpException(
              `Invalid product ID: ${item.productId}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const stock = product.stocks.find(
            (stock) => stock.warehouseName === item.warehouseName,
          );

          if (!stock) {
            throw new Error(
              `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
            );
          }
          const sendingWarehouse =
            await this.prismaService.wareHouse.findUnique({
              where: { id: transferDto.sendingWarehouseId, companyId },
            });

          const receivingWarehouse =
            await this.prismaService.wareHouse.findUnique({
              where: { id: transferDto.receivingWarehouseId, companyId },
              include: { stocks: true },
            });

          if (!sendingWarehouse || !receivingWarehouse) {
            throw new HttpException(
              'Sending or receiving warehouse not found',
              HttpStatus.NOT_FOUND,
            );
          }

          const sendingStock = await this.prismaService.stock.findUnique({
            where: { id: Number(item.sendingStockId) },
          });

          if (!sendingStock) {
            throw new HttpException('Stock not found', HttpStatus.BAD_REQUEST);
          }

          if (Number(sendingStock.openingStock) < Number(item.qtyTransferred)) {
            throw new HttpException(
              'Insufficient quantity in the sending stock',
              HttpStatus.BAD_REQUEST,
            );
          }
        }),
      );

      const approver = await this.prismaService.user.findUnique({
        where: { id: transferDto.approverId, companyId },
      });

      if (!approver) {
        throw new HttpException(
          'Assigned approver not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const request = await this.prismaService.stockRequest.create({
        data: {
          requestNumber: transferDto.requestNumber,
          dateInitiated: transferDto.dateInitiated,
          sendingWarehouseId: transferDto.sendingWarehouseId,
          receivingWarehouseId: transferDto.receivingWarehouseId,
          sendingWarehouseName: transferDto.sendingWarehouseName,
          receivingWarehouseName: transferDto.receivingWarehouseName,
          requestedBy: user.primaryContactName,
          dueDate: transferDto.dueDate,
          approverName: transferDto.approverName,
          approverId: approver.id,
          companyId,
          itemDetails: transferDto?.itemDetails.map((item) => ({
            productId: item?.productId,
            productName: item.itemName,
            costPrice: item.costPrice,
            qtyTransferred: item.qtyTransferred,
            sendingStockId: item.sendingStockId,
            warehouseName: item.warehouseName,
            transferValue: item.transferValue,
          })),
        },
      });

      // Create notification
      const notification = await this.prismaService.systemNotifications.create({
        data: {
          message: `New request ${request.requestNumber} needs approval.`,
          companyId,
          userId: user.id,
          approverId: approver.id,
          stockRequestId: request.id,
          receiverId: transferDto.approverId,
        },
      });

      // Send notification
      await this.mailService.transferNotifications(
        notification,
        approver,
        user,
        request,
      );
      return {
        status: 'Success',
        message: 'Request successfully created',
        data: request,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getStockRequest(userId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const request = await this.prismaService.stockRequest.findMany({
        where: { companyId },
        include: {
          sendingWarehouse: { where: { companyId } },
          receivingWarehouse: { where: { companyId } },
          //stockApprover: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!request) {
        throw new HttpException(
          'Stock request not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        data: request,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'Error retrieving stock request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async generateUniqueBatchNumber(): Promise<string> {
    const prefix = 'BATCH';
    const timestamp = Date.now().toString(36);
    //const randomString = Math.random().toString(36).substring(2, 8);
    // const batchNumber = `${prefix}-${timestamp}-${randomString}`;
    const batchNumber = `${prefix}-${timestamp}`;

    const existingStock = await this.prismaService.stock.findFirst({
      where: { batchNumber },
    });

    if (existingStock) {
      return this.generateUniqueBatchNumber();
    }

    return batchNumber;
  }

  async updateStockApprovalRequest(
    userId: number,
    requestId: number,
    updateRequestDto: UpdateRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingRequest = await this.prismaService.stockRequest.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Request with id number ${requestId} does not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const getNotification =
        await this.prismaService.systemNotifications.findFirst({
          where: {
            approverId: userId,
            companyId,
            stockRequestId: existingRequest.id,
          },
        });

      if (!getNotification) {
        throw new HttpException('No notification found', HttpStatus.NOT_FOUND);
      }

      const requestedUser = await this.prismaService.user.findUnique({
        where: { id: getNotification.userId, companyId },
      });

      // Save the updated request
      const updatedRequest = await this.prismaService.stockRequest.update({
        where: { id: requestId, companyId },
        data: {
          status: updateRequestDto.status,
          comment:
            updateRequestDto.status === RequestState.APPROVED
              ? null
              : updateRequestDto.status === RequestState.REJECT
                ? updateRequestDto.comment
                : null,
        },
      });

      if (updateRequestDto.status === RequestState.APPROVED) {
        const notification =
          await this.prismaService.systemNotifications.update({
            where: { id: getNotification.id },
            data: {
              message: `Request with serial number: ${updatedRequest.requestNumber} has been approved.`,
              companyId,
              comment: null,
              read: true,
              userId: requestedUser.id,
              approverId: user.id,
              stockRequestId: existingRequest.id,
              receiverId: requestedUser.id,
            },
          });

        await this.mailService.stockRequestApprovalNotifications(
          notification,
          requestedUser,
          user,
          updatedRequest,
        );
      } else if (updateRequestDto.status === RequestState.REJECT) {
        const notification =
          await this.prismaService.systemNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Request with serial number: ${updatedRequest.requestNumber} was rejected.`,
              comment: updateRequestDto.comment,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              stockRequestId: existingRequest.id,
              receiverId: requestedUser.id,
              read: true,
            },
          });

        await this.mailService.stockRequestRejectionNotifications(
          notification,
          requestedUser,
          user,
          updatedRequest,
        );
      }

      return {
        status: 'Success',
        data: updatedRequest,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getRequestByREQ(userId: number, requestNumber: string): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const request = await this.prismaService.stockRequest.findFirst({
        where: { requestNumber: requestNumber, companyId },
        include: {
          sendingWarehouse: { where: { companyId } },
          receivingWarehouse: { where: { companyId } },
        },
      });

      if (!request) {
        throw new HttpException('Request not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: request,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async editStockRequest(
    userId: number,
    requestId: number,
    updateRequestDto: UpdateRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the request exists
      const existingRequest = await this.prismaService.stockRequest.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Request with id ${requestId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if data is provided for update
      if (!Object.keys(updateRequestDto).length) {
        return {
          status: 'No Updates',
          data: [],
        };
      }

      // Notify approver about the update
      const approver = await this.prismaService.user.findUnique({
        where: { id: updateRequestDto.approverId, companyId },
      });

      if (!approver) {
        throw new HttpException(
          `Approver with id ${updateRequestDto.approverId} does not exist`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update the request fields
      const updatedRequest = await this.prismaService.stockRequest.update({
        where: { id: requestId, companyId },
        data: {
          requestNumber: updateRequestDto.requestNumber,
          dateInitiated: updateRequestDto.dateInitiated,
          sendingWarehouseId: updateRequestDto.sendingWarehouseId,
          receivingWarehouseId: updateRequestDto.receivingWarehouseId,
          sendingWarehouseName: updateRequestDto.sendingWarehouseName,
          receivingWarehouseName: updateRequestDto.receivingWarehouseName,
          requestedBy: user.primaryContactName,
          dueDate: updateRequestDto.dueDate,
          approverName: updateRequestDto.approverName,
          status: RequestState.PENDING,
          approverId: approver.id,
          companyId,
          itemDetails: updateRequestDto?.itemDetails?.map((item) => ({
            productId: item?.productId,
            productName: item.itemName,
            costPrice: item.costPrice,
            sendingStockId: item.sendingStockId,
            qtyTransferred: item.qtyTransferred,
            warehouseName: item.warehouseName,
            transferValue: item.transferValue,
          })),
        },
      });

      let notification;
      notification = await this.prismaService.systemNotifications.findFirst({
        where: {
          approverId: approver.id,
          stockRequestId: updatedRequest.id,
        },
      });

      if (!notification) {
        notification = await this.prismaService.systemNotifications.create({
          data: {
            message: `Stock transfer request ${updatedRequest.requestNumber} needs approval.`,
            companyId,
            userId: user.id,
            approverId: approver.id,
            stockRequestId: updatedRequest.id,
            receiverId: approver.id,
          },
        });
      }

      await this.mailService.transferNotifications(
        notification,
        approver,
        user,
        updatedRequest,
      );

      return {
        status: 'Success',
        data: updatedRequest,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async stockConfirmation(
    userId: number,
    requestId: number,
    updateRequestDto: UpdateRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingRequest = await this.prismaService.stockRequest.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Invalid request serial number ${requestId} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (existingRequest.status !== RequestState.APPROVED) {
        throw new HttpException(`Request not approved`, HttpStatus.BAD_REQUEST);
      }

      await Promise.all(
        updateRequestDto.itemDetails.map(async (item) => {
          const product = await this.prismaService.product.findUnique({
            where: { id: Number(item.productId) },
            include: { stocks: true },
          });

          if (!product) {
            throw new HttpException(
              `Invalid product ID: ${item.productId}`,
              HttpStatus.NOT_FOUND,
            );
          }
        }),
      );

      // Create the order confirmation
      const request = await this.prismaService.stockRequest.update({
        where: { id: requestId, companyId },
        data: {
          status: updateRequestDto.status,
          itemDetails: updateRequestDto?.itemDetails.map((item) => ({
            productId: item?.productId,
            productName: item.itemName,
            sendingStockId: item.sendingStockId,
            costPrice: item.costPrice,
            qtyTransferred: item.qtyTransferred,
            warehouseName: item.warehouseName,
            transferValue: item.transferValue,
            comment: item.comment,
            received: item.receive,
          })),
        },
      });

      //console.log('about to update');
      if (request.status === RequestState.CONFIRM) {
        await this.updateTransfer(
          updateRequestDto.itemDetails,
          request,
          user.id,
        );
      }

      return {
        status: 'Stock Confirmation Successful',
        data: request,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating Stock confirmation',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateTransfer(itemDetails: any, request: StockRequest, userId) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      for (const item of itemDetails) {
        const product = await this.prismaService.product.findUnique({
          where: { id: Number(item.productId) },
          include: { stocks: true },
        });

        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }

        const sendingWarehouse = await this.prismaService.wareHouse.findUnique({
          where: { id: request.sendingWarehouseId, companyId },
        });

        const receivingWarehouse =
          await this.prismaService.wareHouse.findUnique({
            where: { id: request.receivingWarehouseId, companyId },
            include: { stocks: true },
          });

        if (!sendingWarehouse || !receivingWarehouse) {
          throw new HttpException(
            'Sending or receiving warehouse not found',
            HttpStatus.NOT_FOUND,
          );
        }

        const sendingWarehouseStock = product.stocks.find(
          (s) => s.warehouseName === request.sendingWarehouseName,
        );

        if (
          !sendingWarehouseStock ||
          Number(sendingWarehouseStock.openingStock) <
            Number(item.qtyTransferred)
        ) {
          console.log(
            Number(sendingWarehouseStock.openingStock),
            Number(item.qtyTransferred),
          );
          throw new HttpException(
            'Insufficient quantity in the sending warehouse',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Update quantity in sending warehouse
        const updatedSendingStock: number =
          Number(sendingWarehouseStock.openingStock) -
          Number(item.qtyTransferred);
        await this.prismaService.stock.update({
          where: { id: sendingWarehouseStock.id },
          data: { openingStock: updatedSendingStock.toString() },
        });

        const batchNumber = await this.generateUniqueBatchNumber();

        const openingStockValue =
          Number(item.costPrice) * Number(item.qtyTransferred);
        const newStock = await this.prismaService.stock.create({
          data: {
            companyId: product.companyId,
            openingStock: String(item.qtyTransferred),
            itemName: product.name,
            warehouseName: receivingWarehouse.name,
            batchNumber,
            purchase: {
              costPrice: item.costPrice,
            },
            openingStockValue: String(openingStockValue),
            createdBy: user.primaryContactName,
            product: { connect: { id: Number(item.productId) } },
            warehouses: { connect: { id: receivingWarehouse.id } },
          },
        });

        // Step 9: Update Product's Total Stock
        //   const updatedTotalStock = product.totalStock + Number(item.quantity);
        //   await this.prismaService.product.update({
        //     where: { id: product.id },
        //     data: { totalStock: updatedTotalStock },
        //   });
        // }

        return newStock;
      }
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'Error transferring item',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteStockRequest(userId: number, requestId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const request = await this.prismaService.stockRequest.findUnique({
        where: { id: requestId, companyId },
        include: { sendingWarehouse: true, receivingWarehouse: true },
      });

      if (!request) {
        throw new HttpException(
          'Stock request not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (request.companyId !== companyId) {
        throw new HttpException(
          'You do not have permission to delete this product',
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.prismaService.stockRequest.delete({
        where: {
          id: request.id,
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Stock request deleted successfully',
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting stock request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async calculateInventoryMetrics(
    userId: number,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<any[]> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const startOfDay = startDate.startOf('day');

      // Calculate the end of the day (23:59:59.999) in the appropriate time zone
      const endOfDay = endDate.endOf('day');

      const salesData = await this.prismaService.salesTransaction.findMany({
        where: {
          companyId,
          AND: [
            { createdAt: { gte: startOfDay.toJSDate() } },
            { createdAt: { lt: endOfDay.toJSDate() } },
          ],
        },

        select: {
          productId: true,
          quantity: true,
          amount: true,
        },
      });

      const restockData =
        await this.prismaService.purchasesTransaction.findMany({
          where: {
            companyId,
            AND: [
              { createdAt: { gte: startOfDay.toJSDate() } },
              { createdAt: { lt: endOfDay.toJSDate() } },
            ],
          },
          select: {
            productId: true,
            quantity: true,
            amount: true,
          },
        });

      const stockData = await this.prismaService.stock.findMany({
        where: {
          companyId,
          AND: [
            { createdAt: { gte: startOfDay.toJSDate() } },
            { createdAt: { lt: endOfDay.toJSDate() } },
          ],
        },
        select: {
          openingStock: true,
          product: { select: { id: true, totalStock: true, name: true } },
        },
      });

      const inventoryMetrics = [];

      // Calculate quantity sold and total sales amount
      const salesMap = new Map();
      salesData.forEach((sale) => {
        if (!salesMap.has(sale.productId)) {
          salesMap.set(sale.productId, { quantity: 0, amount: 0 });
        }
        salesMap.get(sale.productId).quantity += sale.quantity;
        salesMap.get(sale.productId).amount += sale.amount;
      });

      // Calculate total restocked quantity and amount
      const restockMap = new Map();
      restockData.forEach((restock) => {
        if (!restockMap.has(restock.productId)) {
          restockMap.set(restock.productId, { quantity: 0, amount: 0 });
        }
        restockMap.get(restock.productId).quantity += restock.quantity;
        restockMap.get(restock.productId).amount += restock.amount;
      });

      // Calculate quantity left and total amount unsold
      stockData.forEach((stock) => {
        stock.product.forEach((product) => {
          const productId = product.id;
          const productName = product.name;
          const totalStock = product.totalStock;
          const totalSold = salesMap.has(productId)
            ? salesMap.get(productId).quantity
            : 0;
          const totalSalesAmount = salesMap.has(productId)
            ? salesMap.get(productId).amount
            : 0;
          const totalRestocked = restockMap.has(productId)
            ? restockMap.get(productId).quantity
            : 0;
          const totalRestockedAmount = restockMap.has(productId)
            ? restockMap.get(productId).amount
            : 0;
          const totalPurchaseQuantity = totalRestocked;
          const totalPurchaseAmount = totalRestockedAmount;
          const quantityLeft = totalStock - totalSold + totalRestocked;
          //const totalAmountUnsold = (totalStock - totalSold) * product.price;

          inventoryMetrics.push({
            productId,
            productName,
            totalSold,
            totalSalesAmount,
            totalPurchaseQuantity,
            totalPurchaseAmount,
            quantityLeft,
            // totalAmountUnsold,
          });
        });
      });

      return inventoryMetrics;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching report',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async debtorsMetrics(
    userId: number,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<DebtorsReport> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const startOfDay = startDate.startOf('day');
      const endOfDay = endDate.endOf('day');

      // Query invoices within the specified date range and with specific payment statuses
      const invoices = await this.prismaService.invoice.findMany({
        where: {
          companyId,
          createdAt: {
            gte: startOfDay.toJSDate(),
            lt: endOfDay.toJSDate(),
          },
          OR: [
            { paymentStatus: PaymentStatus.PART },
            { paymentStatus: PaymentStatus.UNPAID },
          ],
        },
        select: {
          id: true,
          customerId: true,
          totalPrice: true,
        },
      });

      // Calculate total invoice amount for each customer
      const invoiceAmounts = invoices.reduce((acc, invoice) => {
        const customerId = invoice.customerId;
        const totalPrice = parseFloat(invoice.totalPrice.replace(/,/g, ''));
        acc[customerId] = (acc[customerId] || 0) + totalPrice;
        return acc;
      }, {});

      const payments = await this.prismaService.payment.findMany({
        where: {
          companyId,
          createdAt: {
            gte: startOfDay.toJSDate(),
            lt: endOfDay.toJSDate(),
          },
          OR: [
            { paymentMode: PaymentMode.CASH },
            { paymentMode: PaymentMode.TRANSFER },
          ],
        },
        select: {
          customerId: true,
          amountPaid: true,
        },
      });

      // Calculate total payment amount for each customer
      const paymentAmounts = payments.reduce((acc, payment) => {
        const customerId = payment.customerId;
        const amountPaid = parseFloat(payment.amountPaid.replace(/,/g, ''));
        acc[customerId] = (acc[customerId] || 0) + amountPaid;
        return acc;
      }, {});

      const validCustomerIds = Object.keys(invoiceAmounts).filter(
        (customerId) => customerId !== 'null',
      );

      // Construct debtor information for each customer
      const debtorsInfo = [];

      for (const customerId of validCustomerIds) {
        const customerIdNum = parseInt(customerId);
        const totalInvoiceAmount = invoiceAmounts[customerId];
        const totalPaymentAmount = paymentAmounts[customerIdNum] || 0;
        const balance = totalPaymentAmount - totalInvoiceAmount;

        // Fetch customer info only if customerId is not null
        const customerInfo = await this.prismaService.customer.findUnique({
          where: { id: customerIdNum },
          select: {
            id: true,
            companyName: true,
          },
        });

        if (!customerInfo) {
          throw new HttpException(`Customer not found`, HttpStatus.NOT_FOUND);
        }

        // Fetch invoices that the customer currently owes (unpaid or partially paid) within the specified date range
        const invoicesForCustomer = await this.prismaService.invoice.findMany({
          where: {
            customerId: customerIdNum,
            companyId,
            createdAt: {
              gte: startOfDay.toJSDate(),
              lt: endOfDay.toJSDate(),
            },
            OR: [
              { paymentStatus: PaymentStatus.PART },
              { paymentStatus: PaymentStatus.UNPAID },
            ],
          },
          select: {
            id: true,
            invoiceSN: true,
            salesPerson: true,
          },
        });

        const customerInvoice = invoicesForCustomer.map(
          (invoice) => invoice.invoiceSN,
        );

        debtorsInfo.push({
          customerId: customerInfo.id,
          customerName: customerInfo.companyName,
          totalInvoiceAmount,
          totalPaymentAmount,
          balance,
          customerInvoice,
          salesPerson: invoicesForCustomer.map(
            (invoice) => invoice.salesPerson,
          ),
        });
      }

      // Calculate total balance in the company
      let totalBalance: number = 0;
      for (const debtor of debtorsInfo) {
        totalBalance += debtor.balance;
      }

      // Calculate total payments made across all customers
      let totalPaymentsMade: number = 0;
      for (const debtor of debtorsInfo) {
        totalPaymentsMade += debtor.totalPaymentAmount;
      }

      return {
        status: true,
        message: 'Successfully fetched debtors info',
        debtorsInfo: debtorsInfo,
        totalBalance: totalBalance,
        totalPaymentsMade: totalPaymentsMade,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching debtors report',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }
}
