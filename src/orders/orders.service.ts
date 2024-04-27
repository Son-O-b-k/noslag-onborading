import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { MailService, PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  ItemRate,
  OrderType,
  Prisma,
  PurchaseOrder,
  RequestState,
  SalesOrder,
} from '@prisma/client';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateOrderConfirmationDto } from './dto/create-purchase-confirmation.dto';
import { DateTime } from 'luxon';
import { Invoice } from 'src/invoice/entities/invoice.entity';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersservice: UsersService,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}

  /************************ SALES ORDER START*****************************/

  async CreateSalesOrder(
    createSalesOrderDto: CreateSalesOrderDto,
    userId: number,
  ) {
    try {
      //console.log('yes');
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      //console.log(user);

      const customer = await this.prismaService.customer.findUnique({
        where: { id: createSalesOrderDto.customerId, companyId },
      });

      if (!customer) {
        throw new HttpException(
          `Customer with name ${createSalesOrderDto.customerName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      // Check if any item quantity requires approval
      const totalQuantity = createSalesOrderDto.itemDetails.reduce(
        (total, item) => total + Number(item.quantity),
        0,
      );

      // Check for valid product IDs and availability

      await Promise.all(
        createSalesOrderDto.itemDetails.map(async (item) => {
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
              `Stock not found for product ${product.name} and warehouse name ${item.warehouseName}`,
            );
          }

          if (Number(stock.openingStock) === 0) {
            throw new HttpException(
              `Product with name ${product.name} is out of stock`,
              HttpStatus.BAD_REQUEST,
            );
          }
        }),
      );

      if (createSalesOrderDto.priceListId) {
        const priceList = await this.prismaService.priceList.findUnique({
          where: { id: createSalesOrderDto.priceListId, companyId },
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
        const missingProductIds = createSalesOrderDto.productIds?.filter(
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
      const existingSalesOrder = await this.prismaService.salesOrder.findFirst({
        where: { SN: createSalesOrderDto.SN, companyId },
      });

      const request = await this.prismaService.request.findUnique({
        where: { id: createSalesOrderDto.requestId, companyId },
      });

      if (!request) {
        throw new HttpException(`Invalid request ID`, HttpStatus.NOT_FOUND);
      }

      if (existingSalesOrder) {
        throw new HttpException(
          `sales order already created with this number ${createSalesOrderDto.SN} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      const assignedTo = await this.prismaService.user.findUnique({
        where: {
          id: createSalesOrderDto.assignedToId,
          companyId,
        },
      });

      if (!assignedTo) {
        throw new HttpException(
          'Assigned user does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      let salesOrder: SalesOrder;
      if (totalQuantity && totalQuantity > 1000) {
        if (createSalesOrderDto.type === OrderType.APPROVAL) {
          if (createSalesOrderDto.approverId) {
            const approver = await this.prismaService.user.findUnique({
              where: {
                id: createSalesOrderDto.approverId,
                companyId,
              },
            });

            if (!approver) {
              throw new HttpException(
                'Assigned approver does not exist',
                HttpStatus.NOT_FOUND,
              );
            }

            // Update committed stock and opening stock
            await this.updateStock(createSalesOrderDto.itemDetails, companyId);

            salesOrder = await this.prismaService.salesOrder.create({
              data: {
                SN: createSalesOrderDto.SN,
                customerName: createSalesOrderDto.customerName,
                customerId: customer.id,
                shipmentDate: createSalesOrderDto.shipmentDate,
                requestId: createSalesOrderDto.requestId,
                location: createSalesOrderDto.location,
                shippingAddress: createSalesOrderDto.shippingAddress,
                shippingCharges: createSalesOrderDto.shippingCharges,
                priceListName: createSalesOrderDto.priceListName,
                discount: createSalesOrderDto.discount,
                priority: createSalesOrderDto.priority,
                totalItems: createSalesOrderDto.totalItems,
                totalPrice: createSalesOrderDto.totalPrice,
                state: createSalesOrderDto.state,
                status: createSalesOrderDto.status,
                approverId: approver.id,
                assignedToId: assignedTo.id,
                type: createSalesOrderDto.type,
                openedBy: user.primaryContactName,
                itemDetails: createSalesOrderDto?.itemDetails.map((item) => ({
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
                companyId,
              },
              include: { approver: { where: { companyId } } },
            });

            const notification =
              await this.prismaService.approvalNotifications.create({
                data: {
                  message: `New sales order ${salesOrder.SN} needs approval.`,
                  companyId,
                  userId: user.id,
                  approverId: approver.id,
                  salesOrderId: salesOrder.id,
                  notifierId: approver.id,
                },
              });

            await this.mailService.salesOrderNotifications(
              notification,
              approver,
              user,
              salesOrder,
            );
          } else if (createSalesOrderDto.departmentIds) {
            let existingDepartments: any[] = [];

            //checks and ensure departmentId is always an array
            const departmentIdArray = Array.isArray(
              createSalesOrderDto.departmentIds,
            )
              ? createSalesOrderDto.departmentIds
              : [createSalesOrderDto.departmentIds];

            // Check if the departments exist
            existingDepartments = await this.prismaService.department.findMany({
              where: { id: { in: departmentIdArray } },
            });

            if (existingDepartments.length !== departmentIdArray.length) {
              const missingDepartmentIds = departmentIdArray.filter(
                (id) =>
                  !existingDepartments.some(
                    (department) => department.id === id,
                  ),
              );
              throw new HttpException(
                `Departments with IDs ${missingDepartmentIds.join(
                  ', ',
                )} not found`,
                HttpStatus.NOT_FOUND,
              );
            }

            // Update committed stock and opening stock
            await this.updateStock(createSalesOrderDto.itemDetails, companyId);

            salesOrder = await this.prismaService.salesOrder.create({
              data: {
                SN: createSalesOrderDto.SN,
                customerName: createSalesOrderDto.customerName,
                customerId: customer.id,
                shipmentDate: createSalesOrderDto.shipmentDate,
                shippingAddress: createSalesOrderDto.shippingAddress,
                shippingCharges: createSalesOrderDto.shippingCharges,
                priceListName: createSalesOrderDto.priceListName,
                discount: createSalesOrderDto.discount,
                priority: createSalesOrderDto.priority,
                totalItems: createSalesOrderDto.totalItems,
                totalPrice: createSalesOrderDto.totalPrice,
                state: createSalesOrderDto.state,
                status: createSalesOrderDto.status,
                type: createSalesOrderDto.type,
                openedBy: user.primaryContactName,
                itemDetails: createSalesOrderDto?.itemDetails.map((item) => ({
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
                companyId,
              },
            });

            // Associate the task with each department
            await Promise.all(
              existingDepartments.map(async (department) => {
                const departments = await this.prismaService.department.update({
                  where: { id: department.id, companyId },
                  data: { salesOrder: { connect: { id: salesOrder.id } } },
                  include: { users: true },
                });

                // Notify each user in the department
                await Promise.all(
                  departments.users.map(async (userInDepartment) => {
                    const notification =
                      await this.prismaService.approvalNotifications.create({
                        data: {
                          message: `New sales order ${salesOrder.SN} needs approval.`,
                          companyId,
                          userId: user.id,
                          approverId: userInDepartment.id,
                          salesOrderId: salesOrder.id,
                          notifierId: userInDepartment.id,
                        },
                      });
                    await this.mailService.salesOrderNotifications(
                      notification,
                      userInDepartment,
                      user,
                      salesOrder,
                    );
                  }),
                );
              }),
            );
          }
          await this.prismaService.request.update({
            where: {
              id: createSalesOrderDto.requestId,
            },
            data: {
              state: RequestState.COMPLETED,
              companyId,
            },
          });
        } else if (createSalesOrderDto.type === OrderType.DRAFT) {
          // await this.updateStock(createSalesOrderDto.itemDetails, companyId);

          salesOrder = await this.prismaService.salesOrder.create({
            data: {
              SN: createSalesOrderDto.SN,
              customerName: createSalesOrderDto.customerName,
              customerId: customer.id,
              shipmentDate: createSalesOrderDto.shipmentDate,
              requestId: createSalesOrderDto.requestId,
              location: createSalesOrderDto.location,
              shippingAddress: createSalesOrderDto.shippingAddress,
              shippingCharges: createSalesOrderDto.shippingCharges,
              priceListName: createSalesOrderDto.priceListName,
              discount: createSalesOrderDto.discount,
              priority: createSalesOrderDto.priority,
              totalItems: createSalesOrderDto.totalItems,
              totalPrice: createSalesOrderDto.totalPrice,
              state: createSalesOrderDto.state,
              status: createSalesOrderDto.status,
              approverId: createSalesOrderDto.approverId,
              assignedToId: assignedTo.id,
              type: createSalesOrderDto.type,
              openedBy: user.primaryContactName,
              itemDetails: createSalesOrderDto?.itemDetails.map((item) => ({
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
              companyId,
            },
            include: { approver: { where: { companyId } } },
          });
        }

        return {
          status: 'Success',
          message: 'Sales Order created successfully',
          data: salesOrder,
        };
      }

      // Update committed stock and opening stock
      //await this.updateStock(createSalesOrderDto.itemDetails, companyId);

      salesOrder = await this.createSalesOrderWithoutApproval(
        companyId,
        customer.id,
        user,
        assignedTo,
        createSalesOrderDto,
      );

      return {
        status: 'Success',
        message: 'Sales Order created successfully',
        data: salesOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateStock(itemDetails, companyId: number): Promise<void> {
    try {
      // Start a transaction
      await this.prismaService.$transaction(async (prisma) => {
        await Promise.all(
          itemDetails.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { id: Number(item.productId), companyId },
              include: {
                stocks: {
                  where: { warehouseName: item.warehouseName },
                  orderBy: { createdAt: 'asc' },
                },
              },
            });

            // Track remaining quantity needed
            let remainingQuantity = Number(item.quantity);

            for (const stock of product.stocks) {
              // Check if there's enough quantity in the current batch
              if (remainingQuantity > 0 && Number(stock.openingStock) > 0) {
                const quantityToDeduct = Math.min(
                  remainingQuantity,
                  Number(stock.openingStock),
                );

                // Update stock in the database
                await prisma.stock.update({
                  where: { id: stock.id },
                  data: {
                    openingStock: String(
                      Number(stock.openingStock) - quantityToDeduct,
                    ), // Decrease opening stock by the quantity deducted
                    committedQuantity:
                      Number(stock.committedQuantity) + quantityToDeduct,
                  },
                });

                remainingQuantity -= quantityToDeduct; // Update remaining quantity needed

                if (remainingQuantity === 0) {
                  // If remaining quantity becomes zero, exit loop
                  break;
                }
              }
            }

            // Check if the entire quantity is fulfilled
            if (remainingQuantity > 0) {
              // Throw error if quantity is still not fulfilled after checking all batches
              throw new Error(
                `Insufficient quantity for product ${product.name}`,
              );
            }
          }),
        );
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating stock',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async createSalesOrderWithoutApproval(
    companyId,
    customerId,
    user,
    assignedTo,
    createSalesOrderDto,
  ): Promise<any> {
    try {
      let salesOrder: SalesOrder;

      if (createSalesOrderDto.type === OrderType.DRAFT) {
        // console.log('DRAFT');
        salesOrder = await this.prismaService.salesOrder.create({
          data: {
            SN: createSalesOrderDto.SN,
            customerName: createSalesOrderDto.customerName,
            customerId,
            shipmentDate: createSalesOrderDto.shipmentDate,
            requestId: createSalesOrderDto.requestId,
            location: createSalesOrderDto.location,
            shippingAddress: createSalesOrderDto.shippingAddress,
            shippingCharges: createSalesOrderDto.shippingCharges,
            priceListName: createSalesOrderDto.priceListName,
            discount: createSalesOrderDto.discount,
            priority: createSalesOrderDto.priority,
            totalItems: createSalesOrderDto.totalItems,
            totalPrice: createSalesOrderDto.totalPrice,
            state: createSalesOrderDto.state,
            status: RequestState.APPROVED,
            approverId: createSalesOrderDto.approverId,
            assignedToId: assignedTo.id,
            type: createSalesOrderDto.type,
            openedBy: user.primaryContactName,
            itemDetails: createSalesOrderDto?.itemDetails.map((item) => ({
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
            companyId,
          },
          include: { approver: { where: { companyId } } },
        });

        return salesOrder;
      }
      //console.log('Yes');
      await this.updateStock(createSalesOrderDto.itemDetails, companyId);
      salesOrder = await this.prismaService.salesOrder.create({
        data: {
          SN: createSalesOrderDto.SN,
          customerName: createSalesOrderDto.customerName,
          customerId,
          shipmentDate: createSalesOrderDto.shipmentDate,
          requestId: createSalesOrderDto.requestId,
          location: createSalesOrderDto.location,
          shippingAddress: createSalesOrderDto.shippingAddress,
          shippingCharges: createSalesOrderDto.shippingCharges,
          priceListName: createSalesOrderDto.priceListName,
          discount: createSalesOrderDto.discount,
          priority: createSalesOrderDto.priority,
          totalItems: createSalesOrderDto.totalItems,
          totalPrice: createSalesOrderDto.totalPrice,
          state: createSalesOrderDto.state,
          status: RequestState.APPROVED,
          approverId: createSalesOrderDto.approverId,
          assignedToId: assignedTo.id,
          type: createSalesOrderDto.type,
          openedBy: user.primaryContactName,
          itemDetails: createSalesOrderDto?.itemDetails.map((item) => ({
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
          companyId,
        },
        include: { approver: { where: { companyId } } },
      });

      await this.prismaService.request.update({
        where: {
          id: createSalesOrderDto.requestId,
        },
        data: {
          state: RequestState.COMPLETED,
          companyId,
        },
      });
      //console.log(salesOrder);
      return salesOrder;
    } catch (error) {
      throw error;
    }
  }

  async getSalesOrder(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const salesOrder = await this.prismaService.salesOrder.findMany({
        where: { companyId },
        include: {
          request: { where: { companyId } },
          notifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'SalesOrder retrieved successfully',
        data: salesOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSalesOrderById(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const salesOrder = await this.prismaService.salesOrder.findUnique({
        where: { id, companyId },
        include: {
          request: { where: { companyId } },
          notifications: { where: { companyId } },
        },
      });

      if (!salesOrder) {
        throw new HttpException(
          `Sales order with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        message: 'SalesOrder retrieved successfully',
        data: salesOrder,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getApprovedSalesOrder(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const salesOrder = await this.prismaService.salesOrder.findMany({
        where: { status: RequestState.APPROVED, companyId },
        include: { request: { where: { companyId } } },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'SalesOrder retrieved successfully',
        data: salesOrder,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSalesOrderDraft(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const salesOrder = await this.prismaService.salesOrder.findMany({
        where: { type: OrderType.DRAFT, companyId },
        include: { request: { where: { companyId } } },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'SalesOrder retrieved successfully',
        data: salesOrder,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateApprovedSalesOrder(
    userId: number,
    orderId: number,
    updateOrderDto: UpdateSalesOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the Order exists
      const existingOrder = await this.prismaService.salesOrder.findUnique({
        where: { id: orderId, companyId },
        include: { request: { where: { companyId } } },
      });

      if (!existingOrder) {
        throw new HttpException(
          `Sales Order with id number ${orderId} does not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      const getNotification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            approverId: userId,
            companyId,
            salesOrderId: existingOrder.id,
          },
        });

      if (!getNotification) {
        throw new HttpException(
          'No sales order notifications found',
          HttpStatus.NOT_FOUND,
        );
      }
      //console.log(getNotification);
      const requestedUser = await this.prismaService.user.findUnique({
        where: { id: getNotification.userId, companyId },
      });
      // Save the updated request
      const updateOrder = await this.prismaService.salesOrder.update({
        where: { id: orderId, companyId },
        data: {
          status: updateOrderDto.status,
        },
      });
      //console.log(updateOrder);
      if (updateOrderDto.status === RequestState.APPROVED) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Sales with serial number: ${updateOrder.SN} has been approved.`,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              salesOrderId: existingOrder.id,
              notifierId: requestedUser.id,
              read: true,
            },
          });

        await this.mailService.salesApprovalNotifications(
          notification,
          requestedUser,
          user,
          updateOrder,
        );
      } else if (updateOrderDto.status === RequestState.REJECT) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Sales with serial number: ${updateOrder.SN} was rejected.`,
              comment: updateOrderDto.comment,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              salesOrderId: existingOrder.id,
              notifierId: requestedUser.id,
              read: true,
            },
          });
        // console.log(notification);
        await this.mailService.salesRejectionNotifications(
          notification,
          requestedUser,
          user,
          updateOrder,
        );
      }
      return {
        status: 'Successfully updated',
        data: updateOrder,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while processing this request',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateSalesOrderFields(
    userId: number,
    orderId: number,
    updateSalesOrderDto: UpdateSalesOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingOrder = await this.prismaService.salesOrder.findUnique({
        where: { id: orderId, companyId },
      });

      if (!existingOrder) {
        throw new HttpException(
          `Sales Order with id number ${orderId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const requestId = await this.prismaService.request.findUnique({
        where: { id: updateSalesOrderDto.requestId, companyId },
      });

      //console.log(existingOrder);
      if (!requestId) {
        throw new HttpException(
          `Request Order with id number ${updateSalesOrderDto.requestId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Create an object to hold the dynamic update data
      const dynamicUpdateData: Record<string, any> = {};

      // Iterate over the fields in updateOrderDto and add them to dynamicUpdateData
      for (const field in updateSalesOrderDto) {
        dynamicUpdateData[field] = updateSalesOrderDto[field];
      }

      let salesOrder: SalesOrder;
      if (Object.keys(dynamicUpdateData).length > 0) {
        if (updateSalesOrderDto.type === OrderType.APPROVAL) {
          if (updateSalesOrderDto.approverId) {
            const approver = await this.prismaService.user.findUnique({
              where: {
                id: updateSalesOrderDto.approverId,
                companyId,
              },
              include: { approverNotifications: true },
            });

            if (!approver) {
              throw new HttpException(
                'Assigned approver does not exist',
                HttpStatus.NOT_FOUND,
              );
            }

            // Save the updated request with dynamic data
            salesOrder = await this.prismaService.salesOrder.update({
              where: { id: orderId, companyId },
              data: {
                ...dynamicUpdateData,
                status: RequestState.PENDING,
              },
            });

            // Retrieve existing notification for the given approver and sales order
            let existingNotification =
              await this.prismaService.approvalNotifications.findFirst({
                where: {
                  approverId: approver.id,
                  salesOrderId: salesOrder.id,
                },
              });

            // If notification doesn't exist, create one
            if (!existingNotification) {
              existingNotification =
                await this.prismaService.approvalNotifications.create({
                  data: {
                    message: `New sales order ${salesOrder.SN} needs approval.`,
                    companyId,
                    userId: user.id,
                    approverId: approver.id,
                    salesOrderId: salesOrder.id,
                    notifierId: approver.id,
                  },
                });
            }
            // Send email notification
            await this.mailService.salesOrderNotifications(
              existingNotification,
              approver,
              user,
              salesOrder,
            );

            await this.prismaService.request.update({
              where: {
                id: updateSalesOrderDto.requestId,
              },
              data: {
                state: RequestState.COMPLETED,
                companyId,
              },
            });

            return {
              status: 'Successfully Updated',
              data: salesOrder,
            };
          } else if (updateSalesOrderDto.departmentIds) {
            let existingDepartments: any[] = [];

            //checks and ensure departmentId is always an array
            const departmentIdArray = Array.isArray(
              updateSalesOrderDto.departmentIds,
            )
              ? updateSalesOrderDto.departmentIds
              : [updateSalesOrderDto.departmentIds];

            // Check if the departments exist
            existingDepartments = await this.prismaService.department.findMany({
              where: { id: { in: departmentIdArray } },
            });

            if (existingDepartments.length !== departmentIdArray.length) {
              const missingDepartmentIds = departmentIdArray.filter(
                (id) =>
                  !existingDepartments.some(
                    (department) => department.id === id,
                  ),
              );
              throw new HttpException(
                `Departments with IDs ${missingDepartmentIds.join(
                  ', ',
                )} not found`,
                HttpStatus.NOT_FOUND,
              );
            }

            salesOrder = await this.prismaService.salesOrder.update({
              where: { id: orderId, companyId },
              data: dynamicUpdateData,
            });

            // Associate the task with each department
            await Promise.all(
              existingDepartments.map(async (department) => {
                const departments = await this.prismaService.department.update({
                  where: { id: department.id, companyId },
                  data: { salesOrder: { connect: { id: salesOrder.id } } },
                  include: { users: true },
                });

                // Notify each user in the department
                await Promise.all(
                  departments.users.map(async (userInDepartment) => {
                    // Retrieve existing notification for the given approver and sales order
                    let existingNotification =
                      await this.prismaService.approvalNotifications.findFirst({
                        where: {
                          approverId: userInDepartment.id,
                          salesOrderId: salesOrder.id,
                        },
                      });

                    if (!existingNotification) {
                      existingNotification =
                        await this.prismaService.approvalNotifications.create({
                          data: {
                            message: `New sales order ${salesOrder.SN} needs approval.`,
                            companyId,
                            userId: user.id,
                            approverId: userInDepartment.id,
                            salesOrderId: salesOrder.id,
                            notifierId: userInDepartment.id,
                          },
                        });
                    }
                    await this.mailService.salesOrderNotifications(
                      existingNotification,
                      userInDepartment,
                      user,
                      salesOrder,
                    );
                  }),
                );
              }),
            );

            await this.prismaService.request.update({
              where: {
                id: updateSalesOrderDto.requestId,
              },
              data: {
                state: RequestState.COMPLETED,
                companyId,
              },
            });

            return {
              status: 'Successfully Updated',
              data: salesOrder,
            };
          }

          // Save the updated request with dynamic data
          salesOrder = await this.prismaService.salesOrder.update({
            where: { id: orderId, companyId },
            data: {
              ...dynamicUpdateData,
              status: RequestState.APPROVED,
            },
          });

          await this.prismaService.request.update({
            where: {
              id: updateSalesOrderDto.requestId,
            },
            data: {
              state: RequestState.COMPLETED,
              companyId,
            },
          });

          return {
            status: 'Successfully Updated Order',
            data: salesOrder,
          };
        }
      } else {
        throw new HttpException(`No fields provided`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating sales order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async cancelSalesOrder(userId: number, orderId: number, comment: string) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Retrieve the sales details including the items sold
      const salesOrder = await this.prismaService.salesOrder.findUnique({
        where: { id: orderId, companyId },
      });

      if (!salesOrder) {
        throw new HttpException('Sales Order not found', HttpStatus.NOT_FOUND);
      }

      // Restore the inventory by adding back the quantities of items sold
      await this.returnStock(salesOrder.itemDetails, companyId);

      // Update the status of the request to "Canceled"
      const order = await this.prismaService.salesOrder.update({
        where: { id: orderId },
        data: { status: RequestState.CANCELLED, comment },
      });

      return {
        status: 'Success',
        message: 'Sales order canceled successfully',
        data: order,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while canceling the invoice',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async returnStock(itemDetails, companyId: number): Promise<void> {
    try {
      // Start a transaction
      await this.prismaService.$transaction(async (prisma) => {
        await Promise.all(
          itemDetails.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { id: Number(item.productId), companyId },
              include: {
                stocks: {
                  where: { warehouseName: item.warehouseName },
                  orderBy: { createdAt: 'asc' },
                },
              },
            });

            // Track returned quantity
            let returnedQuantity = Number(item.quantity);

            for (const stock of product.stocks) {
              // Check if the stock has committed quantity to return
              if (returnedQuantity > 0 && Number(stock.committedQuantity) > 0) {
                const quantityToReturn = Math.min(
                  returnedQuantity,
                  Number(stock.committedQuantity),
                );

                // Update stock in the database
                await prisma.stock.update({
                  where: { id: stock.id },
                  data: {
                    openingStock: String(
                      Number(stock.openingStock) + quantityToReturn,
                    ), // Increase opening stock by the quantity returned
                    committedQuantity:
                      Number(stock.committedQuantity) - quantityToReturn, // Decrease committed quantity
                  },
                });

                returnedQuantity -= quantityToReturn; // Update returned quantity

                if (returnedQuantity === 0) {
                  // If returned quantity becomes zero, exit loop
                  break;
                }
              }
            }

            // Check if the entire quantity is returned
            if (returnedQuantity > 0) {
              // Throw error if quantity is still not returned after checking all batches
              throw new Error(
                `Unable to return all quantities for product ${product.name}`,
              );
            }
          }),
        );
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while returning stock',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /************************ SALES ORDER END*****************************/

  /************************ PURCHASE ORDER START*****************************/

  async CreatePurchaseOrder(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    userId: number,
  ) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const supplier = await this.prismaService.supplier.findUnique({
        where: { id: createPurchaseOrderDto.supplierId, companyId },
      });

      if (!supplier) {
        throw new HttpException(
          `Supplier with name ${createPurchaseOrderDto.supplierName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      const request = await this.prismaService.request.findUnique({
        where: { id: createPurchaseOrderDto.requestId, companyId },
      });

      if (!request) {
        throw new HttpException(`Invalid request ID`, HttpStatus.NOT_FOUND);
      }

      await Promise.all(
        createPurchaseOrderDto.itemDetails.map(async (item) => {
          console.log(item.productId);
          const product = await this.prismaService.product.findUnique({
            where: { id: Number(item.productId) },
            // include: { stocks: true },
          });

          if (!product) {
            throw new HttpException(
              `Invalid product ID: ${item.productId}`,
              HttpStatus.BAD_REQUEST,
            );
          }
        }),
      );

      if (createPurchaseOrderDto.priceListId) {
        const priceList = await this.prismaService.priceList.findUnique({
          where: { id: createPurchaseOrderDto.priceListId, companyId },
          include: { products: { where: { companyId } } },
        });

        if (!priceList) {
          throw new HttpException(`PriceList not found`, HttpStatus.NOT_FOUND);
        }

        // if (priceList.customerType !== supplier.customerType) {
        //   throw new HttpException(
        //     `PriceList can only be applied to same customer Type`,
        //     HttpStatus.NOT_FOUND,
        //   );
        // }

        // Compare productIds in the dto with the productIds in the priceList
        const missingProductIds = createPurchaseOrderDto.productIds.filter(
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
      const existingPurchaseOrder =
        await this.prismaService.purchaseOrder.findFirst({
          where: { SN: createPurchaseOrderDto.SN, companyId },
        });

      if (existingPurchaseOrder) {
        throw new HttpException(
          `Purchase order already created with this number ${createPurchaseOrderDto.SN} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      let purchaseOrder: PurchaseOrder;

      if (createPurchaseOrderDto.type === OrderType.APPROVAL) {
        if (createPurchaseOrderDto.approverId) {
          const approver = await this.prismaService.user.findUnique({
            where: {
              id: createPurchaseOrderDto.approverId,
              companyId,
            },
          });

          if (!approver) {
            throw new HttpException(
              'Assigned approver does not exist',
              HttpStatus.NOT_FOUND,
            );
          }

          const assignedTo = await this.prismaService.user.findUnique({
            where: {
              id: createPurchaseOrderDto.assignedToId,
              companyId,
            },
          });

          if (!assignedTo) {
            throw new HttpException(
              'Assigned user does not exist',
              HttpStatus.NOT_FOUND,
            );
          }

          purchaseOrder = await this.prismaService.purchaseOrder.create({
            data: {
              SN: createPurchaseOrderDto.SN,
              supplierName: createPurchaseOrderDto.supplierName,
              supplierId: supplier.id,
              shipmentDate: createPurchaseOrderDto.shipmentDate,
              requestId: createPurchaseOrderDto.requestId,
              location: createPurchaseOrderDto.location,
              shippingAddress: createPurchaseOrderDto.shippingAddress,
              shippingCharges: createPurchaseOrderDto.shippingCharges,
              priceListName: createPurchaseOrderDto.priceListName,
              discount: createPurchaseOrderDto.discount,
              priority: createPurchaseOrderDto.priority,
              totalItems: createPurchaseOrderDto.totalItems,
              totalPrice: createPurchaseOrderDto.totalPrice,
              state: createPurchaseOrderDto.state,
              status: createPurchaseOrderDto.status,
              approverId: approver.id,
              assignedToId: assignedTo.id,
              type: createPurchaseOrderDto.type,
              openedBy: user.primaryContactName,
              itemDetails: createPurchaseOrderDto?.itemDetails.map((item) => ({
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
              companyId,
            },
            include: { approver: { where: { companyId } } },
          });

          const notification =
            await this.prismaService.approvalNotifications.create({
              data: {
                message: `New purchase order ${purchaseOrder.SN} needs approval.`,
                companyId,
                userId: user.id,
                approverId: approver.id,
                purchaseOrderId: purchaseOrder.id,
                notifierId: approver.id,
              },
            });

          await this.mailService.purchaseOrderNotifications(
            notification,
            approver,
            user,
            purchaseOrder,
          );
        } else if (createPurchaseOrderDto.departmentIds) {
          let existingDepartments: any[] = [];

          //checks and ensure departmentId is always an array
          const departmentIdArray = Array.isArray(
            createPurchaseOrderDto.departmentIds,
          )
            ? createPurchaseOrderDto.departmentIds
            : [createPurchaseOrderDto.departmentIds];

          // Check if the departments exist
          existingDepartments = await this.prismaService.department.findMany({
            where: { id: { in: departmentIdArray } },
          });

          if (existingDepartments.length !== departmentIdArray.length) {
            const missingDepartmentIds = departmentIdArray.filter(
              (id) =>
                !existingDepartments.some((department) => department.id === id),
            );
            throw new HttpException(
              `Departments with IDs ${missingDepartmentIds.join(
                ', ',
              )} not found`,
              HttpStatus.NOT_FOUND,
            );
          }

          purchaseOrder = await this.prismaService.purchaseOrder.create({
            data: {
              SN: createPurchaseOrderDto.SN,
              supplierName: createPurchaseOrderDto.supplierName,
              supplierId: supplier.id,
              shipmentDate: createPurchaseOrderDto.shipmentDate,
              shippingAddress: createPurchaseOrderDto.shippingAddress,
              shippingCharges: createPurchaseOrderDto.shippingCharges,
              priceListName: createPurchaseOrderDto.priceListName,
              discount: createPurchaseOrderDto.discount,
              priority: createPurchaseOrderDto.priority,
              totalItems: createPurchaseOrderDto.totalItems,
              totalPrice: createPurchaseOrderDto.totalPrice,
              state: createPurchaseOrderDto.state,
              status: createPurchaseOrderDto.status,
              type: createPurchaseOrderDto.type,
              openedBy: user.primaryContactName,
              itemDetails: createPurchaseOrderDto?.itemDetails.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                unitType: item.unitType,
                quantity: item.quantity,
                amount: item.amount,
                rate: item.rate,
                unit: item.unit,
                baseQty: item.baseQty,
              })),
              companyId,
            },
          });

          // Associate the task with each department
          await Promise.all(
            existingDepartments.map(async (department) => {
              const departments = await this.prismaService.department.update({
                where: { id: department.id, companyId },
                data: { purchaseOrder: { connect: { id: purchaseOrder.id } } },
                include: { users: true },
              });

              // Notify each user in the department
              await Promise.all(
                departments.users.map(async (userInDepartment) => {
                  const notification =
                    await this.prismaService.approvalNotifications.create({
                      data: {
                        message: `New Purchase order ${purchaseOrder.SN} needs approval.`,
                        companyId,
                        userId: user.id,
                        approverId: userInDepartment.id,
                        purchaseOrderId: purchaseOrder.id,
                        notifierId: userInDepartment.id,
                      },
                    });
                  await this.mailService.purchaseOrderNotifications(
                    notification,
                    userInDepartment,
                    user,
                    purchaseOrder,
                  );
                }),
              );
            }),
          );
        }
        await this.prismaService.request.update({
          where: {
            id: createPurchaseOrderDto.requestId,
          },
          data: {
            state: RequestState.COMPLETED,
            companyId,
          },
        });
      } else if (createPurchaseOrderDto.type === OrderType.DRAFT) {
        if (createPurchaseOrderDto.assignedToId) {
          const assignedTo = await this.prismaService.user.findUnique({
            where: {
              id: createPurchaseOrderDto.assignedToId,
              companyId,
            },
          });

          if (!assignedTo) {
            throw new HttpException(
              'Assigned user does not exist',
              HttpStatus.NOT_FOUND,
            );
          }
        }

        purchaseOrder = await this.prismaService.purchaseOrder.create({
          data: {
            SN: createPurchaseOrderDto.SN,
            supplierName: createPurchaseOrderDto.supplierName,
            supplierId: supplier.id,
            shipmentDate: createPurchaseOrderDto.shipmentDate,
            requestId: createPurchaseOrderDto.requestId,
            location: createPurchaseOrderDto.location,
            shippingAddress: createPurchaseOrderDto.shippingAddress,
            shippingCharges: createPurchaseOrderDto.shippingCharges,
            priceListName: createPurchaseOrderDto.priceListName,
            discount: createPurchaseOrderDto.discount,
            priority: createPurchaseOrderDto.priority,
            totalItems: createPurchaseOrderDto.totalItems,
            totalPrice: createPurchaseOrderDto.totalPrice,
            state: createPurchaseOrderDto.state,
            status: createPurchaseOrderDto.status,
            approverId: createPurchaseOrderDto.approverId,
            assignedToId: createPurchaseOrderDto.assignedToId,
            type: createPurchaseOrderDto.type,
            openedBy: user.primaryContactName,
            itemDetails: createPurchaseOrderDto?.itemDetails.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitType: item.unitType,
              quantity: item.quantity,
              amount: item.amount,
              rate: item.rate,
              unit: item.unit,
              baseQty: item.baseQty,
            })),
            companyId,
          },
          include: { approver: { where: { companyId } } },
        });
      }
      return {
        status: 'Success',
        message: 'Purchase Order created successfully',
        data: purchaseOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateApprovedPurchaseOrder(
    userId: number,
    orderId: number,
    updateOrderDto: UpdatePurchaseOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the Order exists
      const existingOrder = await this.prismaService.purchaseOrder.findUnique({
        where: { id: orderId, companyId },
      });

      if (!existingOrder) {
        throw new HttpException(
          `Purchase Order with id number ${orderId} does not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const getNotification =
        await this.prismaService.approvalNotifications.findFirst({
          where: {
            approverId: userId,
            companyId,
            purchaseOrderId: existingOrder.id,
          },
        });

      if (!getNotification) {
        throw new HttpException(
          'No Purchase order notifications found',
          HttpStatus.NOT_FOUND,
        );
      }
      //console.log(getNotification);
      const requestedUser = await this.prismaService.user.findUnique({
        where: { id: getNotification.userId, companyId },
      });
      // Save the updated request
      const updateOrder = await this.prismaService.purchaseOrder.update({
        where: { id: orderId, companyId },
        data: {
          status: updateOrderDto.status,
        },
      });

      if (updateOrderDto.status === RequestState.APPROVED) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Purchase with serial number: ${updateOrder.SN} has been approved.`,
              companyId,
              comment: null,
              userId: requestedUser.id,
              approverId: user.id,
              purchaseOrderId: existingOrder.id,
            },
          });

        await this.mailService.purchaseApprovalNotifications(
          notification,
          requestedUser,
          user,
          updateOrder,
        );
      } else if (updateOrderDto.status === RequestState.REJECT) {
        const notification =
          await this.prismaService.approvalNotifications.update({
            where: {
              id: getNotification.id,
              companyId,
            },
            data: {
              message: `Purchase with serial number: ${updateOrder.SN} was rejected.`,
              comment: updateOrderDto.comment,
              companyId,
              userId: requestedUser.id,
              approverId: user.id,
              purchaseOrderId: existingOrder.id,
            },
          });

        await this.mailService.purchaseRejectionNotifications(
          notification,
          requestedUser,
          user,
          updateOrder,
        );
      }

      return {
        status: 'Success',
        data: updateOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getApprovedPurchaseOrder(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrder = await this.prismaService.purchaseOrder.findMany({
        where: { status: RequestState.APPROVED, companyId },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Purchase Order retrieved successfully',
        data: purchaseOrder,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPurchaseOrderById(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrder = await this.prismaService.purchaseOrder.findUnique({
        where: { id, companyId },
        include: {
          request: { where: { companyId } },
          notifications: { where: { companyId } },
        },
      });

      if (!purchaseOrder) {
        throw new HttpException(
          `Purchase order with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        message: 'PurchaseOrder retrieved successfully',
        data: purchaseOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPurchaseOrderDraft(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrder = await this.prismaService.purchaseOrder.findMany({
        where: { type: OrderType.DRAFT, companyId },
        include: { request: { where: { companyId } } },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'purchase Order retrieved successfully',
        data: purchaseOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updatePurchaseOrderFields(
    userId: number,
    orderId: number,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the Order exists
      // console.log(orderId);
      const existingOrder = await this.prismaService.purchaseOrder.findUnique({
        where: { id: orderId, companyId },
      });

      //console.log(existingOrder);
      if (!existingOrder) {
        throw new HttpException(
          `Purchase Order with id number ${orderId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const requestId = await this.prismaService.request.findUnique({
        where: { id: updatePurchaseOrderDto.requestId, companyId },
      });

      //console.log(existingOrder);
      if (!requestId) {
        throw new HttpException(
          `Request Order with id number ${updatePurchaseOrderDto.requestId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Create an object to hold the dynamic update data
      const dynamicUpdateData: Record<string, any> = {};

      // Iterate over the fields in updateOrderDto and add them to dynamicUpdateData
      for (const field in updatePurchaseOrderDto) {
        dynamicUpdateData[field] = updatePurchaseOrderDto[field];
      }

      let purchaseOrder: PurchaseOrder;
      if (Object.keys(dynamicUpdateData).length > 0) {
        if (updatePurchaseOrderDto.approverId) {
          const approver = await this.prismaService.user.findUnique({
            where: {
              id: updatePurchaseOrderDto.approverId,
              companyId,
            },
          });

          if (!approver) {
            throw new HttpException(
              'Assigned approver does not exist',
              HttpStatus.NOT_FOUND,
            );
          }
          const request = await this.prismaService.request.findUnique({
            where: { id: updatePurchaseOrderDto.requestId, companyId },
          });

          if (!request) {
            throw new HttpException(`Invalid request ID`, HttpStatus.NOT_FOUND);
          }

          // Save the updated request with dynamic data
          purchaseOrder = await this.prismaService.purchaseOrder.update({
            where: { id: orderId, companyId },
            data: {
              ...dynamicUpdateData,
              status: RequestState.PENDING,
            },
          });

          let existingNotification =
            await this.prismaService.approvalNotifications.findFirst({
              where: {
                approverId: approver.id,
                purchaseOrderId: purchaseOrder.id,
              },
            });

          if (!existingNotification) {
            existingNotification =
              await this.prismaService.approvalNotifications.create({
                data: {
                  message: `New Purchase order ${purchaseOrder.SN} needs approval.`,
                  companyId,
                  userId: user.id,
                  approverId: approver.id,
                  purchaseOrderId: purchaseOrder.id,
                  notifierId: approver.id,
                },
              });
          }
          await this.mailService.purchaseOrderNotifications(
            existingNotification,
            approver,
            user,
            purchaseOrder,
          );
          await this.prismaService.request.update({
            where: {
              id: updatePurchaseOrderDto.requestId,
            },
            data: {
              state: RequestState.COMPLETED,
              companyId,
            },
          });

          return {
            status: 'Successfully Updated',
            data: purchaseOrder,
          };
        } else if (updatePurchaseOrderDto.departmentIds) {
          let existingDepartments: any[] = [];

          //checks and ensure departmentId is always an array
          const departmentIdArray = Array.isArray(
            updatePurchaseOrderDto.departmentIds,
          )
            ? updatePurchaseOrderDto.departmentIds
            : [updatePurchaseOrderDto.departmentIds];

          // Check if the departments exist
          existingDepartments = await this.prismaService.department.findMany({
            where: { id: { in: departmentIdArray } },
          });

          if (existingDepartments.length !== departmentIdArray.length) {
            const missingDepartmentIds = departmentIdArray.filter(
              (id) =>
                !existingDepartments.some((department) => department.id === id),
            );
            throw new HttpException(
              `Departments with IDs ${missingDepartmentIds.join(
                ', ',
              )} not found`,
              HttpStatus.NOT_FOUND,
            );
          }

          purchaseOrder = await this.prismaService.purchaseOrder.update({
            where: { id: orderId, companyId },
            data: dynamicUpdateData,
          });

          // Associate the task with each department
          await Promise.all(
            existingDepartments.map(async (department) => {
              const departments = await this.prismaService.department.update({
                where: { id: department.id, companyId },
                data: { purchaseOrder: { connect: { id: purchaseOrder.id } } },
                include: { users: true },
              });

              // Notify each user in the department
              await Promise.all(
                departments.users.map(async (userInDepartment) => {
                  const existingNotification =
                    await this.prismaService.approvalNotifications.findFirst({
                      where: {
                        approverId: userInDepartment.id,
                        salesOrderId: purchaseOrder.id,
                      },
                    });

                  if (!existingNotification) {
                    const notification =
                      await this.prismaService.approvalNotifications.create({
                        data: {
                          message: `New Purchase order ${purchaseOrder.SN} needs approval.`,
                          companyId,
                          userId: user.id,
                          approverId: userInDepartment.id,
                          salesOrderId: purchaseOrder.id,
                          notifierId: userInDepartment.id,
                        },
                      });
                    await this.mailService.purchaseOrderNotifications(
                      notification,
                      userInDepartment,
                      user,
                      purchaseOrder,
                    );
                  }
                }),
              );
            }),
          );

          await this.prismaService.request.update({
            where: {
              id: updatePurchaseOrderDto.requestId,
            },
            data: {
              state: RequestState.COMPLETED,
              companyId,
            },
          });

          return {
            status: 'Successfully Updated',
            data: purchaseOrder,
          };
        }
      } else {
        throw new HttpException(`No fields provided`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAllPurchaseOrder(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrder = await this.prismaService.purchaseOrder.findMany({
        where: { companyId },
        include: {
          request: { where: { companyId } },
          notifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Purchase Order retrieved successfully',
        data: purchaseOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createPurchaseOrderConfirmation(
    userId: number,
    createConfirmationDto: CreateOrderConfirmationDto,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrder = await this.prismaService.purchaseOrder.findUnique({
        where: { id: createConfirmationDto.orderId, companyId },
        include: { supplier: true },
      });

      if (!purchaseOrder) {
        throw new HttpException(
          `Invalid purchase serial number ${createConfirmationDto.orderId} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      await Promise.all(
        createConfirmationDto.itemDetails.map(async (item) => {
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

          let stock = product.stocks.find((stock) => {
            return stock.warehouseName === item.warehouseName.trim();
          });

          if (!stock) {
            // Create the stock
            stock = await this.createStock(companyId, item, user);
          }
        }),
      );
      console.log(purchaseOrder.supplierId, purchaseOrder.supplier);
      // Create the order confirmation
      const PurchaseOrderConfirmation =
        await this.prismaService.purchaseOrderConfirmation.create({
          data: {
            orderId: purchaseOrder.id,
            companyId,
            supplierId: purchaseOrder.supplier.id,
            itemDetails: createConfirmationDto?.itemDetails.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              comment: item.comment,
              rate: item.rate,
              received: item.received,
              unitType: item.unitType,
              quantity: item.quantity,
              amount: item.amount,
              warehouseName: item.warehouseName,
              unit: item.unit,
              baseQty: item.baseQty,
            })),
          },
        });

      // Update the purchase order status to COMPLETED
      await this.prismaService.purchaseOrder.update({
        where: {
          id: createConfirmationDto.orderId,
        },
        data: {
          status: RequestState.COMPLETED,
          companyId,
        },
      });

      console.log('about to update');
      await this.updateInventory(
        PurchaseOrderConfirmation.itemDetails,
        companyId,
        user,
      );
      console.log('updated successfully');
      const purchaseTransactions = [];

      // Create or update purchase transactions for each item in the confirmation
      for (const item of createConfirmationDto.itemDetails) {
        const existingTransaction =
          await this.prismaService.purchasesTransaction.findFirst({
            where: {
              productId: item.productId,
              warehouseName: item.warehouseName,
              companyId,
            },
          });

        const existingWarehouse = await this.prismaService.wareHouse.findFirst({
          where: {
            name: {
              equals: item.warehouseName.trim(),
              mode: 'insensitive',
            },
            companyId,
          },
        });

        if (existingTransaction) {
          // Update existing purchase transaction
          await this.prismaService.purchasesTransaction.update({
            where: { id: existingTransaction.id },
            data: {
              quantity: item.quantity,
              rate: Number(item.rate),
              amount: item.amount,
              productName: item.productName,
              warehouseName: item.warehouseName,
              warehouseId: existingWarehouse.id,
              purchaseOrderId: purchaseOrder.id,
              purchaseRequestId: purchaseOrder.requestId,
              supplierId: purchaseOrder.supplier.id,
              confirmationId: PurchaseOrderConfirmation.id,
            },
          });
        } else {
          const purchaseTransaction =
            await this.prismaService.purchasesTransaction.create({
              data: {
                quantity: item.quantity,
                rate: Number(item.rate),
                amount: item.amount,
                productName: item.productName,
                warehouseName: item.warehouseName,
                warehouseId: existingWarehouse.id,
                productId: item.productId,
                companyId,
                supplierId: purchaseOrder.supplier.id,
                purchaseOrderId: purchaseOrder.id,
                purchaseRequestId: purchaseOrder.requestId,
                confirmationId: PurchaseOrderConfirmation.id,
              },
            });

          purchaseTransactions.push(purchaseTransaction);
        }
      }

      return {
        status: 'Purchase Confirmation Successful',
        data: PurchaseOrderConfirmation,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating purchase order confirmation',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async createStock(companyId: number, item: any, user: any) {
    const warehouse = await this.prismaService.wareHouse.findFirst({
      where: {
        name: {
          equals: item.warehouseName.trim(),
          mode: 'insensitive',
        },
        companyId,
      },
    });

    if (!warehouse) {
      throw new HttpException(
        `Warehouse not found for stock with warehouseName: ${item.warehouseName}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const batchNumber = await this.generateUniqueBatchNumber(
      warehouse.name,
      user.id,
    );
    const stock = await this.prismaService.stock.create({
      data: {
        companyId,
        openingStock: '0',
        itemName: item.productName,
        warehouseName: warehouse.name,
        batchNumber,
        openingStockValue: '0',
        createdBy: user.primaryContactName,
        product: { connect: { id: item.productId } },
        warehouses: { connect: { id: warehouse.id } },
      },
      include: { warehouses: true },
    });

    return stock;
  }

  async getAllOrderConfirmationsWithDetails(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const purchaseOrderConfirmation =
        await this.prismaService.purchaseOrderConfirmation.findMany({
          where: { companyId },
          include: {
            purchaseOrder: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      return {
        status: 'Success',
        message: 'Confirmation Order retrieved successfully',
        data: purchaseOrderConfirmation,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order confirmation',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getConfirmationOrderById(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const confirmOrder =
        await this.prismaService.purchaseOrderConfirmation.findUnique({
          where: { id, companyId },
          include: {
            purchaseOrder: true,
          },
        });

      if (!confirmOrder) {
        throw new HttpException(
          `ConfirmOrder order with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        message: 'successfully retrived',
        data: confirmOrder,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase order confirmation',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  // private async updateInventory(itemDetails: any) {
  //   try {
  //     for (const item of itemDetails) {
  //       const product = await this.prismaService.product.findUnique({
  //         where: { id: item.productId },
  //         include: { stocks: true },
  //       });

  //       if (!product) {
  //         throw new Error(`Product not found for ID ${item.productId}`);
  //       }

  //       //console.log(itemDetails);

  //       // Find or create stock for the warehouse
  //       let stock = product.stocks.find(
  //         (stock) => stock.warehouseName === item.warehouseName.trim(),
  //       );

  //       if (!stock) {
  //         throw new Error(
  //           `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
  //         );
  //       }

  //       // Update inventory quantity
  //       const updatedQuantity =
  //         Number(stock.openingStock) + Number(item.quantity);
  //       const updatedTotalStock = product.totalStock + Number(item.quantity);

  //       await this.prismaService.stock.update({
  //         where: { id: stock.id },
  //         data: {
  //           openingStock: String(updatedQuantity),
  //         },
  //       });

  //       await this.prismaService.product.update({
  //         where: { id: product.id },
  //         data: {
  //           totalStock: updatedTotalStock,
  //         },
  //       });
  //     }
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  private async updateInventory(
    itemDetails: any,
    companyId: number,
    user: any,
  ) {
    try {
      for (const item of itemDetails) {
        const product = await this.prismaService.product.findUnique({
          where: { id: item.productId },
          include: { stocks: true },
        });

        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }

        const warehouse = await this.prismaService.wareHouse.findFirst({
          // where: { name: item.warehouseName.trim(), companyId },
          where: {
            name: {
              equals: item.warehouseName.trim(),
              mode: 'insensitive',
            },
            companyId,
          },
        });

        if (!warehouse) {
          throw new HttpException(
            `Warehouse not found for stock with warehouseName: ${item.warehouseName}`,
            HttpStatus.NOT_FOUND,
          );
        }

        // Find or create stock for the warehouse
        let stock = product.stocks.find(
          (stock) => stock.warehouseName === item.warehouseName.trim(),
        );

        if (!stock) {
          console.log(stock, item.warehouseName.trim());
          throw new Error(
            `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
          );
        }

        // If the stock quantity is zero, delete the stock batch
        if (Number(stock.openingStock) === 0) {
          await this.prismaService.stock.delete({ where: { id: stock.id } });
          continue;
        }

        // Create a new stock batch since it's a new batch
        const batchNumber = await this.generateUniqueBatchNumber(
          warehouse.name,
          user.id,
        );

        const openingStockValue: number = item.quantity * item.rate;
        const newStock = await this.prismaService.stock.create({
          data: {
            companyId: product.companyId,
            openingStock: String(item.quantity),
            itemName: product.name,
            warehouseName: item.warehouseName.trim(),
            batchNumber,
            purchase: {
              pricePerPcs: item.rate,
            },
            openingStockValue: String(openingStockValue),
            createdBy: user.primaryContactName,
            product: { connect: { id: item.productId } },
            warehouses: { connect: { id: warehouse.id } },
          },
          include: { warehouses: true },
        });

        // Update the product's total stock
        const updatedTotalStock = product.totalStock + Number(item.quantity);
        await this.prismaService.product.update({
          where: { id: product.id },
          data: { totalStock: updatedTotalStock },
        });
      }
    } catch (error) {
      throw error;
    }
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

    const batchNumber = await this.usersservice.generateSerialNumber(
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

  async getAllPurchaseOrderByFiltering(
    userId: number,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Calculate the start of the day (00:00:00) in the appropriate time zone
      const startOfDay = startDate.startOf('day');

      // Calculate the end of the day (23:59:59.999) in the appropriate time zone
      const endOfDay = endDate.endOf('day');

      const purchaseOrders = await this.prismaService.purchaseOrder.findMany({
        where: {
          companyId,
          AND: [
            { createdAt: { gte: startOfDay.toJSDate() } },
            { createdAt: { lt: endOfDay.toJSDate() } },
          ],
        },
        include: {
          request: { where: { companyId } },
          notifications: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      let totalAmount = 0;
      let totalQuantity = 0;

      // Iterate over each purchase order and calculate total amount and quantity
      purchaseOrders.forEach((purchaseOrder) => {
        const itemDetails: {
          rate: string;
          amount: string;
          quantity: string;
          productId: number;
          productName: string;
          warehouseName: string;
        }[] = purchaseOrder.itemDetails as {
          rate: string;
          amount: string;
          quantity: string;
          productId: number;
          productName: string;
          warehouseName: string;
        }[];

        itemDetails.forEach((item) => {
          totalAmount += Number(item.amount);
          totalQuantity += Number(item.quantity);
        });
      });

      return {
        status: 'Success',
        message: 'Purchase Orders stats successfully retrieved',
        data: {
          totalAmount,
          totalQuantity,
          // purchaseOrders,
        },
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching purchase stats',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAllSalesOrderStatsByFiltering(
    userId: number,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Calculate the start of the day (00:00:00) in the appropriate time zone
      const startOfDay = startDate.startOf('day');

      // Calculate the end of the day (23:59:59.999) in the appropriate time zone
      const endOfDay = endDate.endOf('day');

      const salesOrder = await this.prismaService.salesOrder.findMany({
        where: {
          companyId,
          AND: [
            { createdAt: { gte: startOfDay.toJSDate() } },
            { createdAt: { lt: endOfDay.toJSDate() } },
          ],
        },
        include: {
          request: { where: { companyId } },
          invoices: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      let draft = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      let completed = 0;
      let invoice = 0;

      salesOrder.forEach((order) => {
        switch (order.status) {
          case 'PENDING':
            pending++;
            break;
          case 'APPROVED':
            approved++;
            break;
          case 'REJECT':
            rejected++;
            break;
          case 'COMPLETED':
            completed++;
            break;
        }
      });

      salesOrder.forEach((order) => {
        switch (order.type) {
          case 'DRAFT':
            draft++;
            break;
        }
      });

      // Count the number of invoices
      invoice = salesOrder.reduce(
        (total, order) => total + order.invoices.length,
        0,
      );

      return {
        status: 'Success',
        message: 'Sales Order stats successfully retrieved',
        data: {
          draft,
          pending,
          approved,
          rejected,
          completed,
          invoice,
        },
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales stats',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /************************ PURCHASE ORDER END*****************************/
}
