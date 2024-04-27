import { Global, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class SerialNumberService {
  constructor(private prisma: PrismaService) {}

  async generateSerialNumber(
    prefix: string,
    module: string,
    companyId: number,
  ): Promise<string> {
    let serialEntry = await this.prisma.serialNumber.findFirst({
      where: { prefix, module, companyId },
    });

    if (serialEntry) {
      // If entry exists, increment the serial number
      const updatedEntry = await this.prisma.serialNumber.update({
        where: { id: serialEntry.id },
        data: { currentNumber: { increment: 1 } },
      });
      serialEntry = updatedEntry;
    } else {
      // If entry doesn't exist, create a new entry
      serialEntry = await this.prisma.serialNumber.create({
        data: { companyId, prefix, module, currentNumber: 1 },
      });
    }

    // Format the serial number with leading zeros
    const serialNumber = `${prefix}-${serialEntry.currentNumber
      .toString()
      .padStart(7, '0')}`;

    return serialNumber;
  }
}
