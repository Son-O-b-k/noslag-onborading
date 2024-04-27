import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CurrentUser, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';
import { UserDto } from './dto/create-user.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';

@Controller('api/v1/employees/')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @UseGuards(JwtGuard)
  @Roles('ADMIN')
  @Put('create')
  createEmployee(
    @CurrentUser() user: User,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Body() userDto: UserDto,
  ) {
    return this.employeesService.createEmployee(
      user.id,
      createEmployeeDto,
      userDto,
    );
  }

  @UseGuards(JwtGuard)
  //@Roles('ADMIN')
  @Get('get-all-employees')
  getAllEmployeesInCompany(
    @CurrentUser() user: User,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Body() userDto: UserDto,
  ) {
    return this.employeesService.getAllEmployeesInCompany(user.id);
  }

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(+id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(+id);
  }
}
