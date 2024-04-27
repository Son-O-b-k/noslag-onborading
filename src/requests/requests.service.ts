import { Injectable, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { CreateSalesRequestDto } from './dto/create-sales-request.dto';
import { UsersService } from 'src/auth/users/users.service';
import { MailService, PrismaService } from 'src/common';
import { Prisma, RequestState, RequestType } from '@prisma/client';
import { UpdateSalesRequestDto } from './dto/update-sales-request.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreateOrderConfirmationDto } from '../orders/dto/create-purchase-confirmation.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}

  /************************ SALES REQUEST STARTS *****************************/

  async createSalesRequest(
    userId: number,
    createRequestDto: CreateSalesRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requestExist = await this.prismaService.request.findFirst({
        where: { REQ: createRequestDto.REQ, companyId },
      });

      if (requestExist) {
        throw new HttpException(
          `Request with serial number ${createRequestDto.REQ} already exist`,
          HttpStatus.CONFLICT,
        );
      }

      const customer = await this.prismaService.customer.findUnique({
        where: { id: createRequestDto.customerId, companyId },
      });

      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      // Check if any item quantity requires approval
      const totalQuantity = createRequestDto.itemDetails.reduce(
        (total, item) => total + Number(item.quantity),
        0,
      );

      // Check for valid product IDs and availability
      await Promise.all(
        createRequestDto.itemDetails.map(async (item) => {
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
          // console.log(stock);

          if (!stock) {
            throw new Error(
              `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
            );
          }
          //console.log(stock.openingStock, item.quantity);

          if (Number(stock.openingStock) === 0) {
            throw new HttpException(
              `Product with name ${product.name} is out of stock`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Check if available quantity is sufficient
          if (Number(item.quantity) > Number(stock.openingStock)) {
            throw new Error(
              `Insufficient quantity for product ${product.name}`,
            );
          }
        }),
      );

      if (createRequestDto.priceListId) {
        const priceList = await this.prismaService.priceList.findUnique({
          where: { id: createRequestDto.priceListId, companyId },
          include: { products: { where: { companyId } } },
        });

        if (!priceList) {
          throw new HttpException(`PriceList not found`, HttpStatus.NOT_FOUND);
        }

        if (priceList.customerType !== customer.customerType) {
          throw new HttpException(
            `PriceList can only be applied to same customer Type`,
            HttpStatus.NOT_FOUND,
          );
        }

        // Compare productIds in the dto with the productIds in the priceList
        const missingProductIds = createRequestDto.productIds?.filter(
          (productId) =>
            !priceList.products.some((product) => product.id === productId),
        );

        if (missingProductIds.length > 0) {
          throw new HttpException(
            `Products with IDs ${missingProductIds.join(
              ', ',
            )} not found in the PriceList`,
            HttpStatus.NOT_FOUND,
          );
        }
      }

      let request;
      if (totalQuantity && totalQuantity > 1000) {
        if (createRequestDto.approverId) {
          const approver = await this.prismaService.user.findUnique({
            where: { id: createRequestDto.approverId, companyId },
          });

          if (!approver) {
            throw new HttpException(
              'Assigned approver not found',
              HttpStatus.NOT_FOUND,
            );
          }

          // Create sales request
          request = await this.prismaService.request.create({
            data: {
              REQ: createRequestDto.REQ,
              name: createRequestDto.customerName,
              type: createRequestDto.type,
              location: createRequestDto.location,
              openedBy: createRequestDto.openedBy,
              opened: createRequestDto.opened,
              dueDate: createRequestDto.dueDate,
              totalPrice: createRequestDto.totalPrice,
              approverName: createRequestDto.approverName,
              approverId: approver.id,
              priceListName: createRequestDto.priceListName,
              itemDetails: createRequestDto?.itemDetails.map((item) => ({
                productId: item?.productId,
                productName: item.productName,
                unitType: item.unitType,
                quantity: item.quantity,
                warehouseName: item.warehouseName,
                amount: item.amount,
                rate: item.rate,
                unit: item.unit,
                baseQty: item.baseQty,
              })),
              customerId: customer.id,
              companyId,
            },
          });

          // Create notification
          const notification =
            await this.prismaService.approvalNotifications.create({
              data: {
                message: `New sales request ${request.REQ} needs approval.`,
                companyId,
                userId: user.id,
                approverId: approver.id,
                requestId: request.id,
                notifierId: createRequestDto.approverId,
              },
            });

          // Send notification
          await this.mailService.salesRequestNotifications(
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
        }
      }

      request = await this.createSalesRequestWithoutApproval(
        companyId,
        customer.id,
        createRequestDto,
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

  private async createSalesRequestWithoutApproval(
    companyId: number,
    customerId: number,
    createRequestDto,
  ) {
    const request = await this.prismaService.request.create({
      data: {
        REQ: createRequestDto.REQ,
        name: createRequestDto.customerName,
        type: createRequestDto.type,
        location: createRequestDto.location,
        openedBy: createRequestDto.openedBy,
        opened: createRequestDto.opened,
        dueDate: createRequestDto.dueDate,
        totalPrice: createRequestDto.totalPrice,
        priceListName: createRequestDto.priceListName,
        state: RequestState.APPROVED,
        approverName: createRequestDto.approverName,
        itemDetails: createRequestDto?.itemDetails.map((item) => ({
          productId: item?.productId,
          productName: item.productName,
          unitType: item.unitType,
          quantity: item.quantity,
          warehouseName: item.warehouseName,
          amount: item.amount,
          rate: item.rate,
          unit: item.unit,
          baseQty: item.baseQty,
        })),
        customerId: customerId,
        companyId,
      },
    });

    return request;
  }

  async updateSalesApprovalRequest(
    userId: number,
    requestId: number,
    UpdateSalesRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    try {
      // console.log(userId);
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the request exists
      const existingRequest = await this.prismaService.request.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Request with id number ${requestId} does not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const getNotification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            approverId: userId,
            companyId,
            requestId: existingRequest.id,
          },
        });

      if (!getNotification) {
        // Handle the case when no notification is found
        throw new HttpException('No notification found', HttpStatus.NOT_FOUND);
      }
      //console.log(getNotification);
      const requestedUser = await this.prismaService.user.findUnique({
        where: { id: getNotification.userId, companyId },
      });
      // Save the updated request
      const updatedRequest = await this.prismaService.request.update({
        where: { id: requestId, companyId },
        data: {
          state: UpdateSalesRequestDto.state,
        },
      });

      if (UpdateSalesRequestDto.state === RequestState.APPROVED) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: { id: getNotification.id },
            data: {
              message: `Request with serial number: ${updatedRequest.REQ} has been approved.`,
              companyId,
              comment: null,
              read: true,
              userId: requestedUser.id,
              approverId: user.id,
              requestId: existingRequest.id,
              notifierId: requestedUser.id,
            },
          });
        //console.log(notification);
        await this.mailService.requestApprovalNotifications(
          notification,
          requestedUser,
          user,
          updatedRequest,
        );
      } else if (UpdateSalesRequestDto.state === RequestState.REJECT) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Request with serial number: ${updatedRequest.REQ} was rejected.`,
              comment: UpdateSalesRequestDto.comment,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              requestId: existingRequest.id,
              notifierId: requestedUser.id,
              read: true,
            },
            // include: { notifier: true },
          });

        await this.mailService.requestRejectionNotifications(
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

  async editSalesRequest(
    userId: number,
    requestId: number,
    updateRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the request exists
      const existingRequest = await this.prismaService.request.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Sales request with id ${requestId} not found`,
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
      //
      // Update the request fields
      const updatedRequest = await this.prismaService.request.update({
        where: { id: requestId, companyId },
        data: {
          name: updateRequestDto.customerName,
          type: updateRequestDto.type,
          location: updateRequestDto.location,
          openedBy: updateRequestDto.openedBy,
          opened: updateRequestDto.opened,
          dueDate: updateRequestDto.dueDate,
          totalPrice: updateRequestDto.totalPrice,
          state: RequestState.PENDING,
          approverName: updateRequestDto.approverName,
          itemDetails: updateRequestDto?.itemDetails?.map((item) => ({
            productId: item?.productId,
            productName: item.productName,
            unitType: item.unitType,
            quantity: item.quantity,
            warehouseName: item.warehouseName,
            amount: item.amount,
            rate: item.rate,
            unit: item.unit,
            baseQty: item.baseQty,
          })),
        },
      });

      // Retrieve existing notification for the given approver and sales order
      const existingNotification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            approverId: approver.id,
            requestId: updatedRequest.id,
          },
        });
      //console.log(existingNotification);

      // If notification doesn't exist, create one
      if (!existingNotification) {
        const notification =
          await this.prismaService.approvalNotifications.create({
            data: {
              message: `Sales request ${updatedRequest.REQ} needs approval.`,
              companyId,
              userId: user.id,
              approverId: approver.id,
              requestId: updatedRequest.id,
              notifierId: approver.id,
            },
          });

        await this.mailService.salesRequestNotifications(
          notification,
          approver,
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

  async getApprovedSalesRequests(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requests = await this.prismaService.request.findMany({
        where: {
          state: RequestState.APPROVED,
          companyId,
          type: RequestType.CUSTOMER,
        },
        include: {
          customer: { where: { companyId } },
          approvalNotifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Requests retrieved successfully',
        data: requests,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSalesRequests(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requests = await this.prismaService.request.findMany({
        where: { companyId, type: RequestType.CUSTOMER },
        include: {
          customer: { where: { companyId } },
          approvalNotifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Requests retrieved successfully',
        data: requests,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async cancelSalesRequest(
    userId: number,
    requestId: number,
    comment?: string,
  ): Promise<any> {
    try {
      console.log('about start');
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requestExist = await this.prismaService.request.findFirst({
        where: { id: requestId, companyId },
      });

      if (!requestExist) {
        throw new HttpException(
          `Request with id number ${requestId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const request = await this.prismaService.request.update({
        where: { id: requestId },
        data: { state: RequestState.CANCELLED, comment },
      });
      console.log('about end');
      let notification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            // approverId: request.approverId,
            companyId,
            requestId: request.id,
          },
        });

      if (notification) {
        const approver = await this.prismaService.user.findUnique({
          where: { id: notification.approverId, companyId },
        });
        notification = await this.prismaService.approvalNotifications.update({
          where: {
            id: notification.id,
            companyId,
          },
          data: {
            message: `Request with serial number: ${request.REQ} was Cancelled.`,
            comment: request.comment,
            companyId,
            userId: user.id,
            approverId: approver.id,
            requestId: request.id,
            notifierId: user.id,
            read: true,
          },
        });

        await this.mailService.requestRejectionNotifications(
          notification,
          approver,
          user,
          request,
        );
      }

      return {
        status: 'Success',
        message: 'Request successfully cancelled',
        data: request,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while canceling request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /************************ SALES REQUEST ENDS *****************************/

  /************************ PURCHASE REQUEST STARTS *****************************/
  async createPurchaseRequest(
    userId: number,
    createRequestDto: CreatePurchaseRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const supplier = await this.prismaService.supplier.findUnique({
        where: { id: createRequestDto.supplierId, companyId },
      });

      if (!supplier) {
        throw new HttpException('Supplier not found', HttpStatus.NOT_FOUND);
      }

      await Promise.all(
        createRequestDto.itemDetails.map(async (item) => {
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
        }),
      );

      const warehousePromises = (createRequestDto.itemDetails || []).map(
        async (item) => {
          const warehouse = await this.prismaService.wareHouse.findFirst({
            where: {
              name: {
                equals: item.warehouseName.trim(),
                mode: 'insensitive',
              },
              companyId,
            },
            include: {
              products: { where: { name: item.productName } },
            },
          });
          if (!warehouse) {
            throw new HttpException(
              `Warehouse not found for request with warehouseName: ${item.warehouseName}`,
              HttpStatus.NOT_FOUND,
            );
          }

          return warehouse;
        },
      );

      const warehouses = await Promise.all(warehousePromises);

      // const hasProductsInAnyWarehouse = warehouses.map((warehouse) => {
      //   if (!warehouse.products || warehouse.products.length === 0) {
      //     throw new HttpException(
      //       `Product name does not exist in warehouse ${warehouse.name}`,
      //       HttpStatus.NOT_FOUND,
      //     );
      //   }
      //   return true;
      // });

      if (warehouses.every((hasProducts) => !hasProducts)) {
        throw new HttpException(
          'Product not found in any warehouse',
          HttpStatus.NOT_FOUND,
        );
      }

      const existingRequest = await this.prismaService.request.findFirst({
        where: { REQ: createRequestDto.REQ, companyId },
      });

      if (existingRequest) {
        throw new HttpException(
          `Request already created with this request serial number ${createRequestDto.REQ} `,
          HttpStatus.BAD_REQUEST,
        );
      }
      const approver = await this.prismaService.user.findUnique({
        where: { id: createRequestDto.approverId, companyId },
      });
      if (!approver) {
        throw new HttpException(
          `Approver with id ${createRequestDto.approverId} does not exist`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const request = await this.prismaService.request.create({
        data: {
          REQ: createRequestDto.REQ,
          name: createRequestDto.supplierName,
          type: createRequestDto.type,
          location: createRequestDto.location,
          openedBy: createRequestDto.openedBy,
          opened: createRequestDto.opened,
          dueDate: createRequestDto.dueDate,
          totalPrice: createRequestDto.totalPrice,
          approverName: createRequestDto.approverName,
          itemDetails: createRequestDto?.itemDetails.map((item) => ({
            productId: item?.productId,
            productName: item.productName,
            unitType: item.unitType,
            quantity: item.quantity,
            warehouseName: item.warehouseName,
            amount: item.amount,
            rate: item.rate,
            unit: item.unit,
            baseQty: item.baseQty,
          })),
          supplierId: supplier.id,
          companyId,
        },
      });
      // console.log(userId);
      const notification =
        await this.prismaService.approvalNotifications.create({
          data: {
            message: `New purchase request ${request.REQ} needs approval.`,
            companyId,
            userId: user.id,
            approverId: approver.id,
            requestId: request.id,
            notifierId: approver.id,
          },
        });

      await this.mailService.purchaseRequestNotifications(
        notification,
        approver,
        user,
        request,
      );

      return {
        status: 'Success',
        data: request,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updatePurchaseApprovalRequest(
    userId: number,
    requestId: number,
    updateSalesRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    try {
      // console.log(userId);
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the request exists
      const existingRequest = await this.prismaService.request.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Request with id number ${requestId} does not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const getNotification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            approverId: userId,
            companyId,
            requestId: existingRequest.id,
          },
        });

      if (!getNotification) {
        // Handle the case when no notification is found
        throw new HttpException('No notification found', HttpStatus.NOT_FOUND);
      }
      //console.log(getNotification);
      const requestedUser = await this.prismaService.user.findUnique({
        where: { id: getNotification.userId, companyId },
      });
      // Save the updated request
      const updatedRequest = await this.prismaService.request.update({
        where: { id: requestId, companyId },
        data: {
          state: updateSalesRequestDto.state,
        },
      });

      if (updateSalesRequestDto.state === RequestState.APPROVED) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: { id: getNotification.id },
            data: {
              message: `Request with serial number: ${updatedRequest.REQ} has been approved.`,
              companyId,
              comment: null,
              read: true,
              userId: requestedUser.id,
              approverId: user.id,
              requestId: existingRequest.id,
              notifierId: requestedUser.id,
            },
          });

        await this.mailService.requestApprovalNotifications(
          notification,
          requestedUser,
          user,
          updatedRequest,
        );
      } else if (updateSalesRequestDto.state === RequestState.REJECT) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Request with serial number: ${updatedRequest.REQ} was rejected.`,
              comment: updateSalesRequestDto.comment,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              requestId: existingRequest.id,
              notifierId: requestedUser.id,
              read: true,
            },
          });

        await this.mailService.requestRejectionNotifications(
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
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPurchaseRequests(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requests = await this.prismaService.request.findMany({
        where: { companyId, type: RequestType.SUPPLIER },
        include: {
          supplier: { where: { companyId } },
          approvalNotifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Requests retrieved successfully',
        data: requests,
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

  async getApprovedPurchaseRequests(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const requests = await this.prismaService.request.findMany({
        where: {
          state: RequestState.APPROVED,
          companyId,
          type: RequestType.SUPPLIER,
        },
        include: {
          customer: { where: { companyId } },
          approvalNotifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Requests retrieved successfully',
        data: requests,
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

  async editPurchaseRequest(
    userId: number,
    requestId: number,
    updateRequestDto: UpdatePurchaseRequestDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the request exists
      const existingRequest = await this.prismaService.request.findUnique({
        where: { id: requestId, companyId },
      });

      if (!existingRequest) {
        throw new HttpException(
          `Purchase request with id ${requestId} not found`,
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
      const updatedRequest = await this.prismaService.request.update({
        where: { id: requestId, companyId },
        data: {
          name: updateRequestDto.supplierName,
          type: updateRequestDto.type,
          location: updateRequestDto.location,
          openedBy: updateRequestDto.openedBy,
          opened: updateRequestDto.opened,
          dueDate: updateRequestDto.dueDate,
          totalPrice: updateRequestDto.totalPrice,
          approverName: updateRequestDto.approverName,
          itemDetails: updateRequestDto?.itemDetails?.map((item) => ({
            productId: item?.productId,
            productName: item.productName,
            unitType: item.unitType,
            quantity: item.quantity,
            warehouseName: item.warehouseName,
            amount: item.amount,
            rate: item.rate,
            unit: item.unit,
            baseQty: item.baseQty,
          })),
        },
      });

      const notification =
        await this.prismaService.approvalNotifications.create({
          data: {
            message: `Purchase request ${updatedRequest.REQ} needs approval.`,
            companyId,
            userId: user.id,
            approverId: approver.id,
            requestId: updatedRequest.id,
            notifierId: approver.id,
          },
        });

      await this.mailService.purchaseRequestNotifications(
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
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /************************ PURCHASE REQUEST ENDS *****************************/

  async getRequestByREQ(userId: number, requestNumber: string): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const request = await this.prismaService.request.findFirst({
        where: { REQ: requestNumber, companyId },
        include: {
          customer: { where: { companyId } },
          supplier: { where: { companyId } },
          approvalNotifications: { where: { companyId } },
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

  async sendEmailToCustomer(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const request = await this.prismaService.request.findUnique({
        where: { id, companyId },
      });

      if (!request) {
        throw new HttpException(
          `Customer request with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const customerId: number = request.customerId;
      const customer = await this.prismaService.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new HttpException(`Customer not found`, HttpStatus.NOT_FOUND);
      }

      const itemDetails: {
        rate: string;
        amount: string;
        quantity: string;
        productId: number;
        productName: string;
        warehouseName: string;
      }[] = request.itemDetails as {
        rate: string;
        amount: string;
        quantity: string;
        productId: number;
        productName: string;
        warehouseName: string;
      }[];

      // Compose email body
      let emailBody = `
        <p class="sm-leading-8" style="margin: 0; margin-bottom: 24px; font-size: 24px; font-weight: 600; color: #000;">Product Details</p>
        <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0" role="presentation">
          <thead>
            <tr>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Product Name</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Rate</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Amount</th>
            </tr>
          </thead>
          <tbody>`;

      // Populate table rows with item details
      itemDetails.forEach((item: any) => {
        emailBody += `
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.productName}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.quantity}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.rate}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.amount}</td>
          </tr>`;
      });

      emailBody += `</tbody>
        </table>`;

      // Add more information to the email body
      emailBody += `
        <p>Company Name: ${user.adminCompanyId.organizationName}</p>
        <p>S/N: ${request.REQ}</p>
        <p>Location: ${request.location}</p>
        <p>Total Price: ${request.totalPrice}</p>
        <p>Customer Name: ${customer.companyName ? customer.companyName : customer.displayName}</p>
        <p>Customer Type: ${customer.type}</p>
        
  
        <p>Thank you for your patronage!</p>
      `;

      // Send email to the customer
      await this.mailService.sendEmailToCustomer(
        customer.companyEmail,
        emailBody,
      );

      return {
        status: 'Success',
        message: 'Quote successfully sent',
      };
    } catch (error) {
      this.logger.error(error);
      console.error(
        `Error sending email to customer: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
