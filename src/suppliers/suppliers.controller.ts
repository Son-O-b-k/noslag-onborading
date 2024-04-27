import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { ContactDto, CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUser, Roles } from 'src/common/decorators';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { User } from '@prisma/client';
import { UserDto } from './dto/user.dto';
import { DateTime } from 'luxon';

@Controller('api/v1/supplier')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('create-supplier')
  createSupplier(
    @CurrentUser() user: User,
    @Body() createSupplierDto: CreateSupplierDto,
    @Body() userDto: UserDto,
  ) {
    return this.suppliersService.createSupplier(user.id, createSupplierDto);
  }

  /************************ UPLOAD SUPPLIER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('upload-suppliers')
  uploadSupplier(
    @CurrentUser() user: User,
    @Body() createSupplierDto: CreateSupplierDto[],
  ) {
    return this.suppliersService.uploadSupplier(user.id, createSupplierDto);
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('get-supplier')
  getAllSuppliersInCompany(@CurrentUser() user: User) {
    return this.suppliersService.getSuppliers(user.id);
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('get-contacts')
  getAllContacts(@CurrentUser() user: User) {
    return this.suppliersService.getContacts(user.id);
  }

  /************************ GET SUPPLIER BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get(':supplierId')
  getSupplierById(
    @CurrentUser() user: User,
    @Param('supplierId') supplierId: number,
  ) {
    return this.suppliersService.getSupplierById(user.id, supplierId);
  }

  /************************ DELETE SUPPLIER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Delete('delete-supplier/:id')
  deleteSupplier(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.suppliersService.deleteSupplier(user.id, id);
  }

  /************************ CREATE SUPPLIER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('create-contact')
  createContact(@CurrentUser() user: User, @Body() contactDto: ContactDto) {
    return this.suppliersService.createContact(user.id, contactDto);
  }

  /************************ UPDATE SUPPLIER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('edit/:supplierId')
  editSupplier(
    @CurrentUser() user: User,
    @Param('supplierId') supplierId: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<any> {
    return this.suppliersService.editSupplier(
      user.id,
      supplierId,
      updateSupplierDto,
    );
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('top/suppliers')
  async getBestCustomers(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: number,
  ) {
    try {
      const processedStartDate = this.processDate(startDate);
      const processedEndDate = this.processDate(endDate);

      // Parse the startDate and endDate strings into Luxon DateTime objects
      const start = DateTime.fromISO(processedStartDate);
      const end = DateTime.fromISO(processedEndDate);

      // Check if the parsed dates are valid
      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format');
      }

      // Adjust the parsed dates to start and end of the day
      const startOfDay = start.startOf('day');
      const endOfDay = end.endOf('day');

      const bestSellingItems = await this.suppliersService.getBestSuppliers(
        user.id,
        startOfDay,
        endOfDay,
        limit,
      );
      return bestSellingItems;
    } catch (error) {
      // Handle errors appropriately
      console.error('Error:', error);
      throw error;
    }
  }

  // Function to process date string into ISO format with time and timezone
  processDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const processedDate = new Date(Date.UTC(year, month - 1, day));
    const isoDateString = processedDate.toISOString().split('T')[0]; // Extract date part
    return isoDateString + 'T00:00:00.000Z'; // Append time and UTC timezone
  }
}
