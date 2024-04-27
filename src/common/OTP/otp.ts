import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class OTPService {
  OTPGenerator(digits: number): { otp: string; otpExpiryTime: Date } {
    if (digits <= 0) {
      throw new HttpException(
        'Number of digits must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const min = 10 ** (digits - 1);
    const max = 10 ** digits - 1;

    const otpExpiryTime = new Date();
    otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10);

    const otp = Math.floor(Math.random() * (max - min + 1)) + min;

    return { otp: otp.toString(), otpExpiryTime };
  }
}
