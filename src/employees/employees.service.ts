import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from 'src/common';
import { AdminService } from 'src/admin/admin.service';
import { Prisma, Status, User, UserType } from '@prisma/client';
import { generateEmployeeID } from 'src/common/utils/generate.password';
import { UserDto } from './dto/create-user.dto';
import { MailService } from 'src/common/mail/mail.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly adminService: AdminService,
    private readonly mailService: MailService,
  ) {}
  async createEmployee(
    userId: number,
    createEmployeeDto: CreateEmployeeDto,
    userDto: UserDto,
  ) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          adminCompanyId: true,
          employeeId: true,
        },
      });

      if (!user) {
        throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
      }

      const companyId =
        user?.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the user initiating the invitation is an admin
      const initiatingUser = await this.prismaService.user.findFirst({
        where: { companyEmail: userDto.companyEmail, companyId },
        select: { userType: true },
      });

      if (initiatingUser && initiatingUser.userType === UserType.ADMIN) {
        throw new HttpException(
          'Admins cannot send invitations to themselves',
          HttpStatus.FORBIDDEN,
        );
      }

      // Check if employee with the same email already exists
      const existingEmployee = await this.getEmployeeByEmail(
        userDto.companyEmail,
        companyId,
      );

      if (existingEmployee) {
        throw new HttpException(
          'Employee with this email already exist',
          HttpStatus.CONFLICT,
        );
      }

      // Check if employee with the same email already exists
      const existingUser = await this.getUserByEmail(userDto.companyEmail);

      if (existingUser) {
        throw new HttpException('Email already exist', HttpStatus.CONFLICT);
      }

      // Generate random password
      const randomPassword = generateEmployeeID(20);
      // Check if employee with the same EmployeeID already exists
      const findEmployeeID = await this.getEmployeeByEmployeeId(
        randomPassword,
        companyId,
      );

      if (findEmployeeID && findEmployeeID.userType === UserType.EMPLOYEE) {
        throw new HttpException(
          'Employee with this EmployeeID already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Create custom roles for the user
      // const createdCustomRoles = await Promise.all(
      //   (userDto.customRoles || []).map(async (role) => {
      //     return await this.prismaService.customRole.create({
      //       data: {
      //         companyId:
      //           user.adminCompanyId?.adminID || user.employeeId?.companyId,
      //         name: role.name,
      //         description: role.description,
      //         permissions: role.permissions,
      //       },
      //     });
      //   }),
      // );

      // Create user with roles
      console.log(randomPassword);
      const employeeUser = await this.prismaService.user.create({
        data: {
          companyEmail: userDto.companyEmail,
          companyId,
          phone: userDto.phone,
          primaryContactName: userDto.primaryContactName,
          userType: UserType.EMPLOYEE,
          status: Status.Deactivate,
          randomNumber: await bcrypt.hash(randomPassword, 10),
          systemRoles: {
            connect: (userDto.systemRoles || []).map((role) => ({
              id: role.id,
            })),
          },
          customRoles: {
            connect: (userDto.customRoles || []).map((role) => ({
              id: role.id,
              companyId,
            })),
          },
          resetToken: new Date(),
          resetTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const updatedUser = await this.prismaService.user.update({
        where: { id: employeeUser.id },
        data: {
          systemRoles: {
            updateMany: (userDto.systemRoles || []).map((role) => ({
              where: { id: role.id },
              data: { companyId: user.id },
            })),
          },
        },
      });

      // console.log(updatedUser);

      // Create employee
      const employee = await this.prismaService.employee.create({
        data: {
          user_employeeID: employeeUser.id,
          ...createEmployeeDto,
          companyId,
          registeredBy: user.primaryContactName,
          companyEmail: employeeUser.companyEmail,
        },
      });

      const userRoles = await this.getEmployeeRoles(employeeUser.id);

      // Send user confirmation email
      await this.mailService.sendEmployeeConfirmation(
        { employeeUser, employee },
        randomPassword,
        userRoles,
        user.adminCompanyId.organizationName,
      );

      return {
        status: 'successful',
        message: 'Invitation successfully sent',
        data: {
          ...employeeUser,
          ...employee,
          randomNumber: undefined,
          password: undefined,
          adminId: undefined,
          companyId: undefined,
          user_employeeID: undefined,
        },
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException(
          'Please create custom roles before inviting employees',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating employee',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error.message;
    }
  }

  async getAllEmployeesInCompany(userId: number) {
    try {
      // Find the user by ID
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          adminCompanyId: true,
          employeeId: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Find the company by user's company ID
      const companies = await this.prismaService.adminCompany.findMany({
        where: {
          adminID: user.adminCompanyId?.adminID || user.employeeId?.companyId,
        },
        include: { employees: { include: { user: true } } },
      });

      if (!companies || companies.length === 0) {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }

      const employees = await Promise.all(
        companies.flatMap(async (company) => {
          const companyEmployees = company.employees;
          const employeesWithUserDetails = await Promise.all(
            companyEmployees.map(async (employee) => {
              const user = await this.prismaService.user.findUnique({
                where: { id: employee.user_employeeID }, // Assuming you have a userId property on the employee
                include: {
                  customRoles: true,
                  systemRoles: true,
                  departments: true,
                  image: true,
                },
              });

              if (!user) {
                // Handle the case where the user is not found
                console.log('no user');
                return null;
              }

              return {
                ...employee,
                user: {
                  ...user,
                  password: undefined,
                  randomNumber: undefined,
                  resetToken: undefined,
                  resetTokenExpiresAt: undefined,
                },
              };
            }),
          );

          // Remove null values (users not found) from the array
          return employeesWithUserDetails.filter(Boolean);
        }),
      );

      // Fetch the admin owner for each company
      const admin = await Promise.all(
        companies.map(async (company) => {
          const adminOwner = await this.prismaService.user.findUnique({
            where: { id: company.adminID },
            include: {
              adminCompanyId: true,
              image: true,
              customRoles: true,
              systemRoles: true,
            },
          });
          return adminOwner;
        }),
      );

      return {
        status: 'Success',
        message: 'Employees retrieved successfully',
        data: { employees, admin },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching employees',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  findAll() {
    return `This action returns all employees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} employee`;
  }

  update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    return `This action updates a #${id} employee`;
  }

  remove(id: number) {
    return `This action removes a #${id} employee`;
  }

  async getEmployeeByEmail(companyEmail: string, companyId: number) {
    return this.prismaService.user.findFirst({
      where: { companyEmail, companyId },
      include: {
        employeeId: true,
      },
    });
  }

  private async getUserByEmail(companyEmail: string) {
    return this.prismaService.user.findFirst({
      where: { companyEmail },
      include: {
        employeeId: true,
      },
    });
  }

  async getEmployeeByEmployeeId(
    randomNumber: string,
    companyId: number,
  ): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: { randomNumber, companyId },
      include: {
        employeeId: true,
      },
    });
  }

  async getEmployeeRoles(employeeId: number) {
    const userRoles = await this.prismaService.user.findUnique({
      where: { id: employeeId },
      select: {
        systemRoles: { select: { name: true } },
        customRoles: { select: { name: true } },
      },
    });

    const formattedRoles = {
      roles: [
        ...userRoles.systemRoles.map((role) => role.name),
        ...userRoles.customRoles.map((role) => role.name),
      ],
    };

    return formattedRoles.roles;
  }
}

// const transactionResult = await this.prismaService.$transaction(
//   async (tx) => {
//     // Create custom roles for the user
//     const createdCustomRoles = await Promise.all(
//       (userDto.customRoles || []).map(async (role) => {
//         return await tx.customRole.create({
//           data: {
//             name: role.name,
//             description: role.description,
//             permissions: role.permissions,
//           },
//         });
//       }),
//     );

//     // Create user with roles
//     const employeeUser = await tx.user.create({
//       data: {
//         companyEmail: userDto.companyEmail,
//         phone: userDto.phone,
//         primaryContactName: userDto.primaryContactName,
//         userType: UserType.EMPLOYEE,
//         status: Status.Deactivate,
//         randomNumber: await bcrypt.hash(randomPassword, 10),
//         systemRoles: {
//           connect: (userDto.systemRoles || []).map((role) => ({
//             name: role.name,
//           })),
//         },
//         customRoles: {
//           connect: createdCustomRoles.map((createdRole) => ({
//             id: createdRole.id,
//           })),
//         },
//         resetToken: new Date(),
//         resetTokenExpiresAt: new Date(
//           Date.now() + 7 * 24 * 60 * 60 * 1000,
//         ),
//       },
//     });

//     // Create employee
//     const employee = await tx.employee.create({
//       data: {
//         user_employeeID: employeeUser.id,
//         ...createEmployeeDto,
//         companyId:
//           user?.adminCompanyId?.adminID || user?.employeeId?.companyId,
//         registeredBy: user.primaryContactName,
//       },
//     });

//     return { employeeUser, employee };
//   },
//   {
//     maxWait: 2000, // default: 2000
//     timeout: 5000, // default: 5000
//     //isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
//   },
// );

// async createEmployee(
//   userId: number,
//   createEmployeeDto: CreateEmployeeDto,
//   userDto: UserDto,
// ) {
//   try {
//     const user = await this.prismaService.user.findUnique({
//       where: { id: userId },
//       include: {
//         adminCompanyId: true,
//         employeeId: true,
//       },
//     });

//     if (!user) {
//       throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
//     }

//     // Generate random password
//     const randomPassword = generateEmployeeID(12);

//     // Check if employee with the same email already exists
//     const existingEmployee = await this.getEmployeeByEmail(
//       userDto.companyEmail,
//     );
//     if (existingEmployee && existingEmployee.userType === UserType.EMPLOYEE) {
//       throw new HttpException(
//         'Employee with this email already exists',
//         HttpStatus.CONFLICT,
//       );
//     }

//     // Check if employee with the same EmployeeID already exists
//     const findEmployeeID = await this.getEmployeeByEmployeeId(randomPassword);
//     if (findEmployeeID && findEmployeeID.userType === UserType.EMPLOYEE) {
//       throw new HttpException(
//         'Employee with this EmployeeID already exists',
//         HttpStatus.CONFLICT,
//       );
//     }

//     const transactionFunc = async () => {
//       // Use Prisma transaction for atomic operations
//       const transactionResult = await this.prismaService.$transaction(
//         async (tx) => {
//           // Create custom roles for the user
//           const createdCustomRoles = await Promise.all(
//             (userDto.customRoles || []).map(async (role) => {
//               return await tx.customRole.create({
//                 data: {
//                   name: role.name,
//                   description: role.description,
//                   permissions: role.permissions,
//                 },
//               });
//             }),
//           );

//           // Create user with roles
//           const employeeUser = await tx.user.create({
//             data: {
//               companyEmail: userDto.companyEmail,
//               phone: userDto.phone,
//               primaryContactName: userDto.primaryContactName,
//               userType: UserType.EMPLOYEE,
//               status: Status.Deactivate,
//               randomNumber: await bcrypt.hash(randomPassword, 10),
//               systemRoles: {
//                 connect: (userDto.systemRoles || []).map((role) => ({
//                   name: role.name,
//                 })),
//               },
//               customRoles: {
//                 connect: createdCustomRoles.map((createdRole) => ({
//                   id: createdRole.id,
//                 })),
//               },
//               resetToken: new Date(),
//               resetTokenExpiresAt: new Date(
//                 Date.now() + 7 * 24 * 60 * 60 * 1000,
//               ),
//             },
//           });

//           // Create employee
//           const employee = await tx.employee.create({
//             data: {
//               user_employeeID: employeeUser.id,
//               ...createEmployeeDto,
//               companyId:
//                 user?.adminCompanyId?.adminID || user?.employeeId?.companyId,
//               registeredBy: user.primaryContactName,
//             },
//           });

//           return { employeeUser, employee };
//         },
//         {
//           maxWait: 2000, // default: 2000
//           timeout: 5000, // default: 5000
//           //isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
//         },
//       );

//       return transactionResult;
//     };

//     // Retry the transaction with a maximum of 5 retries
//     const transactionResult = await retryTransaction(5, transactionFunc);

//     // Get roles of the user
//     const userRoles = await this.getEmployeeRoles(
//       transactionResult.employeeUser.id,
//     );

//     // Send user confirmation email
//     await this.mailService.sendEmployeeConfirmation(
//       transactionResult,
//       randomPassword,
//       userRoles,
//     );

//     return {
//       status: 'successful',
//       message: 'Invitation successfully sent',
//       data: {
//         ...transactionResult.employeeUser,
//         ...transactionResult.employee,
//         randomNumber: undefined,
//         password: undefined,
//         adminId: undefined,
//         companyId: undefined,
//       },
//     };
//   } catch (error) {
//     console.log(error.message);
//     throw error;
//   }
// }

// code 2

// async createEmployee(
//   userId: number,
//   createEmployeeDto: CreateEmployeeDto,
//   userDto: UserDto,
// ) {
//   try {
//     const user = await this.prismaService.user.findUnique({
//       where: { id: userId },
//       include: {
//         adminCompanyId: true,
//         employeeId: true,
//       },
//     });

//     if (!user) {
//       throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
//     }

//     // Generate random password
//     const randomPassword = generateEmployeeID(12);

//     // Check if employee with the same email already exists
//     const existingEmployee = await this.getEmployeeByEmail(
//       userDto.companyEmail,
//     );
//     if (existingEmployee && existingEmployee.userType === UserType.EMPLOYEE) {
//       throw new HttpException(
//         'Employee with this email already exists',
//         HttpStatus.CONFLICT,
//       );
//     }

//     // Check if employee with the same EmployeeID already exists
//     const findEmployeeID = await this.getEmployeeByEmployeeId(randomPassword);
//     if (findEmployeeID && findEmployeeID.userType === UserType.EMPLOYEE) {
//       throw new HttpException(
//         'Employee with this EmployeeID already exists',
//         HttpStatus.CONFLICT,
//       );
//     }

//     const transactionResult = await this.prismaService.$transaction(
//       async (tx) => {
//         // Create custom roles for the user
//         const createdCustomRoles = await Promise.all(
//           (userDto.customRoles || []).map(async (role) => {
//             return await tx.customRole.create({
//               data: {
//                 name: role.name,
//                 description: role.description,
//                 permissions: role.permissions,
//               },
//             });
//           }),
//         );

//         // Create user with roles
//         const employeeUser = await tx.user.create({
//           data: {
//             companyEmail: userDto.companyEmail,
//             phone: userDto.phone,
//             primaryContactName: userDto.primaryContactName,
//             userType: UserType.EMPLOYEE,
//             status: Status.Deactivate,
//             randomNumber: await bcrypt.hash(randomPassword, 10),
//             systemRoles: {
//               connect: (userDto.systemRoles || []).map((role) => ({
//                 name: role.name,
//               })),
//             },
//             customRoles: {
//               connect: createdCustomRoles.map((createdRole) => ({
//                 id: createdRole.id,
//               })),
//             },
//             resetToken: new Date(),
//             resetTokenExpiresAt: new Date(
//               Date.now() + 7 * 24 * 60 * 60 * 1000,
//             ),
//           },
//         });

//         // Create employee
//         const employee = await tx.employee.create({
//           data: {
//             user_employeeID: employeeUser.id,
//             ...createEmployeeDto,
//             companyId:
//               user?.adminCompanyId?.adminID || user?.employeeId?.companyId,
//             registeredBy: user.primaryContactName,
//           },
//         });

//         return { employeeUser, employee };
//       },
//       {
//         maxWait: 2000, // default: 2000
//         timeout: 5000, // default: 5000
//         //isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // optional, default defined by database configuration
//       },
//     );

//     // Get roles of the user
//     const userRoles = await this.getEmployeeRoles(
//       transactionResult.employeeUser.id,
//     );

//     // Send user confirmation email
//     await this.mailService.sendEmployeeConfirmation(
//       transactionResult,
//       randomPassword,
//       userRoles,
//     );

//     return {
//       status: 'successful',
//       message: 'Invitation successfully sent',
//       data: {
//         ...transactionResult.employeeUser,
//         ...transactionResult.employee,
//         randomNumber: undefined,
//         password: undefined,
//         adminId: undefined,
//         companyId: undefined,
//       },
//     };
//   } catch (error) {
//     console.log(error.message);
//     throw error;
//   }
// }
