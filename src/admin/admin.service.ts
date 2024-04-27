import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
//import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateComapnyDto } from './dto/update-company.dto';
import {
  AdminCompany,
  Image,
  Prisma,
  User,
  UserType,
  WareHouse,
} from '@prisma/client';
import { CloudinaryService, PrismaService } from 'src/common';
import { AdminRoleDto } from './dto/create-admin-role.dto';
import { DepartmentDto } from './dto/create-department.dto';
import { DepartmentRoleDto } from './dto/create-department-role.dto';
import { AddUsersToDepartmentDto } from './dto/addUserToDepartment.dto';
import { CustomRoleDto } from './dto/custom-role.dto';
import { AddUsersToRoleDto } from './dto/addUsersToRole.dto';
import { CategoryDto } from './dto/product-category.dto';
import { wareHouseDto } from './dto/create-warehouse.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from 'src/auth/users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async updateCompany(
    adminId: number,
    data: UpdateComapnyDto,
    file?: Express.Multer.File,
  ) {
    try {
      // Check if the admin exists
      const user = await this.prismaService.user.findUnique({
        where: { id: adminId },
        include: {
          adminCompanyId: { include: { logo: true } },
          employeeId: true,
          image: true,
        },
      });
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!user.adminCompanyId) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      let logo = null;
      const companyLogo = user.adminCompanyId.logo;

      if (file) {
        // Delete the previous image if it exists
        if (companyLogo) {
          await this.cloudinaryService.deleteImage(companyLogo.publicId);
        }

        const imagesLink = await this.cloudinaryService
          .uploadImage(file)
          .catch((error) => {
            throw new HttpException(error, HttpStatus.BAD_REQUEST);
          });

        // Check if the user already has an image
        if (companyLogo) {
          // If the user has an existing image, update it
          logo = await this.prismaService.image.update({
            where: { id: companyLogo.id }, // Use existing image ID
            data: {
              publicId: imagesLink.public_id,
              url: imagesLink.url,
              companyId,
            },
          });
        } else {
          // If the user doesn't have an existing image, create a new one
          logo = await this.prismaService.image.create({
            data: {
              publicId: imagesLink.public_id,
              url: imagesLink.url,
              companyId,
            },
          });
        }
      }

      if (user.userType === UserType.ADMIN) {
        // Check if the admin has a company
        if (!user.adminCompanyId) {
          throw new HttpException(
            'No existing company, please create a company',
            HttpStatus.NOT_FOUND,
          );
        }

        // Check if the company exists
        const company = await this.prismaService.adminCompany.findUnique({
          where: { adminID: user.id },
        });

        if (!company) {
          throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
        }

        // Update the company details
        const update = await this.prismaService.adminCompany.update({
          where: { id: company.id },
          data: {
            ...data,
            imageId: logo.id,
          },
          include: { logo: true },
        });
        if (update) {
          return {
            status: 'Success',
            message: 'Rocords updated',
            data: update,
          };
        }
      } else if (user.userType === UserType.EMPLOYEE) {
        // Check if the company exists
        const company = await this.prismaService.adminCompany.findUnique({
          where: { adminID: user.employeeId.companyId },
        });

        if (!company) {
          throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
        }

        // Update the company details
        const update = await this.prismaService.adminCompany.update({
          where: { id: company.id },
          data: {
            ...data,
            imageId: logo.id,
          },
          include: { logo: true },
        });
        if (update) {
          return {
            status: 'Success',
            message: 'Rocords updated',
            data: update,
          };
        }
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating records',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createDepartment(userId: number, departmentDto: DepartmentDto) {
    try {
      // Check if the user (admin or employee) exists
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found ', HttpStatus.NOT_FOUND);
      }

      // Check if the department name already exists in the company
      const existingDepartment = await this.prismaService.department.findFirst({
        where: {
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
          name: departmentDto.name,
        },
      });

      if (existingDepartment) {
        throw new HttpException(
          'Department with this name already exists in the company',
          HttpStatus.CONFLICT,
        );
      }

      const createdDepartment = await this.prismaService.department.create({
        data: {
          name: departmentDto.name,
          description: departmentDto.description,
          permissions: departmentDto.permissions,
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Department created successfully',
        ...createdDepartment,
        companyId: undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating department',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createWareHouse(userId: number, wareHouseDto: wareHouseDto) {
    try {
      // Check if the user (admin or employee) exists
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found ', HttpStatus.NOT_FOUND);
      }

      // Check if the department name already exists in the company
      const existingWareHouse = await this.prismaService.wareHouse.findFirst({
        // where: {
        //   companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        //   name: wareHouseDto.name,
        // },

        where: {
          name: {
            equals: wareHouseDto.name.trim(),
            mode: 'insensitive',
          },
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (existingWareHouse) {
        throw new HttpException(
          `Warehouse with this name ${existingWareHouse.name} already exists in the company`,
          HttpStatus.CONFLICT,
        );
      }

      const createdWareHouse = await this.prismaService.wareHouse.create({
        data: {
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
          name: wareHouseDto.name.trim(),
          address: wareHouseDto.address,
          companyEmail: wareHouseDto.companyEmail,
          createdBy: user.primaryContactName,
          ...wareHouseDto,
        },
      });

      return {
        status: 'Success',
        message: 'Warehouse created successfully',
        ...createdWareHouse,
        companyId: undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating warehouse',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getWarehouseById(userId: number, warehouseId: number): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const warehouse = await this.prismaService.wareHouse.findUnique({
        where: { id: warehouseId, companyId },
        include: {
          //products: true,
          stocks: { include: { product: true } },
        },
      });

      if (!warehouse) {
        throw new HttpException('Warehouse not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: warehouse,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching records',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createCategory(userId: number, categoryDto: CategoryDto) {
    try {
      // Check if the user (admin or employee) exists
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found ', HttpStatus.NOT_FOUND);
      }

      // Check if the department name already exists in the company
      const existingCategory = await this.prismaService.category.findFirst({
        where: {
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
          name: categoryDto.name,
        },
      });

      if (existingCategory) {
        throw new HttpException(
          'Category with this name already exists in the company',
          HttpStatus.CONFLICT,
        );
      }

      const category = await this.prismaService.category.create({
        data: {
          name: categoryDto.name.trim(),
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Category created successfully',
        ...category,
        companyId: undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating category',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async createCustomRole(userId: number, customRoleDto: CustomRoleDto) {
    try {
      const createdCustomRoles = await this.prismaService.$transaction(
        async (prisma) => {
          // Check if the user (admin or employee) exists
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminCompanyId: true, employeeId: true },
          });

          if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
          }

          // Check if the department name already exists in the company
          const existingRole = await prisma.customRole.findFirst({
            where: {
              companyId:
                user.adminCompanyId?.adminID || user.employeeId?.companyId,
              name: customRoleDto.name,
            },
          });

          if (existingRole) {
            throw new HttpException(
              'Role with this name already exists in the company',
              HttpStatus.CONFLICT,
            );
          }

          return prisma.customRole.create({
            data: {
              companyId:
                user.adminCompanyId?.adminID || user.employeeId?.companyId,
              name: customRoleDto.name,
              description: customRoleDto.description,
              permissions: customRoleDto.permissions,
            },
          });
        },
      );

      return {
        status: 'Success',
        message: 'Custom role created successfully',
        ...createdCustomRoles,
        companyId: undefined,
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllDepartmentsInCompany(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all departments in the company
      const departments = await this.prismaService.department.findMany({
        where: {
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
        include: { users: { include: { image: true } }, departmentRoles: true },
      });

      // if (departments && departments.length === 0) {
      //   throw new HttpException(
      //     'Please create a department',
      //     HttpStatus.METHOD_NOT_ALLOWED,
      //   );
      // }

      return {
        status: 'Success',
        message: 'Departments retrieved successfully',
        data: departments,
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllCustomRolesInCompany(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all departments in the company
      const roles = await this.prismaService.customRole.findMany({
        where: {
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
        include: { users: true },
      });

      if (!roles) {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        message: 'roles retrieved successfully',
        data: roles,
      };
    } catch (error) {
      throw error;
    }
  }

  async getCategory(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all departments in the company
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      const categories = await this.prismaService.category.findMany({
        where: {
          companyId,
        },
        include: {
          products: {
            where: {
              companyId,
            },
          },
        },
      });

      if (categories && categories.length === 0) {
        throw new HttpException(
          'Please create a category',
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }

      return {
        status: 'Success',
        message: 'categories retrieved successfully',
        data: categories,
      };
    } catch (error) {
      throw error;
    }
  }

  async getWareHouse(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all warehouses in the company
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      const warehouses = await this.prismaService.wareHouse.findMany({
        where: {
          companyId,
        },
        include: {
          //products: true,
          stocks: { include: { product: true } },
        },
      });

      if (warehouses && warehouses.length === 0) {
        throw new HttpException(
          'Please create a warehouse',
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }

      return {
        status: 'Success',
        message: 'warehouses retrieved successfully',
        data: warehouses,
      };
    } catch (error) {
      throw error;
    }
  }

  async getStocks(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the company exists
      const company = await this.prismaService.adminCompany.findUnique({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      if (!company) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      // Get all Stocks in the company
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      const stocks = await this.prismaService.stock.findMany({
        where: {
          companyId,
        },
        include: {
          product: {
            where: {
              companyId,
            },
          },
          warehouses: {
            where: {
              companyId,
            },
          },
        },
      });

      if (stocks && stocks.length === 0) {
        throw new HttpException(
          'Please create a warehouse',
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }

      return {
        status: 'Success',
        message: 'stocks retrieved successfully',
        data: stocks,
      };
    } catch (error) {
      throw error;
    }
  }

  async getSystemRole(userId: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      //  console.log(user.adminCompanyId?.adminID || user.employeeId?.companyId);

      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      const roles = await this.prismaService.systemRole.findMany({
        where: {
          companyId,
        },
        include: {
          users: {
            where: {
              companyId,
            },
          },
        },
      });

      if (!roles) {
        throw new HttpException(
          'Please create a role',
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }

      return {
        status: 'Success',
        message: 'roles retrieved successfully',
        data: roles,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteCustomRole(roleId: number) {
    try {
      const role = await this.prismaService.customRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
      }

      // Use Prisma transaction for atomic operations
      await this.prismaService.customRole.deleteMany({
        where: { id: roleId },
      });

      return {
        status: 'Success',
        message: 'role deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteDepartment(departmentId: number) {
    try {
      // Check if the department exists
      const department = await this.prismaService.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new HttpException('Department not found', HttpStatus.NOT_FOUND);
      }

      // Use Prisma transaction for atomic operations
      await this.prismaService.$transaction(async (tx) => {
        await tx.departmentRole.deleteMany({
          where: {
            department: {
              some: {
                id: departmentId,
              },
            },
          },
        });

        await tx.department.delete({
          where: { id: departmentId },
        });
      }),
        {
          maxWait: 2000, // default: 2000
          timeout: 5000, // default: 5000
          //isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
        };

      return {
        status: 'Success',
        message: 'Department deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteDepartmentalRole(roleId: number) {
    try {
      // Check if the department exists
      const departmentRole = await this.prismaService.departmentRole.findUnique(
        {
          where: { id: roleId },
        },
      );

      if (!departmentRole) {
        throw new HttpException(
          'Department role not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Use Prisma transaction for atomic operations
      await this.prismaService.departmentRole.deleteMany({
        where: {
          id: roleId,
        },
      });

      return {
        status: 'Success',
        message: 'Department role deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async createDepartmentRole(
    departmentId: number,
    departmentRoleDto: DepartmentRoleDto,
  ) {
    try {
      // Check if the department exists
      const department = await this.prismaService.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new HttpException('Department not found', HttpStatus.NOT_FOUND);
      }

      // Create the department role
      const createdDepartmentRole =
        await this.prismaService.departmentRole.create({
          data: {
            name: departmentRoleDto.name,
            description: departmentRoleDto.description,
            department: {
              connect: { id: departmentId },
            },
          },
        });

      return {
        status: 'Success',
        message: 'Department role created successfully',
        data: createdDepartmentRole,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating roles',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async addUsersToDepartment(addUserToDepartmentDto: AddUsersToDepartmentDto) {
    try {
      // Find the department by ID
      const department = await this.prismaService.department.findUnique({
        where: { id: addUserToDepartmentDto.departmentId },
        include: { users: true },
      });

      if (!department) {
        throw new HttpException('Department not found', HttpStatus.NOT_FOUND);
      }

      // Find the users by their IDs
      const users = await this.prismaService.user.findMany({
        where: { id: { in: addUserToDepartmentDto.userIds } },
        include: { departments: true, image: true },
      });

      // Check if any user is not found
      const notFoundUsers = addUserToDepartmentDto.userIds.filter(
        (userId) => !users.find((user) => user.id === userId),
      );

      if (notFoundUsers.length > 0) {
        const notFoundUserNames = notFoundUsers.map((userId) => {
          const user = users.find((u) => u.id === userId);

          return user
            ? user?.primaryContactName || 'Unknown User'
            : `ID ${userId}`;
        });

        const errorMessage =
          notFoundUserNames.length === 1
            ? `User with ${notFoundUserNames[0]} not found`
            : `Users with ${notFoundUserNames.join(', ')} not found`;

        throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
      }

      // Check if users are already in the department
      const usersInDepartment = users.filter((user) =>
        user.departments.some(
          (d) => d.id === addUserToDepartmentDto.departmentId,
        ),
      );

      if (usersInDepartment.length === 0) {
        // Add users to the department
        const updatedUsers = await Promise.all(
          addUserToDepartmentDto.userIds.map(async (userId) => {
            return this.prismaService.user.update({
              where: { id: userId },
              data: {
                departments: {
                  connect: { id: addUserToDepartmentDto.departmentId },
                },
              },
              include: { departments: true },
            });
          }),
        );

        return {
          status: 'Success',
          message: 'Users successfully added to the department',
          data: updatedUsers.map((user) => ({
            ...user,
            password: undefined,
            randomNumber: undefined,
            resetToken: undefined,
            resetTokenExpiresAt: undefined,
          })),
        };
      } else {
        const userNames = usersInDepartment.map(
          (user) => user?.primaryContactName,
        );
        const errorMessage =
          usersInDepartment.length === 1
            ? `${userNames[0]} is already in the department`
            : `${userNames.join(', ')} are already in the department`;

        throw new HttpException(errorMessage, HttpStatus.CONFLICT);
      }
    } catch (error) {
      console.error(error.message);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while adding users to department',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async addUsersToCustomRole(addUsersToRoleDto: AddUsersToRoleDto) {
    try {
      // Find the department by ID
      const customRole = await this.prismaService.customRole.findUnique({
        where: { id: addUsersToRoleDto.roleId },
        include: { users: true },
      });

      if (!customRole) {
        throw new HttpException('customRole not found', HttpStatus.NOT_FOUND);
      }

      // Find the users by their IDs
      const users = await this.prismaService.user.findMany({
        where: { id: { in: addUsersToRoleDto.userIds } },
        include: { departments: true },
      });

      // Check if any user is not found
      const notFoundUsers = addUsersToRoleDto.userIds.filter(
        (userId) => !users.find((user) => user.id === userId),
      );

      if (notFoundUsers.length > 0) {
        const notFoundUserNames = notFoundUsers.map((userId) => {
          const user = users.find((u) => u.id === userId);

          return user
            ? user?.primaryContactName || 'Unknown User'
            : `ID ${userId}`;
        });

        const errorMessage =
          notFoundUserNames.length === 1
            ? `User with ${notFoundUserNames[0]} not found`
            : `Users with ${notFoundUserNames.join(', ')} not found`;

        throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
      }

      // Check if users are already in the department
      const usersInRole = users.filter((user) =>
        user.departments.some((d) => d.id === addUsersToRoleDto.roleId),
      );

      if (usersInRole.length === 0) {
        // Add users to the department
        const updatedUsers = await Promise.all(
          addUsersToRoleDto.userIds.map(async (userId) => {
            return this.prismaService.user.update({
              where: { id: userId },
              data: {
                customRoles: {
                  connect: { id: addUsersToRoleDto.roleId },
                },
              },
              include: { customRoles: true },
            });
          }),
        );

        return {
          status: 'Success',
          message: 'Users successfully added',
          data: updatedUsers.map((user) => ({
            ...user,
            password: undefined,
            randomNumber: undefined,
            resetToken: undefined,
            resetTokenExpiresAt: undefined,
          })),
        };
      } else {
        const userNames = usersInRole.map((user) => user?.primaryContactName);
        const errorMessage =
          usersInRole.length === 1
            ? `${userNames[0]} already has role`
            : `${userNames.join(', ')} already have roles`;

        throw new HttpException(errorMessage, HttpStatus.CONFLICT);
      }
    } catch (error) {
      console.error(error.message);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while adding users to role',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getCompanyByAdminId(adminId: number) {
    return await this.prismaService.user.findUnique({
      where: { id: adminId },
      include: {
        adminCompanyId: true,
      },
    });
  }

  async updateCustomRole(
    userId: number,
    roleId: number,
    updateRoleDto: UpdateRoleDto,
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const updatedCustomRole = await this.prismaService.customRole.update({
        where: { id: roleId },
        data: {
          name: updateRoleDto.name,
          description: updateRoleDto.description,
          permissions: updateRoleDto.permissions,
          companyId: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Custom role updated successfully',
        ...updatedCustomRole,
        companyId: undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating role',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteWarehouse(userId: number, warehouseId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const warehouse = await this.prismaService.wareHouse.findUnique({
        where: { id: warehouseId, companyId },
        include: { stocks: true },
      });

      if (!warehouse) {
        throw new HttpException('Warehouse not found', HttpStatus.NOT_FOUND);
      }

      if (warehouse.companyId !== companyId) {
        throw new HttpException(
          'You do not have permission to delete this warehouse',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (warehouse.name.trim() === 'primary') {
        throw new HttpException(
          'Sorry, you cannot delete this warehouse',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Delete the product from associated warehouses
      await Promise.all(
        warehouse.stocks.map(async (stock) => {
          await this.prismaService.stock.delete({
            where: {
              id: stock.id,
            },
          });
        }),
      );

      await this.prismaService.wareHouse.delete({
        where: {
          id: warehouseId,
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Warehouse deleted successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting warehouse',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteAllWarehouses(userId: number) {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const { count } = await this.prismaService.wareHouse.deleteMany({
        where: {
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Warehouse deleted successfully',
        count,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting warehouse',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async editWarehouse(
    userId: number,
    warehouseId: number,
    wareHouseDto: wareHouseDto,
  ) {
    try {
      // Check if the user (admin or employee) exists
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { adminCompanyId: true, employeeId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if the warehouse exists
      const existingWarehouse = await this.prismaService.wareHouse.findUnique({
        where: { id: warehouseId },
      });

      if (!existingWarehouse) {
        throw new HttpException('Warehouse not found', HttpStatus.NOT_FOUND);
      }

      // Ensure that the user has permission to edit the warehouse
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      if (existingWarehouse.companyId !== companyId) {
        throw new HttpException(
          'You do not have permission to edit this warehouse',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Update the warehouse with the new data
      const updatedWarehouse = await this.prismaService.wareHouse.update({
        where: { id: warehouseId },
        data: {
          name: wareHouseDto.name,
          address: wareHouseDto.address,
          companyEmail: wareHouseDto.companyEmail,
          ...wareHouseDto,
        },
      });

      return {
        status: 'Success',
        message: 'Warehouse updated successfully',
        ...updatedWarehouse,
        companyId: undefined,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating warehouse',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  // async getAllUsersInCompany(companyId: number) {
  //   try {
  //     // Find the company by ID
  //     const company = await this.prismaService.adminCompany.findUnique({
  //       where: { id: companyId },
  //       include: { users: true },
  //     });

  //     if (!company) {
  //       throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
  //     }

  //     return {
  //       status: 'Success',
  //       message: 'Users in the company retrieved successfully',
  //       data: company.user.map((user) => ({
  //         ...user,
  //         password: undefined,
  //         randomNumber: undefined,
  //         resetToken: undefined,
  //         resetTokenExpiresAt: undefined,
  //       })),
  //     };
  //   } catch (error) {
  //     console.error(error.message);
  //     throw error;
  //   }
  // }
}
