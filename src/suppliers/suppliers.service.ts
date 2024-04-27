import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ContactDto, CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from 'src/common';
import { Prisma, RequestType, Status, UserType } from '@prisma/client';
import { UsersService } from 'src/auth/users/users.service';
import { DateTime } from 'luxon';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly logger: Logger,
  ) {}
  async createSupplier(userId: number, CreateSupplierDto: CreateSupplierDto) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);

      const companyId =
        user?.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingSupplier = await this.prismaService.supplier.findFirst({
        where: { serialNumber: CreateSupplierDto.serialNumber, companyId },
      });
      if (existingSupplier) {
        throw new HttpException(
          'Supplier with serialNumber already exists',
          HttpStatus.CONFLICT,
        );
      }

      //console.log(CreateSupplierDto);
      if (CreateSupplierDto.companyEmail) {
        const existingEmail = await this.prismaService.supplier.findFirst({
          where: { companyEmail: CreateSupplierDto.companyEmail, companyId },
        });

        if (existingEmail) {
          throw new HttpException(
            'Supplier with email already exists',
            HttpStatus.CONFLICT,
          );
        }
      }

      const existingName = await this.prismaService.supplier.findFirst({
        where: {
          companyName: {
            equals: CreateSupplierDto.companyName.trim(),
            mode: 'insensitive',
          },
          companyId,
        },
      });

      if (existingName) {
        throw new HttpException(
          `Supplier with name ${CreateSupplierDto.companyName} already exist`,
          HttpStatus.CONFLICT,
        );
      }

      const contacts = CreateSupplierDto.contacts || [];
      // console.log(contacts);
      const supplier = await this.prismaService.supplier.create({
        data: {
          companyId,
          serialNumber: CreateSupplierDto.serialNumber,
          title: CreateSupplierDto.title,
          lastName: CreateSupplierDto.lastName,
          website: CreateSupplierDto.website,
          displayName: CreateSupplierDto.displayName,
          companyName: CreateSupplierDto.companyName,
          mobileNumber: CreateSupplierDto.mobileNumber,
          currency: CreateSupplierDto.currency,
          mediaLink: CreateSupplierDto.mediaLink,
          billAddress: CreateSupplierDto.billAddress,
          shippingAddress: CreateSupplierDto.shippingAddress,
          firstName: CreateSupplierDto.primaryContactName,
          registeredBy: user.primaryContactName,
          companyEmail: CreateSupplierDto.companyEmail,
          supplierType: CreateSupplierDto.supplierType,
          department: CreateSupplierDto.department,
          contacts: {
            create: contacts.map((item) => ({
              companyId,
              firstName: item.firstName,
              lastName: item.lastName,
              department: item.department,
              title: item.title,
              companyEmail: item.companyEmail,
              mobileNumber: item.mobileNumber,
              businessPhone: item.businessPhone,
              type: RequestType.SUPPLIER,
              primary: item.primary,
            })),
          },
        },
        include: { contacts: true },
      });

      return {
        status: 'successful',
        message: 'Successfully added supplier',
        data: {
          supplier,
        },
      };
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

  // async uploadSupplier(userId: number, CreateSupplierDto: CreateSupplierDto[]) {
  //   try {
  //     const user = await this.usersService.findUserWithRelationships(userId);

  //     const companyId =
  //       user?.adminCompanyId?.adminID || user.employeeId?.companyId;

  //     const results = [];

  //     for (const supplierData of CreateSupplierDto) {
  //       const existingCompanyName = await this.prismaService.supplier.findFirst(
  //         {
  //           where: {
  //             companyName: {
  //               equals: supplierData.companyName.trim(),
  //               mode: 'insensitive',
  //             },
  //             companyId,
  //           },
  //         },
  //       );

  //       if (existingCompanyName) {
  //         throw new HttpException(
  //           `Supplier with name ${existingCompanyName.companyName} already exist`,
  //           HttpStatus.CONFLICT,
  //         );
  //       }

  //       if (supplierData.companyEmail) {
  //         const existingEmail = await this.prismaService.supplier.findFirst({
  //           where: { companyEmail: supplierData.companyEmail, companyId },
  //         });

  //         if (existingEmail) {
  //           throw new HttpException(
  //             `Supplier with name ${existingEmail.companyName} and email ${existingEmail.companyEmail} already exists`,
  //             HttpStatus.CONFLICT,
  //           );
  //         }
  //       }

  //       if (!supplierData.serialNumber) {
  //         supplierData.serialNumber =
  //           await this.generateUniqueSerialNumber(userId);
  //       }
  //       const contacts = supplierData.contacts || [];
  //       // console.log(contacts);
  //       const supplier = await this.prismaService.supplier.create({
  //         data: {
  //           companyId,
  //           serialNumber: supplierData.serialNumber,
  //           title: supplierData.title,
  //           lastName: supplierData.lastName,
  //           website: supplierData.website,
  //           displayName: supplierData.displayName,
  //           companyName: supplierData.companyName,
  //           mobileNumber: supplierData.mobileNumber,
  //           currency: supplierData.currency,
  //           mediaLink: supplierData.mediaLink,
  //           billAddress: supplierData.billAddress,
  //           shippingAddress: supplierData.shippingAddress,
  //           firstName: supplierData.primaryContactName,
  //           registeredBy: user.primaryContactName,
  //           companyEmail: supplierData.companyEmail,
  //           supplierType: supplierData.supplierType,
  //           department: supplierData.department,
  //           contacts: {
  //             create: contacts.map((item) => ({
  //               companyId,
  //               firstName: item.firstName,
  //               lastName: item.lastName,
  //               department: item.department,
  //               title: item.title,
  //               companyEmail: item.companyEmail,
  //               mobileNumber: item.mobileNumber,
  //               businessPhone: item.businessPhone,
  //               type: RequestType.SUPPLIER,
  //               primary: item.primary,
  //             })),
  //           },
  //         },
  //         include: { contacts: true },
  //       });

  //       results.push(supplier);
  //     }
  //     return {
  //       status: 'successful',
  //       message: 'Successfully uploaded supplier',
  //       data: results,
  //     };
  //   } catch (error) {
  //     if (error instanceof Prisma.PrismaClientValidationError) {
  //       throw new HttpException(
  //         'An error occurred while creating supplier',
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }
  //     throw error;
  //   }
  // }

  async uploadSupplier(userId: number, CreateSupplierDto: CreateSupplierDto[]) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user?.adminCompanyId?.adminID || user.employeeId?.companyId;

      const results = [];
      let newSuppliersCreated = false;

      for (const supplierData of CreateSupplierDto) {
        const existingCompanyName = await this.prismaService.supplier.findFirst(
          {
            where: {
              companyName: {
                equals: supplierData.companyName.trim(),
                mode: 'insensitive',
              },
              companyId,
            },
          },
        );

        if (!existingCompanyName) {
          let existingEmail = null;
          if (supplierData.companyEmail) {
            existingEmail = await this.prismaService.supplier.findFirst({
              where: { companyEmail: supplierData.companyEmail, companyId },
            });
          }

          if (!existingEmail) {
            if (!supplierData.serialNumber) {
              supplierData.serialNumber =
                await this.generateUniqueSerialNumber(userId);
            }
            const contacts = supplierData.contacts || [];
            const supplier = await this.prismaService.supplier.create({
              data: {
                companyId,
                serialNumber: supplierData.serialNumber,
                title: supplierData.title,
                lastName: supplierData.lastName,
                website: supplierData.website,
                displayName: supplierData.displayName,
                companyName: supplierData.companyName,
                mobileNumber: supplierData.mobileNumber,
                currency: supplierData.currency,
                mediaLink: supplierData.mediaLink,
                billAddress: supplierData.billAddress,
                shippingAddress: supplierData.shippingAddress,
                firstName: supplierData.primaryContactName,
                registeredBy: user.primaryContactName,
                companyEmail: supplierData.companyEmail,
                supplierType: supplierData.supplierType,
                department: supplierData.department,
                contacts: {
                  create: contacts.map((item) => ({
                    companyId,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    department: item.department,
                    title: item.title,
                    companyEmail: item.companyEmail,
                    mobileNumber: item.mobileNumber,
                    businessPhone: item.businessPhone,
                    type: RequestType.SUPPLIER,
                    primary: item.primary,
                  })),
                },
              },
              include: { contacts: true },
            });
            results.push(supplier);
            newSuppliersCreated = true;
          }
        }
      }

      if (!newSuppliersCreated) {
        return {
          status: 'successful',
          message: 'No new suppliers were created',
          data: [],
        };
      }

      return {
        status: 'successful',
        message: `${results.length} supplier uploaded successfully`,
        //data: results,
      };
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

  async getSuppliers(userId: number) {
    try {
      // Find the user by ID
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      const suppliers = await this.prismaService.supplier.findMany({
        where: {
          companyId,
        },
        include: {
          contacts: { where: { type: 'SUPPLIER', companyId } },
          invoices: { where: { companyId } },
          purchaseOrderConfirmation: { where: { companyId } },
          purchaseTransactions: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Suppliers retrieved successfully',
        data: suppliers,
      };
    } catch (error) {
      // console.error(error.message);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while getting suppliers',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getSupplierById(userId: number, supplierId: number): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const supplier = await this.prismaService.supplier.findUnique({
        where: { id: supplierId, companyId },
        include: {
          contacts: { where: { type: 'SUPPLIER', companyId } },
          invoices: { where: { companyId } },
          requests: { where: { companyId } },
          purchaseOrderConfirmation: { where: { companyId } },
          purchaseTransactions: { where: { companyId } },
        },
      });

      if (!supplier) {
        throw new HttpException('Supplier not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: supplier,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while getting supplier',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteSupplier(userId: number, supplierId: number) {
    try {
      // Find the user by ID
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const supplier = await this.prismaService.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new HttpException('Supplier not found', HttpStatus.NOT_FOUND);
      }

      const del = await this.prismaService.supplier.deleteMany({
        where: {
          id: supplierId,
          companyId,
        },
      });

      if (del.count === 0) {
        throw new HttpException(
          'Sorry, you cant delete this user',
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        status: 'Success',
        message: 'Supplier deleted successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting supplier',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createContact(userId: number, contactDto: ContactDto) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);

      const companyId =
        user?.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingSupplier = await this.prismaService.supplier.findUnique({
        where: { id: contactDto.supplierId, companyId },
      });
      if (!existingSupplier) {
        throw new HttpException(
          `Supplier with name ${contactDto.supplierName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      //console.log(createCustomerDto);
      if (contactDto.companyEmail) {
        const existingEmail = await this.prismaService.contacts.findFirst({
          where: { companyEmail: contactDto.companyEmail, companyId },
        });

        if (existingEmail) {
          throw new HttpException(
            'Supplier with email already exists',
            HttpStatus.CONFLICT,
          );
        }
      }

      const contact = await this.prismaService.contacts.create({
        data: {
          companyId,
          title: contactDto.title,
          type: RequestType.SUPPLIER,
          lastName: contactDto.lastName,
          firstName: contactDto.firstName,
          companyEmail: contactDto.companyEmail,
          department: contactDto.department,
          primary: contactDto.primary,
          mobileNumber: contactDto.mobileNumber,
          businessPhone: contactDto.businessPhone,
          suppliers: {
            connect: { id: contactDto.supplierId },
          },
        },
      });

      return {
        status: 'successful',
        message: 'Successfully added contact',
        data: {
          contact,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating contact',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getContacts(userId: number) {
    try {
      // Find the user by ID
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all suppliers in the company
      const contacts = await this.prismaService.contacts.findMany({
        where: {
          companyId,
          type: RequestType.SUPPLIER,
        },
        include: {
          suppliers: { where: { companyId } },
        },
        // orderBy: {
        //   createdAt: 'desc',
        // },
      });

      return {
        status: 'Success',
        message: 'Contacts retrieved successfully',
        data: contacts,
      };
    } catch (error) {
      //console.error(error.message);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while getting contact',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async editSupplier(
    userId: number,
    supplierId: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the supplier exists
      const existingSupplier = await this.prismaService.supplier.findUnique({
        where: { id: supplierId, companyId },
        include: { contacts: { where: { companyId } } },
      });

      if (!existingSupplier) {
        throw new HttpException(
          `Supplier with id ${supplierId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if data is provided for update
      if (!Object.keys(updateSupplierDto).length) {
        return {
          status: 'No Updates',
          data: [],
        };
      }

      // Extract contact IDs from existingSupplier
      const contactIds = existingSupplier.contacts.map((contact) => contact.id);

      // Update the supplier fields
      const updatedSupplier = await this.prismaService.supplier.update({
        where: { id: supplierId, companyId },
        data: {
          companyId,
          serialNumber: updateSupplierDto.serialNumber,
          title: updateSupplierDto.title,
          lastName: updateSupplierDto.lastName,
          website: updateSupplierDto.website,
          displayName: updateSupplierDto.displayName,
          companyName: updateSupplierDto.companyName,
          mobileNumber: updateSupplierDto.mobileNumber,
          currency: updateSupplierDto.currency,
          mediaLink: updateSupplierDto.mediaLink,
          billAddress: updateSupplierDto.billAddress,
          shippingAddress: updateSupplierDto.shippingAddress,
          firstName: updateSupplierDto.primaryContactName,
          registeredBy: user.primaryContactName,
          companyEmail: updateSupplierDto.companyEmail,
          supplierType: updateSupplierDto.supplierType,
          department: updateSupplierDto.department,
          contacts: {
            // Update operation for each contact
            updateMany: updateSupplierDto.contacts.map((contact, index) => ({
              where: { id: contactIds[index] },
              data: {
                companyId,
                firstName: contact.firstName,
                lastName: contact.lastName,
                department: contact.department,
                primary: contact.primary,
                title: contact.title,
                companyEmail: contact.companyEmail,
                mobileNumber: contact.mobileNumber,
                businessPhone: contact.businessPhone,
                type: RequestType.SUPPLIER,
              },
            })),
          },
        },
      });

      return {
        status: 'Updated Successfully',
        data: updatedSupplier,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating records',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getBestSuppliers(
    userId: number,
    startDate: DateTime,
    endDate: DateTime,
    limit: number,
  ) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Calculate the start of the day (00:00:00) in the appropriate time zone
      const startOfDay = startDate.startOf('day');

      // Calculate the end of the day (23:59:59.999) in the appropriate time zone
      const endOfDay = endDate.endOf('day');

      const suppliersPurchase =
        await this.prismaService.purchasesTransaction.groupBy({
          by: ['supplierId'],
          _sum: {
            quantity: true,
            amount: true,
          },
          where: {
            companyId,
            AND: [
              { createdAt: { gte: startOfDay.toJSDate() } },
              { createdAt: { lt: endOfDay.toJSDate() } },
            ],
          },
          orderBy: {
            _sum: {
              amount: 'desc',
              //quantity: 'desc',
            },
          },
          take: limit,
        });

      // Get customer details for each sale group
      const bestSuppliers = await Promise.all(
        suppliersPurchase.map(async (purchase) => {
          const supplierId = purchase.supplierId;
          const supplier = await this.prismaService.supplier?.findUnique({
            where: {
              id: supplierId,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              companyEmail: true,
              createdAt: true,
            },
          });

          return {
            ...supplier,
            totalSalesAmount: purchase._sum.amount,
            totalQuantity: purchase._sum.quantity,
          };
        }),
      );

      return {
        status: 'Successfully retrieved top suppliers',
        bestSuppliers,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching records',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async generateUniqueSerialNumber(userId: number): Promise<string> {
    const serialNumber = await this.usersService.generateSerialNumber(
      'VSN',
      'vendor',
      userId,
    );

    const existingNumber = await this.prismaService.customer.findFirst({
      where: { serialNumber },
    });

    if (existingNumber) {
      return this.generateUniqueSerialNumber(userId);
    }

    return serialNumber;
  }
}
