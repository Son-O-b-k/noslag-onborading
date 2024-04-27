import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CloudinaryService, MailService, PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { Prisma, Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    // private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
  ) {}
  async createTask(
    userId: number,
    createTaskDto: CreateTaskDto,
    file?: Express.Multer.File,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingTask = await this.prismaService.task.findFirst({
        where: { taskSN: createTaskDto.taskSN, companyId },
      });
      //console.log(existingTask);

      if (existingTask) {
        throw new HttpException(
          `Task already created with this task serial number ${createTaskDto.taskSN} `,
          HttpStatus.BAD_REQUEST,
        );
      }
      let task: Task;
      // Find the user by their id
      if (createTaskDto.userId) {
        console.log(createTaskDto.userId);
        const approver = await this.prismaService.user.findUnique({
          where: { id: createTaskDto.userId },
        });

        if (!approver) {
          throw new HttpException(
            'Assigned user does not exist',
            HttpStatus.BAD_REQUEST,
          );
        }

        let image = null;

        if (file) {
          const imagesLink = await this.cloudinaryService
            .uploadImage(file)
            .catch((error) => {
              throw new HttpException(error, HttpStatus.BAD_REQUEST);
            });

          image = await this.prismaService.image.create({
            data: {
              publicId: imagesLink.public_id,
              url: imagesLink.url,
              companyId,
            },
          });
        }

        task = await this.prismaService.task.create({
          data: {
            companyId,
            taskSN: createTaskDto.taskSN,
            name: createTaskDto.name,
            priority: createTaskDto.priority,
            state: createTaskDto.state,
            appliesTo: createTaskDto.appliesTo,
            assignedBy: user.primaryContactName,
            duration: createTaskDto.duration,
            comments: createTaskDto.comments,
            description: createTaskDto.description,
            notes: createTaskDto.notes,
            userId: createTaskDto.userId,
            imageId: image?.id,
          },
          include: {
            image: { where: { companyId } },
            user: { include: { image: true } },
          },
        });

        const notification =
          await this.prismaService.systemNotifications.create({
            data: {
              message: `New Task added ${task.taskSN}.`,
              companyId,
              userId: user.id,
              approverId: approver.id,
              taskId: task.id,
              receiverId: approver.id,
            },
          });

        await this.mailService.taskNotifications(
          notification,
          approver,
          user,
          task,
        );
      }

      // Ensure departmentIds is always an array
      let existingDepartments: any[] = [];
      if (createTaskDto.departmentIds) {
        const departmentIdArray = Array.isArray(createTaskDto.departmentIds)
          ? createTaskDto.departmentIds
          : [createTaskDto.departmentIds];

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
            `Departments with IDs ${missingDepartmentIds.join(', ')} not found`,
            HttpStatus.NOT_FOUND,
          );
        }

        let image = null;

        if (file) {
          const imagesLink = await this.cloudinaryService
            .uploadImage(file)
            .catch((error) => {
              throw new HttpException(error, HttpStatus.BAD_REQUEST);
            });

          image = await this.prismaService.image.create({
            data: {
              publicId: imagesLink.public_id,
              url: imagesLink.url,
              companyId,
            },
          });
        }

        task = await this.prismaService.task.create({
          data: {
            companyId,
            taskSN: createTaskDto.taskSN,
            name: createTaskDto.name,
            priority: createTaskDto.priority,
            state: createTaskDto.state,
            appliesTo: createTaskDto.appliesTo,
            assignedBy: user.primaryContactName,
            duration: createTaskDto.duration,
            comments: createTaskDto.comments,
            description: createTaskDto.description,
            notes: createTaskDto.notes,
            userId: createTaskDto.userId,
            imageId: image?.id,
          },
          include: { image: { where: { companyId } } },
        });

        // Associate the task with each department
        await Promise.all(
          existingDepartments.map(async (department) => {
            await this.prismaService.department.update({
              where: { id: department.id, companyId },
              data: { tasks: { connect: { id: task.id } } },
            });
          }),
        );
      }
      return {
        status: 'Success',
        message: 'Task created successfully',
        data: task,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating task',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateTaskState(
    userId: number,
    TaskId: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Check if the Order exists
      const existingTask = await this.prismaService.task.findUnique({
        where: { id: TaskId, companyId },
        // include: { request: { where: { companyId } } },
      });

      if (!existingTask) {
        throw new HttpException(
          `Task with id number ${TaskId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const updateTask = await this.prismaService.task.update({
        where: { id: TaskId, companyId },
        data: {
          state: updateTaskDto.state,
        },
        include: {
          image: { where: { companyId } },
          user: { where: { image: { companyId } } },
          departments: {
            include: {
              users: { include: { image: { where: { companyId } } } },
            },
          },
        },
      });

      return {
        status: 'Successfully updated Task',
        data: updateTask,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating task',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAllTasks(userId: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const tasks = await this.prismaService.task.findMany({
        where: { companyId },
        include: {
          image: { where: { companyId } },
          user: { include: { image: true } },
          departments: {
            include: {
              users: { include: { image: { where: { companyId } } } },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Tasks retrieved successfully',
        data: tasks,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching task',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async geTaskById(userId: number, id: number): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const task = await this.prismaService.task.findUnique({
        where: { id, companyId },
        include: {
          image: { where: { companyId } },
          // user: { where: { image: { companyId } } },
          user: { include: { image: true } },
          departments: {
            include: {
              users: { where: { image: { companyId } } },
            },
          },
          //notifications: { where: { companyId } },
        },
      });

      if (!task) {
        throw new HttpException(
          `Task with id ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'Success',
        message: 'Task retrieved successfully',
        data: task,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching task',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async updateTask(
    userId: number,
    taskId: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const existingTask = await this.prismaService.task.findUnique({
        where: { id: taskId, companyId },
      });

      if (!existingTask) {
        throw new HttpException(
          `Task with id number ${taskId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Create an object to hold the dynamic update data
      const dynamicUpdateData: Record<string, any> = {};

      // Iterate over the fields in updateTaskDto and add them to dynamicUpdateData
      for (const field in updateTaskDto) {
        dynamicUpdateData[field] = updateTaskDto[field];
      }

      let task: Task;
      if (Object.keys(dynamicUpdateData).length > 0) {
        if (updateTaskDto.userId) {
          const approver = await this.prismaService.user.findUnique({
            where: {
              id: updateTaskDto.userId,
              companyId,
            },
          });

          if (!approver) {
            throw new HttpException(
              'Assigned approver does not exist',
              HttpStatus.NOT_FOUND,
            );
          }

          // console.log(updateTaskDto);
          // Save the updated request with dynamic data
          task = await this.prismaService.task.update({
            where: { id: taskId, companyId },
            data: dynamicUpdateData,
            include: {
              image: { where: { companyId } },
              user: { where: { image: { companyId } } },
              departments: {
                include: {
                  users: { include: { image: { where: { companyId } } } },
                },
              },
            },
          });

          const notification =
            await this.prismaService.systemNotifications.create({
              data: {
                message: `New Task added ${task.taskSN}.`,
                companyId,
                userId: user.id,
                approverId: approver.id,
                taskId: task.id,
                receiverId: approver.id,
              },
            });

          await this.mailService.taskNotifications(
            notification,
            approver,
            user,
            task,
          );

          return {
            status: 'Successfully Updated',
            data: task,
          };
        } else if (updateTaskDto.departmentIds) {
          let existingDepartments: any[] = [];

          //checks and ensure departmentId is always an array
          const departmentIdArray = Array.isArray(updateTaskDto.departmentIds)
            ? updateTaskDto.departmentIds
            : [updateTaskDto.departmentIds];

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

          task = await this.prismaService.task.update({
            where: { id: taskId, companyId },
            data: dynamicUpdateData,
          });

          // Associate the task with each department
          await Promise.all(
            existingDepartments.map(async (department) => {
              const departments = await this.prismaService.department.update({
                where: { id: department.id, companyId },
                data: { tasks: { connect: { id: task.id } } },
                include: { users: true },
              });

              // Notify each user in the department
              await Promise.all(
                departments.users.map(async (userInDepartment) => {
                  const notification =
                    await this.prismaService.systemNotifications.create({
                      data: {
                        message: `New Task Added ${task.taskSN}.`,
                        companyId,
                        userId: user.id,
                        approverId: userInDepartment.id,
                        taskId: task.id,
                        receiverId: userInDepartment.id,
                      },
                    });
                  await this.mailService.taskNotifications(
                    notification,
                    userInDepartment,
                    user,
                    task,
                  );
                }),
              );
            }),
          );

          return {
            status: 'Successfully Updated',
            data: task,
          };
        }
      } else {
        throw new HttpException(`No fields provided`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating task',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }
}
