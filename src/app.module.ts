import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { EmployeesModule } from './employees/employees.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { ConfigModule, PrismaService } from './common';
import { AdminModule } from './admin/admin.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/guards/role.guard';
import { JwtAuthService } from './common/utils/token.generators';
import { UserInterceptor } from './common/interceptors/user.interceptor';
import { AllExceptionsFilter } from './common/filters/httpExceptionFilter';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CloudinaryModule } from './common/cloudinary';
import { OrdersModule } from './orders/orders.module';
import { TasksModule } from './tasks/tasks.module';
import { RequestsModule } from './requests/requests.module';
import { PriceListModule } from './price-list/price-list.module';
import { InvoiceModule } from './invoice/invoice.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentModule } from './payment/payment.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InventoryModule } from './inventory/inventory.module';
import { RequestSizeMiddleware } from './common/middleWare/requestSize';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    EmployeesModule,
    PrismaModule,
    AdminModule,
    SuppliersModule,
    CloudinaryModule,
    OrdersModule,
    TasksModule,
    RequestsModule,
    PriceListModule,
    InvoiceModule,
    NotificationsModule,
    PaymentModule,
    TransactionsModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthService,

    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserInterceptor,
    },
    {
      provide: 'APP_FILTER',
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestSizeMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
