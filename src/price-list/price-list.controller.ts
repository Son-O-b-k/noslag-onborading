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
import { PriceListService } from './price-list.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { CurrentUser, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';

@Controller('api/v1/pricelist')
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  /************************ CREATE PRICELIST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('create-pricelist')
  createRequest(
    @CurrentUser() user: User,
    @Body() createPriceListDto: CreatePriceListDto,
  ) {
    return this.priceListService.createPriceList(user.id, createPriceListDto);
  }

  /************************ GET PRICELIST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-pricelists')
  getRequests(@CurrentUser() user: User) {
    return this.priceListService.getPriceLists(user.id);
  }

  /************************ GET PURCHASE PRICELIST ************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-purchase-pricelist')
  getPurchasePriceLists(@CurrentUser() user: User) {
    return this.priceListService.getPurchasePriceLists(user.id);
  }

  /************************ GET SALES PRICELIST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-sales-pricelist')
  getSalesPriceLists(@CurrentUser() user: User) {
    return this.priceListService.getSalesPriceLists(user.id);
  }

  /************************ GET PRICELIST BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get(':id')
  getPriceListById(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.priceListService.getPriceListById(user.id, id);
  }

  /************************ EDIT PRICELIST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Put('edit/:id')
  editProduct(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updatePriceListDto: UpdatePriceListDto,
  ): Promise<any> {
    return this.priceListService.editPriceList(user.id, id, updatePriceListDto);
  }
}
