import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PurchaseOrder,
  Request,
  SalesOrder,
  StockRequest,
  Task,
  User,
  WareHouse,
} from '@prisma/client';
import { TransferDto } from 'src/inventory/dto/warehouse-transfer.dto';
// import { User } from 'src/shared/schema/users';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async forgotPassword(user: any, otp: string) {
    await this.mailerService
      .sendMail({
        to: user.companyEmail,
        subject: 'Password Recovery',
        template: './forgotPassword',
        context: {
          name: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          otp: user.otp,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async sendAdminConfirmation(user: any, randomPassword: string) {
    const url = `${this.configService.get('BASEURL')}/auth/customPassword`;
    //console.log(user);

    await this.mailerService
      .sendMail({
        to: user.user?.companyEmail,
        subject: `Welcome to ${user.company?.organizationName}! Confirm your Email`,
        template: 'adminconfirmation',
        context: {
          name: user.user?.primaryContactName,
          organizationName: user.company?.organizationName,
          companyAddress: user.company?.companyAddress,
          companyEmail: user.user?.companyEmail,
          generatedPassword: randomPassword,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async sendEmailToCustomer(email: any, body: string) {
    // const url = `${this.configService.get('BASEURL')}/auth/customPassword`;
    //console.log(user);

    await this.mailerService
      .sendMail({
        to: email,
        subject: `Customer Quote`,
        html: body,
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async sendEmployeeConfirmation(
    user: any,
    randomPassword: string,
    userRoles: any,
    organizationName,
  ) {
    const url = `${this.configService.get('BASEURL')}/auth/signup/employee`;

    await this.mailerService
      .sendMail({
        to: user.employeeUser?.companyEmail,
        subject: `Invitation`,
        template: './employeeinvite',
        context: {
          name: user.employeeUser?.primaryContactName,
          organizationName,
          companyEmail: user.employeeUser?.companyEmail,
          generatedPassword: randomPassword,
          roles: userRoles,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async salesOrderNotifications(
    notification: any,
    approver: any,
    user: any,
    salesOrder: SalesOrder,
  ) {
    //
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: approver.companyEmail,
        subject: `Sales Order Approval Required - Order: ${salesOrder.SN}`,
        template: './salesOrder',
        context: {
          approverName: approver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          salesOrder,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async purchaseOrderNotifications(
    notification: any,
    approver: any,
    user: any,
    purchaseOrder: PurchaseOrder,
  ) {
    //console.log(approver.primaryContactName, user.primaryContactName);
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: approver.companyEmail,
        subject: `Purchase Order Approval Required - Order: ${purchaseOrder.SN}`,
        template: './purchaseOrder',
        context: {
          approverName: approver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          purchaseOrder,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async salesRequestNotifications(
    notification: any,
    approver: any,
    user: any,
    request: Request,
  ) {
    console.log(approver);
    // console.log(approver.primaryContactName, user.primaryContactName);
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: approver.companyEmail,
        subject: `Sales Request Approval Required - Request: ${request.REQ}`,
        template: './salesRequest',
        context: {
          approverName: approver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async purchaseRequestNotifications(
    notification: any,
    approver: any,
    user: any,
    request: Request,
  ) {
    // console.log(approver.primaryContactName, user.primaryContactName);
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: approver.companyEmail,
        subject: `Purchase Request Approval Required - Request: ${request.REQ}`,
        template: './purchaseRequest',
        context: {
          approverName: approver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async requestApprovalNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    request: Request,
  ) {
    // console.log(requestedUser.primaryContactName, user.primaryContactName);
    //
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Request Approval - Request: ${request.REQ}`,
        template: './requestApproval',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async requestRejectionNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    request: Request,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Sales Rejection - Sales: ${request.REQ}`,
        template: './requestRejection',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async stockRequestApprovalNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    request: StockRequest,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Request Approval - Request: ${request.requestNumber}`,
        template: './stockRequestApproval',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async stockRequestRejectionNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    request: StockRequest,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New transfer Rejection - Stock: ${request.requestNumber}`,
        template: './stockRequestRejection',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async salesApprovalNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    sales: SalesOrder,
  ) {
    // console.log(requestedUser.primaryContactName, user.primaryContactName)

    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Sales Approval - Sales: ${sales.SN}`,
        template: './salesApproval',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          sales,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async salesRejectionNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    sales: SalesOrder,
  ) {
    // console.log(requestedUser.primaryContactName, user.primaryContactName)

    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Sales Rejection - Sales: ${sales.SN}`,
        template: './salesRejection',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          sales,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async purchaseApprovalNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    purchase: PurchaseOrder,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Purchase Approval - Sales: ${purchase.SN}`,
        template: './purchaseApproval',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          purchase,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async purchaseRejectionNotifications(
    notification: any,
    requestedUser: any,
    user: any,
    purchase: PurchaseOrder,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: requestedUser.companyEmail,
        subject: `New Purchase Rejection - Purchase: ${purchase.SN}`,
        template: './purchaseApproval',
        context: {
          requesterName: requestedUser.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          purchase,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async taskNotifications(
    notification: any,
    receiver: any,
    user: any,
    task: Task,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: receiver.companyEmail,
        subject: `New Task Added - Task: ${task.taskSN}`,
        template: './task',
        context: {
          requesterName: receiver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          task,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async transferNotifications(
    notification: any,
    approver: any,
    user: any,
    request: StockRequest,
  ) {
    const url = `${this.configService.get('BASEURL')}/dashboard/selfService/approvals`;
    await this.mailerService
      .sendMail({
        to: approver.companyEmail,
        subject: `New Transfer Approval`,
        template: './transferApproval',
        context: {
          approverName: approver.primaryContactName,
          senderName: user.primaryContactName,
          organizationName: user.adminCompanyId?.organizationName,
          notification,
          request,
          url,
        },
      })
      .then((success) => {
        console.log('Email successfully triggered');
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
