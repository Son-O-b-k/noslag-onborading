import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidItemDetails', async: false })
export class IsValidItemDetails implements ValidatorConstraintInterface {
  validate(itemDetails: Record<string, string>[], args: ValidationArguments) {
    const allowedKeys = [
      'qtyAvailable',
      'qtyOnHand',
      'qtyAdjusted',
      'qtyTransferred',
      'transferValue',
      'purchasePrice',
      'warehouseName',
      'costPrice',
      'itemName',
      'currentValue',
      'changedValue',
      'valueAdjusted',
      'productId',
      'sendingStockId',
      'comment',
      'receive',
    ];

    for (const itemDetail of itemDetails) {
      const keys = Object.keys(itemDetail);
      for (const key of keys) {
        if (!allowedKeys.includes(key)) {
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid item details. Allowed keys are: QtyAvailable, QtyOnHand, QtyAdjusted, PurchasePrice, CostPrice, ItemName, CurrentValue, ValueAdjusted';
  }
}
